import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { Send, Users, MessageSquare } from 'lucide-react';

interface Props {
  currentUser: User;
  users: User[];
  messages: Message[];
  onSendMessage: (text: string) => void;
}

const DiscussionBoard: React.FC<Props> = ({ currentUser, users, messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Scroll to bottom when new messages arrive, but only if user was already at bottom
  useEffect(() => {
    if (shouldAutoScroll) {
       bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Check if user is near bottom (within 50px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldAutoScroll(isNearBottom);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    setShouldAutoScroll(true); // Force scroll on own message
  };

  const onlineCount = users.filter(u => (Date.now() - (u.lastSeen || 0)) < 15000).length;

  return (
    <div className="flex flex-col h-full bg-zinc-900 md:rounded-3xl md:border border-zinc-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-zinc-900/90 backdrop-blur-md p-4 border-b border-zinc-800 flex justify-between items-center z-10 sticky top-0 shrink-0">
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
        className="flex-grow overflow-y-auto bg-zinc-950/30 p-4 space-y-6 scroll-smooth"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-60">
                <div className="bg-zinc-800/50 p-4 rounded-full mb-3">
                   <MessageSquare size={32} />
                </div>
                <p className="text-base font-medium">No messages yet</p>
                <p className="text-xs">Coordinate with the squad now!</p>
            </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.userId === currentUser.id;
          const showHeader = index === 0 || messages[index-1].userId !== msg.userId;
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
              
              <div className={`flex gap-2 max-w-[85%] md:max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 flex-shrink-0 flex flex-col items-center">
                    {showHeader ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-zinc-900/50">
                             <img src={msg.avatar} alt={msg.userName} className="w-full h-full object-cover" />
                        </div>
                    ) : <div className="w-8" />}
                </div>

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showHeader && !isMe && (
                        <span className="text-[11px] font-bold text-zinc-500 ml-1 mb-1">{msg.userName}</span>
                    )}
                    
                    <div className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-sm leading-relaxed break-words relative group transition-all ${
                        isMe 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700/50'
                    }`}>
                        {msg.text}
                    </div>
                    <span className="text-[10px] text-zinc-600 mt-1 px-1 font-medium opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="bg-zinc-900 p-3 md:p-4 border-t border-zinc-800 flex gap-2 items-end z-20 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
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
  );
};

export default DiscussionBoard;