import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GamePhase, Attributes, LogEntry, TurnResult, BatchTurnResult } from './types';
import { INITIAL_POINTS, INITIAL_ATTRIBUTES, REALM_POINTS_MAP, STORAGE_KEY_POINTS, STORAGE_KEY_SCRIPTURE, STORAGE_KEY_RECORD } from './constants';
import { AttributeControl } from './components/AttributeControl';
import { StatusPanel } from './components/StatusPanel';
import { EventLog } from './components/EventLog';
import { generateBatchTurns, generateWorldAnalysis } from './services/geminiService';

const App: React.FC = () => {
  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [attributes, setAttributes] = useState<Attributes>({ ...INITIAL_ATTRIBUTES });
  const [bonusPoints, setBonusPoints] = useState(0); // Points from previous run
  const [pointsRemaining, setPointsRemaining] = useState(INITIAL_POINTS);
  
  // Inheritance Data
  const [yuwaiScripture, setYuwaiScripture] = useState<string>("");
  const [tianwaiRecord, setTianwaiRecord] = useState<string>("");
  
  // UI State for Ending
  const [endingProcessing, setEndingProcessing] = useState(false);
  const [showEndingUI, setShowEndingUI] = useState(false);
  const [endingMode, setEndingMode] = useState<'analyze' | 'edit'>('analyze');
  const [hasCalculatedEnding, setHasCalculatedEnding] = useState(false); // Prevent re-calc on re-open
  const [lastRunPoints, setLastRunPoints] = useState(0); // Points earned in the just-concluded run

  // Queue System
  const [eventQueue, setEventQueue] = useState<TurnResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isAuto, setIsAuto] = useState(false); 

  // Main Playing State
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.SETUP,
    age: 0,
    realm: '凡人 (Mortal)',
    attributes: { ...INITIAL_ATTRIBUTES },
    techniques: [],
    artifacts: [],
    history: [],
    isDead: false,
    awakeningLevel: 0,
    corruption: 0,
  });

  // Load Persistence on Mount
  useEffect(() => {
    const savedPoints = localStorage.getItem(STORAGE_KEY_POINTS);
    const savedScripture = localStorage.getItem(STORAGE_KEY_SCRIPTURE);
    const savedRecord = localStorage.getItem(STORAGE_KEY_RECORD);

    if (savedPoints) setBonusPoints(parseInt(savedPoints, 10));
    if (savedScripture) setYuwaiScripture(savedScripture);
    if (savedRecord) setTianwaiRecord(savedRecord);
    
    if (savedPoints) {
       setPointsRemaining(INITIAL_POINTS + parseInt(savedPoints, 10));
    }
  }, []);

  // Setup Handlers
  const handleAttrChange = (key: keyof Attributes, val: number) => {
    const diff = val - attributes[key];
    if (pointsRemaining - diff >= 0) {
      setAttributes(prev => ({ ...prev, [key]: val }));
      setPointsRemaining(prev => prev - diff);
    }
  };

  const startGame = () => {
    const initialState: GameState = {
      ...gameState,
      phase: GamePhase.PLAYING,
      attributes: { ...attributes },
      age: 0, 
      history: [{ age: 0, text: "你出生在异界，开启了你的修仙模拟人生。", type: 'normal' }],
    };
    setGameState(initialState);
    setPhase(GamePhase.PLAYING);
    setShowEndingUI(false);
    setHasCalculatedEnding(false);
    setLastRunPoints(0);
  };

  const restartGame = () => {
    setPhase(GamePhase.SETUP);
    setIsAuto(false);
    setShowEndingUI(false);
    setHasCalculatedEnding(false);
    setLastRunPoints(0);
    setEventQueue([]);
    setAttributes({ ...INITIAL_ATTRIBUTES });
    
    // Reload bonus points to ensure fresh state
    const currentBonus = parseInt(localStorage.getItem(STORAGE_KEY_POINTS) || "0", 10);
    setBonusPoints(currentBonus);
    setPointsRemaining(INITIAL_POINTS + currentBonus);

    setGameState({
      phase: GamePhase.SETUP,
      age: 0,
      realm: '凡人 (Mortal)',
      attributes: { ...INITIAL_ATTRIBUTES },
      techniques: [],
      artifacts: [],
      history: [],
      isDead: false,
      awakeningLevel: 0,
      corruption: 0,
    });
  };

  // API Call to populate Queue
  const fetchEvents = useCallback(async (choiceId: string | null = null) => {
    if (isFetching || gameState.isDead) return;
    setIsFetching(true);

    try {
      // If user made a choice, enable auto for subsequent events
      if (choiceId) {
        setIsAuto(true);
        // Clear pending choice from UI immediately to avoid flicker while loading
        setGameState(prev => ({ ...prev, pendingChoice: null }));
      }

      // Pass combined knowledge to the AI
      const inheritedKnowledge = `
        ${yuwaiScripture ? `[宇外荒经 Fragment]: ${yuwaiScripture}` : ""}
        ${tianwaiRecord ? `[天外异闻箓 Fragment]: ${tianwaiRecord}` : ""}
      `.trim();

      const result: BatchTurnResult = await generateBatchTurns(gameState, choiceId, inheritedKnowledge);
      
      if (result.events && result.events.length > 0) {
        setEventQueue(prev => [...prev, ...result.events]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  }, [gameState, isFetching, yuwaiScripture, tianwaiRecord]);

  // Handle Game Over Logic (Persistence) - Triggered by User Button Click
  const handleOpenEnding = async () => {
    setShowEndingUI(true);
    
    // If we already calculated for this specific life, don't do it again
    if (hasCalculatedEnding) return;

    setEndingProcessing(true);
    
    // 1. Calculate and Save Points (Robust Matching)
    let earnedPoints = 0;
    const playerRealm = gameState.realm.trim();

    // Iterate through all defined realms to find the best match
    Object.keys(REALM_POINTS_MAP).forEach(key => {
        // Key format: "ChineseName (EnglishName)" e.g. "元婴期 (Nascent Soul)"
        // or just "ChineseName" if no parens
        const match = key.match(/^(.+?)(?:\s*\((.+?)\))?$/);
        
        if (match) {
            const cnKey = match[1]; // "元婴期"
            const enKey = match[2]; // "Nascent Soul" or undefined

            // Robust keyword extraction: Remove "期" (Phase/Period) suffix from Chinese name
            // e.g. "元婴期" -> "元婴". This allows matching "元婴初期", "元婴大圆满" etc.
            // Also handle "炼气期" -> "炼气"
            const cnKeyword = cnKey.replace(/期$/, '');

            // Check if player's realm contains the keyword
            // Case 1: Chinese Match (e.g. player "元婴一层" includes "元婴")
            // Case 2: English Match (e.g. player "Nascent Soul (Late)" includes "Nascent Soul")
            const isMatch = playerRealm.includes(cnKeyword) || (enKey && playerRealm.includes(enKey));

            if (isMatch) {
                earnedPoints = Math.max(earnedPoints, REALM_POINTS_MAP[key]);
            }
        }
    });

    setLastRunPoints(earnedPoints);

    // Update Max Record if higher
    const currentMax = parseInt(localStorage.getItem(STORAGE_KEY_POINTS) || "0", 10);
    if (earnedPoints > currentMax) {
        localStorage.setItem(STORAGE_KEY_POINTS, earnedPoints.toString());
        setBonusPoints(earnedPoints); // Update UI to reflect new max
    }

    // 2. Awakening Check & Scripture Logic
    const isAwakened = gameState.awakeningLevel >= 50; // Threshold for awakening
    
    if (isAwakened) {
        // Mode: Edit Tianwai Record
        setEndingMode('edit');
    } else {
        // Mode: Auto Analyze Yuwai Scripture
        setEndingMode('analyze');
        const newScripture = await generateWorldAnalysis(gameState.history, yuwaiScripture);
        setYuwaiScripture(newScripture);
        localStorage.setItem(STORAGE_KEY_SCRIPTURE, newScripture);
    }

    setHasCalculatedEnding(true);
    setEndingProcessing(false);
  };

  const saveTianwaiRecord = () => {
      localStorage.setItem(STORAGE_KEY_RECORD, tianwaiRecord);
      restartGame();
  };

  // Queue Consumer / Game Loop Tick
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // If there are events in the queue, process the next one
    if (eventQueue.length > 0 && !gameState.isDead) {
      timeoutId = setTimeout(() => {
        // Pop the first event
        const currentEvent = eventQueue[0];
        const remainingEvents = eventQueue.slice(1);

        setEventQueue(remainingEvents);

        // Apply state changes
        setGameState(prev => {
          const newHistory: LogEntry[] = [
            ...prev.history,
            { 
              age: prev.age + currentEvent.ageIncrement, 
              text: currentEvent.log, 
              type: currentEvent.choiceEvent ? 'choice' : (currentEvent.isDead ? 'danger' : 'normal') 
            }
          ];

          // Merge attributes
          const newAttrs = { ...prev.attributes };
          if (currentEvent.attributeChanges) {
            (Object.keys(currentEvent.attributeChanges) as Array<keyof Attributes>).forEach(k => {
              const val = currentEvent.attributeChanges![k];
              if (val) newAttrs[k] = (newAttrs[k] || 0) + val;
            });
          }

          // Merge arrays unique
          const newTech = Array.from(new Set([...prev.techniques, ...(currentEvent.newTechniques || [])]));
          const newArts = Array.from(new Set([...prev.artifacts, ...(currentEvent.newArtifacts || [])]));

          const newState: GameState = {
            ...prev,
            age: prev.age + currentEvent.ageIncrement,
            attributes: newAttrs,
            history: newHistory,
            techniques: newTech,
            artifacts: newArts,
            realm: currentEvent.realmUpdate || prev.realm,
            isDead: currentEvent.isDead,
            deathReason: currentEvent.deathReason,
            pendingChoice: currentEvent.choiceEvent || null,
            corruption: prev.corruption + (currentEvent.corruptionChange || 0),
            awakeningLevel: prev.awakeningLevel + (currentEvent.awakeningChange || 0),
          };

          if (currentEvent.isDead) {
             newState.history.push({
               age: newState.age,
               text: `【结局】 ${currentEvent.deathReason}`,
               type: 'danger'
             });
             newState.phase = GamePhase.ENDED;
             // NOTE: We do NOT automatically call handleOpenEnding here anymore.
             // User must click the button.
          }

          return newState;
        });

      }, 800); // Tick rate for reading speed
    } 
    // If Queue is empty, not dead, not waiting for choice, and Auto is ON -> Fetch more
    else if (eventQueue.length === 0 && !gameState.pendingChoice && !gameState.isDead && !isFetching && isAuto) {
      fetchEvents();
    }

    return () => clearTimeout(timeoutId);
  }, [eventQueue, gameState.isDead, gameState.pendingChoice, isFetching, isAuto, fetchEvents]);

  // Rendering Setup
  if (phase === GamePhase.SETUP) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=2')] bg-cover bg-center overflow-y-auto">
        <div className="bg-slate-900/90 p-8 rounded-xl shadow-2xl border border-slate-600 max-w-lg w-full backdrop-blur-md my-10">
          <h1 className="text-4xl font-serif text-amber-500 text-center mb-2">异界修仙模拟器</h1>
          <p className="text-slate-400 text-center mb-8 text-sm">Otherworldly Cultivation Simulator</p>
          
          <div className="mb-6 bg-slate-800 p-4 rounded text-center grid grid-cols-2 gap-4">
             <div>
                <span className="block text-slate-400 text-xs uppercase">Initial Points</span>
                <span className="text-xl font-bold text-slate-200">{INITIAL_POINTS}</span>
             </div>
             <div>
                <span className="block text-slate-400 text-xs uppercase">Inheritance Bonus</span>
                <span className="text-xl font-bold text-amber-400">+{bonusPoints}</span>
             </div>
             <div className="col-span-2 border-t border-slate-700 pt-2 mt-2">
                <span className="text-slate-300 mr-2">剩余点数 (Total):</span>
                <span className="text-2xl font-bold text-amber-400">{pointsRemaining}</span>
             </div>
          </div>

          <AttributeControl label="精 Essence" value={attributes.essence} remaining={pointsRemaining} onChange={(v) => handleAttrChange('essence', v)} />
          <AttributeControl label="气 Qi" value={attributes.qi} remaining={pointsRemaining} onChange={(v) => handleAttrChange('qi', v)} />
          <AttributeControl label="神 Spirit" value={attributes.spirit} remaining={pointsRemaining} onChange={(v) => handleAttrChange('spirit', v)} />
          <AttributeControl label="根骨 Root" value={attributes.rootBone} remaining={pointsRemaining} onChange={(v) => handleAttrChange('rootBone', v)} />
          <AttributeControl label="功德 Merit" value={attributes.merit} remaining={pointsRemaining} onChange={(v) => handleAttrChange('merit', v)} />

          <button
            onClick={startGame}
            disabled={pointsRemaining > 0}
            className="w-full mt-6 py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors text-lg"
          >
            {pointsRemaining > 0 ? "请分配完所有点数 (Allocate All Points)" : "开始轮回 (Start Incarnation)"}
          </button>
        </div>
      </div>
    );
  }

  // Rendering Game
  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#0f172a] text-slate-200 overflow-hidden font-serif relative">
      
      {/* Sidebar: Status */}
      <div className="w-full md:w-80 shrink-0 bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col max-h-[30vh] md:max-h-full md:h-full z-20 shadow-lg md:shadow-none">
        <StatusPanel state={gameState} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-700 bg-[#0f172a]/95 backdrop-blur z-10 flex justify-between items-end shadow-md">
           <div>
             <h1 className="text-2xl font-bold text-amber-500 leading-none">道历 {gameState.age} 年</h1>
             <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Year {gameState.age} of the Dao Era</p>
           </div>
           {gameState.isDead && (
             <span className="bg-red-900/50 text-red-400 px-3 py-1 rounded border border-red-700 text-sm font-bold animate-pulse">已陨落 (FALLEN)</span>
           )}
        </div>

        {/* Log Area */}
        <div className="flex-1 overflow-hidden relative"> 
          <EventLog history={gameState.history} />
        </div>

        {/* Action Area */}
        <div className="shrink-0 p-4 bg-[#0f172a] border-t border-slate-700 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
          <div className="w-full max-w-5xl mx-auto">
            {isFetching && eventQueue.length === 0 ? (
               <div className="flex items-center justify-center h-24 space-x-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-200"></div>
                 <span className="text-slate-400 font-mono text-sm ml-2">
                   推演天机中... (Divining Fate...)
                 </span>
               </div>
            ) : gameState.isDead ? (
              <div className="flex flex-col items-center justify-center h-24">
                 <p className="text-lg text-red-400 mb-2 italic">尘归尘，土归土。</p>
                 <div className="flex gap-4">
                     <button 
                        onClick={handleOpenEnding} 
                        className="px-6 py-2 bg-indigo-900/50 hover:bg-indigo-800/50 rounded text-indigo-200 transition-colors border border-indigo-700/50 font-bold"
                     >
                        {hasCalculatedEnding ? "查阅经书 (Inheritance)" : "结算本世 (Conclude Life)"}
                     </button>
                 </div>
              </div>
            ) : gameState.pendingChoice ? (
              <div className="flex flex-col gap-3 bg-indigo-950/30 p-3 rounded-lg border border-indigo-500/30 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg text-purple-300 font-bold">{gameState.pendingChoice.title}</h3>
                    <p className="text-slate-300 text-sm opacity-80">{gameState.pendingChoice.description}</p>
                  </div>
                  <span className="text-xs text-purple-400 border border-purple-500/50 px-2 py-0.5 rounded">抉择 Choice</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {gameState.pendingChoice.options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => fetchEvents(opt.id)}
                      className="p-3 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 hover:border-indigo-500 rounded text-left text-indigo-100 transition-all text-sm font-medium"
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex gap-4 items-center justify-center h-24">
                <button
                  onClick={() => fetchEvents()}
                  disabled={isAuto || eventQueue.length > 0}
                  className={`flex-1 h-full text-xl font-bold tracking-[0.2em] bg-gradient-to-r from-amber-900/40 to-amber-800/40 hover:from-amber-800/60 hover:to-amber-700/60 border border-amber-700/50 text-amber-100 rounded-lg transition-all active:scale-[0.99] shadow-inner ${isAuto ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  {eventQueue.length > 0 ? "事件进行中..." : "继续推演 (PROCEED)"}
                </button>
                
                <button
                  onClick={() => setIsAuto(!isAuto)}
                  className={`w-32 h-full text-base font-bold border rounded-lg transition-all flex flex-col items-center justify-center shadow-lg
                    ${isAuto 
                      ? 'bg-red-900/20 border-red-800/50 text-red-400 hover:bg-red-900/40' 
                      : 'bg-emerald-900/20 border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/40'
                    }`}
                >
                  <span>{isAuto ? '停止' : '自动'}</span>
                  <span className="text-[10px] font-normal opacity-60 uppercase mt-1">
                    {isAuto ? 'STOP' : 'AUTO'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inheritance UI Overlay */}
      {showEndingUI && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-600 p-6 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                {endingProcessing ? (
                     <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-amber-500 font-serif text-xl animate-pulse">正在收录生平...</p>
                        <p className="text-slate-500 text-sm mt-2">Judging your soul...</p>
                     </div>
                ) : (
                    <>
                        <div className="mb-6 text-center">
                            <h2 className="text-3xl font-serif text-slate-100 mb-2">
                                {endingMode === 'analyze' ? '《宇外荒经》' : '《天外异闻箓》'}
                            </h2>
                            <p className="text-slate-400 text-sm mb-4">
                                {endingMode === 'analyze' 
                                    ? '凡人观测到的世界表象 (The Surface World observed by Mortals)' 
                                    : '觉醒者窥见的真实记录 (The Truth recorded by the Awakened)'}
                            </p>
                            
                            <div className="bg-slate-800/80 rounded py-2 px-4 inline-block border border-slate-700">
                                <span className="text-slate-400 text-xs uppercase mr-2">本世奖励 Points Earned</span>
                                <span className="text-amber-400 font-bold text-lg">+{lastRunPoints}</span>
                                <span className="text-slate-600 text-xs mx-2">|</span>
                                <span className="text-slate-400 text-xs uppercase mr-2">最高记录 Highest Record</span>
                                <span className="text-slate-200 font-bold">{bonusPoints}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 mb-6">
                            {endingMode === 'analyze' ? (
                                <div className="overflow-y-auto whitespace-pre-wrap font-serif leading-relaxed text-amber-100/80 custom-scrollbar pr-2 h-64 md:h-96">
                                    {yuwaiScripture}
                                </div>
                            ) : (
                                <textarea 
                                    className="w-full h-64 md:h-96 bg-transparent text-emerald-100/90 font-serif leading-relaxed resize-none focus:outline-none custom-scrollbar"
                                    value={tianwaiRecord}
                                    onChange={(e) => setTianwaiRecord(e.target.value)}
                                    placeholder="在此记录你所窥见的真实（这将影响下一个轮回）..."
                                />
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-center text-xs text-slate-500">
                                {endingMode === 'analyze' 
                                    ? '此经文已自动融合你本世的经历，将流传于后世。' 
                                    : '你已觉醒，请亲手书写这世界的真相，警示（或误导）后人。'}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowEndingUI(false)}
                                    className="py-3 rounded-lg font-bold text-lg transition-colors shadow-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
                                >
                                    回顾生平 (Review History)
                                </button>
                                <button 
                                    onClick={endingMode === 'analyze' ? restartGame : saveTianwaiRecord}
                                    className={`py-3 rounded-lg font-bold text-lg transition-colors shadow-lg
                                        ${endingMode === 'analyze' 
                                            ? 'bg-amber-700 hover:bg-amber-600 text-amber-100' 
                                            : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'}`}
                                >
                                    {endingMode === 'analyze' ? '入轮回 (Next Life)' : '铭刻真理 (Inscribe)'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

    </div>
  );
};

export default App;