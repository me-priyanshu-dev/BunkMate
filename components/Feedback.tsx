
import React, { useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';

const Feedback: React.FC = () => {
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    
    const subject = encodeURIComponent(`BunkMate Feedback from ${name || 'User'}`);
    const body = encodeURIComponent(message);
    const mailtoLink = `mailto:raj.1044.priyanshu@gmail.com?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-10 border border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto shadow-sm transition-colors duration-300">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={32} />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">We value your feedback</h2>
        <p className="text-zinc-500 max-w-md mx-auto">Found a bug? Have a feature request? Or just want to say hi? Send a message directly to the developer.</p>
      </div>

      <div className="space-y-6">
        <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Your Name (Optional)</label>
            <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Your Message</label>
            <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={6}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors resize-none"
            />
        </div>

        <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-600/20 transition-all"
        >
            <Mail size={20} /> Send via Email
        </button>
        
        <p className="text-center text-xs text-zinc-400 mt-4">
            This will open your default email client to send the message.
        </p>
      </div>
    </div>
  );
};

export default Feedback;
