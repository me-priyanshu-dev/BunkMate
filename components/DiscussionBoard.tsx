import React, { useState, useEffect, useRef } from 'react';
import { User, Message, TypingStatus, Poll } from '../types';
import { Send, Users, MessageSquare, Reply, Smile, Check, CheckCheck, ChevronDown, ArrowDown, BarChart2, Plus, X, Trash2 } from 'lucide-react';

interface Props {
  currentUser: User;
  users: User[];
  messages: Message[];
  onSendMessage: (text: string, replyTo?: Message, poll?: Poll) => void;
  onSendTyping: (isTyping: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  typingUsers: TypingStatus[];
  onVote?: (messageId: string, optionId: string) => void;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

const DiscussionBoard: React.FC<Props> = ({ currentUser, users, messages, onSendMessage, onSendTyping, onReact, typingUsers, onVote }) => {
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollHeight = useRef<number>(0);
  
  // Poll Creator State
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Auto-scroll logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    // If we are near bottom or if it's the very first load/few messages
    if (isNearBottom || messages.length < 5) {
        container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    } else {
        // If we are not at bottom and new message arrives, show button
        setShowScrollButton(true);
    }
    lastScrollHeight.current = scrollHeight;
  }, [messages.length, typingUsers]); 

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({ 
        top: scrollContainerRef.current.scrollHeight, 
        behavior: 'smooth' 
    });
    setShowScrollButton(false);
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
    setInput('');
    setReplyingTo(null);
    onSendTyping(false);
    setTimeout(() => scrollToBottom(), 50);
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
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setTimeout(() => scrollToBottom(), 50);
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
    <div className="flex flex-col h-full bg-zinc-900 md:rounded-3xl md:border border-zinc-800 overflow-hidden shadow-xl relative">
      {/* Header */}
      <div className="bg-zinc-900/95 backdrop-blur-md p-4 border-b border-zinc-800 flex justify-between items-center z-50 sticky top-0 shrink-0 shadow-sm">
        <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <MessageSquare className="text-blue-500" size={20} />
              Squad Chat
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                    {onlineCount} Online
                </span>
                <span className="text-zinc-600 text-[10px]">•</span>
                <span className="text-xs text-zinc-500 font-mono tracking-wider bg-zinc-800/50 px-1.5 py-0.5 rounded">{currentUser.classCode}</span>
            </div>
        </div>
        <div className="bg-zinc-800 p-2 rounded-full text-zinc-400">
            <Users size={18} />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-grow overflow-y-auto bg-zinc-950/50 p-4 space-y-2 scroll-smooth"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-60">
                <div className="bg-zinc-800/50 p-4 rounded-full mb-3">
                   <MessageSquare size={32} />
                </div>
                <p className="text-base font-medium">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
            </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUser.id;
          const showHeader = index === 0 || messages[index-1].userId !== msg.userId;
          const isNearTop = index < 3; 
          const othersRead = msg.readBy?.some(id => id !== currentUser.id);
          const isAllRead = othersRead; 
          
          // Date Separator Logic
          const prevMsg = messages[index - 1];
          const showDateSeparator = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                  <div className="flex justify-center my-4">
                      <span className="bg-zinc-800/80 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-zinc-700/50">
                          {formatDateLabel(msg.timestamp)}
                      </span>
                  </div>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group mb-4 relative z-0 hover:z-30`}>
              
                <div className={`flex gap-2 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 flex-shrink-0 flex flex-col items-center">
                        {showHeader ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-zinc-900/50 mt-1">
                                <img src={msg.avatar} alt={msg.userName} className="w-full h-full object-cover" />
                            </div>
                        ) : <div className="w-8" />}
                    </div>

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative min-w-[140px]`}>
                        {showHeader && !isMe && (
                            <span className="text-[11px] font-bold text-zinc-500 ml-1 mb-1">{msg.userName}</span>
                        )}

                        {/* Reply Context Bubble */}
                        {msg.replyTo && (
                            <div className={`mb-1 px-3 py-2 rounded-xl text-xs border-l-2 bg-zinc-900/80 border-zinc-600 text-zinc-400 w-full max-w-full truncate opacity-80 ${isMe ? 'rounded-br-none mr-1' : 'rounded-bl-none ml-1'}`}>
                                <span className="font-bold text-blue-400 block text-[10px] mb-0.5">{msg.replyTo.userName}</span>
                                {msg.replyTo.text}
                            </div>
                        )}
                        
                        {/* POLL CARD */}
                        {msg.poll ? (
                            <div className={`p-4 rounded-2xl border ${isMe ? 'bg-blue-900/20 border-blue-800' : 'bg-zinc-800 border-zinc-700'} min-w-[250px]`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <BarChart2 size={16} className={isMe ? 'text-blue-400' : 'text-zinc-400'} />
                                    <span className={`font-bold text-sm ${isMe ? 'text-blue-200' : 'text-zinc-200'}`}>Poll: {msg.poll.question}</span>
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
                                                onClick={() => onVote && onVote(msg.id, opt.id)}
                                                className={`w-full relative h-10 rounded-lg overflow-hidden border transition-all ${isVoted ? 'border-blue-500 ring-1 ring-blue-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                                            >
                                                <div className="absolute top-0 left-0 bottom-0 bg-zinc-700/50 w-full" /> 
                                                <div className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isVoted ? 'bg-blue-600/40' : 'bg-zinc-600/40'}`} style={{ width: `${percent}%` }} />
                                                <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium z-10">
                                                    <span className="text-white flex items-center gap-2">
                                                        {opt.text}
                                                        {isVoted && <Check size={12} className="text-blue-400" />}
                                                    </span>
                                                    <span className="text-zinc-300">{voteCount}</span>
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
                                onDoubleClick={() => onReact(msg.id, '❤️')}
                                className={`relative px-4 py-2 rounded-2xl text-[15px] shadow-sm leading-relaxed break-words transition-all cursor-pointer select-none ${
                                isMe 
                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700/50'
                            }`}>
                                {msg.text}
                                
                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-blue-200' : 'text-zinc-500'}`}>
                                    <span>{formatTime(msg.timestamp)}</span>
                                    {isMe && (
                                        isAllRead ? <CheckCheck size={14} className="text-blue-300" /> : <Check size={14} className="text-blue-300/70" />
                                    )}
                                </div>

                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex gap-0.5 bg-zinc-900 rounded-full px-1.5 py-0.5 border border-zinc-800 shadow-md whitespace-nowrap z-20`}>
                                        {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                            <span key={emoji} className="text-xs" title={userIds.join(', ')}>{emoji} <span className="text-[9px] text-zinc-500 font-mono">{userIds.length > 1 ? userIds.length : ''}</span></span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions Menu (Hover) */}
                        <div className={`absolute top-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 shadow-xl backdrop-blur-sm z-10`}>
                            <button onClick={() => setReplyingTo(msg)} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                                <Reply size={14} />
                            </button>
                            <div className="relative group/emoji">
                                <button className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                                    <Smile size={14} />
                                </button>
                                <div className={`absolute ${isNearTop ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 hidden group-hover/emoji:flex bg-zinc-900 border border-zinc-700 p-1.5 rounded-full shadow-xl gap-1 z-50`}>
                                    {REACTION_EMOJIS.map(emoji => (
                                        <button 
                                            key={emoji} 
                                            onClick={() => onReact(msg.id, emoji)}
                                            className="hover:scale-125 transition-transform text-base p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {activeTypingUsers.length > 0 && (
             <div className="flex items-center gap-2 ml-10 animate-fade-in mt-2">
                 <div className="bg-zinc-800/80 px-4 py-2 rounded-full rounded-tl-none border border-zinc-700/50 flex items-center gap-2">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-xs text-zinc-400 italic">
                        {activeTypingUsers.length > 2 
                            ? 'Several people are typing...' 
                            : `${activeTypingUsers.map(u => u.userName.split(' ')[0]).join(', ')} is typing...`
                        }
                    </span>
                 </div>
             </div>
        )}
        <div className="h-4" /> 
      </div>
      
      {showScrollButton && (
        <button 
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 bg-zinc-800 text-blue-400 p-2 rounded-full shadow-lg border border-zinc-700 hover:bg-zinc-700 transition-all z-30 animate-bounce"
        >
            <ArrowDown size={20} />
        </button>
      )}

      {/* Poll Creator Modal */}
      {showPollCreator && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold flex items-center gap-2"><BarChart2 className="text-blue-500" /> Create Poll</h3>
                      <button onClick={() => setShowPollCreator(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                  </div>
                  
                  <input 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white mb-4 focus:border-blue-500 outline-none" 
                    placeholder="Ask a question..." 
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                  />
                  
                  <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                      {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                              <input 
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none"
                                placeholder={`Option ${idx + 1}`}
                                value={opt}
                                onChange={e => {
                                    const newOpts = [...pollOptions];
                                    newOpts[idx] = e.target.value;
                                    setPollOptions(newOpts);
                                }}
                              />
                              {pollOptions.length > 2 && (
                                  <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-red-400 hover:bg-red-500/10 p-2 rounded">
                                      <Trash2 size={16} />
                                  </button>
                              )}
                          </div>
                      ))}
                      {pollOptions.length < 5 && (
                          <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-blue-400 text-sm flex items-center gap-1 hover:underline">
                              <Plus size={14} /> Add Option
                          </button>
                      )}
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                      <input 
                        type="checkbox" 
                        id="multi" 
                        checked={pollAllowMultiple} 
                        onChange={e => setPollAllowMultiple(e.target.checked)} 
                        className="rounded bg-zinc-800 border-zinc-700"
                      />
                      <label htmlFor="multi" className="text-zinc-400 text-sm cursor-pointer select-none">Allow multiple selections</label>
                  </div>

                  <button 
                    onClick={handleSendPoll}
                    disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                      Create Poll
                  </button>
              </div>
          </div>
      )}

      {/* Input Area */}
      <div className="bg-zinc-900 border-t border-zinc-800 z-20 shrink-0">
        {replyingTo && (
            <div className="bg-zinc-950/50 px-4 py-2 flex justify-between items-center border-b border-zinc-800/50 border-l-4 border-l-blue-500 mx-4 mt-2 rounded-r-lg">
                <div className="overflow-hidden">
                    <span className="text-blue-400 text-xs font-bold block">Replying to {replyingTo.userName}</span>
                    <p className="text-zinc-400 text-xs truncate">{replyingTo.text}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white p-1">
                    <ChevronDown size={16} />
                </button>
            </div>
        )}
        
        <div className="p-3 md:p-4 flex gap-2 items-end">
            <button 
                onClick={() => setShowPollCreator(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-blue-400 w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-colors border border-zinc-700"
                title="Create Poll"
            >
                <BarChart2 size={20} />
            </button>
            
            <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
                }
            }}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            rows={1}
            className="flex-grow bg-zinc-950 text-white text-base rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-zinc-800 placeholder-zinc-600 transition-all resize-none min-h-[48px] max-h-[120px]"
            style={{ height: 'auto', overflow: 'hidden' }} 
            />
            <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-all shadow-lg active:scale-95"
            >
            <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default DiscussionBoard;