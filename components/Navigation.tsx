
import React from 'react';
import { ViewState } from '../types';
import { Home, BarChart2, MessageSquare, Bot, LogOut, User, MessageCircle } from 'lucide-react';

interface Props {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout?: () => void;
}

const Navigation: React.FC<Props> = ({ currentView, setView, onLogout }) => {
  const navItems = [
    { view: ViewState.DASHBOARD, icon: Home, label: 'Overview' },
    { view: ViewState.DISCUSS, icon: MessageSquare, label: 'Chat' },
    { view: ViewState.STATS, icon: BarChart2, label: 'Stats' },
    { view: ViewState.ADVISOR, icon: Bot, label: 'Advisor' },
    { view: ViewState.PROFILE, icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 z-50 shadow-2xl transition-colors duration-300">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex flex-col items-center space-y-1.5 transition-colors ${
                currentView === item.view ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <item.icon size={26} strokeWidth={currentView === item.view ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar Nav */}
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-screen fixed left-0 top-0 p-6 z-50 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Home className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">BunkMate</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left ${
                currentView === item.view 
                  ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500 font-semibold' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
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
                  ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500 font-semibold' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <MessageCircle size={24} strokeWidth={currentView === ViewState.FEEDBACK ? 2.5 : 2} />
              <span className="text-lg">Feedback</span>
            </button>
        </nav>

        {onLogout && (
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 px-4 py-4 mt-auto text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
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
