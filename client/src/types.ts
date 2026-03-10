export type TerminalTheme = 'green' | 'amber' | 'matrix' | 'white';

export interface User {
  id: string;
  username: string;
  githubId?: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
  joinDate: string;
  accessLevel: 'Member' | 'Admin';
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  isLive?: boolean;
  streamUrl?: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  isBot?: boolean;
  isPrivate?: boolean;
  recipient?: string;
  type?: 'text' | 'system' | 'file' | 'paste';
}

export type ServerEvent =
  | { type: 'init'; channels: Channel[]; messages: Message[]; users: User[] }
  | { type: 'message'; message: Message }
  | { type: 'user_joined'; user: User }
  | { type: 'user_left'; userId: string }
  | { type: 'typing'; channelId: string; username: string; isTyping: boolean }
  | { type: 'theme_change'; theme: TerminalTheme }
  | { type: 'user_profile'; user: User }
  | { type: 'status_update'; userId: string; status: 'online' | 'offline' | 'away' }
  | { type: 'update_stream'; channelId: string; isLive: boolean; streamUrl?: string }
  | { type: 'error'; message: string };

export type ClientEvent =
  | { type: 'send_message'; channelId: string; content: string; username: string; recipient?: string }
  | { type: 'typing'; channelId: string; username: string; isTyping: boolean }
  | { type: 'set_status'; status: 'online' | 'away' }
  | { type: 'update_stream'; channelId: string; isLive: boolean; streamUrl?: string }
  | { type: 'update_profile'; bio: string };
