export interface User {
  id: string;
  name: string;
  avatar: string;
  isCurrentUser: boolean;
  lastSeen?: number; // Timestamp of last activity
  classCode: string; // The room/group ID
  targetDaysPerWeek: number; // User's personal goal (1-7)
}

export type StatusType = 'GOING' | 'NOT_GOING' | 'UNDECIDED';

export interface DailyStatus {
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  status: StatusType;
  note?: string;
  timestamp: number;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  percentage: number;
  targetPercentage: number;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  text: string;
  timestamp: number;
  // New Chat Features
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
  readBy?: string[]; // array of userIds
}

export interface TypingStatus {
  userId: string;
  userName: string;
  timestamp: number;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  STATS = 'STATS',
  ADVISOR = 'ADVISOR',
  DISCUSS = 'DISCUSS'
}