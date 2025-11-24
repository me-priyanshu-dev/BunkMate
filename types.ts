
export interface User {
  id: string;
  name: string;
  avatar: string;
  isCurrentUser: boolean;
  lastSeen?: number; // Timestamp of last activity
  classCode: string; // The room/group ID
  targetDaysPerWeek: number; // User's personal goal (1-7)
  examName?: string;
  examDate?: string; // YYYY-MM-DD
  theme?: 'blue' | 'purple' | 'emerald';
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

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of userIds
}

export interface Poll {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  text: string; // can be empty if it's just a poll
  timestamp: number;
  // New Chat Features
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
  readBy?: string[]; // array of userIds
  poll?: Poll;
}

export interface TypingStatus {
  userId: string;
  userName: string;
  timestamp: number;
}

export type EventType = 'CRITICAL' | 'IMPORTANT' | 'INFO' | 'FUN';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  createdBy: string; // userName
  timestamp: number;
}

export interface MindMapNode {
  id: string;
  label: string;
  emoji?: string;
  children?: MindMapNode[];
  color?: string; // Hex color for the branch
}

export type QuestionType = 'FILL_BLANK' | 'MCQ' | 'SUBJECTIVE';

export interface StudyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For MCQ
  answer: string; // The correct answer (string for fill/subjective, index/text for MCQ)
  explanation?: string;
}

export interface StudyNoteSection {
  title: string;
  content: string;
  visualKeywords: string; // For AI image generation
  questions?: StudyQuestion[]; // Interactive questions for this section
}

export interface StudyNote {
  topic: string;
  summary: string;
  sections: StudyNoteSection[];
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  STUDY = 'STUDY', // Replaces AGENDA
  STATS = 'STATS',
  ADVISOR = 'ADVISOR',
  DISCUSS = 'DISCUSS',
  PROFILE = 'PROFILE',
  FEEDBACK = 'FEEDBACK'
}