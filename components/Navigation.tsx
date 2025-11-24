import React from 'react';
import { ViewState } from '../types';
import { Home, MessageSquare, LogOut, User, MessageCircle, Download, BookOpen } from 'lucide-react';

interface Props {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout?: () => void;
  installPWA?: () => void;
  canInstall?: boolean;
}

const Navigation: React.FC<Props> = ({ currentView, setView, onLogout, installPWA, canInstall }) => {
  const navItems = [
    { view: ViewState.DASHBOARD, icon: Home, label: 'Overview' },
    { view: ViewState.DISCUSS, icon: MessageSquare, label: 'Chat' },
    { view: ViewState.STUDY, icon: BookOpen, label: 'Study' },
    { view: ViewState.PROFILE, icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-primary-100 dark:border-zinc-800 px-2 py-3 z-50 shadow-2xl transition-colors duration-300 safe-area-bottom">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${
                currentView === item.view ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-primary-500 dark:hover:text-primary-300'
              }`}
            >
              <item.icon size={24} strokeWidth={currentView === item.view ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar Nav */}
      <div className="hidden md:flex flex-col w-64 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-r border-primary-100 dark:border-zinc-800 h-screen fixed left-0 top-0 p-6 z-50 transition-colors duration-300 shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl shadow-lg shadow-primary-500/30">
                <Home className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">ClassMate</h1>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left ${
                currentView === item.view 
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold shadow-sm' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-primary-600 dark:hover:text-primary-300 hover:shadow-sm'
              }`}
            >
              <item.icon size={24} strokeWidth={currentView === item.view ? 2.5 : 2} />
              <span className="text-lg">{item.label}</span>
            </button>
          ))}
          
           <button
              onClick={() => setView(ViewState.FEEDBACK)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left ${
                currentView === ViewState.FEEDBACK 
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold shadow-sm' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-primary-600 dark:hover:text-primary-300 hover:shadow-sm'
              }`}
            >
              <MessageCircle size={24} strokeWidth={currentView === ViewState.FEEDBACK ? 2.5 : 2} />
              <span className="text-lg">Feedback</span>
            </button>
        </nav>

        {canInstall && installPWA && (
            <button
                onClick={installPWA}
                className="flex items-center gap-4 px-4 py-4 mb-4 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors mt-4 border border-dashed border-emerald-200 dark:border-emerald-800"
            >
                <Download size={24} />
                <span className="text-lg font-medium">Install App</span>
            </button>
        )}

        {onLogout && (
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 px-4 py-4 mt-2 text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
          >
            <LogOut size={24} />
            <span className="text-lg font-medium">Log Out</span>
          </button>
        )}
      </div>
    </>
  );
};

export default Navigation;