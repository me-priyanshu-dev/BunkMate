import React, { useState, useEffect } from 'react';
import { GraduationCap, ArrowRight, ShieldCheck, UserPlus, LogIn, Hash, Target, AlertCircle } from 'lucide-react';
import { getAllUsers, checkNameExists } from '../services/mockData';
import { User } from '../types';
import { SoundService } from '../services/soundService';

interface Props {
  onComplete: (name: string, classCode: string, targetDays: number, isNew: boolean, existingUser?: User) => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [targetDays, setTargetDays] = useState(4);
  const [error, setError] = useState('');
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [view, setView] = useState<'LIST' | 'CREATE'>('CREATE');

  useEffect(() => {
    const users = getAllUsers();
    // Only show users that were created on this device as "Log in" options
    const myUsers = users.filter(u => u.isCurrentUser);
    setExistingUsers(myUsers);
    if (myUsers.length > 0) {
      setView('LIST');
    }
  }, []);

  const handleCreate = () => {
    setError('');
    
    if (!name.trim() || !classCode.trim()) {
        setError('Please fill in all fields.');
        return;
    }

    if (checkNameExists(name.trim(), classCode.toUpperCase().trim())) {
        setError('This name is already taken in this class. Please use a unique nickname.');
        return;
    }
    
    SoundService.playClick();
    onComplete(name, classCode, targetDays, true);
  };

  const handleLogin = (user: User) => {
    SoundService.playClick();
    onComplete(user.name, user.classCode, user.targetDaysPerWeek || 4, false, user);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="mb-8 p-6 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 animate-pop-in">
        <GraduationCap size={64} className="text-blue-600" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">ClassMate</h1>
      <p className="text-zinc-400 mb-10 max-w-sm text-base md:text-lg">
        The simplest way to coordinate attendance with your class squad.
      </p>

      <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-sm md:max-w-md border border-zinc-800 shadow-xl">
        
        {view === 'LIST' && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-zinc-300 font-semibold text-left text-lg">Continue as...</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {existingUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleLogin(user)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800 transition-all border border-zinc-800 hover:border-zinc-700 group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-zinc-900 group-hover:ring-blue-500/50 transition-colors">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                     <span className="text-white font-bold block text-lg">{user.name}</span>
                     <span className="text-sm text-zinc-500 font-mono">{user.classCode}</span>
                  </div>
                  <LogIn size={20} className="ml-auto text-zinc-600 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
            
            <div className="pt-6 mt-2 border-t border-zinc-800">
               <button 
                 onClick={() => setView('CREATE')}
                 className="w-full py-2 flex items-center justify-center gap-2 text-zinc-500 hover:text-blue-400 text-sm font-medium transition-colors"
               >
                 <UserPlus size={18} /> Register New Student
               </button>
            </div>
          </div>
        )}

        {view === 'CREATE' && (
          <div className="space-y-5 animate-slide-up">
             <div className="flex items-start gap-4 mb-8 text-left bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <ShieldCheck className="text-green-500 shrink-0 mt-1" size={24} />
              <p className="text-sm text-zinc-400 leading-relaxed">
                Enter your details. <strong>Only one account per person allowed.</strong> Use the same Class Code as your friends.
              </p>
            </div>

            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Your Unique Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-lg text-white focus:outline-none focus:border-blue-600 focus:ring-0 transition-colors placeholder-zinc-600"
                />
                
                <div className="relative">
                    <Hash size={20} className="absolute left-4 top-4.5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Class Code (e.g. XII-A)"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-5 py-4 text-lg text-white focus:outline-none focus:border-blue-600 focus:ring-0 transition-colors uppercase placeholder:normal-case placeholder-zinc-600 font-mono"
                    />
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3 text-zinc-400">
                        <Target size={18} />
                        <span className="text-sm font-medium">Goal: Days to go per week?</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        {[1, 2, 3, 4, 5, 6].map(num => (
                            <button
                                key={num}
                                onClick={() => { setTargetDays(num); SoundService.playClick(); }}
                                className={`w-10 h-10 rounded-xl font-bold transition-all ${
                                    targetDays === num 
                                    ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-900/50' 
                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 p-3 rounded-xl border border-red-900/50 animate-fade-in">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!name.trim() || !classCode.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all mt-4 text-lg active:scale-95"
            >
              Join Squad <ArrowRight size={20} />
            </button>
            
            {existingUsers.length > 0 && (
                <button 
                  onClick={() => setView('LIST')}
                  className="text-zinc-500 text-sm mt-4 hover:text-white transition-colors"
                >
                    Back to login
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;