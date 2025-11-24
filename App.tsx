
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, DailyStatus, StatusType, ViewState, AttendanceStats, Message, TypingStatus, Poll } from './types';
import { 
  initializeData, 
  getTodayDateString, 
  getDateWithOffset,
  getStatuses, 
  saveStatus, 
  getCurrentUser, 
  registerUser, 
  loginUser,
  logoutUser,
  getUsersForDisplay,
  getMessages,
  saveMessage,
  addReactionToMessage,
  markMessageAsRead,
  upsertRemoteUser,
  saveRemoteStatus,
  voteOnPoll,
  updateUserProfile
} from './services/mockData';
import { 
  connectMQTT, 
  disconnectMQTT, 
  publishStatus, 
  publishHeartbeat, 
  publishMessage,
  publishTyping,
  publishReaction,
  publishReadReceipt,
  publishPollVote
} from './services/mqttService';
import Navigation from './components/Navigation';
import StatusCard from './components/StatusCard';
import GroupPulse from './components/GroupPulse';
import AttendanceChart from './components/AttendanceChart';
import CalendarView from './components/CalendarView';
import Advisor from './components/Advisor';
import Onboarding from './components/Onboarding';
import DiscussionBoard from './components/DiscussionBoard';
import ProfileSettings from './components/ProfileSettings';
import Feedback from './components/Feedback';
import { Bell, Wifi, WifiOff, LogOut, Calendar } from 'lucide-react';

const App: React.FC = () => {
  // Initialize state lazily to prevent flickering on load
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    initializeData();
    return getCurrentUser();
  });

  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<DailyStatus[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [statsViewMode, setStatsViewMode] = useState<'CHART' | 'CALENDAR'>('CHART');
  const [isConnected, setIsConnected] = useState(false);
  const [dateOffset, setDateOffset] = useState(0); // 0 = Today, 1 = Tomorrow, 2 = Day After
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Safe initialization of Notification permission
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof Notification !== 'undefined') {
      return Notification.permission;
    }
    return 'default';
  });

  // Calculate view date info
  const { dateStr: viewDateStr, label: viewDateLabel, fullDisplay: viewDateDisplay } = useMemo(
      () => getDateWithOffset(dateOffset), 
      [dateOffset]
  );
  const todayDate = getTodayDateString();

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
        } catch (e) {
            console.error("Failed to request notification permission", e);
        }
    }
  };

  // Theme Logic
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Load Initial Data
  useEffect(() => {
    if (currentUser) {
      setUsers(getUsersForDisplay(currentUser.id, currentUser.classCode));
      setStatuses(getStatuses());
      setMessages(getMessages());
    }
    // Request notification permission on mount if default and API exists
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        requestNotificationPermission();
    }
  }, [currentUser]);

  // Clean up typing users that are stale (> 3s)
  useEffect(() => {
    const interval = setInterval(() => {
        setTypingUsers(prev => prev.filter(u => Date.now() - u.timestamp < 3000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // MQTT Integration Effect
  useEffect(() => {
    if (currentUser) {
      // Connect to MQTT
      connectMQTT(currentUser, (topic, payload) => {
        setIsConnected(true);
        handleMQTTMessage(topic, payload);
      });
      setIsConnected(true);

      // Heartbeat Loop (Send my presence every 5s)
      const heartbeatInterval = setInterval(() => {
         publishHeartbeat(currentUser);
      }, 5000);

      // Refresh Loop (Update UI state to check for offline users)
      const refreshInterval = setInterval(() => {
          const currentList = getUsersForDisplay(currentUser.id, currentUser.classCode);
          setUsers(prevUsers => {
             const prevJson = JSON.stringify(prevUsers);
             const currJson = JSON.stringify(currentList);
             return prevJson !== currJson ? currentList : prevUsers;
          });
      }, 3000);

      return () => {
        disconnectMQTT();
        setIsConnected(false);
        clearInterval(heartbeatInterval);
        clearInterval(refreshInterval);
      };
    }
  }, [currentUser]);

  const sendSystemNotification = (title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
         try {
             new Notification(title, { 
                 body, 
                 icon: 'https://cdn-icons-png.flaticon.com/512/2983/2983911.png',
                 tag: 'bunkmate-notification',
                 renotify: true
             } as any);
         } catch (e) {
             console.error("Notification failed", e);
         }
    }
  };

  const handleMQTTMessage = (topic: string, data: any) => {
    if (!currentUser) return;

    if (topic.includes('/heartbeat')) {
      const remoteUser = data as User;
      if (remoteUser.id !== currentUser.id) {
         // This handles name/avatar updates from remote users too
         upsertRemoteUser(remoteUser);
      }
    } else if (topic.includes('/status')) {
      const statusObj = data as DailyStatus;
      if (statusObj.userId !== currentUser.id) {
         saveRemoteStatus(statusObj);
         setStatuses(prev => {
            const exists = prev.find(s => s.userId === statusObj.userId && s.date === statusObj.date);
            if (exists && exists.timestamp >= statusObj.timestamp) return prev;
            return [...prev.filter(s => !(s.userId === statusObj.userId && s.date === statusObj.date)), statusObj];
         });
         
         if (statusObj.date === todayDate || statusObj.date === viewDateStr) {
             const allUsers = getUsersForDisplay(currentUser.id, currentUser.classCode);
             const who = allUsers.find(u => u.id === statusObj.userId);
             const name = who?.name || 'Friend';
             const text = `${name} is ${statusObj.status === 'GOING' ? 'Going' : 'Not Going'} ${statusObj.date === todayDate ? 'today' : 'on ' + statusObj.date}`;
             addNotification(text);
             if (document.visibilityState === 'hidden') {
                 sendSystemNotification("Squad Update", text);
             }
         }
      }
    } else if (topic.includes('/message')) {
      const msg = data as Message;
      if (msg.userId !== currentUser.id) {
          saveMessage(msg);
          setMessages(prev => {
             if (prev.some(m => m.id === msg.id)) return prev;
             return [...prev, msg]; 
          });
          
          if (currentView !== ViewState.DISCUSS) {
             addNotification(`New message from ${msg.userName}`);
             sendSystemNotification(msg.userName, msg.text || (msg.poll ? 'Sent a poll' : 'Sent a message'));
          } else if (document.visibilityState === 'visible') {
              // If I'm looking at chat, mark as read
              publishReadReceipt(msg.id, currentUser.id);
          }
      }
    } else if (topic.includes('/typing')) {
        const typing = data as { userId: string, userName: string, isTyping: boolean, timestamp: number };
        if (typing.userId !== currentUser.id && typing.isTyping) {
            setTypingUsers(prev => {
                const others = prev.filter(u => u.userId !== typing.userId);
                return [...others, { userId: typing.userId, userName: typing.userName, timestamp: typing.timestamp }];
            });
        }
    } else if (topic.includes('/reaction')) {
        const { messageId, emoji, userId } = data;
        if (userId !== currentUser.id) {
            const updatedMsgs = addReactionToMessage(messageId, emoji, userId);
            setMessages(updatedMsgs);
        }
    } else if (topic.includes('/read')) {
        const { messageId, userId } = data;
        if (userId !== currentUser.id) {
            const updatedMsgs = markMessageAsRead(messageId, userId);
            setMessages(updatedMsgs);
        }
    } else if (topic.includes('/poll-vote')) {
        const { messageId, optionId, userId } = data;
        if (userId !== currentUser.id) {
            const updatedMsgs = voteOnPoll(messageId, optionId, userId);
            setMessages(updatedMsgs);
        }
    }
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== msg));
    }, 5000);
  };

  const forceRefresh = () => {
    setStatuses(getStatuses());
    setMessages(getMessages());
    if (currentUser) {
        setUsers(getUsersForDisplay(currentUser.id, currentUser.classCode));
        publishHeartbeat(currentUser);
    }
  };

  const handleUpdateStatus = (status: StatusType) => {
    if (!currentUser) return;
    const newStatus = saveStatus(currentUser.id, status, viewDateStr);
    setStatuses(getStatuses()); 
    publishStatus(newStatus);
  };

  const handleSendMessage = (text: string, replyTo?: Message, poll?: Poll) => {
    if (!currentUser) return;
    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      avatar: currentUser.avatar,
      text,
      timestamp: Date.now(),
      replyTo: replyTo ? { id: replyTo.id, userName: replyTo.userName, text: replyTo.text } : undefined,
      readBy: [],
      poll
    };
    saveMessage(newMsg);
    setMessages(prev => [...prev, newMsg]);
    publishMessage(newMsg);
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (currentUser) publishTyping(currentUser, isTyping);
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const updatedMsgs = addReactionToMessage(messageId, emoji, currentUser.id);
    setMessages(updatedMsgs);
    publishReaction(messageId, emoji, currentUser.id);
  };

  const handlePollVote = (messageId: string, optionId: string) => {
      if (!currentUser) return;
      const updatedMsgs = voteOnPoll(messageId, optionId, currentUser.id);
      setMessages(updatedMsgs);
      publishPollVote(messageId, optionId, currentUser.id);
  }

  const handleUpdateProfile = (updates: Partial<User>) => {
      if (!currentUser) return;
      const updatedUser = updateUserProfile(currentUser.id, updates);
      if (updatedUser) {
          setCurrentUser(updatedUser);
          // Broadcast update so others see new name/avatar immediately
          publishHeartbeat(updatedUser);
      }
  };

  const handleOnboardingComplete = (name: string, classCode: string, targetDays: number, isNew: boolean, existingUser?: User) => {
    let user;
    if (isNew) {
      user = registerUser(name, classCode, targetDays);
    } else if (existingUser) {
      user = loginUser(existingUser);
    }
    
    if (user) {
      setCurrentUser(user);
    }
  };

  const handleLogout = () => {
    logoutUser();
    disconnectMQTT();
    setCurrentUser(null);
    setNotifications([]);
    setCurrentView(ViewState.DASHBOARD);
  };

  const myStats = useMemo((): AttendanceStats => {
    if (!currentUser) return { totalDays: 0, presentDays: 0, percentage: 0, targetPercentage: 75 };
    const myStatuses = statuses.filter(s => s.userId === currentUser.id && s.status !== 'UNDECIDED' && s.date <= todayDate);
    const totalDays = myStatuses.length;
    const presentDays = myStatuses.filter(s => s.status === 'GOING').length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;
    const targetDays = currentUser.targetDaysPerWeek || 4;
    const targetPercentage = (targetDays / 5) * 100;
    return { totalDays, presentDays, percentage, targetPercentage };
  }, [statuses, currentUser, todayDate]);

  const currentViewStatuses = useMemo(() => {
    return statuses.filter(s => s.date === viewDateStr);
  }, [statuses, viewDateStr]);

  const myCurrentViewStatus = useMemo(() => {
    return currentViewStatuses.find(s => s.userId === currentUser?.id)?.status || 'UNDECIDED';
  }, [currentViewStatuses, currentUser]);

  const recommendation = useMemo(() => {
    if (!currentUser) return undefined;
    const othersStatuses = currentViewStatuses.filter(s => s.userId !== currentUser.id);
    const othersGoing = othersStatuses.filter(s => s.status === 'GOING').length;
    const othersNotGoing = othersStatuses.filter(s => s.status === 'NOT_GOING').length;
    const historyStatuses = statuses
        .filter(s => s.userId === currentUser.id && s.status !== 'UNDECIDED' && s.date < viewDateStr)
        .sort((a,b) => b.date.localeCompare(a.date));
    
    const histTotal = historyStatuses.length;
    const histPresent = historyStatuses.filter(s => s.status === 'GOING').length;
    const histPercentage = histTotal > 0 ? (histPresent / histTotal) * 100 : 100;
    let consecutiveAbsences = 0;
    for (let s of historyStatuses) {
        if (s.status === 'NOT_GOING') consecutiveAbsences++;
        else break;
    }

    if (consecutiveAbsences >= 2) return { shouldGo: true, message: `You've missed ${consecutiveAbsences} days in a row. Go ${viewDateLabel.toLowerCase()} to break the streak!`, severity: 'critical' as const };
    if (histPercentage < myStats.targetPercentage) return { shouldGo: true, message: `Your attendance (${histPercentage.toFixed(0)}%) is below target (${myStats.targetPercentage.toFixed(0)}%). Catch up time!`, severity: 'critical' as const };
    if (othersNotGoing > othersGoing && othersNotGoing > 0) return { shouldGo: false, message: `Majority of friends are skipping ${viewDateLabel.toLowerCase()}. Your stats are safe to join them.`, severity: 'safe' as const };
    if (othersGoing > othersNotGoing) return { shouldGo: true, message: `${othersGoing} friends are going. Good day to show up.`, severity: 'moderate' as const };
    return { shouldGo: true, message: "When in doubt, it's better to show up.", severity: 'moderate' as const };
  }, [currentViewStatuses, myStats.targetPercentage, currentUser, statuses, viewDateLabel, viewDateStr]);


  if (!currentUser) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Helper render functions
  const renderDashboardWidgets = () => (
    <>
      <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-2xl mb-6 border border-zinc-200 dark:border-zinc-800 flex relative transition-colors duration-300">
         <div className="absolute top-1.5 bottom-1.5 rounded-xl bg-blue-600 transition-all duration-300 ease-out" 
              style={{ 
                  width: 'calc(33.33% - 4px)', 
                  left: `calc(${dateOffset * 33.33}% + 2px)` 
              }} 
         />
         {[0, 1, 2].map(offset => {
             const { label, dateStr } = getDateWithOffset(offset);
             const isSelected = dateOffset === offset;
             const dayNum = dateStr.split('-')[2]; 
             return (
                 <button 
                    key={offset}
                    onClick={() => setDateOffset(offset)}
                    className={`flex-1 relative z-10 py-2.5 rounded-xl text-sm font-medium transition-colors flex flex-col items-center leading-none gap-1 ${isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                 >
                    <span>{label}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-600'}`}>{dayNum}</span>
                 </button>
             );
         })}
      </div>

      <StatusCard 
        user={currentUser} 
        status={myCurrentViewStatus} 
        onUpdateStatus={handleUpdateStatus} 
        recommendation={recommendation}
        dateLabel={viewDateLabel}
      />
      <GroupPulse 
        users={users} 
        statuses={currentViewStatuses} 
        onRefresh={forceRefresh}
        currentUser={currentUser}
        dateLabel={viewDateLabel}
      />
    </>
  );

  const renderStatsWidgets = () => (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex gap-4 mb-2 flex-shrink-0">
        <button 
           onClick={() => setStatsViewMode('CHART')}
           className={`flex-1 py-3 px-4 rounded-xl text-lg font-medium transition-colors ${statsViewMode === 'CHART' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
        >
          Overview & Rank
        </button>
        <button 
           onClick={() => setStatsViewMode('CALENDAR')}
           className={`flex-1 py-3 px-4 rounded-xl text-lg font-medium transition-colors ${statsViewMode === 'CALENDAR' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
        >
          Calendar
        </button>
      </div>
      <div className="flex-grow min-h-0 overflow-y-auto">
        {statsViewMode === 'CHART' ? (
            <AttendanceChart currentUser={currentUser} users={users} statuses={statuses} myStats={myStats} />
        ) : (
            <CalendarView statuses={statuses} currentUser={currentUser} />
        )}
      </div>
    </div>
  );

  const isInteractiveView = currentView === ViewState.DISCUSS || currentView === ViewState.ADVISOR;

  return (
    <div className="h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-600/30 overflow-hidden flex flex-col transition-colors duration-300">
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none w-full max-w-md px-4">
        {notifications.map((note, idx) => (
          <div key={idx} className="bg-zinc-800/95 backdrop-blur border border-zinc-700 text-white py-3 px-6 rounded-full shadow-2xl animate-fade-in flex items-center gap-3">
             <Bell size={18} className="text-blue-500" /> 
             <span className="font-medium">{note}</span>
          </div>
        ))}
      </div>

      <Navigation currentView={currentView} setView={setCurrentView} onLogout={handleLogout} />

      <div className="md:hidden flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-shrink-0 pt-6 px-4 flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-0.5">Hi, {currentUser.name}</h1>
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <span className="text-xs">{viewDateDisplay}</span>
                  {isConnected ? <Wifi size={14} className="text-green-500"/> : <WifiOff size={14} className="text-red-500"/>}
                  <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300 font-mono">{currentUser.classCode}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {typeof Notification !== 'undefined' && permissionStatus === 'default' && (
                  <button onClick={requestNotificationPermission} className="p-2.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/30">
                      <Bell size={18} />
                  </button>
              )}
              <button onClick={handleLogout} className="p-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400">
                  <LogOut size={18} />
              </button>
            </div>
        </div>

        <div className={`flex-1 min-h-0 px-4 pb-24 ${isInteractiveView ? 'overflow-hidden flex flex-col' : 'overflow-y-auto space-y-4 scroll-smooth'}`}>
            {currentView === ViewState.DASHBOARD && renderDashboardWidgets()}
            {currentView === ViewState.STATS && renderStatsWidgets()}
            {currentView === ViewState.ADVISOR && (
               <div className="h-full">
                 <Advisor users={users} todayStatus={currentViewStatuses} myStats={myStats} userGoal={currentUser.targetDaysPerWeek || 4} dateLabel={viewDateLabel} />
               </div>
            )}
            {currentView === ViewState.DISCUSS && (
               <div className="h-full">
                 <DiscussionBoard 
                    currentUser={currentUser} 
                    users={users} 
                    messages={messages} 
                    onSendMessage={handleSendMessage}
                    onSendTyping={handleSendTyping}
                    onReact={handleReact}
                    typingUsers={typingUsers}
                    onVote={handlePollVote}
                 />
               </div>
            )}
            {currentView === ViewState.PROFILE && (
                <ProfileSettings 
                    user={currentUser} 
                    onUpdateUser={handleUpdateProfile} 
                    isDarkMode={isDarkMode} 
                    toggleTheme={toggleTheme} 
                    onNavigateToFeedback={() => setCurrentView(ViewState.FEEDBACK)}
                />
            )}
            {currentView === ViewState.FEEDBACK && <Feedback />}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block h-full">
         <div className="ml-64 p-10 h-screen overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-8 shrink-0">
              <div>
                  <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">Dashboard</h1>
                  <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                    <span className="text-lg">{viewDateDisplay}</span>
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      {isConnected ? <Wifi size={18} className="text-green-500"/> : <WifiOff size={18} className="text-red-500"/>}
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">{currentUser.classCode}</span>
                    </div>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  {typeof Notification !== 'undefined' && permissionStatus === 'default' && (
                      <button onClick={requestNotificationPermission} className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600/30 font-medium">
                          <Bell size={18} /> Enable Notifications
                      </button>
                  )}
                  <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 pr-4 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                      <span className="font-medium text-zinc-900 dark:text-white">{currentUser.name}</span>
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-grow min-h-0 animate-fade-in">
              {currentView === ViewState.DASHBOARD && (
                  <>
                    <div className="col-span-8 space-y-8 overflow-y-auto pr-2">
                        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-fit shadow-sm">
                            <Calendar className="ml-2 text-zinc-400 dark:text-zinc-500" size={20} />
                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>
                            {[0, 1, 2].map(offset => {
                                const { label, dateStr } = getDateWithOffset(offset);
                                const isSelected = dateOffset === offset;
                                const dayNum = dateStr.split('-')[2];
                                return (
                                    <button 
                                        key={offset}
                                        onClick={() => setDateOffset(offset)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                    >
                                        {label} <span className="text-xs opacity-60 ml-1">{dayNum}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <StatusCard 
                          user={currentUser} 
                          status={myCurrentViewStatus} 
                          onUpdateStatus={handleUpdateStatus} 
                          recommendation={recommendation}
                          dateLabel={viewDateLabel}
                        />
                        <GroupPulse 
                          users={users} 
                          statuses={currentViewStatuses} 
                          onRefresh={forceRefresh} 
                          currentUser={currentUser}
                          dateLabel={viewDateLabel}
                        />
                    </div>
                    <div className="col-span-4 space-y-8 h-full flex flex-col overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto"><AttendanceChart currentUser={currentUser} users={users} statuses={statuses} myStats={myStats} /></div>
                        <div className="h-[300px] shrink-0"><Advisor users={users} todayStatus={currentViewStatuses} myStats={myStats} userGoal={currentUser.targetDaysPerWeek || 4} dateLabel={viewDateLabel} /></div>
                    </div>
                  </>
              )}

              {currentView === ViewState.STATS && (
                  <div className="col-span-12 grid grid-cols-2 gap-8 h-full">
                      <div className="h-full overflow-hidden"><AttendanceChart currentUser={currentUser} users={users} statuses={statuses} myStats={myStats} /></div>
                      <div className="h-full overflow-hidden"><CalendarView statuses={statuses} currentUser={currentUser} /></div>
                  </div>
              )}
              
              {currentView === ViewState.DISCUSS && (
                  <div className="col-span-12 h-full">
                      <DiscussionBoard 
                        currentUser={currentUser} 
                        users={users} 
                        messages={messages} 
                        onSendMessage={handleSendMessage}
                        onSendTyping={handleSendTyping}
                        onReact={handleReact}
                        typingUsers={typingUsers}
                        onVote={handlePollVote}
                      />
                  </div>
              )}
              
              {currentView === ViewState.ADVISOR && (
                  <div className="col-span-8 col-start-3 h-full">
                    <Advisor users={users} todayStatus={currentViewStatuses} myStats={myStats} userGoal={currentUser.targetDaysPerWeek || 4} dateLabel={viewDateLabel} />
                  </div>
              )}

              {currentView === ViewState.PROFILE && (
                  <div className="col-span-6 col-start-4">
                      <ProfileSettings 
                        user={currentUser} 
                        onUpdateUser={handleUpdateProfile} 
                        isDarkMode={isDarkMode} 
                        toggleTheme={toggleTheme} 
                        onNavigateToFeedback={() => setCurrentView(ViewState.FEEDBACK)}
                      />
                  </div>
              )}

              {currentView === ViewState.FEEDBACK && (
                  <div className="col-span-6 col-start-4">
                      <Feedback />
                  </div>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default App;
