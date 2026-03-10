import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import * as fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from 'url';
import axios from "axios";
import * as dotenv from "dotenv";
import cors from "cors";

dotenv.config();

let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else {
    console.warn("GEMINI_API_KEY not found. CS-Bot will be disabled.");
  }
} catch (e: any) {
  console.warn("Failed to initialize Gemini API:", e.message);
}

// Mongoose Schemas & Models
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  githubId: { type: String, unique: true, sparse: true },
  avatarUrl: String,
  bio: String,
  status: { type: String, default: 'offline' },
  joinDate: { type: Date, default: Date.now },
  accessLevel: { type: String, default: 'Member' }
});

const channelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: String,
  isLive: { type: Boolean, default: false },
  streamUrl: String
});

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isBot: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  recipient: String,
  type: { type: String, default: 'text' }
});

const User = mongoose.model('User', userSchema);
const Channel = mongoose.model('Channel', channelSchema);
const Message = mongoose.model('Message', messageSchema);

// Seeding Logic
async function seedDatabase() {
  try {
    const channelCount = await Channel.countDocuments();
    if (channelCount === 0) {
      const seedChannels = [
        { id: uuidv4(), name: 'general', description: 'General discussion for all members' },
        { id: uuidv4(), name: 'projects', description: 'Showcase and discuss your latest builds' },
        { id: uuidv4(), name: 'live', description: 'Community livestream and shared viewing', isLive: false },
        { id: uuidv4(), name: 'help', description: 'Get help with coding or hardware issues' },
        { id: uuidv4(), name: 'system-log', description: 'Real-time network event logs' },
        { id: uuidv4(), name: 'random', description: 'Off-topic banter and memes' }
      ];
      await Channel.insertMany(seedChannels);
      console.log("Seeded initial channels.");

      // Initial System Log
      const systemLog = seedChannels.find(c => c.name === 'system-log');
      if (systemLog) {
        await new Message({
          id: uuidv4(),
          channelId: systemLog.id,
          userId: 'system',
          username: 'SYSTEM',
          content: '*** Mainframe initialized. All protocols active. Node terminal green enabled.',
          isBot: true
        }).save();
      }
    }
  } catch (err) {
    console.error("Error during database seeding:", err);
  }
}

// Mongoose Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kirinyaga-cs")
  .then(() => {
    console.log("Connected to MongoDB");
    seedDatabase();
  })
  .catch(err => console.error("MongoDB connection error:", err));

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // GitHub OAuth
  app.get('/api/auth/github/url', (req, res) => {
    const redirectUri = `${process.env.APP_URL || `http://localhost:${PORT}`}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'read:user',
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
  });

  app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code provided');

    try {
      // Exchange code for token
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }, {
        headers: { Accept: 'application/json' }
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` }
      });

      const githubUser = userResponse.data;
      const username = githubUser.login;
      const githubId = githubUser.id.toString();
      const avatarUrl = githubUser.avatar_url;
      const bio = githubUser.bio;

      // Upsert user
      let user = await User.findOne({ githubId });
      if (!user) {
        const id = uuidv4();
        user = new User({ id, username, githubId, avatarUrl, bio });
        await user.save();
      } else {
        user.username = username;
        user.avatarUrl = avatarUrl;
        user.bio = bio;
        await user.save();
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify(user)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth Error:', err);
      res.status(500).send('Authentication failed');
    }
  });

  // WebSocket handling
  const allSockets = new Set<WebSocket>();
  const clients = new Map<WebSocket, { username: string; id: string }>();

  const broadcast = (payload: string) => {
    allSockets.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  const sendToUser = (username: string, payload: string) => {
    clients.forEach((info, client) => {
      if (info.username === username && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  const handleBotResponse = async (channelId: string, userMessage: string, systemPrompt?: string) => {
    if (!ai) {
      const timestamp = new Date().toISOString();
      const id = uuidv4();
      broadcast(JSON.stringify({
        type: 'message',
        message: { id, channelId, userId: 'bot-1', username: 'CS-Bot', content: 'AI functionality is currently disabled. Please set GEMINI_API_KEY.', timestamp, isBot: true }
      }));
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt || "You are 'CS-Bot', a helpful assistant for the Computer Society of Kirinyaga. Provide technical, concise, and helpful answers. Use markdown for code snippets.",
        }
      });

      const botContent = response.text || "I'm sorry, I couldn't process that.";
      const id = uuidv4();
      const timestamp = new Date();

      const newMsg = new Message({
        id, channelId, userId: 'bot-1', username: 'CS-Bot', content: botContent, timestamp, isBot: true
      });
      await newMsg.save();

      broadcast(JSON.stringify({
        type: 'message',
        message: { id, channelId, userId: 'bot-1', username: 'CS-Bot', content: botContent, timestamp: timestamp.toISOString(), isBot: true }
      }));
    } catch (err) {
      console.error('Bot Error:', err);
    }
  };

  wss.on('connection', async (ws) => {
    allSockets.add(ws);
    // Send initial state immediately
    const channels = await Channel.find({});
    const messages = await Message.find({ isPrivate: false }).sort({ timestamp: -1 }).limit(100).lean();
    const users = await User.find({});

    // Sort and format for the frontend
    messages.reverse();
    const formattedMessages = messages.map(m => ({ ...m, timestamp: (m.timestamp as any).toISOString() }));

    ws.send(JSON.stringify({ type: 'init', channels, messages: formattedMessages, users }));

    ws.on('message', async (data) => {
      try {
        const event = JSON.parse(data.toString());

        if (event.type === 'send_message') {
          const { channelId, content, username } = event;

          // Register user if not already
          if (!clients.has(ws)) {
            let user = await User.findOne({ username });
            const userId = user ? user.id : uuidv4();
            clients.set(ws, { username, id: userId });

            // Upsert user in DB and set status to online
            if (!user) {
              const newUser = new User({ id: userId, username, status: 'online' });
              await newUser.save();
            } else {
              user.status = 'online';
              await user.save();
            }

            // Broadcast status update
            broadcast(JSON.stringify({ type: 'status_update', userId, status: 'online' }));

            // System Log: User Joined
            const systemLogChannel = await Channel.findOne({ name: 'system-log' });
            if (systemLogChannel) {
              const joinMsg = {
                id: uuidv4(),
                channelId: systemLogChannel.id,
                userId: 'system',
                username: 'SYSTEM',
                content: `*** ${username} joined the network`,
                timestamp: new Date().toISOString(),
                isBot: true
              };

              const newMsg = new Message(joinMsg);
              await newMsg.save();

              broadcast(JSON.stringify({ type: 'message', message: joinMsg }));
            }
          }

          // Handle Slash Commands
          if (content.startsWith('/')) {
            const parts = content.slice(1).split(' ');
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            if (cmd === 'bot') {
              handleBotResponse(channelId, args.join(' '));
              return;
            }

            if (cmd === 'review') {
              handleBotResponse(channelId, args.join(' '), "You are a senior code reviewer. Analyze the provided code for bugs, security issues, and performance. Be critical but constructive.");
              return;
            }

            if (cmd === 'man') {
              handleBotResponse(channelId, `Explain the command or topic: ${args.join(' ')}`, "You are a Linux manual page generator. Provide a detailed explanation of the command or topic requested in the style of a man page.");
              return;
            }

            if (cmd === 'who') {
              const userList = Array.from(clients.values()).map(u => u.username).join(', ');
              ws.send(JSON.stringify({
                type: 'message',
                message: {
                  id: uuidv4(), channelId, userId: 'system', username: 'SYSTEM',
                  content: `Active nodes: [${userList}]`,
                  timestamp: new Date().toISOString(), isBot: true
                }
              }));
              return;
            }

            if (cmd === 'finger') {
              const target = args[0];
              const user = await User.findOne({ username: target });
              if (user) {
                // Send text message for terminal feel
                ws.send(JSON.stringify({
                  type: 'message',
                  message: {
                    id: uuidv4(), channelId, userId: 'system', username: 'SYSTEM',
                    content: `**USER PROFILE: ${user.username}**\n- **Access:** ${user.accessLevel}\n- **Joined:** ${user.joinDate}\n- **Bio:** ${user.bio || 'No bio set.'}`,
                    timestamp: new Date().toISOString(), isBot: true
                  }
                }));
                // Also send structured data for the UI modal
                ws.send(JSON.stringify({
                  type: 'user_profile',
                  user: user
                }));
              } else {
                ws.send(JSON.stringify({ type: 'error', message: `User ${target} not found in mainframe.` }));
              }
              return;
            }

            if (cmd === 'msg') {
              const target = args[0];
              const msgContent = args.slice(1).join(' ');
              const id = uuidv4();
              const timestamp = new Date().toISOString();

              const payload = JSON.stringify({
                type: 'message',
                message: { id, channelId, userId: clients.get(ws)?.id, username, content: `[PRIVATE] ${msgContent}`, timestamp, isPrivate: true, recipient: target }
              });

              sendToUser(target, payload);
              ws.send(payload); // Send to self too
              return;
            }

            if (cmd === 'sudo') {
              const user = await User.findOne({ username });
              if (user?.accessLevel !== 'Admin') {
                ws.send(JSON.stringify({ type: 'error', message: `${username} is not in the sudoers file. This incident will be reported.` }));
                return;
              }

              const subCmd = args[0]?.toLowerCase();
              if (subCmd === 'create-channel') {
                const name = args[1];
                const description = args.slice(2).join(' ');
                if (!name) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Usage: /sudo create-channel <name> <description>' }));
                  return;
                }
                const id = uuidv4();
                const newChannel = new Channel({ id, name, description });
                await newChannel.save();

                const channels = await Channel.find({});
                const users = await User.find({});
                broadcast(JSON.stringify({ type: 'init', channels, messages: [], users }));
                ws.send(JSON.stringify({ type: 'message', message: { id: uuidv4(), channelId, userId: 'system', username: 'SYSTEM', content: `Channel #${name} created successfully.`, timestamp: new Date().toISOString(), isBot: true } }));
                return;
              }

              if (subCmd === 'promote') {
                const target = args[1];
                if (!target) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Usage: /sudo promote <username>' }));
                  return;
                }
                const updatedUser = await User.findOneAndUpdate({ username: target }, { accessLevel: 'Admin' }, { new: true });
                if (updatedUser) {
                  broadcast(JSON.stringify({ type: 'user_profile', user: updatedUser }));
                  ws.send(JSON.stringify({ type: 'message', message: { id: uuidv4(), channelId, userId: 'system', username: 'SYSTEM', content: `${target} has been promoted to Admin.`, timestamp: new Date().toISOString(), isBot: true } }));
                }
                return;
              }

              ws.send(JSON.stringify({ type: 'message', message: { id: uuidv4(), channelId, userId: 'system', username: 'SYSTEM', content: `Admin command executed: ${args.join(' ')}`, timestamp: new Date().toISOString(), isBot: true } }));
              return;
            }
          }

          const id = uuidv4();
          const userId = clients.get(ws)?.id || uuidv4();
          const timestamp = new Date();

          const newMsg = new Message({
            id, channelId, userId, username, content, timestamp
          });
          await newMsg.save();

          broadcast(JSON.stringify({
            type: 'message',
            message: { id, channelId, userId, username, content, timestamp: timestamp.toISOString() }
          }));
        } else if (event.type === 'set_status') {
          const info = clients.get(ws);
          if (info) {
            await User.findOneAndUpdate({ id: info.id }, { status: event.status });
            broadcast(JSON.stringify({ type: 'status_update', userId: info.id, status: event.status }));
          }
        } else if (event.type === 'update_profile') {
          const info = clients.get(ws);
          if (info) {
            const updatedUser = await User.findOneAndUpdate({ id: info.id }, { bio: event.bio }, { new: true });
            if (updatedUser) {
              broadcast(JSON.stringify({ type: 'user_profile', user: updatedUser }));
            }
          }
        } else if (event.type === 'update_stream') {
          const info = clients.get(ws);
          if (info) {
            const user = await User.findOne({ id: info.id });
            if (user?.accessLevel === 'Admin') {
              const updatedChannel = await Channel.findOneAndUpdate(
                { id: event.channelId },
                { isLive: event.isLive, streamUrl: event.streamUrl },
                { new: true }
              );
              if (updatedChannel) {
                broadcast(JSON.stringify({
                  type: 'update_stream',
                  channelId: event.channelId,
                  isLive: event.isLive,
                  streamUrl: event.streamUrl
                }));
              }
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized: Admin access required to update stream.' }));
            }
          }
        } else if (event.type === 'typing') {
          broadcast(JSON.stringify({
            type: 'typing',
            channelId: event.channelId,
            username: event.username,
            isTyping: event.isTyping
          }));
        } else if (event.type === 'init') {
          const channels = await Channel.find({});
          const messages = await Message.find({ isPrivate: false }).sort({ timestamp: -1 }).limit(100).lean();
          const users = await User.find({});

          messages.reverse();
          const formattedMessages = messages.map(m => ({ ...m, timestamp: (m.timestamp as any).toISOString() }));

          ws.send(JSON.stringify({ type: 'init', channels, messages: formattedMessages, users }));
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', async () => {
      const info = clients.get(ws);
      if (info) {
        // Set status to offline
        await User.findOneAndUpdate({ id: info.id }, { status: 'offline' });
        broadcast(JSON.stringify({ type: 'status_update', userId: info.id, status: 'offline' }));

        const systemLogChannel = await Channel.findOne({ name: 'system-log' });
        if (systemLogChannel) {
          const leaveMsg = {
            id: uuidv4(),
            channelId: systemLogChannel.id,
            userId: 'system',
            username: 'SYSTEM',
            content: `*** ${info.username} quit`,
            timestamp: new Date().toISOString(),
            isBot: true
          };

          const newMsg = new Message(leaveMsg);
          await newMsg.save();

          broadcast(JSON.stringify({ type: 'message', message: leaveMsg }));
        }
      }
      clients.delete(ws);
      allSockets.delete(ws);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
