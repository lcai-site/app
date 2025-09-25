import React, { useEffect, useRef } from 'react';

const PromptModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    prompt: string;
    setPrompt: (p: string) => void;
    title: string;
    placeholder: string;
    isListening: boolean;
    onToggleListening: () => void;
    onPromptEnhance: (action: 'translate' | 'enhance') => void;
    isProcessingPrompt: boolean;
    activePromptTool: 'translate' | 'enhance' | null;
}> = ({ isOpen, onClose, prompt, setPrompt, title, placeholder, isListening, onToggleListening, onPromptEnhance, isProcessingPrompt, activePromptTool }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            // FIX: Cast querySelector result to HTMLElement to call focus() safely.
            setTimeout(() => (modalRef.current?.querySelector('textarea') as HTMLTextAreaElement)?.focus(), 100);
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl flex flex-col gap-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
                <div className="flex justify-between items-center">
                    <h2 id="prompt-modal-title" className="text-2xl font-bold font-display">{title}</h2>
                    <button ref={closeButtonRef} onClick={onClose} className="text-text-secondary hover:text-text-primary text-3xl leading-none" aria-label="Fechar modal">&times;</button>
                </div>
                <div className="relative">
                    <textarea
                        className="w-full h-64 bg-primary-bg border border-glass-border rounded-lg p-3 pr-12 text-text-primary resize-none focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={placeholder}
                        aria-label="Caixa de texto do prompt"
                    />
                     <button
                        onClick={onToggleListening}
                        className={`absolute right-3 bottom-3 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-interactive-bg text-text-secondary hover:bg-interactive-hover-bg'}`}
                        aria-label={isListening ? "Parar ditado" : "Usar microfone para ditar"}
                        title={isListening ? "Parar ditado" : "Usar microfone para ditar"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button onClick={() => onPromptEnhance('translate')} disabled={isProcessingPrompt} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                    {activePromptTool === 'translate' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                    Traduzir prompt
                    </button>
                    <button onClick={() => onPromptEnhance('enhance')} disabled={isProcessingPrompt} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                    {activePromptTool === 'enhance' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                    Melhorar
                    </button>
                </div>
                <button onClick={onClose} className="w-full bg-gradient-to-r from-accent-start to-accent-end text-white font-display font-bold py-3 px-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_4px_15px_rgba(162,89,255,0.2)] hover:opacity-90 hover:shadow-[0_6px_20px_rgba(162,89,255,0.3)]">
                    Concluído
                </button>
            </div>
        </div>
    );
};

export default PromptModal;