
import React, { useState } from 'react';
import { User, DailyStatus } from '../types';
import { Check, X, HelpCircle, UserPlus, Share2, RefreshCw, Globe2 } from 'lucide-react';

interface Props {
  users: User[];
  statuses: DailyStatus[];
  onRefresh?: () => void;
  currentUser: User;
  dateLabel: string;
}

const GroupPulse: React.FC<Props> = ({ users, statuses, onRefresh, currentUser, dateLabel }) => {
  const [showInvite, setShowInvite] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOnline = (timestamp?: number) => {
      if (!timestamp) return false;
      return (Date.now() - timestamp) < 15000;
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    const aOnline = isOnline(a.lastSeen);
    const bOnline = isOnline(b.lastSeen);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleRefresh = () => {
    if (onRefresh) {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'GOING': return { icon: <Check size={16} strokeWidth={3} />, text: 'GOING', color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-800' };
      case 'NOT_GOING': return { icon: <X size={16} strokeWidth={3} />, text: 'ABSENT', color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-800' };
      default: return { icon: <HelpCircle size={16} strokeWidth={2.5} />, text: 'WAITING', color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' };
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 md:p-8 border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <h3 className="text-zinc-900 dark:text-white font-bold text-lg md:text-2xl truncate">Squad Status <span className="text-zinc-500 font-normal text-base md:text-lg hidden sm:inline">({dateLabel})</span></h3>
            <span className="shrink-0 text-sm font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">{users.length}</span>
            {onRefresh && (
                <button 
                    onClick={handleRefresh} 
                    className={`ml-1 md:ml-2 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Force Refresh"
                >
                    <RefreshCw size={18} />
                </button>
            )}
        </div>
        <button 
          onClick={() => setShowInvite(!showInvite)}
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-600/20 text-xs md:text-sm font-semibold transition-colors"
        >
          <UserPlus size={16} />
          {showInvite ? 'Close' : 'Invite'}
        </button>
      </div>

      {showInvite && (
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl mb-6 animate-fade-in">
          <p className="font-semibold text-zinc-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
            <Share2 size={18} /> Invite Friends
          </p>
          <div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400 mb-4 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
             <Globe2 size={20} className="shrink-0 mt-0.5 text-blue-500" />
             <p className="text-sm leading-relaxed">
                Tell your friends to enter this Class Code on their devices to join the squad:
             </p>
          </div>
          <div className="text-center bg-zinc-100 dark:bg-black p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
             <span className="text-2xl md:text-3xl font-mono font-bold text-zinc-900 dark:text-white tracking-[0.2em]">{currentUser.classCode}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedUsers.map(user => {
          const userStatus = statuses.find(s => s.userId === user.id);
          const statusType = userStatus?.status || 'UNDECIDED';
          const online = isOnline(user.lastSeen);
          const display = getStatusDisplay(statusType);

          return (
            <div 
              key={user.id} 
              className={`flex items-center justify-between p-3 md:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 transition-all ${user.isCurrentUser ? 'border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0 mr-2">
                <div className="relative shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden ring-2 ring-white dark:ring-zinc-900">
                       <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> 
                    </div>
                    {online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-950"></div>
                    )}
                </div>
                <div className="min-w-0">
                  <span className={`font-semibold text-base md:text-lg block truncate ${user.isCurrentUser ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {user.name} 
                    {user.isCurrentUser && <span className="text-xs text-zinc-500 ml-1.5 font-normal">(You)</span>}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 block truncate">
                    {online ? 'Online now' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border shrink-0 ${display.color}`}>
                <div className="shrink-0">{display.icon}</div>
                <span className="text-xs md:text-sm font-bold tracking-wide">
                  {display.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupPulse;
