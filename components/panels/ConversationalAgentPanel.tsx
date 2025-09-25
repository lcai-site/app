
import React, { useEffect, useRef } from 'react';
import type { ConciergeMessage, ImageData } from '../../types';
import ImageResultMessage from './ImageResultMessage';
import VoiceAgentVisualizer from '../ui/VoiceAgentVisualizer';

type AgentStatus = 'idle' | 'listening' | 'processing' | 'speaking';

interface ConversationalAgentPanelProps {
    history: ConciergeMessage[];
    onClose: () => void;
    onSendToEdit: (image: ImageData) => void;
    onAddToGallery: (image: ImageData) => void;
    onDownload: (image: ImageData) => void;
    onRequestContentAssistant: (image: { base64: string, mimeType: string }) => void;
    performEditOnResult: (image: ImageData, action: 'remove-background' | 'enhance') => Promise<void>;
    agentStatus: AgentStatus;
    currentTranscript: string;
    onVisualizerClick: () => void;
    onImageUpload: (file: File) => void;
    onTakePhoto: () => void;
}

const ConversationalAgentPanel: React.FC<ConversationalAgentPanelProps> = ({
    history,
    onClose,
    onSendToEdit,
    onAddToGallery,
    onDownload,
    onRequestContentAssistant,
    performEditOnResult,
    agentStatus,
    currentTranscript,
    onVisualizerClick,
    onImageUpload,
    onTakePhoto,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, agentStatus]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-secondary-bg/90 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col" 
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="concierge-title"
            >
                <div className="p-4 border-b border-glass-border flex justify-between items-center flex-shrink-0">
                    <h2 id="concierge-title" className="text-lg font-bold gradient-text">🤖 Assistente Conversacional</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-3xl leading-none" aria-label="Fechar assistente">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {history.map((message, index) => (
                        <div key={index} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {message.resultImage ? (
                                <ImageResultMessage
                                    image={message.resultImage}
                                    onSendToEdit={() => onSendToEdit(message.resultImage!)}
                                    onAddToGallery={() => onAddToGallery(message.resultImage!)}
                                    onDownload={() => onDownload(message.resultImage!)}
                                    onRequestContentAssistant={() => onRequestContentAssistant(message.resultImage!)}
                                    performEditOnResult={performEditOnResult}
                                />
                            ) : (
                                <div className={`flex flex-col max-w-[80%] p-3 rounded-2xl ${message.role === 'user' ? 'bg-accent-start text-white rounded-br-none items-end' : 'bg-interactive-bg text-text-primary rounded-bl-none items-start'}`}>
                                    {message.image && (
                                        <img src={message.image.objectUrl} alt="User upload" className={`rounded-lg mb-2 max-h-48 ${!message.text ? 'w-full' : ''}`} />
                                    )}
                                    {message.text && (
                                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                    )}
                                    {message.imageUrl && (
                                        <img src={message.imageUrl} alt="Exemplo visual" className="rounded-lg mt-2 max-h-48 w-auto" />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                     {agentStatus === 'processing' && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] p-3 rounded-2xl bg-interactive-bg text-text-primary rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="p-4 border-t border-glass-border flex flex-col items-center justify-center flex-shrink-0 gap-4">
                    <p className="text-lg text-text-primary h-14 text-center">{currentTranscript || ' '}</p>
                    <div className="flex items-center justify-center gap-6 w-full">
                        <input type="file" id="concierge-upload" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) onImageUpload(e.target.files[0]); e.target.value = ''; }} />
                        <label htmlFor="concierge-upload" className="p-4 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg cursor-pointer transition-colors" title="Anexar da galeria">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </label>

                        <VoiceAgentVisualizer status={agentStatus} onClick={onVisualizerClick} />

                        <button onClick={onTakePhoto} className="p-4 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Tirar foto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>
                    <button onClick={onClose} className="text-sm text-text-secondary hover:text-text-primary">Sair do modo de voz</button>
                </div>
            </div>
        </div>
    );
};

export default ConversationalAgentPanel;
