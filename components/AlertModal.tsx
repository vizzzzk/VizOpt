
import React from 'react';
import { AlertCircle, CheckCircle2, XCircle, Info, Trash2 } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'danger' | 'warning';

interface Props {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  isConfirm?: boolean; // If true, shows Confirm/Cancel buttons
}

export const AlertModal: React.FC<Props> = ({ 
    isOpen, type, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onClose, isConfirm 
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <XCircle className="text-red-500" size={32} />;
            case 'success': return <CheckCircle2 className="text-green-500" size={32} />;
            case 'warning': return <AlertCircle className="text-orange-500" size={32} />;
            default: return <Info className="text-blue-500" size={32} />;
        }
    };

    const getHeaderColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-500/10 border-red-500/20 text-red-400';
            case 'success': return 'bg-green-500/10 border-green-500/20 text-green-400';
            case 'warning': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
            default: return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={isConfirm ? undefined : onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                
                <div className={`p-6 flex flex-col items-center text-center border-b border-gray-800 ${getHeaderColor()}`}>
                    <div className="mb-3">{getIcon()}</div>
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>

                <div className="p-6 text-center">
                    <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
                </div>

                <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-3">
                    {isConfirm ? (
                        <>
                            <button 
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-sm transition-colors"
                            >
                                {cancelLabel}
                            </button>
                            <button 
                                onClick={() => { onConfirm && onConfirm(); onClose(); }}
                                className={`flex-1 px-4 py-2 text-white rounded-lg font-bold text-sm transition-colors shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'}`}
                            >
                                {confirmLabel}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-sm transition-colors"
                        >
                            Okay
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
