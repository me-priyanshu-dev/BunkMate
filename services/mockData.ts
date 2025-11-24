import { User, DailyStatus, StatusType, Message } from '../types';

// Fixed: Use Local Time instead of UTC to avoid timezone issues
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateWithOffset = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[d.getDay()];
  
  let label = dayName;
  if (offset === 0) label = 'Today';
  else if (offset === 1) label = 'Tomorrow';
  else if (offset === 2) label = dayName; // e.g. "Mon"
  
  return { 
    dateStr, 
    label, 
    fullDisplay: `${label}, ${dayName} ${day}` 
  };
};

// --- In-Memory Cache to prevent UI flickering/Lag ---
let usersCache: User[] | null = null;
let statusesCache: DailyStatus[] | null = null;
let messagesCache: Message[] | null = null;

// --- User Management ---

export const getAllUsers = (): User[] => {
  if (usersCache) return usersCache;
  const usersJson = localStorage.getItem('bunkmate_users');
  usersCache = usersJson ? JSON.parse(usersJson) : [];
  return usersCache!;
};

export const getCurrentUser = (): User | null => {
  const sessionUser = sessionStorage.getItem('bunkmate_active_user');
  if (sessionUser) return JSON.parse(sessionUser);
  return null;
};

export const checkNameExists = (name: string, classCode: string): boolean => {
  const users = getAllUsers();
  return users.some(u => 
    u.name.toLowerCase() === name.toLowerCase() && 
    u.classCode === classCode
  );
};

export const registerUser = (name: string, classCode: string, targetDays: number): User => {
  const users = getAllUsers();
  
  // Clean up class code
  const code = classCode.toUpperCase().trim();

  // Generate a unique ID
  const userId = 'u_' + Date.now() + Math.floor(Math.random() * 10000);

  // Generate unique avatar using name + ID + random salt
  const avatarSeed = `${name}_${userId}_${Math.random()}`;

  const newUser: User = {
    id: userId,
    name: name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
    isCurrentUser: true,
    lastSeen: Date.now(),
    classCode: code,
    targetDaysPerWeek: targetDays
  };

  const updatedUsers = [...users, newUser];
  
  // Update Cache and Storage
  usersCache = updatedUsers;
  localStorage.setItem('bunkmate_users', JSON.stringify(updatedUsers));
  sessionStorage.setItem('bunkmate_active_user', JSON.stringify(newUser));
  
  return newUser;
};

export const loginUser = (user: User): User => {
  sessionStorage.setItem('bunkmate_active_user', JSON.stringify(user));
  return user;
};

export const logoutUser = () => {
  sessionStorage.removeItem('bunkmate_active_user');
  // Clear cache to ensure fresh start on re-login
  usersCache = null;
  statusesCache = null;
  messagesCache = null;
};

// Merges a remote user into our local view (cache)
export const upsertRemoteUser = (remoteUser: Partial<User>) => {
  const users = getAllUsers();
  const existingIndex = users.findIndex(u => u.id === remoteUser.id);
  let updatedUsers = [...users];

  if (existingIndex >= 0) {
    // Update existing user but preserve isCurrentUser flag
    const isMe = users[existingIndex].isCurrentUser;
    const existingTarget = users[existingIndex].targetDaysPerWeek || 4; 
    
    updatedUsers[existingIndex] = { 
      ...users[existingIndex], 
      ...remoteUser, 
      isCurrentUser: isMe,
      targetDaysPerWeek: remoteUser.targetDaysPerWeek || existingTarget
    };
  } else {
    // Add new remote user
    updatedUsers.push({
      id: remoteUser.id!,
      name: remoteUser.name || 'Unknown',
      avatar: remoteUser.avatar || '',
      classCode: remoteUser.classCode || '',
      isCurrentUser: false,
      lastSeen: remoteUser.lastSeen,
      targetDaysPerWeek: remoteUser.targetDaysPerWeek || 4
    });
  }
  
  usersCache = updatedUsers;
  localStorage.setItem('bunkmate_users', JSON.stringify(updatedUsers));
  return updatedUsers;
};

export const getUsersForDisplay = (currentUserId: string, classCode: string): User[] => {
  const users = getAllUsers();
  return users
    .filter(u => u.classCode === classCode)
    .map(u => ({
      ...u,
      isCurrentUser: u.id === currentUserId
    }));
};

// --- Status Management ---

export const getStatuses = (): DailyStatus[] => {
  if (statusesCache) return statusesCache;
  const data = localStorage.getItem('bunkmate_statuses');
  statusesCache = data ? JSON.parse(data) : [];
  return statusesCache!;
};

export const saveStatus = (userId: string, status: StatusType, date: string = getTodayDateString()) => {
  const statuses = getStatuses();
  const existingIndex = statuses.findIndex(s => s.userId === userId && s.date === date);
  
  const timestamp = Date.now();
  const newStatusObj = { userId, date, status, timestamp };
  let updatedStatuses = [...statuses];

  if (existingIndex >= 0) {
    updatedStatuses[existingIndex] = newStatusObj;
  } else {
    updatedStatuses.push(newStatusObj);
  }
  
  statusesCache = updatedStatuses;
  localStorage.setItem('bunkmate_statuses', JSON.stringify(updatedStatuses));
  return newStatusObj;
};

export const saveRemoteStatus = (statusObj: DailyStatus) => {
  const statuses = getStatuses();
  const existingIndex = statuses.findIndex(s => s.userId === statusObj.userId && s.date === statusObj.date);
  
  let updatedStatuses = [...statuses];

  // Only update if newer
  if (existingIndex >= 0) {
    if (statuses[existingIndex].timestamp < statusObj.timestamp) {
        updatedStatuses[existingIndex] = statusObj;
    } else {
        return statuses; // No change
    }
  } else {
    updatedStatuses.push(statusObj);
  }
  
  statusesCache = updatedStatuses;
  localStorage.setItem('bunkmate_statuses', JSON.stringify(updatedStatuses));
  return updatedStatuses;
};

// --- Discussion Board ---

export const getMessages = (): Message[] => {
  if (messagesCache) return messagesCache;
  const msgs = localStorage.getItem('bunkmate_messages');
  messagesCache = msgs ? JSON.parse(msgs) : [];
  return messagesCache!;
};

export const saveMessage = (msg: Message): Message[] => {
  const msgs = getMessages();
  // Check if message already exists (e.g., received via multiple channels)
  const existingIndex = msgs.findIndex(m => m.id === msg.id);
  
  let updated = [...msgs];
  
  if (existingIndex >= 0) {
      // Update existing message (e.g. adding reactions or read receipts)
      // Merge properties
      updated[existingIndex] = {
          ...updated[existingIndex],
          ...msg,
          // Merge Reactions carefully
          reactions: msg.reactions || updated[existingIndex].reactions,
          // Merge ReadBy
          readBy: Array.from(new Set([...(updated[existingIndex].readBy || []), ...(msg.readBy || [])]))
      };
  } else {
      updated.push(msg);
  }

  // Keep only last 100 messages
  if (updated.length > 100) updated.shift();
  
  messagesCache = updated;
  localStorage.setItem('bunkmate_messages', JSON.stringify(updated));
  return updated;
};

export const addReactionToMessage = (messageId: string, emoji: string, userId: string): Message[] => {
    const msgs = getMessages();
    const msgIndex = msgs.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return msgs;

    const msg = msgs[msgIndex];
    const reactions = msg.reactions || {};
    const usersForEmoji = reactions[emoji] || [];

    // Toggle reaction
    let newUsersForEmoji;
    if (usersForEmoji.includes(userId)) {
        newUsersForEmoji = usersForEmoji.filter(id => id !== userId);
    } else {
        newUsersForEmoji = [...usersForEmoji, userId];
    }

    // Cleanup empty emoji keys
    if (newUsersForEmoji.length === 0) {
        delete reactions[emoji];
    } else {
        reactions[emoji] = newUsersForEmoji;
    }

    const updatedMsg = { ...msg, reactions: { ...reactions } };
    const updatedMsgs = [...msgs];
    updatedMsgs[msgIndex] = updatedMsg;

    messagesCache = updatedMsgs;
    localStorage.setItem('bunkmate_messages', JSON.stringify(updatedMsgs));
    return updatedMsgs;
};

export const markMessageAsRead = (messageId: string, userId: string): Message[] => {
    const msgs = getMessages();
    const msgIndex = msgs.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return msgs;

    const msg = msgs[msgIndex];
    const readBy = msg.readBy || [];

    if (readBy.includes(userId)) return msgs;

    const updatedMsg = { ...msg, readBy: [...readBy, userId] };
    const updatedMsgs = [...msgs];
    updatedMsgs[msgIndex] = updatedMsg;
    
    messagesCache = updatedMsgs;
    localStorage.setItem('bunkmate_messages', JSON.stringify(updatedMsgs));
    return updatedMsgs;
}

export const initializeData = () => {
  if (!localStorage.getItem('bunkmate_users')) {
    localStorage.setItem('bunkmate_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('bunkmate_statuses')) {
    localStorage.setItem('bunkmate_statuses', JSON.stringify([]));
  }
  
  // Prime caches
  getAllUsers();
  getStatuses();
  getMessages();
};