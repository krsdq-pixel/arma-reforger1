import React from 'react';
import { Language } from '../types/mortar';

interface NumpadSubgridProps {
  onSelectKeypad: (key: number) => void;
  lang: Language;
  label: string;
}

export const NumpadSubgrid: React.FC<NumpadSubgridProps> = ({
  onSelectKeypad,
  lang,
  label
}) => {
  // Keypad matrix standard in tactical gaming:
  // 7 8 9 (North-West, North, North-East)
  // 4 5 6 (West, Center, East)
  // 1 2 3 (South-West, South, South-East)
  const rows = [
    [7, 8, 9],
    [4, 5, 6],
    [1, 2, 3]
  ];

  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2">
      <div className="text-[11px] text-zinc-400 mb-1.5 font-medium flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-zinc-500 font-mono">(Keypad 1-9)</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 w-36 mx-auto">
        {rows.map((row) =>
          row.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onSelectKeypad(num)}
              className="h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 active:bg-emerald-600 active:text-white text-zinc-200 font-mono text-sm font-bold rounded flex items-center justify-center transition-colors cursor-pointer"
              title={`Keypad ${num} (${lang === 'ar' ? 'مربع فرعي' : 'sub-grid'})`}
            >
              {num}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
