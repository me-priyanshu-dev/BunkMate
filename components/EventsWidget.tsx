
import React, { useState } from 'react';
import { CalendarEvent, EventType } from '../types';
import { Calendar, Plus, AlertTriangle, Info, Star, X, PartyPopper } from 'lucide-react';
import { SoundService } from '../services/soundService';

interface Props {
  events: CalendarEvent[];
  onAddEvent: (title: string, type: EventType) => void;
  dateLabel: string;
}

const EventsWidget: React.FC<Props> = ({ events, onAddEvent, dateLabel }) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('INFO');

  const handleSave = () => {
    if (!title.trim()) return;
    onAddEvent(title, type);
    SoundService.playClick();
    setShowModal(false);
    setTitle('');
    setType('INFO');
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'CRITICAL': return <AlertTriangle size={20} className="text-red-500" />;
      case 'IMPORTANT': return <Star size={20} className="text-amber-500" />;
      case 'FUN': return <PartyPopper size={20} className="text-green-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  const getEventStyle = (type: EventType) => {
    switch (type) {
      case 'CRITICAL': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      case 'IMPORTANT': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
      case 'FUN': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-lg uppercase tracking-wider">
                <Calendar size={20} className="text-blue-500" />
                Class Agenda
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                Events for <span className="font-semibold text-zinc-800 dark:text-zinc-200">{dateLabel}</span>
            </p>
        </div>
        <button 
            onClick={() => { setShowModal(true); SoundService.playClick(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
            <Plus size={18} /> Add Event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 md:h-64 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/50">
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3">
                    <Calendar size={32} className="text-zinc-300 dark:text-zinc-600" />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">No events scheduled.</p>
                <p className="text-zinc-400 text-xs mt-1">Add tests, labs, or holidays!</p>
            </div>
        ) : (
            <div className="space-y-3">
                {events.map(event => (
                    <div key={event.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${getEventStyle(event.type)} animate-pop-in shadow-sm`}>
                        <div className="shrink-0 p-2 bg-white/50 dark:bg-black/20 rounded-xl">{getEventIcon(event.type)}</div>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-lg leading-tight">{event.title}</p>
                            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                                Added by <span className="font-medium underline decoration-dotted">{event.createdBy}</span>
                            </p>
                        </div>
                        <div className="text-xs font-mono font-medium opacity-60 bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                            {event.type}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-xl text-zinc-900 dark:text-white">Add Agenda Item</h4>
                    <button onClick={() => setShowModal(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-red-500"><X size={20}/></button>
                </div>
                
                <div className="mb-5">
                    <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Event Title</label>
                    <input 
                        type="text"
                        placeholder="e.g. Physics Lab, Math Test"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        autoFocus
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-lg text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Priority Level</label>
                    <div className="grid grid-cols-2 gap-3">
                        {(['CRITICAL', 'IMPORTANT', 'INFO', 'FUN'] as EventType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`text-xs font-bold py-3 rounded-xl border transition-all ${
                                    type === t 
                                    ? getEventStyle(t) + ' ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' 
                                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    Add to Agenda
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default EventsWidget;
