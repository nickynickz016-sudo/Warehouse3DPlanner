import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmProceedModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmWord?: string;
  confirmButtonText?: string;
  dangerLevel?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmProceedModal: React.FC<ConfirmProceedModalProps> = ({
  isOpen,
  title,
  message,
  confirmWord = 'proceed',
  confirmButtonText = 'Confirm Proceed',
  dangerLevel = 'danger',
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatched = inputValue.trim().toLowerCase() === confirmWord.toLowerCase();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isMatched) {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dangerLevel === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {dangerLevel === 'danger' ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">{title}</h3>
            </div>
            <button 
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="text-sm text-gray-600 mb-5 leading-relaxed">
            {message}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 text-center">
                Type <span className="font-mono font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{confirmWord}</span> to execute
              </label>
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Type '${confirmWord}' here`}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:bg-red-50/20 outline-none font-bold text-center tracking-wide transition-all shadow-inner text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!isMatched}
                className={`flex-1 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                  isMatched 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25 active:scale-98' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                <Trash2 size={14} />
                <span>{confirmButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
