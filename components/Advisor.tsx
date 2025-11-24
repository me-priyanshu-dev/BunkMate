import React, { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { User, DailyStatus, AttendanceStats } from '../types';
import { askGeminiAdvisor } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Props {
  users: User[];
  todayStatus: DailyStatus[];
  myStats: AttendanceStats;
  userGoal: number;
  dateLabel: string;
}

const Advisor: React.FC<Props> = ({ users, todayStatus, myStats, userGoal, dateLabel }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const handleAsk = async () => {
    if (loading) return;
    setLoading(true);
    const result = await askGeminiAdvisor(todayStatus, users, myStats, userGoal, "Sunny", query, dateLabel);
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 md:rounded-3xl border-0 md:border border-zinc-800 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="p-6 md:p-8 pb-4 shrink-0">
             <div className="flex items-center gap-4">
                <div className="bg-violet-600/20 p-3 rounded-xl shrink-0">
                    <Bot className="text-violet-400" size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">AI Advisor</h2>
                    <p className="text-zinc-400 text-sm">Strategic Consultant ({dateLabel})</p>
                </div>
            </div>
        </div>

        {/* Content Area - Flex Grow to take available space */}
        <div className="flex-grow overflow-y-auto px-6 md:px-8 space-y-4">
          {!advice && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-zinc-500">
              <Sparkles className="mb-4 text-zinc-700" size={48} />
              <p className="text-lg font-medium text-zinc-400">"Should I go {dateLabel.toLowerCase()}?"</p>
              <p className="text-sm mt-2 max-w-xs mx-auto text-zinc-600">I analyze your squad's status, majority vote, and your attendance goals.</p>
            </div>
          )}

          {loading && (
             <div className="flex flex-col items-center justify-center h-full min-h-[200px] space-y-4">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-base text-violet-400 font-medium animate-pulse">Consulting the algorithm...</p>
             </div>
          )}

          {advice && !loading && (
            <div className="bg-zinc-800/80 rounded-2xl p-5 md:p-6 text-zinc-100 border border-zinc-700/50 leading-relaxed text-base md:text-lg shadow-lg animate-fade-in mb-4">
                <div className="prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-strong:text-violet-200">
                    <ReactMarkdown>{advice}</ReactMarkdown>
                </div>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom via flex layout (not absolute) */}
        <div className="shrink-0 p-4 md:p-6 bg-zinc-900 border-t border-zinc-800 z-10">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder={`Ask about ${dateLabel.toLowerCase()}...`}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-5 pr-14 py-3.5 md:py-4 text-base text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 placeholder-zinc-600 transition-all shadow-inner"
            />
            <button 
              onClick={handleAsk}
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-violet-600 hover:bg-violet-500 text-white w-10 md:w-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale hover:scale-105 active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
    </div>
  );
};

export default Advisor;