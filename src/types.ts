export type Role = 'USER' | 'ADMIN' | 'CURATOR' | 'OWNER';

export interface User {
  id: string;
  email: string;
  username: string;
  nickname: string;
  avatar?: string;
  role: Role;
  banStatus: 'NONE' | 'WARNED' | 'BANNED';
  warnCount: number;
  channel?: Channel;
  stats?: UserStats;
}

export interface Channel {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
}

export interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'voice' | 'file';
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
}

export interface UserStats {
  dialogsCount: number;
  messagesSent: number;
  averageRating: number;
  completionRate: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}
