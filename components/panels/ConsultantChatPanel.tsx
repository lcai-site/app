
import React, { useEffect, useRef } from 'react';
import type { ConsultantMessage, ImageData } from '../../types';

interface ConsultantChatPanelProps {
    history: ConsultantMessage[];
    userInput: string;
    setUserInput: (value: string) => void;
    onSendMessage: () => void;
    isTyping: boolean;
    imageToSend: ImageData | null;
    onRemoveImage: () => void;
    onImageUpload: (file: File) => void;
    onTakePhoto: () => void;
    isListening: boolean;
    onToggleListening: () => void;
}

const ConsultantChatPanel: React.FC<ConsultantChatPanelProps> = ({ 
    history, 
    userInput, 
    setUserInput, 
    onSendMessage, 
    isTyping,
    imageToSend,
    onRemoveImage,
    onImageUpload,
    onTakePhoto,
    isListening,
    onToggleListening
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isTyping]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-panel-bg rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-2 text-center text-text-primary">💡 Consultor de IA</h3>
            <p className="text-xs text-text-secondary text-center mb-4">
                Converse com a IA para refinar sua ideia. Ela fará perguntas para ajudar a criar a imagem perfeita.
            </p>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {history.map((message, index) => (
                    <div key={index} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col max-w-[80%] p-3 rounded-2xl ${message.role === 'user' ? 'bg-accent-start text-white rounded-br-none items-end' : 'bg-interactive-bg text-text-primary rounded-bl-none items-start'}`}>
                           {message.image && (
                                <img src={message.image.objectUrl} alt="User upload" className={`rounded-lg mb-2 max-h-48 ${!message.text ? 'w-full' : ''}`} />
                            )}
                            {message.text && (
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
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
            <div className="mt-4 flex flex-col">
                {imageToSend && (
                    <div className="p-2">
                        <div className="relative inline-block">
                            <img src={imageToSend.objectUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
                            <button onClick={onRemoveImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm leading-none p-0 z-10" aria-label="Remover imagem">&times;</button>
                        </div>
                    </div>
                )}
                <div className="pt-2 border-t border-glass-border flex items-end gap-2">
                    <input type="file" id="consultant-upload" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) onImageUpload(e.target.files[0]); e.target.value = ''; }} />
                    <label htmlFor="consultant-upload" className="p-2 rounded-lg bg-interactive-bg hover:bg-interactive-hover-bg cursor-pointer transition-colors" title="Anexar da galeria">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </label>
                    <button onClick={onTakePhoto} className="p-2 rounded-lg bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Tirar foto">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                        placeholder="Sua ideia..."
                        className="flex-grow bg-secondary-bg border border-glass-border rounded-lg p-2 focus:ring-2 focus:ring-accent-start resize-none max-h-24 overflow-y-auto hide-scrollbar"
                        rows={1}
                    />
                     <button onClick={onToggleListening} className={`p-2 rounded-lg shrink-0 transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-interactive-bg text-text-secondary hover:bg-interactive-hover-bg'}`} title={isListening ? 'Parar ditado' : 'Usar microfone'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={onSendMessage}
                        disabled={(!userInput.trim() && !imageToSend) || isTyping}
                        className="p-2 rounded-lg bg-accent-start hover:bg-accent-end disabled:opacity-50 transition-colors shrink-0"
                        aria-label="Enviar mensagem"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsultantChatPanel;
