import React, { useState, useEffect, useRef } from 'react';
import { User, Message, TypingStatus, Poll } from '../types';
import { Send, Users, MessageSquare, Reply, Smile, Check, CheckCheck, ArrowDown, BarChart2, Plus, X, Trash2, Eye } from 'lucide-react';
import { SoundService } from '../services/soundService';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';

interface Props {
  currentUser: User;
  users: User[];
  messages: Message[];
  onSendMessage: (text: string, replyTo?: Message, poll?: Poll) => void;
  onSendTyping: (isTyping: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  typingUsers: TypingStatus[];
  onVote?: (messageId: string, optionId: string) => void;
  onReadMessage?: (messageId: string) => void;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

// --- Helper Component for Swipe-to-Reply ---
const SwipeableMessage: React.FC<{ children: React.ReactNode; onReply: () => void }> = ({ children, onReply }) => {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean>(false);
  const hasTriggeredHaptic = useRef<boolean>(false);
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
    hasTriggeredHaptic.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    if (!e.touches || e.touches.length === 0) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Detect direction once to distinguish scroll vs swipe
    if (!isHorizontalSwipe.current) {
        // If vertical movement is significant, let browser handle scroll
        if (Math.abs(diffY) > 10) {
            startX.current = null;
            startY.current = null;
            return;
        }
        // If horizontal movement is dominant
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
            isHorizontalSwipe.current = true;
        }
    }

    if (isHorizontalSwipe.current) {
        // Only allow swipe right
        if (diffX > 0) {
            // Add resistance / cap at 120px
            const dampening = diffX > SWIPE_THRESHOLD ? 0.5 : 1;
            const movement = Math.min(diffX * dampening, 120);
            setTranslateX(movement);

            // Haptic feedback when crossing threshold
            if (movement > SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
                try {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                } catch (e) { /* Ignore vibration errors */ }
                hasTriggeredHaptic.current = true;
            } else if (movement < SWIPE_THRESHOLD) {
                hasTriggeredHaptic.current = false;
            }
        }
    }
  };

  const handleTouchEnd = () => {
    if (translateX > SWIPE_THRESHOLD) {
        onReply();
    }
    setTranslateX(0);
    startX.current = null;
    startY.current = null;
    isHorizontalSwipe.current = false;
    hasTriggeredHaptic.current = false;
  };

  const handleTouchCancel = () => {
      setTranslateX(0);
      startX.current = null;
      startY.current = null;
      isHorizontalSwipe.current = false;
      hasTriggeredHaptic.current = false;
  };

  return (
    <div 
        className="relative w-full touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
    >
        {/* Reply Icon Indicator */}
        <div 
            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 z-0 pointer-events-none"
            style={{ 
                left: '10px',
                opacity: Math.min(translateX / SWIPE_THRESHOLD, 1),
                transform: `translateY(-50%) scale(${Math.min(translateX / SWIPE_THRESHOLD, 1.2)})`,
                transition: 'opacity 0.1s, transform 0.1s'
            }}
        >
            <div className="bg-zinc-200 dark:bg-zinc-800 p-2 rounded-full shadow-sm">
                <Reply size={20} />
            </div>
        </div>

        {/* Message Content */}
        <div 
            style={{ transform: `translateX(${translateX}px)`, transition: translateX === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
            className="relative z-10 w-full"
        >
            {children}
        </div>
    </div>
  );
};

const DiscussionBoard: React.FC<Props> = ({ currentUser, users, messages, onSendMessage, onSendTyping, onReact, typingUsers, onVote, onReadMessage }) => {
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageCount = useRef(messages.length);
  
  // Emoji Picker State
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  
  // Quick Reaction Menu Positioning
  const [quickMenuPos, setQuickMenuPos] = useState<{ top?: number, bottom?: number, left?: number, right?: number, transform?: string } | null>(null);
  const [activeQuickMenuId, setActiveQuickMenuId] = useState<string | null>(null);

  // Poll Creator State
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Detect Theme for Emoji Picker
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Mark unread messages as read when viewing
  useEffect(() => {
      if (onReadMessage && document.visibilityState === 'visible') {
          // Find messages sent by others that I haven't read yet
          const unreadMessages = messages.filter(m => 
              m.userId !== currentUser.id && 
              (!m.readBy || !m.readBy.includes(currentUser.id))
          );
          
          unreadMessages.forEach(msg => {
              onReadMessage(msg.id);
          });
      }
  }, [messages.length, currentUser.id, onReadMessage]);

  // Scroll to Bottom Helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollButton(false);
  };

  // Improved Scroll Logic using useEffect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollHeight, clientHeight, scrollTop } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    const isNewMessage = messages.length > lastMessageCount.current;
    
    // 1. Initial Load: Snap to bottom
    if (lastMessageCount.current === 0 && messages.length > 0) {
        scrollToBottom('instant');
    } 
    // 2. New Message Arrived
    else if (isNewMessage) {
        const lastMsg = messages[messages.length - 1];
        // If I sent it, or I was already near bottom, auto-scroll
        if (lastMsg.userId === currentUser.id) {
            scrollToBottom('smooth');
        } else if (isNearBottom) {
             scrollToBottom('smooth');
             SoundService.playReceive();
        } else {
             setShowScrollButton(true);
             SoundService.playReceive();
        }
    }

    lastMessageCount.current = messages.length;
  }, [messages.length, currentUser.id]);

  // Keep scroll at bottom if typing users change and we are already at bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollHeight, clientHeight, scrollTop } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom) {
        scrollToBottom('smooth');
    }
  }, [typingUsers.length]);

  // Close quick menu on scroll
  useEffect(() => {
    const handleGlobalScroll = () => {
       if (activeQuickMenuId) setActiveQuickMenuId(null);
    };
    window.addEventListener('scroll', handleGlobalScroll, true);
    return () => window.removeEventListener('scroll', handleGlobalScroll, true);
  }, [activeQuickMenuId]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Show button if more than 150px away from bottom
    const isAwayFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(isAwayFromBottom);
    
    if (activeQuickMenuId) setActiveQuickMenuId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onSendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        onSendTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input, replyingTo || undefined);
    SoundService.playSend();
    setInput('');
    setReplyingTo(null);
    onSendTyping(false);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const handleSendPoll = () => {
    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (!pollQuestion.trim() || validOptions.length < 2) return;

    const newPoll: Poll = {
      question: pollQuestion,
      options: validOptions.map(text => ({ id: 'opt_' + Math.random().toString(36).substr(2, 9), text, votes: [] })),
      allowMultiple: pollAllowMultiple
    };

    onSendMessage('', undefined, newPoll);
    SoundService.playSend();
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    if (activeReactionMessageId) {
        onReact(activeReactionMessageId, emojiData.emoji);
        SoundService.playClick();
        setShowFullEmojiPicker(false);
        setActiveReactionMessageId(null);
    }
  };

  const toggleQuickMenu = (e: React.MouseEvent, msgId: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (activeQuickMenuId === msgId) {
          setActiveQuickMenuId(null);
          return;
      }

      const button = e.currentTarget as HTMLButtonElement;
      const rect = button.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Estimated width of the reaction menu (6 emojis + padding)
      const MENU_WIDTH = 320; 
      const SCREEN_PADDING = 10;

      let pos: any = {};
      
      // Vertical Logic: Bias towards opening upwards on mobile (bottom heavy)
      if (rect.bottom > screenHeight * 0.6) {
          pos.bottom = screenHeight - rect.top + 10; // Open Upwards
      } else {
          pos.top = rect.bottom + 10; // Open Downwards
      }

      // Horizontal Logic: Center relative to button, but clamp to screen edges
      let calculatedLeft = rect.left + (rect.width / 2) - (MENU_WIDTH / 2);

      // Clamp Left
      if (calculatedLeft < SCREEN_PADDING) {
          calculatedLeft = SCREEN_PADDING;
      } 
      // Clamp Right
      else if (calculatedLeft + MENU_WIDTH > screenWidth - SCREEN_PADDING) {
          calculatedLeft = screenWidth - MENU_WIDTH - SCREEN_PADDING;
      }

      pos.left = calculatedLeft;

      setQuickMenuPos(pos);
      setActiveQuickMenuId(msgId);
  };


  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const activeTypingUsers = typingUsers.filter(u => u.userId !== currentUser.id);
  const onlineCount = users.filter(u => (Date.now() - (u.lastSeen || 0)) < 15000).length;

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md md:rounded-3xl md:border border-primary-100 dark:border-zinc-800 overflow-hidden shadow-xl relative transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center z-50 sticky top-0 shrink-0 shadow-sm transition-colors">
        <div>
            <h2 className="text-zinc-900 dark:text-white font-bold text-lg flex items-center gap-2">
              <MessageSquare className="text-primary-600 dark:text-primary-500 animate-pulse" size={20} />
              Squad Chat
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'}`}></span>
                    {onlineCount} Online
                </span>
                <span className="text-zinc-400 dark:text-zinc-600 text-[10px]">•</span>
                <span className="text-xs text-zinc-500 font-mono tracking-wider bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded">{currentUser.classCode}</span>
            </div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full text-zinc-400">
            <Users size={18} />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-grow overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 space-y-2 transition-colors relative"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onClick={() => setActiveQuickMenuId(null)}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, gray 1px, transparent 0)`, backgroundSize: '24px 24px' }}></div>

        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-600 opacity-60 min-h-[300px]">
                <div className="bg-zinc-200/50 dark:bg-zinc-800/50 p-4 rounded-full mb-3 animate-pop-in">
                   <MessageSquare size={32} />
                </div>
                <p className="text-base font-medium">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
            </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUser.id;
          const showHeader = index === 0 || messages[index-1].userId !== msg.userId;
          const othersRead = msg.readBy?.filter(id => id !== currentUser.id) || [];
          const isAllRead = othersRead.length > 0;
          
          const seenByUsers = othersRead.map(id => users.find(u => u.id === id)).filter(Boolean);
          
          const prevMsg = messages[index - 1];
          const showDateSeparator = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                  <div className="flex justify-center my-6 relative z-0 animate-fade-in">
                      <span className="bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-zinc-200 dark:border-zinc-700/50 backdrop-blur-sm">
                          {formatDateLabel(msg.timestamp)}
                      </span>
                  </div>
              )}

              <SwipeableMessage onReply={() => {
                  setReplyingTo(msg);
                  SoundService.playClick();
              }}>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group mb-4 relative z-0 hover:z-30 w-full animate-slide-up`}>
                
                    <div className={`flex gap-2 max-w-[90%] md:max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 flex-shrink-0 flex flex-col items-center">
                            {showHeader ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-900/50 mt-1 animate-pop-in">
                                    <img src={msg.avatar} alt={msg.userName} className="w-full h-full object-cover" />
                                </div>
                            ) : <div className="w-8" />}
                        </div>

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative min-w-[120px] max-w-full`}>
                            {showHeader && !isMe && (
                                <span className="text-[11px] font-bold text-zinc-500 ml-1 mb-1">{msg.userName}</span>
                            )}

                            {/* Reply Context Bubble */}
                            {msg.replyTo && (
                                <div className={`mb-1 px-3 py-2 rounded-xl text-xs border-l-2 bg-zinc-200/80 dark:bg-zinc-900/80 border-zinc-400 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 w-full truncate opacity-80 ${isMe ? 'rounded-br-none mr-1' : 'rounded-bl-none ml-1'}`}>
                                    <span className="font-bold text-primary-500 dark:text-primary-400 block text-[10px] mb-0.5">{msg.replyTo.userName}</span>
                                    {msg.replyTo.text}
                                </div>
                            )}
                            
                            {/* POLL CARD */}
                            {msg.poll ? (
                                <div className={`p-4 rounded-2xl border ${isMe ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'} min-w-[250px] w-full`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <BarChart2 size={16} className={isMe ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-500 dark:text-zinc-400'} />
                                        <span className={`font-bold text-sm ${isMe ? 'text-primary-800 dark:text-primary-200' : 'text-zinc-800 dark:text-zinc-200'} break-words`}>Poll: {msg.poll.question}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {msg.poll.options.map(opt => {
                                            const voteCount = opt.votes.length;
                                            const isVoted = opt.votes.includes(currentUser.id);
                                            const totalVotes = msg.poll!.options.reduce((acc, o) => acc + o.votes.length, 0);
                                            const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                                            
                                            return (
                                                <button 
                                                    key={opt.id}
                                                    onClick={() => {
                                                        onVote && onVote(msg.id, opt.id);
                                                        SoundService.playClick();
                                                    }}
                                                    className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${isVoted ? 'border-primary-500 ring-1 ring-primary-500' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
                                                >
                                                    <div className="absolute top-0 left-0 bottom-0 bg-zinc-100 dark:bg-zinc-700/50 w-full" /> 
                                                    <div className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isVoted ? 'bg-primary-500/20 dark:bg-primary-600/40' : 'bg-zinc-300/40 dark:bg-zinc-600/40'}`} style={{ width: `${percent}%` }} />
                                                    <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium z-10">
                                                        <span className="text-zinc-900 dark:text-white flex items-center gap-2 truncate">
                                                            {opt.text}
                                                            {isVoted && <Check size={12} className="text-primary-500 dark:text-primary-400" />}
                                                        </span>
                                                        <span className="text-zinc-600 dark:text-zinc-300">{voteCount}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 text-right">
                                        {msg.poll.options.reduce((acc, o) => acc + o.votes.length, 0)} votes • {msg.poll.allowMultiple ? 'Multiple Choice' : 'Single Choice'}
                                    </p>
                                </div>
                            ) : (
                                /* Message Bubble */
                                <div 
                                    onDoubleClick={() => {
                                        onReact(msg.id, '❤️');
                                        SoundService.playClick();
                                    }}
                                    className={`relative px-4 py-2 rounded-2xl text-[15px] shadow-sm leading-relaxed break-words whitespace-pre-wrap transition-all cursor-pointer select-none ${
                                    isMe 
                                    ? 'bg-primary-600 text-white rounded-tr-sm' 
                                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-200 dark:border-zinc-700/50'
                                }`}
                                    style={{ overflowWrap: 'anywhere' }}
                                >
                                    {msg.text}
                                    
                                    <div 
                                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-primary-200' : 'text-zinc-400 dark:text-zinc-500'}`}
                                    >
                                        <span>{formatTime(msg.timestamp)}</span>
                                        {isMe && (
                                            isAllRead ? <CheckCheck size={14} className="text-primary-300" /> : <Check size={14} className="text-primary-300/70" />
                                        )}
                                    </div>

                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex gap-0.5 bg-white dark:bg-zinc-900 rounded-full px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 shadow-md whitespace-nowrap z-20 animate-pop-in`}>
                                            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                                const ids = userIds as string[];
                                                return (
                                                <span key={emoji} className="text-xs" title={ids.join(', ')}>{emoji} <span className="text-[9px] text-zinc-500 font-mono">{ids.length > 1 ? ids.length : ''}</span></span>
                                            )})}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Seen By Indicator */}
                            {isMe && !msg.poll && seenByUsers.length > 0 && (
                                <div className="flex flex-col items-end gap-0.5 mt-1 mr-1 animate-fade-in select-none">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-zinc-400">Seen by</span>
                                        {seenByUsers.length <= 2 ? (
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[150px]">
                                                {seenByUsers.map(u => u!.name.split(' ')[0]).join(', ')}
                                            </span>
                                        ) : (
                                            <div className="flex -space-x-1.5">
                                                {seenByUsers.slice(0, 3).map((u, i) => (
                                                    <img 
                                                        key={u!.id + i} 
                                                        src={u!.avatar} 
                                                        alt={u!.name} 
                                                        title={u!.name}
                                                        className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-zinc-900 bg-zinc-200"
                                                    />
                                                ))}
                                                {seenByUsers.length > 3 && (
                                                    <span className="w-3.5 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-1 ring-white dark:ring-zinc-900 flex items-center justify-center text-[8px] text-zinc-500 font-bold">
                                                        +{seenByUsers.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions Menu */}
                            <div className={`absolute top-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-sm z-10`}>
                                <button onClick={() => setReplyingTo(msg)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                    <Reply size={14} />
                                </button>
                                <button 
                                    onClick={(e) => toggleQuickMenu(e, msg.id)}
                                    onMouseEnter={(e) => { if(window.innerWidth > 768) toggleQuickMenu(e, msg.id) }}
                                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <Smile size={14} />
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
              </SwipeableMessage>
            </React.Fragment>
          );
        })}
        
        {/* Quick Reaction Menu (Fixed Portal) */}
        {activeQuickMenuId && quickMenuPos && (
            <div 
                className="fixed z-[9999] flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2 rounded-full shadow-2xl gap-2 animate-pop-in"
                style={{ ...quickMenuPos }}
                onMouseLeave={() => setActiveQuickMenuId(null)}
            >
                {REACTION_EMOJIS.map(emoji => (
                    <button 
                        key={emoji} 
                        onClick={() => {
                            onReact(activeQuickMenuId, emoji);
                            SoundService.playClick();
                            setActiveQuickMenuId(null);
                        }}
                        className="hover:scale-125 transition-transform text-xl p-1"
                    >
                        {emoji}
                    </button>
                ))}
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
                <button 
                    onClick={() => {
                        setActiveReactionMessageId(activeQuickMenuId);
                        setShowFullEmojiPicker(true);
                        SoundService.playClick();
                        setActiveQuickMenuId(null);
                    }}
                    className="hover:scale-110 transition-transform p-1 text-zinc-400 hover:text-primary-500"
                    title="More Emojis"
                >
                    <Plus size={20} />
                </button>
            </div>
        )}

        {activeTypingUsers.length > 0 && (
             <div className="flex items-center gap-2 ml-10 animate-fade-in mt-2 relative z-0">
                 <div className="bg-white/80 dark:bg-zinc-800/80 px-4 py-2 rounded-full rounded-tl-none border border-zinc-200 dark:border-zinc-700/50 flex items-center gap-2">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                        {activeTypingUsers.length > 2 
                            ? 'Several people are typing...' 
                            : `${activeTypingUsers.map(u => u.userName.split(' ')[0]).join(', ')} is typing...`
                        }
                    </span>
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} className="h-6" /> 
      </div>
      
      {showScrollButton && (
        <button 
            onClick={() => {
                scrollToBottom('smooth');
                SoundService.playClick();
            }}
            className="absolute bottom-24 right-6 bg-white dark:bg-zinc-800 text-primary-500 p-2.5 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 transition-transform active:scale-95 z-50 animate-bounce"
        >
            <ArrowDown size={24} />
        </button>
      )}

      {/* Full Emoji Picker Modal (FIXED POSITIONING) */}
      {showFullEmojiPicker && (
          <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="relative shadow-2xl rounded-xl overflow-hidden max-w-[90vw] max-h-[80vh]">
                  <button 
                    onClick={() => {
                        setShowFullEmojiPicker(false);
                        setActiveReactionMessageId(null);
                    }}
                    className="absolute top-2 right-2 z-10 p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full text-zinc-500 hover:text-red-500"
                  >
                      <X size={16} />
                  </button>
                  <EmojiPicker 
                    theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                    onEmojiClick={onEmojiClick}
                    searchDisabled={false}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    width={320}
                    height={400}
                    style={{ maxWidth: '100%' }}
                  />
              </div>
          </div>
      )}

      {/* Poll Creator Modal */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg flex items-center gap-2 text-zinc-900 dark:text-white"><BarChart2 className="text-primary-500" /> Create Poll</h3>
                     <button onClick={() => setShowPollCreator(false)} className="text-zinc-500 hover:text-red-500"><X size={20}/></button>
                 </div>
                 
                 <input 
                    type="text"
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white transition-all"
                 />
                 
                 <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                     {pollOptions.map((opt, i) => (
                         <div key={i} className="flex gap-2">
                             <input 
                                type="text"
                                placeholder={`Option ${i+1}`}
                                value={opt}
                                onChange={e => {
                                    const newOpts = [...pollOptions];
                                    newOpts[i] = e.target.value;
                                    setPollOptions(newOpts);
                                }}
                                className="flex-1 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 dark:text-white transition-all"
                             />
                             {pollOptions.length > 2 && (
                                 <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500"><Trash2 size={18}/></button>
                             )}
                         </div>
                     ))}
                 </div>
                 
                 <button 
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-sm text-primary-500 font-medium flex items-center gap-1 mb-4 hover:underline"
                 >
                     <Plus size={16} /> Add Option
                 </button>

                 <div className="flex items-center gap-2 mb-6" onClick={() => setPollAllowMultiple(!pollAllowMultiple)}>
                     <div className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${pollAllowMultiple ? 'bg-primary-500 border-primary-500' : 'border-zinc-400'}`}>
                         {pollAllowMultiple && <Check size={14} className="text-white" />}
                     </div>
                     <span className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">Allow multiple answers</span>
                 </div>

                 <button 
                    onClick={handleSendPoll}
                    disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                    className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all"
                 >
                     Send Poll
                 </button>
             </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 z-40">
        {replyingTo && (
            <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800/50 p-2 px-4 rounded-t-xl border-b border-zinc-200 dark:border-zinc-700/50 mb-2 animate-slide-up">
                <div className="flex flex-col text-sm border-l-2 border-primary-500 pl-2">
                    <span className="font-bold text-primary-500">{replyingTo.userName}</span>
                    <span className="text-zinc-500 truncate max-w-[200px]">{replyingTo.text}</span>
                </div>
                <button onClick={() => setReplyingTo(null)}><X size={16} className="text-zinc-400" /></button>
            </div>
        )}

        <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <button 
                onClick={() => setShowPollCreator(true)}
                className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/10 text-primary-500 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-colors"
                title="Create Poll"
            >
                <BarChart2 size={20} />
            </button>
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center border border-zinc-200 dark:border-zinc-800 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
                <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type a message..."
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-4 py-3 max-h-32 min-h-[48px] resize-none text-zinc-900 dark:text-white placeholder-zinc-500"
                    rows={1}
                />
            </div>
            <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className={`p-3 rounded-xl transition-all duration-200 ${
                    input.trim() 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20 hover:scale-105 active:scale-95' 
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                }`}
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default DiscussionBoard;