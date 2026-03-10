import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import {
  Hash,
  Users,
  Bot,
  ChevronRight,
  Github,
  User as UserIcon,
  MessageSquare,
  LogOut,
  X,
  Command,
  Menu
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Channel, Message, ServerEvent, TerminalTheme, User } from './types';
import { cn } from './lib/utils';

interface CommandDef {
  cmd: string;
  desc: string;
  args?: string;
}

const SLASH_COMMANDS: CommandDef[] = [
  { cmd: 'help', desc: 'Show this menu' },
  { cmd: 'clear', desc: 'Clear current channel buffer' },
  { cmd: 'whoami', desc: 'Display your current node info' },
  { cmd: 'list', desc: 'List all available channels' },
  { cmd: 'join', desc: 'Switch to a different channel', args: '<channel>' },
  { cmd: 'status', desc: 'Set your current status', args: '<online|away>' },
  { cmd: 'bio', desc: 'Update your bio', args: '<text>' },
  { cmd: 'profile', desc: 'View user profile modal', args: '<handle>' },
  { cmd: 'msg', desc: 'Private message', args: '<handle> <text>' },
  { cmd: 'bot', desc: 'Direct query to CS-Bot', args: '<query>' },
  { cmd: 'theme', desc: 'Toggle light/dark theme', args: '[light|dark]' },
  { cmd: 'stream', desc: 'Update channel livestream (Admin)', args: '<url|off>' },
];

interface NavContentProps {
  channels: Channel[];
  activeChannelId: string | null;
  activeDmUsername: string | null;
  setActiveChannelId: (id: string | null) => void;
  setActiveDmUsername: (username: string | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  activeDms: string[];
  users: User[];
  setProfileUser: (user: User | null) => void;
  setShowProfile: (show: boolean) => void;
  currentUser: User | null;
  username: string;
}

const NavContent = ({
  channels,
  activeChannelId,
  activeDmUsername,
  setActiveChannelId,
  setActiveDmUsername,
  setIsSidebarOpen,
  activeDms,
  users,
  setProfileUser,
  setShowProfile,
  currentUser,
  username
}: NavContentProps) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-terminal">
      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-[10px] font-bold text-terminal-green-dim uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-terminal-green-dim animate-pulse"></span>
            Directories
          </h2>
        </div>
        <nav className="space-y-1">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannelId(channel.id); setActiveDmUsername(null); setIsSidebarOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-[13px] transition-all flex items-center gap-3 font-mono group uppercase tracking-tighter",
                activeChannelId === channel.id && !activeDmUsername
                  ? "text-terminal-green bg-terminal-green-dark/30 border-l-2 border-terminal-green glow-text"
                  : "text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green-dark/10"
              )}
            >
              <Hash size={14} className={activeChannelId === channel.id && !activeDmUsername ? "text-terminal-green" : "text-terminal-green-dim opacity-50"} />
              <span>{channel.name}</span>
            </button>
          ))}
        </nav>
      </section>

      {activeDms.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-bold text-terminal-green-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-terminal-amber animate-pulse"></span>
              Secure Comms
            </h2>
          </div>
          <nav className="space-y-1">
            {activeDms.map(dmUser => (
              <button
                key={dmUser}
                onClick={() => { setActiveDmUsername(dmUser); setActiveChannelId(null); setIsSidebarOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[13px] transition-all flex items-center gap-3 font-mono group uppercase tracking-tighter",
                  activeDmUsername === dmUser
                    ? "text-terminal-amber bg-terminal-amber/10 border-l-2 border-terminal-amber glow-amber"
                    : "text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green-dark/10"
                )}
              >
                <UserIcon size={14} className={activeDmUsername === dmUser ? "text-terminal-amber" : "text-terminal-green-dim opacity-50"} />
                <span>{dmUser}</span>
              </button>
            ))}
          </nav>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-[10px] font-bold text-terminal-green-dim uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-terminal-green animate-pulse"></span>
            Active Nodes
          </h2>
          <span className="text-[10px] text-terminal-green-dim">[{users.filter(u => u.status !== 'offline').length}]</span>
        </div>
        <div className="space-y-1 overflow-y-auto pr-2">
          {users.filter(u => u.status !== 'offline').map(user => (
            <button
              key={user.id}
              onClick={() => { setProfileUser(user); setShowProfile(true); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green-dark/20 transition-all flex items-center gap-3 font-mono group"
            >
              <div className="relative shrink-0 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={`${user.username}'s avatar`} className="w-5 h-5 rounded-sm bg-terminal-green-dark object-cover border border-terminal-green-dim/30" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-sm bg-terminal-green-dark flex items-center justify-center text-terminal-green border border-terminal-green-dim/30">
                    <UserIcon size={10} />
                  </div>
                )}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                  user.status === 'online' ? "bg-terminal-green shadow-terminal-green" : "bg-terminal-green-dim opacity-50"
                )} />
              </div>
              <span className="truncate uppercase tracking-tighter">[{user.username}]</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 pt-6 border-t border-terminal-green-dim/20">
        <div className="px-2 py-3 bg-terminal-green-dark/10 border border-terminal-green-dim/20 rounded-sm">
          <div className="flex items-center gap-2 text-terminal-green mb-2">
            <Bot size={14} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">CS-Kernel V1.0</span>
          </div>
          <p className="text-[11px] text-terminal-green-dim leading-relaxed">
            SYSTEM STATUS: <span className="text-terminal-green">OPTIMAL</span><br />
            ENCRYPT: <span className="text-terminal-green">AES-256</span><br />
            NODE: <span className="text-terminal-green">KIRINYAGA-HUB</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const LivestreamPlayer = ({ url }: { url: string }) => {
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return null;

    // YouTube
    const ytMatch = rawUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1`;

    // Twitch
    const twitchMatch = rawUrl.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    if (twitchMatch) return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${window.location.hostname}&autoplay=true&muted=true`;

    return null;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full bg-zinc-900 border-b border-zinc-800 overflow-hidden relative group"
    >
      <div className="aspect-video w-full max-w-4xl mx-auto shadow-2xl relative">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media"
          title="Livestream Player"
        />
        <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1 bg-red-600 text-[10px] font-bold text-white rounded uppercase tracking-wider animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
          Live
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmUsername, setActiveDmUsername] = useState<string | null>(null);
  const [termTheme, setTermTheme] = useState<TerminalTheme>('green');
  const [booting, setBooting] = useState(true);
  const [username, setUsername] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Slash Command Menu State
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    // Initial boot sequence
    const timer = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', termTheme);
  }, [termTheme]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const user = event.data.user;
        setCurrentUser(user);
        setUsername(user.username);
        setIsLoggedIn(true);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleGithubLogin = async () => {
    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/auth/github/url`);
      const { url } = await response.json();
      window.open(url, 'github_oauth', 'width=600,height=700');
    } catch (err) {
      console.error('Github login error:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const wsBaseUrl = (import.meta.env.VITE_WS_BASE_URL || '').replace(/\/+$/, '');
      let socket: WebSocket;

      if (wsBaseUrl) {
        socket = new WebSocket(`${wsBaseUrl}/ws`);
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      }

      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };
      socket.onclose = () => setIsConnected(false);
      socket.onmessage = (event) => {
        const data: ServerEvent = JSON.parse(event.data);
        if (data.type === 'init') {
          setChannels(data.channels);
          setUsers(data.users);
          const initialChannelId = data.channels.length > 0 ? data.channels[0].id : null;

          setMessages(data.messages);
          if (initialChannelId) setActiveChannelId(initialChannelId);
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'error') {
          const errMsg: Message = {
            id: 'err-' + Date.now(),
            channelId: activeChannelId || 'initial',
            userId: 'system',
            username: 'SYSTEM',
            content: `Error: ${data.message}`,
            timestamp: new Date().toISOString(),
            isBot: true
          };
          setMessages(prev => [...prev, errMsg]);
        } else if (data.type === 'user_profile') {
          setProfileUser(data.user);
          setShowProfile(true);
          setUsers(prev => prev.map(u => u.id === data.user.id ? data.user : u));
          if (currentUser && currentUser.id === data.user.id) {
            setCurrentUser(data.user);
          }
        } else if (data.type === 'status_update') {
          setUsers(prev => prev.map(u => u.id === data.userId ? { ...u, status: data.status } : u));
          if (currentUser && currentUser.id === data.userId) {
            setCurrentUser(prev => prev ? { ...prev, status: data.status } : null);
          }
          if (profileUser && profileUser.id === data.userId) {
            setProfileUser(prev => prev ? { ...prev, status: data.status } : null);
          }
        } else if (data.type === 'typing') {
          setTypingUsers(prev => {
            const channelTyping = new Set(prev[data.channelId] || []);
            if (data.isTyping) {
              if (data.username !== username) channelTyping.add(data.username);
            } else {
              channelTyping.delete(data.username);
            }
            return { ...prev, [data.channelId]: channelTyping };
          });
        } else if (data.type === 'update_stream') {
          setChannels(prev => prev.map(c =>
            c.id === data.channelId
              ? { ...c, isLive: data.isLive, streamUrl: data.streamUrl }
              : c
          ));
        }
      };

      return () => socket.close();
    }
  }, [isLoggedIn, username]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChannelId, typingUsers]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Manual login disabled. GitHub Auth enforced.
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChannelId || !socketRef.current) return;

    if (inputMessage.startsWith('/')) {
      const parts = inputMessage.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'clear') {
        setMessages(prev => prev.filter(m => m.channelId !== activeChannelId));
        setInputMessage('');
        return;
      }
      if (cmd === 'theme') {
        const theme = args[0]?.toLowerCase();
        if (theme === 'green' || theme === 'amber') {
          setTermTheme(theme as TerminalTheme);
          setMessages(prev => [...prev, { id: uuidv4(), channelId: activeChannelId || 'system', userId: 'system', username: 'SYSTEM', content: `Terminal theme updated to: ${theme.toUpperCase()}`, timestamp: new Date().toISOString(), isBot: true }]);
        } else {
          setMessages(prev => [...prev, { id: uuidv4(), channelId: activeChannelId || 'system', userId: 'system', username: 'SYSTEM', content: `Usage: /theme <green|amber>`, timestamp: new Date().toISOString(), isBot: true }]);
        }
        setInputMessage('');
        return;
      }
      if (cmd === 'profile') {
        const target = args[0] || username;
        socketRef.current.send(JSON.stringify({
          type: 'send_message',
          channelId: activeChannelId,
          content: `/finger ${target}`,
          username
        }));
        setInputMessage('');
        return;
      }
      if (cmd === 'bio') {
        const newBio = args.join(' ');
        if (!newBio) {
          setMessages(prev => [...prev, {
            id: uuidv4(), channelId: activeChannelId, userId: 'system', username: 'SYSTEM',
            content: `Usage: /bio <your new bio content>`,
            timestamp: new Date().toISOString(), isBot: true
          }]);
        } else {
          socketRef.current.send(JSON.stringify({
            type: 'update_profile',
            bio: newBio
          }));
        }
        setInputMessage('');
        return;
      }
      if (cmd === 'status') {
        const newStatus = args[0] as 'online' | 'away';
        if (['online', 'away'].includes(newStatus)) {
          socketRef.current.send(JSON.stringify({
            type: 'set_status',
            status: newStatus
          }));
        }
        setInputMessage('');
        return;
      }
      if (cmd === 'join') {
        const targetChannel = channels.find(c => c.name.toLowerCase() === args[0]?.toLowerCase());
        if (targetChannel) {
          setActiveChannelId(targetChannel.id);
        } else {
          setMessages(prev => [...prev, { id: uuidv4(), channelId: activeChannelId, userId: 'system', username: 'SYSTEM', content: `Channel #${args[0]} not found.`, timestamp: new Date().toISOString(), isBot: true }]);
        }
        setInputMessage('');
        return;
      }
      if (cmd === 'list') {
        const channelList = channels.map(c => `- #${c.name}: ${c.description}`).join('\n');
        setMessages(prev => [...prev, {
          id: uuidv4(),
          channelId: activeChannelId,
          userId: 'system',
          username: 'SYSTEM',
          content: `**AVAILABLE CHANNELS:**\n${channelList}`,
          timestamp: new Date().toISOString(),
          isBot: true
        }]);
        setInputMessage('');
        return;
      }
      if (cmd === 'whoami') {
        setProfileUser(currentUser);
        setShowProfile(true);
        setInputMessage('');
        return;
      }
      if (cmd === 'stream') {
        if (currentUser?.accessLevel !== 'Admin') {
          setMessages(prev => [...prev, {
            id: uuidv4(),
            channelId: activeChannelId || 'system',
            userId: 'system',
            username: 'SYSTEM',
            content: 'Permission denied: Administrators only.',
            timestamp: new Date().toISOString(),
            isBot: true
          }]);
          setInputMessage('');
          return;
        }
        const url = args[0];
        const isLive = !!url && url.toLowerCase() !== 'off';
        socketRef.current?.send(JSON.stringify({
          type: 'update_stream',
          channelId: activeChannelId,
          isLive,
          streamUrl: isLive ? url : ''
        }));
        setInputMessage('');
        return;
      }
      if (cmd === 'help') {
        const helpMsg: Message = {
          id: 'help-' + Date.now(),
          channelId: activeChannelId,
          userId: 'system',
          username: 'SYSTEM',
          content: `**AVAILABLE COMMANDS:**\n- \`/help\`: Show this menu\n- \`/clear\`: Clear current channel buffer\n- \`/who\`: List active users\n- \`/list\`: List all available channels\n- \`/join <channel>\`: Switch to a different channel\n- \`/status <online|away>\`: Set your current status\n- \`/bio <text>\`: Update your bio\n- \`/profile <handle>\`: View user profile modal\n- \`/msg <handle> <text>\`: Private message\n- \`/bot <query>\`: Direct query to CS-Bot\n- \`/whoami\`: Display your current node info\n- \`/stream <url|off>\`: Update channel livestream (Admin only)`,
          timestamp: new Date().toISOString(),
          isBot: true
        };
        setMessages(prev => [...prev, helpMsg]);
        setInputMessage('');
        return;
      }
    }

    setCommandHistory(prev => [inputMessage, ...prev].slice(0, 50));
    setHistoryIndex(-1);

    if (activeDmUsername) {
      socketRef.current.send(JSON.stringify({
        type: 'send_message',
        channelId: activeChannelId || 'dm',
        content: `/msg ${activeDmUsername} ${inputMessage}`,
        username
      }));
    } else {
      socketRef.current.send(JSON.stringify({
        type: 'send_message',
        channelId: activeChannelId,
        content: inputMessage,
        username
      }));
    }
    setInputMessage('');
    sendTypingStatus(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandMenu) {
      const filteredCommands = SLASH_COMMANDS.filter(c => c.cmd.startsWith(commandFilter));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredCommands[selectedCommandIndex]) {
          const selected = filteredCommands[selectedCommandIndex];
          setInputMessage(`/${selected.cmd} `);
          setShowCommandMenu(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowCommandMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    } else if (e.key === 'ArrowUp' && !showCommandMenu) {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setInputMessage(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInputMessage(commandHistory[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInputMessage('');
      }
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!socketRef.current || !activeChannelId) return;
    socketRef.current.send(JSON.stringify({
      type: 'typing',
      channelId: activeChannelId,
      username,
      isTyping
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    // Check for slash commands
    if (val === '/') {
      setShowCommandMenu(true);
      setCommandFilter('');
      setSelectedCommandIndex(0);
    } else if (val.startsWith('/') && !val.includes(' ')) {
      setShowCommandMenu(true);
      setCommandFilter(val.slice(1).toLowerCase());
      setSelectedCommandIndex(0);
    } else {
      setShowCommandMenu(false);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingStatus(true);
    typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 2000);
  };

  const userMap = React.useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach(u => {
      map[u.username] = u;
    });
    return map;
  }, [users]);

  const activeDms = React.useMemo(() => {
    if (!username) return [];
    const dmSet = new Set<string>();
    messages.forEach(m => {
      if (m.isPrivate) {
        if (m.username === username && m.recipient) dmSet.add(m.recipient);
        if (m.recipient === username) dmSet.add(m.username);
      }
    });
    return Array.from(dmSet);
  }, [messages, username]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4 font-sans text-zinc-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-950 border border-zinc-800 shadow-xl rounded-xl overflow-hidden"
        >
          <div className="p-8 text-center border-b border-terminal-green-dim/20">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 relative group">
              <div className="absolute inset-0 bg-terminal-green/20 rounded-full blur-xl group-hover:bg-terminal-green/30 transition-all"></div>
              <img
                src="/icons/android-chrome-192x192.png"
                alt="Kirinyaga CS Logo"
                className="w-16 h-16 relative z-10 drop-shadow-terminal-avatar grayscale brightness-110 contrast-125"
              />
            </div>
            <h1 className="text-2xl font-black text-terminal-green mb-2 glow-text uppercase tracking-tighter">Kirinyaga CS</h1>
            <p className="text-terminal-green-dim text-[11px] uppercase tracking-[0.2em] opacity-60">Join the community node network</p>
          </div>
          <div className="p-8 pb-10">
            <button
              onClick={handleGithubLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-400 rounded-lg text-white font-medium transition-colors shadow-sm"
            >
              <Github size={18} />
              <span>Connect with GitHub</span>
            </button>
            <p className="text-xs text-zinc-500 text-center mt-4">
              Kirinyaga CS requires a GitHub account to participate.
            </p>
          </div>
        </motion.div >
      </div >
    );
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const filteredMessages = messages.filter(m => {
    if (activeDmUsername) {
      return m.isPrivate && (
        (m.username === activeDmUsername && m.recipient === username) ||
        (m.username === username && m.recipient === activeDmUsername)
      );
    }
    return !m.isPrivate && m.channelId === activeChannelId;
  });
  const currentTyping = Array.from(typingUsers[activeChannelId || ''] || []);

  return (
    <div className={cn(
      "fixed inset-0 bg-terminal-bg font-mono overflow-hidden transition-colors duration-700",
      booting ? "scale-y-0 opacity-0" : "scale-y-100 opacity-100 animate-turn-on"
    )}>
      {/* CRT Overlays */}
      <div className="pointer-events-none fixed inset-0 z-[100] scanlines opacity-[0.03]"></div>
      <div className="pointer-events-none fixed inset-0 z-[101] flicker opacity-[0.02]"></div>
      <div className="pointer-events-none fixed inset-0 z-[102] vignette opacity-50"></div>

      <div className="flex h-full relative z-10">
        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-terminal-bg/80 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 z-50 w-72 border-r border-terminal-green-dim/20 bg-terminal-bg flex flex-col pt-1 shadow-terminal-side md:hidden"
              >
                <div className="p-6 flex items-center gap-4 border-b border-terminal-green-dim/20 bg-terminal-green-dark/5">
                  <div className="w-10 h-10 rounded-sm bg-terminal-green-dark border border-terminal-green flex items-center justify-center shrink-0 shadow-terminal overflow-hidden">
                    <img src="/icons/android-chrome-192x192.png" alt="Logo" className="w-7 h-7 grayscale" />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm text-terminal-green leading-none tracking-tighter uppercase glow-text">Kirinyaga CS</h1>
                    <span className="text-[10px] text-terminal-green-dim font-mono uppercase tracking-[0.2em] mt-1 block opacity-60">Mobile.Node</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <NavContent
                    channels={channels}
                    activeChannelId={activeChannelId}
                    activeDmUsername={activeDmUsername}
                    setActiveChannelId={setActiveChannelId}
                    setActiveDmUsername={setActiveDmUsername}
                    setIsSidebarOpen={setIsSidebarOpen}
                    activeDms={activeDms}
                    users={users}
                    setProfileUser={setProfileUser}
                    setShowProfile={setShowProfile}
                    currentUser={currentUser}
                    username={username}
                  />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 border-r border-terminal-green-dim/20 bg-terminal-bg flex-col pt-1">
          <div className="p-6 flex items-center gap-4 border-b border-terminal-green-dim/20 bg-terminal-green-dark/5">
            <div className="w-10 h-10 rounded-sm bg-terminal-green-dark border border-terminal-green flex items-center justify-center shrink-0 shadow-terminal animate-pulse overflow-hidden">
              <img src="/icons/android-chrome-192x192.png" alt="Logo" className="w-7 h-7 grayscale" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-terminal-green leading-none tracking-tighter uppercase glow-text">Kirinyaga CS</h1>
              <span className="text-[10px] text-terminal-green-dim font-mono uppercase tracking-[0.2em] mt-1 block opacity-60">Terminal.Core</span>
            </div>
          </div>

          <NavContent
            channels={channels}
            activeChannelId={activeChannelId}
            activeDmUsername={activeDmUsername}
            setActiveChannelId={setActiveChannelId}
            setActiveDmUsername={setActiveDmUsername}
            setIsSidebarOpen={setIsSidebarOpen}
            activeDms={activeDms}
            users={users}
            setProfileUser={setProfileUser}
            setShowProfile={setShowProfile}
            currentUser={currentUser}
            username={username}
          />

          <div className="p-4 border-t border-terminal-green-dim/20 bg-terminal-bg/50">
            <button
              onClick={() => { setProfileUser(currentUser); setShowProfile(true); }}
              className="w-full flex items-center gap-3 p-2 hover:bg-terminal-green-dark/20 rounded-sm transition-colors group border border-transparent hover:border-terminal-green-dim/10"
            >
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="My avatar" className="w-8 h-8 rounded-sm border border-terminal-green-dim/30 object-cover grayscale" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-sm bg-terminal-green-dark/40 flex items-center justify-center text-terminal-green border border-terminal-green-dim/30">
                  <UserIcon size={16} />
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-terminal-green leading-tight group-hover:glow-text transition-all uppercase tracking-tighter">{username}</p>
                <p className="text-[9px] text-terminal-green-dim uppercase tracking-[0.2em] opacity-60">Status: NODE_ACTIVE</p>
              </div>
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-terminal-bg">
          <header className="h-16 border-b border-terminal-green-dim/20 flex items-center px-4 md:px-6 bg-terminal-bg/80 backdrop-blur shrink-0 z-10 w-full relative">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  className="md:hidden p-1.5 -ml-1.5 rounded-sm hover:bg-terminal-green-dark/20 text-terminal-green-dim transition-colors border border-transparent hover:border-terminal-green-dim/20"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={20} />
                </button>
                {activeDmUsername ? (
                  <UserIcon size={20} className="text-terminal-green-dim" />
                ) : (
                  <Hash size={20} className="text-terminal-green-dim" />
                )}
                <div>
                  <h2 className="text-[14px] font-black text-terminal-green leading-none glow-text uppercase tracking-tighter">
                    {activeDmUsername ? `&lt;${activeDmUsername}&gt;` : (activeChannel?.name || 'INITIALIZING...')}
                  </h2>
                  <p className="text-[10px] text-terminal-green-dim font-mono uppercase tracking-[0.2em] mt-1 opacity-60">
                    {activeDmUsername ? 'SECURE_DM_LINK' : (activeChannel?.description || 'NODE_HANDSHAKE_PENDING...')}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5 scrollbar-terminal overflow-x-hidden bg-terminal-bg"
          >
            {activeChannel?.isLive && activeChannel.streamUrl && !activeDmUsername && (
              <LivestreamPlayer url={activeChannel.streamUrl} />
            )}
            <AnimatePresence initial={false}>
              {filteredMessages.map((msg, idx) => {
                const isSystemMsg = msg.userId === 'system';

                if (isSystemMsg) {
                  return (
                    <motion.article
                      key={msg.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="py-1 flex items-center gap-3 group px-4 border-l-2 border-transparent hover:border-terminal-green-dim/30"
                    >
                      <span className="text-[10px] text-terminal-green-dim font-mono w-14 shrink-0 mt-0.5 hidden group-hover:inline-block opacity-50 font-bold uppercase">
                        SYS://
                      </span>
                      <div className="text-[13px] text-terminal-green-dim font-medium break-words flex-1 markdown-body font-mono uppercase tracking-tight">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </motion.article>
                  );
                }

                return (
                  <motion.article
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 hover:bg-terminal-green-dark/10 py-1.5 px-4 rounded-sm group transition-all border border-transparent hover:border-terminal-green-dim/20"
                  >
                    <span className="text-[10px] text-terminal-green-dim font-mono w-12 shrink-0 pt-1 text-right opacity-30 group-hover:opacity-100 transition-opacity font-bold">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>

                    <div className="flex-1 min-w-0 flex items-start gap-2 pt-0.5">
                      <span className="font-bold text-[14px] text-terminal-green shrink-0 whitespace-nowrap cursor-pointer hover:underline uppercase tracking-tighter" onClick={() => {
                        socketRef.current?.send(JSON.stringify({
                          type: 'send_message',
                          channelId: activeChannelId,
                          content: `/finger ${msg.username}`,
                          username
                        }));
                      }}>
                        &lt;{msg.username}&gt;
                      </span>
                      <div className="text-[14px] text-terminal-green/90 leading-relaxed font-mono min-w-0 markdown-body break-words uppercase tracking-tight">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {currentTyping.length > 0 && (
              <div className="text-[10px] text-terminal-green-dim px-20 italic font-mono uppercase tracking-widest animate-pulse">
                &gt;&gt; {currentTyping.join(', ')} is transmitting...
              </div>
            )}
          </div>

          <footer className="p-4 px-6 bg-terminal-bg border-t border-terminal-green-dim/20 relative">
            <AnimatePresence>
              {showCommandMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full left-6 right-6 mb-4 bg-terminal-bg border border-terminal-green-dim shadow-terminal-glow overflow-hidden z-50 p-1 font-mono"
                >
                  <div className="px-4 py-2 border-b border-terminal-green-dim/30 flex items-center gap-2">
                    <Command size={14} className="text-terminal-green" />
                    <span className="text-[10px] font-bold text-terminal-green uppercase tracking-[0.2em]">Kernel Commands</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1 scrollbar-terminal">
                    {SLASH_COMMANDS.filter(c => c.cmd.startsWith(commandFilter)).length === 0 ? (
                      <div className="p-4 text-xs text-terminal-green-dim text-center uppercase">0 match strings found.</div>
                    ) : (
                      SLASH_COMMANDS.filter(c => c.cmd.startsWith(commandFilter)).map((cmd, i) => (
                        <div
                          key={cmd.cmd}
                          className={cn(
                            "px-4 py-2 text-[12px] flex items-center justify-between cursor-pointer transition-all uppercase tracking-tighter",
                            i === selectedCommandIndex ? "bg-terminal-green-dark/30 text-terminal-green glow-text" : "text-terminal-green-dim hover:bg-terminal-green-dark/10"
                          )}
                          onClick={() => {
                            setInputMessage(`/${cmd.cmd} `);
                            setShowCommandMenu(false);
                            document.querySelector('textarea')?.focus();
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold">/{cmd.cmd}</span>
                            {cmd.args && <span className="opacity-40 text-[10px]">&lt;{cmd.args}&gt;</span>}
                          </div>
                          <span className="text-[10px] opacity-60 tracking-wider">:: {cmd.desc}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <form
              onSubmit={handleSendMessage}
              className="flex items-end gap-3"
            >
              <div className="flex-1 relative bg-terminal-green-dark/5 border border-terminal-green-dim/30 rounded-sm focus-within:border-terminal-green transition-all flex items-end shadow-terminal-inner">
                <div className="pl-4 pb-3 text-terminal-green animate-pulse">
                  <ChevronRight size={18} />
                </div>
                <textarea
                  rows={1}
                  placeholder={activeDmUsername ? `SECURE_MSG @${activeDmUsername}...` : `BROADCAST_MSG #${activeChannel?.name || 'ROOT'}...`}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none outline-none py-3 px-3 text-[14px] text-terminal-green placeholder:text-terminal-green-dark resize-none min-h-[48px] max-h-[200px] font-mono uppercase tracking-tight"
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || !isConnected}
                className={cn(
                  "h-[48px] px-6 rounded-sm font-bold text-[12px] uppercase tracking-widest transition-all shadow-lg shrink-0",
                  inputMessage.trim() && isConnected
                    ? "bg-terminal-green text-terminal-bg hover:brightness-110 active:scale-95"
                    : "bg-terminal-green-dark/20 text-terminal-green-dim border border-terminal-green-dim/20 cursor-not-allowed"
                )}
              >
                EXEC
              </button>
            </form>
            <div className="flex justify-between items-center mt-3 px-1 font-mono">
              <div className="text-[10px] text-terminal-green-dim uppercase tracking-widest opacity-60">
                <span className="font-bold text-terminal-green">PROTOCAL:</span> SSH_V2 // <span className="font-bold text-terminal-green">NODE:</span> {activeChannelId?.slice(0, 8) || 'SYSTEM'}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-terminal-green-dim uppercase tracking-widest">
                {isConnected ? (
                  <><span className="w-1.5 h-1.5 bg-terminal-green shadow-terminal-green anim-blink"></span> LINK_ESTABLISHED</>
                ) : (
                  <><span className="w-1.5 h-1.5 bg-red-600 shadow-[0_0_5px_#ff0000] anim-blink"></span> LINK_LOST</>
                )}
              </div>
            </div>
          </footer>
        </main>

        {/* User Profile Modal */}
        <AnimatePresence>
          {
            showProfile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="w-full max-w-sm bg-terminal-bg border-2 border-terminal-green-dim shadow-terminal-heavy overflow-hidden font-mono"
                >
                  <div className="flex justify-between items-center p-4 border-b border-terminal-green-dim/30 bg-terminal-green-dark/10">
                    <span className="text-[10px] font-bold text-terminal-green uppercase tracking-[0.3em]">Node_Protocol_v3.1</span>
                    <button onClick={() => setShowProfile(false)} className="text-terminal-green-dim hover:text-terminal-green bg-terminal-green-dark/20 p-1.5 rounded-sm transition-all border border-terminal-green-dim/20">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-8 flex flex-col items-center">
                    <div className="relative mb-6">
                      {profileUser?.avatarUrl ? (
                        <img src={profileUser.avatarUrl} alt={`${profileUser.username}'s avatar`} className="w-32 h-32 rounded-sm border-2 border-terminal-green shadow-terminal-avatar object-cover grayscale brightness-110" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-32 h-32 rounded-sm bg-terminal-green-dark flex items-center justify-center text-terminal-green border-2 border-terminal-green shadow-terminal-avatar">
                          <UserIcon size={64} />
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-terminal-bg border border-terminal-green text-terminal-green text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">
                        {profileUser?.accessLevel || 'GUEST'}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-terminal-green leading-none glow-text uppercase tracking-tighter">[{profileUser?.username}]</h3>

                    <div className="flex items-center gap-3 mt-4">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full anim-blink",
                        profileUser?.status === 'online' ? "bg-terminal-green shadow-terminal-green" :
                          profileUser?.status === 'away' ? "bg-terminal-amber shadow-terminal-amber" : "bg-terminal-green-dark"
                      )} />
                      <span className="text-xs text-terminal-green font-bold uppercase tracking-widest">{profileUser?.status || 'Offline'}</span>
                    </div>

                    <div className="w-full mt-8 space-y-3">
                      <div className="bg-terminal-green-dark/20 border border-terminal-green-dim/30 p-4 text-[12px] text-terminal-green/80 italic text-center uppercase tracking-tight leading-relaxed">
                        "{profileUser?.bio || 'No transmission data set.'}"
                      </div>

                      <div className="flex items-center justify-between text-[11px] py-1 border-b border-terminal-green-dim/10 uppercase tracking-widest text-terminal-green-dim">
                        <span>Sync Date</span>
                        <span className="text-terminal-green font-bold">{profileUser?.joinDate ? new Date(profileUser.joinDate).toLocaleDateString() : 'UNKNOWN'}</span>
                      </div>

                      {profileUser?.githubId && (
                        <div className="pt-4 flex justify-center w-full">
                          <a
                            href={`https://github.com/${profileUser.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-terminal-green text-terminal-bg hover:bg-terminal-green-dim rounded-sm text-[11px] font-black w-full justify-center transition-all uppercase tracking-[0.2em]"
                          >
                            <Github size={16} />
                            External Source
                          </a>
                        </div>
                      )}

                      {currentUser?.id === profileUser?.id && (
                        <div className="pt-2 flex justify-center w-full">
                          <button
                            onClick={() => {
                              setIsLoggedIn(false);
                              setShowProfile(false);
                            }}
                            className="flex items-center gap-3 text-red-600 hover:bg-red-950/20 border border-transparent hover:border-red-900/40 px-4 py-2 rounded-sm text-[11px] font-black w-full justify-center transition-all uppercase tracking-[0.1em]"
                          >
                            <LogOut size={16} />
                            Eject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
