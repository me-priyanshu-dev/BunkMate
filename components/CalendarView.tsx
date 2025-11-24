import React from 'react';
import { DailyStatus, User } from '../types';
import { Check, X } from 'lucide-react';

interface Props {
  statuses: DailyStatus[];
  currentUser: User;
}

const CalendarView: React.FC<Props> = ({ statuses, currentUser }) => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay(); // 0 is Sunday

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getStatusForDay = (day: number) => {
    // Correctly construct date string in local time YYYY-MM-DD
    const d = new Date(today.getFullYear(), today.getMonth(), day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    return statuses.find(s => s.date === dateStr && s.userId === currentUser.id)?.status;
  };

  const renderDayStatus = (status?: string) => {
    switch (status) {
      case 'GOING':
        return <div className="absolute inset-0 m-1 bg-green-500/20 flex items-center justify-center rounded-lg border border-green-500/30"><Check size={16} className="text-green-400" strokeWidth={3} /></div>;
      case 'NOT_GOING': // Updated check
      case 'BUNK': // Legacy check
        return <div className="absolute inset-0 m-1 bg-red-500/20 flex items-center justify-center rounded-lg border border-red-500/30"><X size={16} className="text-red-400" strokeWidth={3} /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-800 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-zinc-300 font-semibold text-lg">Attendance Log</h3>
        <span className="text-sm font-medium text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-sm text-zinc-600 font-bold">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square"></div>
        ))}
        {days.map((day) => {
          const status = getStatusForDay(day);
          const isToday = day === today.getDate();
          return (
            <div 
              key={day} 
              className={`aspect-square rounded-xl flex items-start justify-start p-1 relative text-sm font-medium transition-colors ${
                  isToday ? 'bg-zinc-800 ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900' : 'bg-zinc-950 hover:bg-zinc-800'
              }`}
            >
              <span className={`z-10 ml-1 mt-0.5 ${status ? 'text-[10px] text-zinc-500' : 'text-zinc-400'}`}>{day}</span>
              {renderDayStatus(status)}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center gap-8 text-sm text-zinc-400 font-medium">
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/20 border border-green-500/50 rounded flex items-center justify-center">
                <Check size={10} className="text-green-400" />
            </div>
            <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border border-red-500/50 rounded flex items-center justify-center">
                <X size={10} className="text-red-400" />
            </div>
            <span>Not Going</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;