import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requireDoubleConfirmation?: boolean;
  doubleConfirmationPrompt?: string;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  isDanger = true,
  requireDoubleConfirmation = false,
  doubleConfirmationPrompt = 'ONAYLIYORUM',
  loading = false,
}) => {
  const [doubleCheckInput, setDoubleCheckInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useModalBackButton(isOpen, onClose, 'confirm-modal');

  if (!isOpen) return null;

  const handleConfirmAction = async () => {
    if (requireDoubleConfirmation && doubleCheckInput.trim().toUpperCase() !== doubleConfirmationPrompt.toUpperCase()) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm();
      setDoubleCheckInput('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isConfirmDisabled = requireDoubleConfirmation && doubleCheckInput.trim().toUpperCase() !== doubleConfirmationPrompt.toUpperCase();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-[10000] bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-xl my-auto font-sans animate-in fade-in-0 zoom-in-95 duration-200 flex flex-col text-[#111111]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] flex items-start gap-4 relative pr-16 bg-white">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDanger ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-[#111111] border border-[#E5E7EB]'}`}>
            {isDanger ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight leading-snug">{title}</h3>
            <p className="text-xs sm:text-sm text-[#666666] mt-1 leading-relaxed">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            title="Kapat"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E7EB] text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {requireDoubleConfirmation && (
          <div className="p-5 sm:p-6 bg-red-50 border-b border-red-200 space-y-2">
            <p className="text-xs font-semibold text-red-700">
              Bu işlem kritik bir eylemdir. Devam etmek için aşağıya <span className="font-mono font-bold uppercase">{doubleConfirmationPrompt}</span> yazın:
            </p>
            <input
              type="text"
              value={doubleCheckInput}
              onChange={(e) => setDoubleCheckInput(e.target.value)}
              placeholder={doubleConfirmationPrompt}
              className="w-full bg-white border border-red-300 rounded-xl px-3.5 py-2.5 text-sm text-[#111111] focus:outline-none focus:border-red-600 font-mono"
            />
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-[#F7F7F8] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || loading}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs sm:text-sm font-semibold hover:bg-[#F2F2F3] text-[#666666] hover:text-[#111111] transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            disabled={isConfirmDisabled || submitting || loading}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-0 shadow-sm active:scale-95 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-40'
                : 'bg-[#111111] hover:bg-[#222222] text-white disabled:opacity-40'
            }`}
          >
            {submitting || loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-current" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

