import React from 'react';
import { GameState } from '../types';

interface Props {
  state: GameState;
}

export const StatusPanel: React.FC<Props> = ({ state }) => {
  const renderStat = (label: string, val: number, colorClass: string) => (
    <div className="flex justify-between items-center mb-2 p-2 bg-slate-900/50 rounded border border-slate-700/50 hover:bg-slate-900 transition-colors">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <span className={`font-mono font-bold ${colorClass}`}>{val}</span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 flex flex-col gap-6 custom-scrollbar">
      {/* Realm Header */}
      <div className="text-center border-b border-slate-700 pb-4 mt-2">
        <h2 className="text-2xl font-serif text-amber-500 mb-1 drop-shadow-sm">{state.realm}</h2>
        <div className="text-slate-500 text-[10px] uppercase tracking-[0.2em]">Current Realm</div>
      </div>

      {/* Core Attributes */}
      <div>
        <h3 className="text-slate-300 font-bold mb-3 text-xs uppercase tracking-wider flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span> 
          属性 Attributes
        </h3>
        {renderStat("精 Essence", state.attributes.essence, "text-red-400")}
        {renderStat("气 Qi", state.attributes.qi, "text-blue-400")}
        {renderStat("神 Spirit", state.attributes.spirit, "text-purple-400")}
        {renderStat("根骨 Root", state.attributes.rootBone, "text-yellow-400")}
        {renderStat("功德 Merit", state.attributes.merit, "text-emerald-400")}
      </div>

       {/* Hidden Stats */}
       {(state.awakeningLevel > 0 || state.corruption > 0) && (
        <div className="animate-in fade-in duration-700">
          <h3 className="text-slate-300 font-bold mb-3 text-xs uppercase tracking-wider flex items-center gap-2 opacity-80">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
            异化 Status
          </h3>
           {state.corruption > 0 && renderStat("浊 Corruption", state.corruption, "text-gray-500")}
           {state.awakeningLevel > 0 && renderStat("觉 Awakening", state.awakeningLevel, "text-pink-500")}
        </div>
      )}

      {/* Techniques */}
      <div className="flex-1 min-h-[100px]">
        <h3 className="text-slate-300 font-bold mb-3 text-xs uppercase tracking-wider flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
          功法 Techniques
        </h3>
        <div className="bg-slate-900/30 rounded p-3 border border-slate-700/30 min-h-[80px]">
          {state.techniques.length === 0 ? (
            <p className="text-slate-600 text-xs italic text-center py-4">暂无功法 (None)</p>
          ) : (
            <ul className="list-none text-sm space-y-2">
              {state.techniques.map((t, i) => (
                <li key={i} className="text-amber-200/90 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">{t}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Artifacts */}
      <div className="flex-1 min-h-[100px]">
        <h3 className="text-slate-300 font-bold mb-3 text-xs uppercase tracking-wider flex items-center gap-2 opacity-80">
           <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
           法器 Artifacts
        </h3>
        <div className="bg-slate-900/30 rounded p-3 border border-slate-700/30 min-h-[80px]">
          {state.artifacts.length === 0 ? (
            <p className="text-slate-600 text-xs italic text-center py-4">两手空空 (Empty)</p>
          ) : (
            <ul className="list-none text-sm space-y-2">
              {state.artifacts.map((a, i) => (
                <li key={i} className="text-cyan-200/90 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">{a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};