import React, { useState } from 'react';
import { SavedTarget, Language, Coordinates } from '../types/mortar';
import { translations } from '../utils/translations';
import { meterToGrid4 } from '../utils/ballistics';

interface SavedTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTargets: SavedTarget[];
  onSelectTarget: (target: SavedTarget) => void;
  onDeleteTarget: (id: string) => void;
  onSaveCurrentTarget: (name: string, notes?: string) => void;
  currentTarget: Coordinates;
  lang: Language;
}

export const SavedTargetsModal: React.FC<SavedTargetsModalProps> = ({
  isOpen,
  onClose,
  savedTargets,
  onSelectTarget,
  onDeleteTarget,
  onSaveCurrentTarget,
  currentTarget,
  lang
}) => {
  const t = translations[lang];
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetNotes, setNewTargetNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetName.trim()) return;
    onSaveCurrentTarget(newTargetName.trim(), newTargetNotes.trim());
    setNewTargetName('');
    setNewTargetNotes('');
  };

  const copyToClipboard = (tgt: SavedTarget) => {
    const text = `[TRP: ${tgt.name}] GRID: ${meterToGrid4(tgt.x)}-${meterToGrid4(tgt.y)} | ALT: ${tgt.alt}m${tgt.notes ? ` | ${tgt.notes}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(tgt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wide">
              {t.savedTargetsTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Save Current Position Box */}
          <form onSubmit={handleSave} className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
              <span>{t.saveTarget}</span>
              <span className="font-mono text-zinc-500 text-[11px]">
                {meterToGrid4(currentTarget.x)}-{meterToGrid4(currentTarget.y)} ({currentTarget.alt}m)
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder={t.targetNamePrompt}
                value={newTargetName}
                onChange={e => setNewTargetName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Optional notes (e.g. bunker, infantry)'}
                value={newTargetNotes}
                onChange={e => setNewTargetNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newTargetName.trim()}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded transition-colors cursor-pointer"
              >
                + {t.saveTarget}
              </button>
            </div>
          </form>

          {/* List of saved targets */}
          <div className="space-y-2">
            {savedTargets.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                {t.noSavedTargets}
              </div>
            ) : (
              savedTargets.map(tgt => (
                <div
                  key={tgt.id}
                  className="bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-zinc-200 truncate">
                      {tgt.name}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Grid: <span className="text-blue-400 font-bold">{meterToGrid4(tgt.x)}-{meterToGrid4(tgt.y)}</span> · Alt: {tgt.alt}m
                    </div>
                    {tgt.notes && (
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {tgt.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(tgt)}
                      className="min-h-[36px] px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded cursor-pointer transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === tgt.id ? '✓' : (lang === 'ar' ? 'نسخ' : 'Copy')}
                    </button>
                    <button
                      onClick={() => {
                        onSelectTarget(tgt);
                        onClose();
                      }}
                      className="min-h-[36px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium rounded cursor-pointer transition-colors"
                    >
                      {t.loadTarget}
                    </button>
                    <button
                      onClick={() => onDeleteTarget(tgt.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-red-400 text-sm rounded hover:bg-zinc-800 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded cursor-pointer transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
