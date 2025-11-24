
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Layers, GitFork, Sparkles, RefreshCw, ChevronLeft, ChevronRight, RotateCw, Volume2, CheckCircle2, Check, X, Eye, HelpCircle, Move, Search, Plus, Minus, Lightbulb, Trophy } from 'lucide-react';
import { generateStudyMaterial } from '../services/geminiService';
import { Flashcard, MindMapNode, StudyNote, StudyQuestion } from '../types';
import { SoundService } from '../services/soundService';

type Tab = 'NOTES' | 'FLASHCARDS' | 'MINDMAP';

const NOTE_COLORS = [
  'bg-[#fef9c3] border-[#fde047] shadow-yellow-200/50', // Yellow
  'bg-[#dbeafe] border-[#93c5fd] shadow-blue-200/50',   // Blue
  'bg-[#dcfce7] border-[#86efac] shadow-green-200/50',  // Green
  'bg-[#fce7f3] border-[#f9a8d4] shadow-pink-200/50',   // Pink
  'bg-[#f3e8ff] border-[#d8b4fe] shadow-purple-200/50', // Purple
  'bg-[#ffedd5] border-[#fdba74] shadow-orange-200/50', // Orange
];

const HIGHLIGHT_COLORS = [
    'bg-yellow-300/60',
    'bg-green-300/60',
    'bg-blue-300/60',
    'bg-pink-300/60'
];

const TAPE_COLORS = [
  'bg-red-400/30',
  'bg-blue-400/30',
  'bg-green-400/30',
  'bg-yellow-400/30',
];

const StudySection: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('NOTES');
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [notes, setNotes] = useState<StudyNote | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  
  // Flashcard UI State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredCards, setMasteredCards] = useState<number[]>([]);
  
  // Mind Map UI State
  const [mapScale, setMapScale] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  // Notes UI State
  const [learnedSections, setLearnedSections] = useState<{[key: number]: boolean}>({});
  const [questionStates, setQuestionStates] = useState<{[key: string]: any}>({});

  const handleGenerate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    SoundService.playClick();
    
    setLearnedSections({});
    setQuestionStates({});
    setMasteredCards([]);
    setExpandedNodes(new Set(['root']));
    
    try {
      const result = await generateStudyMaterial(topic, activeTab);
      
      if (activeTab === 'NOTES') setNotes(result as StudyNote);
      else if (activeTab === 'FLASHCARDS') {
        setFlashcards(result as Flashcard[]);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setShowHint(false);
      }
      else if (activeTab === 'MINDMAP') setMindMap(result as MindMapNode);
      
      SoundService.playReceive();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleLearned = (index: number) => {
      setLearnedSections(prev => ({
          ...prev,
          [index]: !prev[index]
      }));
      SoundService.playClick();
  };

  const playText = (text: string) => {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/(\*\*|==)/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1;
      utterance.pitch = 1.1; 
      window.speechSynthesis.speak(utterance);
  };

  // --- Flashcard Logic ---
  const handleCardResult = (success: boolean) => {
      if (success) {
          if (!masteredCards.includes(currentCardIndex)) {
            setMasteredCards([...masteredCards, currentCardIndex]);
          }
      } else {
          setMasteredCards(masteredCards.filter(id => id !== currentCardIndex));
      }
      
      SoundService.playClick();
      if (currentCardIndex < flashcards.length - 1) {
          setTimeout(() => {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
            setShowHint(false);
          }, 300);
      }
  };

  // --- Mind Map Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingMap(true);
    setDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMap) return;
    setMapPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDraggingMap(false);

  const toggleNodeExpand = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(expandedNodes);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedNodes(newSet);
      SoundService.playClick();
  };

  // --- Handwitten Text Renderer with Highlighters ---
  const renderHandwrittenContent = (text: string, sectionIndex: number) => {
      const parts = text.split(/(\*\*.*?\*\*|==.*?==)/g);
      return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-extrabold text-black/90">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('==') && part.endsWith('==')) {
              const hlColor = HIGHLIGHT_COLORS[sectionIndex % HIGHLIGHT_COLORS.length];
              return (
                <span key={i} className={`relative inline-block px-1 mx-0.5 rounded-sm transform -rotate-1`}>
                    <span className={`absolute inset-0 ${hlColor} rounded-sm -z-10 transform skew-x-3`}></span>
                    <span className="relative z-0">{part.slice(2, -2)}</span>
                </span>
              );
          }
          return <span key={i}>{part}</span>;
      });
  };

  const handleAnswerQuestion = (key: string, value: any) => {
      setQuestionStates(prev => ({ ...prev, [key]: value }));
      SoundService.playClick();
  };

  const renderQuestion = (q: StudyQuestion, sectionIndex: number) => {
      const key = `${sectionIndex}-${q.id}`;
      const state = questionStates[key]; 
      
      if (q.type === 'FILL_BLANK') {
          const isRevealed = !!state;
          return (
              <div className="mt-4 p-3 bg-white/40 rounded-lg border border-black/5 font-hand text-lg">
                  <span className="font-bold mr-2 text-zinc-500">Q:</span>
                  {q.question.replace('____', '')}
                  <button 
                    onClick={() => handleAnswerQuestion(key, true)}
                    className={`inline-block min-w-[80px] border-b-2 border-black/30 px-2 mx-1 text-center transition-colors ${isRevealed ? 'text-blue-600 font-bold border-blue-500' : 'text-transparent hover:bg-black/5'}`}
                  >
                      {isRevealed ? q.answer : '______'}
                  </button>
                  {q.question.split('____')[1]}
              </div>
          );
      }
      if (q.type === 'MCQ') {
          return (
              <div className="mt-4 p-3 bg-white/40 rounded-lg border border-black/5 font-hand">
                  <p className="text-lg font-medium mb-2"><span className="font-bold text-zinc-500 mr-2">Q:</span>{q.question}</p>
                  <div className="grid grid-cols-1 gap-2">
                      {q.options?.map((opt, i) => {
                          const isSelected = state === opt;
                          const isCorrect = opt === q.answer;
                          let btnClass = "border-black/20 bg-white/50 hover:bg-white/80";
                          if (state) {
                              if (opt === q.answer) btnClass = "border-green-500 bg-green-100 text-green-800";
                              else if (isSelected && !isCorrect) btnClass = "border-red-500 bg-red-100 text-red-800";
                              else btnClass = "opacity-50 border-transparent";
                          }
                          return (
                              <button 
                                key={i}
                                disabled={!!state}
                                onClick={() => handleAnswerQuestion(key, opt)}
                                className={`text-left px-3 py-1.5 rounded-md border text-base transition-all ${btnClass}`}
                              >
                                  <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span> {opt}
                              </button>
                          );
                      })}
                  </div>
              </div>
          );
      }
      if (q.type === 'SUBJECTIVE') {
          const isRevealed = !!state;
          return (
              <div className="mt-4 p-3 bg-white/40 rounded-lg border border-black/5 font-hand">
                   <p className="text-lg font-medium mb-2"><span className="font-bold text-zinc-500 mr-2">Q:</span>{q.question}</p>
                   {isRevealed ? (
                       <div className="bg-green-50/50 p-2 rounded border border-green-200 text-green-900 text-base animate-fade-in">
                           <p className="font-bold mb-1">Answer:</p>
                           {q.answer}
                           {q.explanation && <p className="text-sm mt-1 opacity-80 italic">💡 {q.explanation}</p>}
                       </div>
                   ) : (
                       <button onClick={() => handleAnswerQuestion(key, true)} className="text-sm text-blue-600 underline decoration-dotted flex items-center gap-1 hover:text-blue-700">
                           <Eye size={14} /> Reveal Answer
                       </button>
                   )}
              </div>
          );
      }
      return null;
  };

  const renderMindMapNode = (node: MindMapNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id || 'root');
    const hasChildren = node.children && node.children.length > 0;
    
    // Depth-based Styling
    let containerClass = "p-4 rounded-2xl border-2 shadow-lg transition-all duration-300 relative group cursor-pointer hover:scale-105";
    let textClass = "font-bold text-center";
    
    if (depth === 0) {
        containerClass += " bg-zinc-900 text-white border-blue-500 shadow-blue-500/20 min-w-[200px]";
        textClass += " text-xl";
    } else if (depth === 1) {
        containerClass += " bg-white dark:bg-zinc-800 border-purple-400 min-w-[150px]";
        textClass += " text-zinc-800 dark:text-zinc-100 text-lg";
    } else {
        containerClass += " bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 min-w-[120px]";
        textClass += " text-zinc-600 dark:text-zinc-300 text-sm";
    }

    return (
        <div key={node.id} className="flex flex-col items-center mx-4">
             {/* Node Content */}
             <div onClick={(e) => hasChildren && toggleNodeExpand(node.id || 'root', e)} className={containerClass}>
                 {/* Root Image */}
                 {depth === 0 && (
                     <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-black overflow-hidden border-2 border-white/20">
                         <img 
                            src={`https://image.pollinations.ai/prompt/${encodeURIComponent(node.label + ' icon 3d render cute minimalist')}?width=100&height=100&nologo=true`} 
                            className="w-full h-full object-cover" 
                            alt="icon" 
                         />
                     </div>
                 )}
                 <div className="text-3xl mb-1 text-center">{node.emoji || '✨'}</div>
                 <div className={textClass}>{node.label}</div>
                 
                 {hasChildren && (
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-200 dark:bg-zinc-700 rounded-full p-1 border border-white dark:border-zinc-900">
                         {isExpanded ? <Minus size={12}/> : <Plus size={12}/>}
                     </div>
                 )}
             </div>

             {/* Branches (Curved Lines Logic replaced with clean CSS hierarchy for robustness) */}
             {hasChildren && isExpanded && (
                 <div className="flex flex-col items-center animate-slide-up origin-top">
                     <div className="w-px h-8 bg-zinc-300 dark:bg-zinc-600"></div> {/* Vertical Stem */}
                     <div className="flex relative">
                         {/* Horizontal connector bar */}
                         {node.children!.length > 1 && (
                             <div className="absolute top-0 left-0 right-0 h-px bg-zinc-300 dark:bg-zinc-600" style={{ left: '50%', right: '50%', width: `calc(100% - ${100/node.children!.length}%)`, transform: 'translateX(-50%)' }}></div>
                         )}
                         
                         {node.children!.map((child, i) => (
                             <div key={child.id || i} className="flex flex-col items-center relative px-2">
                                 {/* Horizontal arms for multiple children */}
                                 {node.children!.length > 1 && (
                                     <div className={`absolute top-0 h-px bg-zinc-300 dark:bg-zinc-600 ${i === 0 ? 'right-1/2 w-1/2' : i === node.children!.length - 1 ? 'left-1/2 w-1/2' : 'w-full'}`}></div>
                                 )}
                                 <div className="w-px h-8 bg-zinc-300 dark:bg-zinc-600"></div>
                                 {renderMindMapNode(child, depth + 1)}
                             </div>
                         ))}
                     </div>
                 </div>
             )}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 md:bg-transparent">
        {/* Header */}
        <div className="p-4 md:p-0 mb-4 shrink-0">
             <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-violet-100 dark:bg-violet-900/30 p-2.5 rounded-xl text-violet-600 dark:text-violet-400">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">AI Study Hub</h2>
                        <p className="text-zinc-500 text-sm">Generate notes, cards & maps instantly.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                            placeholder="Enter a topic (e.g. Thermodynamics)..."
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-violet-500 transition-colors text-zinc-900 dark:text-white"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !topic.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                    {(['NOTES', 'FLASHCARDS', 'MINDMAP'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); SoundService.playClick(); }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                                activeTab === tab 
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {tab === 'NOTES' && <BookOpen size={16} />}
                            {tab === 'FLASHCARDS' && <Layers size={16} />}
                            {tab === 'MINDMAP' && <GitFork size={16} />}
                            {tab}
                        </button>
                    ))}
                </div>
             </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0 pb-20 md:pb-0 h-full">
            
            {/* NOTES VIEW */}
            {activeTab === 'NOTES' && (
                <div className="animate-fade-in relative min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 opacity-50 font-hand text-xl">
                            <RefreshCw className="animate-spin mb-2" />
                            <span>Scribbling notes...</span>
                        </div>
                    ) : notes ? (
                        <div className="space-y-8 pb-10">
                            {/* Sticky Summary */}
                            <div className="bg-yellow-200 text-zinc-900 p-6 rounded-sm shadow-xl rotate-1 max-w-sm mx-auto relative transform transition-transform hover:rotate-0 border-b-4 border-r-4 border-black/10">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/50 rotate-[-2deg] backdrop-blur-sm shadow-sm"></div>
                                <h3 className="font-hand font-bold text-2xl mb-2 text-center underline decoration-wavy decoration-yellow-600/30">Quick Summary</h3>
                                <p className="font-hand text-lg leading-relaxed text-center">{notes.summary}</p>
                            </div>

                            {/* Notes Grid */}
                            <div className="grid grid-cols-1 gap-8">
                                {notes.sections.map((section, index) => {
                                    const isLearned = learnedSections[index];
                                    const rotation = index % 2 === 0 ? '-1deg' : '1deg';
                                    const colorClass = NOTE_COLORS[index % NOTE_COLORS.length];
                                    const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length];
                                    
                                    return (
                                        <div 
                                            key={index}
                                            className={`${colorClass} p-6 rounded-sm border-2 shadow-lg relative transition-all hover:scale-[1.01]`}
                                            style={{ transform: `rotate(${rotation})` }}
                                        >
                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 ${tapeColor} rotate-[-2deg] backdrop-blur-[1px] opacity-80 shadow-sm`}></div>
                                            <div className="flex justify-between items-start gap-4 mb-4 mt-2">
                                                <h4 className={`font-hand font-bold text-3xl text-zinc-900 ${isLearned ? 'line-through decoration-4 decoration-black/20 opacity-50' : ''}`}>{section.title}</h4>
                                                <button onClick={() => playText(section.content)} className="p-2 bg-black/5 rounded-full text-zinc-600 hover:text-blue-600 hover:bg-black/10 transition-colors"><Volume2 size={20} /></button>
                                            </div>
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <p className={`font-hand text-xl leading-loose text-zinc-800 ${isLearned ? 'opacity-50' : ''}`}>{renderHandwrittenContent(section.content, index)}</p>
                                                    {section.questions && section.questions.length > 0 && (
                                                        <div className="mt-6 pt-6 border-t border-black/10">
                                                            <h5 className="font-hand font-bold text-xl mb-2 flex items-center gap-2 text-zinc-700"><HelpCircle size={20} /> Check Your Understanding</h5>
                                                            <div className="space-y-2">{section.questions.map(q => <div key={q.id}>{renderQuestion(q, index)}</div>)}</div>
                                                        </div>
                                                    )}
                                                    <button onClick={() => toggleLearned(index)} className={`mt-6 flex items-center gap-2 px-5 py-2 rounded-full font-hand font-bold text-lg transition-colors border-2 ${isLearned ? 'bg-green-100/50 text-green-800 border-green-300' : 'bg-white/50 text-zinc-700 border-zinc-300 hover:bg-white hover:border-zinc-400'}`}><CheckCircle2 size={20} />{isLearned ? 'Done!' : 'Mark Learned'}</button>
                                                </div>
                                                <div className="shrink-0 w-full md:w-56 aspect-square bg-white rounded-lg p-2 border-2 border-zinc-200 shadow-sm rotate-2 relative">
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-zinc-200/50 rotate-2 backdrop-blur-sm"></div>
                                                    <div className="w-full h-full overflow-hidden bg-white flex items-center justify-center">
                                                        <img src={`https://image.pollinations.ai/prompt/${encodeURIComponent(section.visualKeywords + ' educational textbook diagram technical sketch line art minimalist white background')}?width=300&height=300&nologo=true&model=flux&seed=${index}`} alt="Diagram" className="w-full h-full object-contain mix-blend-multiply" loading="lazy" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center opacity-40 font-sans mt-20">
                            <BookOpen size={48} className="mx-auto mb-2" />
                            <p>Enter a topic to generate a scrapbook.</p>
                        </div>
                    )}
                </div>
            )}

            {/* FLASHCARDS PRO VIEW */}
            {activeTab === 'FLASHCARDS' && (
                <div className="h-full flex flex-col items-center justify-center min-h-[500px] animate-fade-in relative">
                    {loading ? (
                         <div className="flex flex-col items-center opacity-50">
                            <RefreshCw className="animate-spin mb-2" />
                            <span>Creating beautiful deck...</span>
                        </div>
                    ) : flashcards.length > 0 ? (
                        <>
                            {/* Progress Bar */}
                            <div className="w-full max-w-md mb-8">
                                <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
                                    <span>Progress</span>
                                    <span>{masteredCards.length} / {flashcards.length} Mastered</span>
                                </div>
                                <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(masteredCards.length / flashcards.length) * 100}%` }}></div>
                                </div>
                            </div>

                            <div className="w-full max-w-sm md:max-w-md perspective-1000 relative">
                                {/* The Card */}
                                <div 
                                    className={`relative w-full aspect-[3/4] cursor-pointer transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                                    onClick={() => { if(!isFlipped) { setIsFlipped(true); SoundService.playClick(); }}}
                                >
                                    {/* Front */}
                                    <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-2xl flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                        <div className="text-6xl mb-6 animate-bounce-soft">{flashcards[currentCardIndex].emoji || '💡'}</div>
                                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-8 leading-tight">{flashcards[currentCardIndex].question}</h3>
                                        
                                        {flashcards[currentCardIndex].hint && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                                                className="text-sm text-zinc-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
                                            >
                                                <Lightbulb size={16} /> {showHint ? flashcards[currentCardIndex].hint : 'Need a hint?'}
                                            </button>
                                        )}
                                        <p className="absolute bottom-8 text-xs text-zinc-400 uppercase tracking-widest animate-pulse">Tap to Flip</p>
                                    </div>
                                    
                                    {/* Back */}
                                    <div className="absolute inset-0 backface-hidden bg-zinc-900 dark:bg-black text-white rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 text-center border-2 border-zinc-800" style={{ transform: 'rotateY(180deg)' }}>
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Answer</span>
                                        <h3 className="text-xl md:text-2xl font-medium leading-relaxed">{flashcards[currentCardIndex].answer}</h3>
                                        
                                        {/* Mastery Buttons */}
                                        <div className="mt-12 flex gap-4 w-full">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleCardResult(false); }}
                                                className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 font-bold border border-red-500/50 hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <X className="mx-auto mb-1" size={20} /> Study Again
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleCardResult(true); }}
                                                className="flex-1 py-3 rounded-xl bg-green-500/10 text-green-400 font-bold border border-green-500/50 hover:bg-green-500 hover:text-white transition-all"
                                            >
                                                <Check className="mx-auto mb-1" size={20} /> Got It
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Card Navigation */}
                             <div className="flex justify-between items-center w-full max-w-xs mt-8">
                                <button onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))} disabled={currentCardIndex === 0} className="p-3 text-zinc-400 hover:text-white disabled:opacity-30"><ChevronLeft size={24} /></button>
                                <span className="font-mono text-zinc-500 text-sm">{currentCardIndex + 1} / {flashcards.length}</span>
                                <button onClick={() => setCurrentCardIndex(Math.min(flashcards.length - 1, currentCardIndex + 1))} disabled={currentCardIndex === flashcards.length - 1} className="p-3 text-zinc-400 hover:text-white disabled:opacity-30"><ChevronRight size={24} /></button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center opacity-40 font-sans">
                            <Layers size={64} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
                            <h3 className="text-xl font-bold mb-2">Flashcards Pro</h3>
                            <p>Enter a topic to generate a gamified deck.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MIND MAP VIEW - INFINITE CANVAS GALAXY */}
            {activeTab === 'MINDMAP' && (
                <div className="h-full relative bg-[#0f172a] overflow-hidden rounded-3xl border border-zinc-800 cursor-grab active:cursor-grabbing group">
                     {/* Background Grid */}
                     <div 
                        className="absolute inset-0 opacity-20 pointer-events-none" 
                        style={{ 
                            backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
                            backgroundSize: '30px 30px',
                            transform: `translate(${mapPosition.x % 30}px, ${mapPosition.y % 30}px)`
                        }}
                     ></div>

                     {loading ? (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-50 bg-black/50 backdrop-blur-sm">
                            <RefreshCw className="animate-spin mb-4" size={32} />
                            <span>Mapping the universe of knowledge...</span>
                        </div>
                    ) : mindMap ? (
                        <>
                            {/* Infinite Canvas Wrapper */}
                            <div 
                                ref={mapRef}
                                className="w-full h-full origin-center flex items-center justify-center"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <div 
                                    className="transition-transform duration-75 ease-linear"
                                    style={{ transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapScale})` }}
                                >
                                    {renderMindMapNode(mindMap)}
                                </div>
                            </div>
                            
                            {/* Controls */}
                            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                                <button onClick={() => setMapScale(s => Math.min(2, s + 0.1))} className="p-3 bg-zinc-800 text-white rounded-xl shadow-lg hover:bg-zinc-700 border border-zinc-700"><Plus size={20}/></button>
                                <button onClick={() => setMapScale(s => Math.max(0.5, s - 0.1))} className="p-3 bg-zinc-800 text-white rounded-xl shadow-lg hover:bg-zinc-700 border border-zinc-700"><Minus size={20}/></button>
                                <button onClick={() => { setMapScale(1); setMapPosition({x:0, y:0}); }} className="p-3 bg-zinc-800 text-white rounded-xl shadow-lg hover:bg-zinc-700 border border-zinc-700"><Move size={20}/></button>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40 font-sans pointer-events-none">
                            <GitFork size={64} className="mx-auto mb-4 text-blue-500" />
                            <h3 className="text-2xl font-bold text-white mb-2">Galaxy Mind Map</h3>
                            <p className="text-zinc-400">Enter a topic to generate an interactive map.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default StudySection;
