import React from 'react';
import { User, StatusType } from '../types';
import { Check, X, CircleDashed, Lightbulb, AlertTriangle, PartyPopper } from 'lucide-react';

interface Props {
  user: User;
  status: StatusType;
  onUpdateStatus: (status: StatusType) => void;
  recommendation?: {
    shouldGo: boolean;
    message: string;
    severity: 'critical' | 'moderate' | 'safe';
  };
  dateLabel: string;
}

const StatusCard: React.FC<Props> = ({ user, status, onUpdateStatus, recommendation, dateLabel }) => {
  
  const getSeverityStyle = (severity?: string) => {
    switch(severity) {
      case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-200', icon: AlertTriangle, iconColor: 'text-red-500' };
      case 'moderate': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-200', icon: Lightbulb, iconColor: 'text-amber-500' };
      case 'safe': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-200', icon: PartyPopper, iconColor: 'text-green-500' };
      default: return { bg: 'bg-zinc-800', border: 'border-zinc-700', text: 'text-zinc-400', icon: Lightbulb, iconColor: 'text-zinc-400' };
    }
  };

  const style = getSeverityStyle(recommendation?.severity);
  const Icon = style.icon;

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-800 shadow-sm space-y-6">
      
      {recommendation ? (
        <div className={`p-5 rounded-2xl border flex gap-4 ${style.bg} ${style.border} animate-fade-in relative overflow-hidden`}>
           {/* Background Decoration */}
           <Icon className={`absolute -right-4 -top-4 opacity-10 ${style.iconColor}`} size={100} />
           
           <div className={`mt-1 shrink-0 bg-zinc-950/30 p-2.5 rounded-xl backdrop-blur-sm`}>
             <Icon size={24} className={style.iconColor} />
           </div>
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-1">
                 <span className={`text-xs font-bold uppercase tracking-wider opacity-70 ${style.text}`}>AI Insight</span>
             </div>
             <p className={`font-bold text-lg md:text-xl mb-1 text-white`}>
                {recommendation.shouldGo ? "Recommendation: Go to School" : "Recommendation: Safe to Skip"}
             </p>
             <p className={`text-sm md:text-base opacity-90 leading-relaxed ${style.text}`}>
                {recommendation.message}
             </p>
           </div>
        </div>
      ) : (
        <h2 className="text-zinc-400 text-sm md:text-base font-semibold uppercase tracking-wider">{dateLabel}'s Decision</h2>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onUpdateStatus('GOING')}
          className={`group flex items-center justify-center gap-4 sm:flex-col sm:gap-4 p-4 md:p-6 rounded-2xl border-2 transition-all duration-200 ${
            status === 'GOING' 
              ? 'bg-green-500/10 border-green-600 text-green-400' 
              : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${status === 'GOING' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-zinc-800'}`}>
             <Check size={28} strokeWidth={3} />
          </div>
          <span className="text-lg md:text-xl font-bold">Going</span>
        </button>

        <button
          onClick={() => onUpdateStatus('NOT_GOING')}
          className={`group flex items-center justify-center gap-4 sm:flex-col sm:gap-4 p-4 md:p-6 rounded-2xl border-2 transition-all duration-200 ${
            status === 'NOT_GOING' 
              ? 'bg-red-500/10 border-red-600 text-red-400' 
              : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${status === 'NOT_GOING' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-zinc-800'}`}>
             <X size={28} strokeWidth={3} />
          </div>
          <span className="text-lg md:text-xl font-bold">Not Going</span>
        </button>

        <button
          onClick={() => onUpdateStatus('UNDECIDED')}
          className={`group flex items-center justify-center gap-4 sm:flex-col sm:gap-4 p-4 md:p-6 rounded-2xl border-2 transition-all duration-200 ${
            status === 'UNDECIDED' 
              ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
              : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${status === 'UNDECIDED' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/50' : 'bg-zinc-800'}`}>
             <CircleDashed size={28} strokeWidth={3} />
          </div>
          <span className="text-lg md:text-xl font-bold">Deciding</span>
        </button>
      </div>
    </div>
  );
};

export default StatusCard;