import React from 'react';

interface Props {
  label: string;
  value: number;
  remaining: number;
  onChange: (val: number) => void;
}

export const AttributeControl: React.FC<Props> = ({ label, value, remaining, onChange }) => {
  const handleIncrease = () => {
    if (remaining > 0 && value < 10) onChange(value + 1);
  };

  const handleDecrease = () => {
    if (value > 0) onChange(value - 1);
  };

  return (
    <div className="flex items-center justify-between mb-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
      <span className="text-amber-100 font-serif text-lg w-20">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={handleDecrease}
          disabled={value <= 0}
          className="w-8 h-8 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold"
        >
          -
        </button>
        <span className="text-xl font-bold text-amber-400 w-8 text-center">{value}</span>
        <button
          onClick={handleIncrease}
          disabled={remaining <= 0 || value >= 10}
          className="w-8 h-8 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
};