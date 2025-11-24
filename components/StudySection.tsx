
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Layers, GitFork, Sparkles, RefreshCw, Volume2, CheckCircle2, Check, X, HelpCircle, Search, Plus, Minus, Lightbulb, Maximize2, Minimize2, MousePointer2, Download, Eraser } from 'lucide-react';
import { generateStudyMaterial } from '../services/geminiService';
import { MindMapNode, StudyNote, StudyQuestion } from '../types';
import { SoundService } from '../services/soundService';

type Tab = 'NOTES' | 'MINDMAP';

const NOTE_COLORS = [
  'bg-[#fffbeb] border-amber-200 shadow-amber-100', // Warm Yellow
  'bg-[#eff6ff] border-blue-200 shadow-blue-100',   // Cool Blue
  'bg-[#f0fdf4] border-emerald-200 shadow-emerald-100', // Fresh Green
  'bg-[#fff1f2] border-rose-200 shadow-rose-100',   // Soft Pink
  'bg-[#f5f3ff] border-violet-200 shadow-violet-100', // Royal Purple
];

const TAPE_COLORS = [
    'bg-rose-400/40',
    'bg-sky-400/40', 
    'bg-emerald-400/40',
    'bg-violet-400/40',
    'bg-amber-400/40'
];

const StudySection: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('NOTES');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Data States
  const [notes, setNotes] = useState<StudyNote | null>(null);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  
  // Mind Map UI State
  const [mapScale, setMapScale] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  // Notes UI State
  const [learnedSections, setLearnedSections] = useState<{[key: number]: boolean}>({});
  const [questionStates, setQuestionStates] = useState<{[key: string]: any}>({});

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
      const handleFsChange = () => {
          setIsFullScreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError('');
    SoundService.playClick();
    
    setLearnedSections({});
    setQuestionStates({});
    setExpandedNodes(new Set(['root']));
    setMapScale(1);
    setMapPosition({ x: 0, y: 0 });
    
    try {
      const result = await generateStudyMaterial(topic, activeTab);
      if (!result) throw new Error(`Could not generate ${activeTab.toLowerCase()}. Please try again.`);
      
      if (activeTab === 'NOTES') setNotes(result as StudyNote);
      else if (activeTab === 'MINDMAP') setMindMap(result as MindMapNode);
      
      SoundService.playReceive();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'AI Brain Freeze! Please try a different topic or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNotes = () => {
    if (!notes) return;
    SoundService.playClick();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${notes.topic} - ClassMate Notes</title>
        <link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Kalam', cursive; padding: 40px; background: #fdf6e3; color: #1f2937; }
          .container { max-width: 800px; margin: 0 auto; }
          .summary { background-color: #fef3c7; padding: 20px; border-left: 5px solid #d97706; margin-bottom: 30px; border-radius: 8px; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); transform: rotate(1deg); }
          .section { background: white; padding: 25px; margin-bottom: 25px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: relative; }
          .tape { position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(1deg); width: 100px; height: 30px; background-color: rgba(251, 113, 133, 0.3); opacity: 0.8; }
          h1 { text-align: center; font-size: 3em; margin-bottom: 40px; }
          h2 { margin-top: 0; }
          strong { font-weight: 800; }
          .highlight { background-color: #fef08a; padding: 2px 5px; border-radius: 2px; }
          .footer { text-align: center; margin-top: 50px; color: #9ca3af; font-size: 0.8em; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${notes.topic}</h1>
          <div class="summary">
            <h3>💡 Quick Summary</h3>
            <p>${notes.summary}</p>
          </div>
          ${notes.sections.map((s, i) => `
            <div class="section" style="transform: rotate(${i % 2 === 0 ? '-1deg' : '1deg'})">
              <div class="tape" style="background-color: ${['rgba(251, 113, 133, 0.3)', 'rgba(56, 189, 248, 0.3)', 'rgba(52, 211, 153, 0.3)'][i % 3]}"></div>
              <h2>${s.title}</h2>
              <p>${s.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/==(.*?)==/g, '<span class="highlight">$1</span>')}</p>
            </div>
          `).join('')}
          <div class="footer">Generated by ClassMate AI</div>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notes.topic.replace(/\s+/g, '_')}_notes.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Helpers ---
  const toggleLearned = (index: number) => {
      setLearnedSections(prev => ({ ...prev, [index]: !prev[index] }));
      SoundService.playClick();
  };

  const playText = (text: string) => {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/(\*\*|==)/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      window.speechSynthesis.speak(utterance);
  };

  const renderHandwrittenContent = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*|==.*?==)/g);
      return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
          if (part.startsWith('==') && part.endsWith('==')) return <span key={i} className="bg-primary-200/50 px-1 rounded-sm border-b-2 border-primary-300/50">{part.slice(2, -2)}</span>;
          return <span key={i}>{part}</span>;
      });
  };

  // --- Mind Map (Infinite Canvas) ---
  const handleStart = (clientX: number, clientY: number) => {
      setIsDraggingMap(true);
      setDragStart({ x: clientX - mapPosition.x, y: clientY - mapPosition.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingMap) return;
      setMapPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const toggleNode = (id: string, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const newSet = new Set(expandedNodes);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedNodes(newSet);
      SoundService.playClick();
  };

  const renderMindMapNode = (node: MindMapNode, depth = 0): React.ReactElement => {
      const isExpanded = expandedNodes.has(node.id || 'root');
      const hasChildren = node.children && node.children.length > 0;
      
      return (
          <div key={node.id} className="flex items-center">
              <div 
                  onClick={(e) => hasChildren && toggleNode(node.id || 'root', e)}
                  className={`
                      relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer select-none shadow-2xl backdrop-blur-md
                      ${depth === 0 ? 'bg-primary-600 border-primary-400 text-white min-w-[200px] shadow-primary-500/50' : 
                        depth === 1 ? 'bg-zinc-800/80 border-primary-500/50 text-primary-100 min-w-[150px]' : 
                        'bg-zinc-900/80 border-zinc-700 text-zinc-300 min-w-[130px]'}
                      hover:scale-105 hover:shadow-primary-500/30 z-10
                  `}
              >
                  {depth === 0 && (
                      <div className="absolute -top-8 w-16 h-16 rounded-full border-4 border-primary-400 overflow-hidden bg-black shadow-lg">
                           <img 
                                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(node.label + ' icon minimal vector flat')}?width=100&height=100&nologo=true`} 
                                className="w-full h-full object-cover"
                           />
                      </div>
                  )}
                  <span className="text-3xl mb-1 filter drop-shadow-md">{node.emoji || '🔹'}</span>
                  <span className={`font-bold text-center leading-tight ${depth === 0 ? 'mt-6 text-lg' : 'text-sm'}`}>{node.label}</span>
                  
                  {hasChildren && (
                      <div className={`absolute -right-3 w-6 h-6 rounded-full flex items-center justify-center border transition-colors shadow-sm ${isExpanded ? 'bg-zinc-700 border-zinc-500 text-zinc-300' : 'bg-white border-primary-300 text-primary-600'}`}>
                          {isExpanded ? <Minus size={12}/> : <Plus size={12}/>}
                      </div>
                  )}
              </div>

              {hasChildren && isExpanded && (
                  <div className="flex flex-col gap-6 ml-12 relative">
                      {/* Connector Line */}
                      <svg className="absolute top-0 bottom-0 -left-12 w-12 h-full pointer-events-none overflow-visible z-0">
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(var(--p-500), 0.3)" />
                                <stop offset="100%" stopColor="rgba(var(--p-500), 0.1)" />
                            </linearGradient>
                          </defs>
                          <path d={`M 0,${50}% C 25,${50}% 25,${50}% 48,${50}%`} stroke="url(#gradient)" strokeWidth="2" fill="none" />
                      </svg>
                      
                      {/* Simple CSS Lines fallback */}
                      <div className="absolute top-1/2 -left-12 w-12 h-0.5 bg-gradient-to-r from-primary-600 to-transparent -translate-y-1/2 opacity-50"></div>
                      <div className="absolute top-4 bottom-4 -left-12 w-0.5 bg-gradient-to-b from-primary-600/0 via-primary-500/30 to-primary-600/0 my-8"></div>
                      
                      {node.children!.map((child) => (
                          <div key={child.id} className="relative flex items-center">
                              <div className="w-12 h-0.5 bg-gradient-to-r from-primary-500/30 to-primary-500/10 mr-0"></div>
                              {renderMindMapNode(child, depth + 1)}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div 
        ref={containerRef}
        className={`h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 transition-all duration-300 ${isFullScreen ? 'overflow-auto fixed inset-0 z-[9999] bg-white dark:bg-black' : ''}`}
    >
        {/* Header - Strongly Themed */}
        <div className={`p-4 ${isFullScreen ? 'fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur' : ''}`}>
             <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-primary-200 dark:border-primary-900/50 shadow-lg shadow-primary-500/5 transition-colors duration-300">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative h-12">
                        <Search className="absolute left-3 top-3.5 text-zinc-400 dark:text-zinc-500" size={20} />
                        <input 
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="What do you want to master? (e.g. Thermodynamics)"
                            className="w-full h-full pl-10 pr-4 rounded-xl transition-all bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto h-12">
                        {(['NOTES', 'MINDMAP'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 h-full rounded-xl text-sm font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${
                                    activeTab === tab 
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 border-primary-500' 
                                    : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-primary-50 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700'
                                }`}
                            >
                                {tab === 'NOTES' ? <BookOpen size={16}/> : <GitFork size={16}/>}
                                {tab === 'NOTES' ? 'Notes' : 'Map'}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !topic.trim()}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white px-6 h-12 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                        {loading ? 'Thinking...' : 'Generate'}
                    </button>
                </div>
             </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow overflow-hidden relative w-full h-full">
            {/* Full Screen Toggle */}
            <div className="absolute top-4 right-4 z-40 flex gap-2">
                {activeTab === 'NOTES' && notes && (
                    <button 
                        onClick={handleDownloadNotes}
                        className="p-2.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded-xl border border-primary-100 shadow-sm text-zinc-500 hover:text-primary-600 hover:scale-105 transition-all"
                        title="Download Notes"
                    >
                        <Download size={20}/>
                    </button>
                )}
                <button 
                    onClick={toggleFullScreen}
                    className="p-2.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded-xl border border-primary-100 shadow-sm text-zinc-500 hover:text-primary-600 hover:scale-105 transition-all"
                >
                    {isFullScreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                </button>
            </div>

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur z-30">
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 text-red-600 text-center shadow-xl animate-pop-in">
                        <p className="font-bold mb-2">Oops!</p>
                        <p>{error}</p>
                        <button onClick={() => setError('')} className="mt-4 text-sm bg-white border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">Dismiss</button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !notes && !mindMap && (
                 <div className="h-full flex flex-col items-center justify-center text-primary-200/50 dark:text-zinc-800/50">
                     <BookOpen size={80} strokeWidth={1} className="mb-4" />
                     <p className="text-xl font-medium text-primary-300 dark:text-zinc-700">Ready to study?</p>
                     <p className="text-sm text-primary-300/70 dark:text-zinc-700/70">Enter a topic above to generate notes or maps.</p>
                 </div>
            )}

            {/* NOTES RENDERER */}
            {!loading && activeTab === 'NOTES' && notes && (
                <div className="h-full overflow-y-auto px-4 pb-20 scroll-smooth bg-[radial-gradient(var(--p-200)_1px,transparent_1px)] [background-size:20px_20px]">
                    <div className="max-w-4xl mx-auto space-y-8 py-8">
                        {/* Summary Sticky Note */}
                        <div className="bg-yellow-100 text-yellow-900 p-6 rounded shadow-xl rotate-1 font-hand text-xl relative max-w-2xl mx-auto border-t-[12px] border-yellow-200/50">
                            <h3 className="font-bold mb-2 flex items-center gap-2"><Lightbulb className="text-yellow-600"/> Quick Summary</h3>
                            <p className="leading-relaxed">{notes.summary}</p>
                        </div>

                        {notes.sections.map((section, idx) => (
                            <div key={idx} className={`relative p-6 md:p-10 rounded-sm shadow-xl transition-transform hover:scale-[1.01] ${NOTE_COLORS[idx % NOTE_COLORS.length]}`} style={{ transform: `rotate(${idx % 2 === 0 ? '-0.5deg' : '0.5deg'})` }}>
                                {/* Tape Effect */}
                                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 ${TAPE_COLORS[idx % TAPE_COLORS.length]} opacity-60 rotate-1 backdrop-blur-[1px]`}></div>
                                
                                <h3 className="text-3xl font-bold font-hand text-black/80 mb-6 border-b-2 border-black/5 pb-2 inline-block">{section.title}</h3>
                                
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="flex-1 font-hand text-xl leading-loose text-black/90 tracking-wide">
                                        {renderHandwrittenContent(section.content)}
                                    </div>
                                    <div className="md:w-64 shrink-0">
                                        <div className="bg-white p-3 shadow-md rotate-2 border border-black/5">
                                            <img 
                                                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(section.visualKeywords + ' educational sketch diagram minimalist line art')}?width=300&height=200&nologo=true&model=flux`}
                                                className="w-full h-auto mix-blend-multiply filter contrast-125"
                                                loading="lazy"
                                                alt="diagram"
                                            />
                                            <p className="text-center font-hand text-xs text-zinc-400 mt-2">Figure {idx + 1}</p>
                                        </div>
                                        {/* Interaction Buttons */}
                                        <div className="flex gap-2 mt-4 justify-center">
                                            <button onClick={() => playText(section.content)} className="p-2 bg-black/5 rounded-full hover:bg-black/10 text-black/60 transition-colors"><Volume2 size={20}/></button>
                                            <button onClick={() => toggleLearned(idx)} className={`p-2 rounded-full transition-colors ${learnedSections[idx] ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}>
                                                <CheckCircle2 size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Questions */}
                                {section.questions && (
                                    <div className="mt-8 pt-6 border-t-2 border-dashed border-black/10">
                                        <h4 className="font-hand font-bold text-lg text-black/60 mb-3 flex gap-2 items-center"><HelpCircle size={18}/> Quick Quiz</h4>
                                        <div className="space-y-4">
                                            {section.questions.map(q => {
                                                const key = `${idx}-${q.id}`;
                                                const state = questionStates[key];
                                                return (
                                                    <div key={q.id} className="bg-white/60 p-4 rounded-lg border border-black/5 font-hand hover:bg-white/80 transition-colors">
                                                        <p className="font-bold text-lg mb-2 text-black/80">{q.question.replace('____', '______')}</p>
                                                        {q.type === 'MCQ' && (
                                                            <div className="grid gap-2">
                                                                {q.options?.map((opt, i) => (
                                                                    <button 
                                                                        key={i}
                                                                        onClick={() => {
                                                                            setQuestionStates(p => ({...p, [key]: opt}));
                                                                            SoundService.playClick();
                                                                        }}
                                                                        className={`text-left px-3 py-2 rounded border transition-colors ${
                                                                            state === opt 
                                                                                ? (opt === q.answer ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800')
                                                                                : 'bg-white/50 border-black/10 hover:bg-white'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {q.type === 'FILL_BLANK' && (
                                                            <button 
                                                                onClick={() => setQuestionStates(p => ({...p, [key]: true}))}
                                                                className={`px-3 py-1 rounded border ${state ? 'bg-green-100 border-green-500 text-green-900' : 'bg-white border-black/20 text-primary-600'}`}
                                                            >
                                                                {state ? q.answer : 'Click to Reveal Answer'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Real World Analogy Card */}
                        <div className="bg-white/80 border-2 border-primary-200 p-8 rounded-xl relative overflow-hidden shadow-xl backdrop-blur-sm">
                             <div className="absolute -right-10 -bottom-10 opacity-5 text-primary-900">
                                 <BookOpen size={200} />
                             </div>
                             <h3 className="text-xl font-bold text-primary-700 mb-3 flex items-center gap-2">
                                 <Sparkles className="text-primary-500" size={24}/> Real World Analogy
                             </h3>
                             <p className="text-zinc-700 italic font-hand text-xl leading-relaxed relative z-10">
                                 "Think of {topic} like a busy city traffic system. The flow depends on the signals and the number of cars..." 
                                 <br/>
                                 <span className="text-sm not-italic text-primary-400 mt-3 block font-sans uppercase tracking-wider font-bold">(AI generated visualization)</span>
                             </p>
                        </div>
                    </div>
                </div>
            )}

            {/* MIND MAP RENDERER */}
            {!loading && activeTab === 'MINDMAP' && mindMap && (
                <div className="h-full w-full bg-zinc-950 overflow-hidden relative cursor-grab active:cursor-grabbing">
                    {/* Dynamic Themed Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,var(--p-900)_0%,transparent_70%)]"></div>
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--p-700) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                    {/* Controls */}
                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50">
                        <button onClick={() => setMapScale(s => s + 0.2)} className="p-3 bg-zinc-800/90 text-white rounded-xl border border-zinc-700 hover:bg-primary-600 hover:border-primary-500 transition-colors shadow-lg"><Plus size={20}/></button>
                        <button onClick={() => setMapScale(1)} className="p-3 bg-zinc-800/90 text-white rounded-xl border border-zinc-700 font-mono text-xs shadow-lg">{Math.round(mapScale*100)}%</button>
                        <button onClick={() => setMapScale(s => Math.max(0.2, s - 0.2))} className="p-3 bg-zinc-800/90 text-white rounded-xl border border-zinc-700 hover:bg-primary-600 hover:border-primary-500 transition-colors shadow-lg"><Minus size={20}/></button>
                    </div>

                    <div className="absolute top-4 left-4 z-50 bg-black/60 backdrop-blur text-zinc-400 text-xs px-4 py-2 rounded-full border border-zinc-800 pointer-events-none flex items-center gap-2">
                        <MousePointer2 size={12}/> Drag to pan • Scroll to zoom
                    </div>

                    <div 
                        className="w-full h-full"
                        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                        onMouseUp={() => setIsDraggingMap(false)}
                        onMouseLeave={() => setIsDraggingMap(false)}
                        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                        onTouchEnd={() => setIsDraggingMap(false)}
                        onWheel={(e) => setMapScale(s => Math.max(0.2, Math.min(3, s - e.deltaY * 0.001)))}
                    >
                        <div 
                            className="w-full h-full flex items-center justify-center will-change-transform"
                            style={{ transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapScale})` }}
                        >
                            {renderMindMapNode(mindMap)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default StudySection;
