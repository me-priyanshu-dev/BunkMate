
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Moon, Sun, RefreshCw, Save, Hash, MessageCircle, Calendar } from 'lucide-react';

interface Props {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigateToFeedback: () => void;
}

const ProfileSettings: React.FC<Props> = ({ user, onUpdateUser, isDarkMode, toggleTheme, onNavigateToFeedback }) => {
  const [name, setName] = useState(user.name);
  const [targetDays, setTargetDays] = useState(user.targetDaysPerWeek || 4);
  const [avatarSeed, setAvatarSeed] = useState(user.avatar.split('seed=')[1]?.split('&')[0] || 'default');
  const [examName, setExamName] = useState(user.examName || '');
  const [examDate, setExamDate] = useState(user.examDate || '');
  const [selectedTheme, setSelectedTheme] = useState<'blue' | 'purple' | 'emerald'>(user.theme || 'blue');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    onUpdateUser({ 
        name, 
        targetDaysPerWeek: targetDays, 
        avatar: newAvatar,
        examName,
        examDate,
        theme: selectedTheme
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const regenerateAvatar = () => {
    setAvatarSeed(Math.random().toString(36).substring(7));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-10 border border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-2xl text-primary-600 dark:text-primary-400">
            <UserIcon size={32} />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Edit Profile</h2>
      </div>

      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-8 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-zinc-100 dark:ring-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                    <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                        alt="Preview" 
                        className="w-full h-full object-cover animate-pop-in" 
                    />
                </div>
                <button 
                    onClick={regenerateAvatar}
                    className="absolute bottom-1 right-1 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-500 transition-transform active:scale-95"
                    title="Generate New Avatar"
                >
                    <RefreshCw size={18} />
                </button>
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Profile Picture</h3>
                <p className="text-zinc-500 text-sm">Click the refresh icon to generate a new unique avatar.</p>
            </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Display Name</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-0 transition-colors"
                />
            </div>

            {/* Exam Settings */}
            <div className="bg-zinc-50 dark:bg-zinc-950/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-zinc-900 dark:text-white font-medium">
                    <Calendar size={18} className="text-primary-500" />
                    <h3>Exam Countdown</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Target Exam</label>
                        <input 
                            type="text" 
                            placeholder="e.g. JEE Mains"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Exam Date</label>
                        <input 
                            type="date" 
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-0"
                        />
                    </div>
                </div>
            </div>
            
             <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Class Code (Read Only)</label>
                <div className="relative">
                    <Hash size={18} className="absolute left-4 top-3.5 text-zinc-400" />
                    <input 
                        type="text" 
                        value={user.classCode}
                        readOnly
                        className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-mono focus:outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Weekly Attendance Target (Days)</label>
                <div className="flex gap-2">
                    {[1,2,3,4,5,6].map(num => (
                        <button
                            key={num}
                            onClick={() => setTargetDays(num)}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                targetDays === num 
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            {/* Theme Selector */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">App Theme</label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setSelectedTheme('blue')}
                        className={`py-3 rounded-xl font-medium transition-all border-2 ${
                            selectedTheme === 'blue' 
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                        <span className="block w-6 h-6 rounded-full bg-blue-600 mx-auto mb-1"></span>
                        Classic Blue
                    </button>
                    <button
                        onClick={() => setSelectedTheme('purple')}
                        className={`py-3 rounded-xl font-medium transition-all border-2 ${
                            selectedTheme === 'purple' 
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' 
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                        <span className="block w-6 h-6 rounded-full bg-violet-600 mx-auto mb-1"></span>
                        Royal Purple
                    </button>
                    <button
                        onClick={() => setSelectedTheme('emerald')}
                        className={`py-3 rounded-xl font-medium transition-all border-2 ${
                            selectedTheme === 'emerald' 
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' 
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                    >
                        <span className="block w-6 h-6 rounded-full bg-emerald-600 mx-auto mb-1"></span>
                        Nature
                    </button>
                </div>
            </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="text-violet-400" /> : <Sun className="text-amber-500" />}
                <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Dark Mode</h4>
                    <p className="text-xs text-zinc-500">{isDarkMode ? 'Active' : 'Inactive'}</p>
                </div>
            </div>
            <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isDarkMode ? 'bg-primary-600' : 'bg-zinc-300'}`}
            >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>

        <button 
            onClick={handleSave}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isSaved 
                ? 'bg-green-600 text-white' 
                : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/20 active:scale-95'
            }`}
        >
            {isSaved ? 'Changes Saved!' : <><Save size={20} /> Save Changes</>}
        </button>

        {/* Feedback Section */}
        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Have a suggestion or found a bug?</p>
            <button 
                onClick={onNavigateToFeedback}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium transition-colors"
            >
                <MessageCircle size={18} />
                Give Feedback
            </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileSettings;
