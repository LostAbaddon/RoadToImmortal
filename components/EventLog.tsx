import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface Props {
  history: LogEntry[];
}

export const EventLog: React.FC<Props> = ({ history }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'danger': return 'text-red-300 border-l-2 border-red-600 pl-4 py-3 bg-red-950/20';
      case 'success': return 'text-emerald-300 border-l-2 border-emerald-600 pl-4 py-3 bg-emerald-950/20';
      case 'important': return 'text-amber-200 border-l-2 border-amber-600 pl-4 py-3 bg-amber-950/20';
      case 'choice': return 'text-purple-300 italic border-l-2 border-purple-500 pl-4 py-2 bg-purple-950/10';
      default: return 'text-slate-300 py-2 pl-2 border-l-2 border-transparent';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 space-y-2 scroll-smooth w-full max-w-5xl mx-auto">
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-600 italic opacity-50">
          <span className="text-4xl mb-4">☯</span>
          <p>大道漫漫，始于足下...</p>
          <p className="text-xs mt-2">The path is long, start your journey...</p>
        </div>
      )}
      {history.map((entry, idx) => (
        <div key={idx} className={`text-base md:text-lg leading-relaxed rounded-r transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${getLogStyle(entry.type)}`}>
          <span className="font-mono font-bold opacity-40 mr-3 text-xs md:text-sm select-none block md:inline mb-1 md:mb-0">[{entry.age}岁]</span>
          <span>{entry.text}</span>
        </div>
      ))}
      <div ref={bottomRef} className="pb-4" />
    </div>
  );
};