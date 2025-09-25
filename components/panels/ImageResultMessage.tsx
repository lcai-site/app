import React, { useState, useEffect } from 'react';
import type { ImageData } from '../../types';

interface ImageResultMessageProps {
    image: ImageData;
    onSendToEdit: () => void;
    onAddToGallery: () => void;
    onDownload: () => void;
    onRequestContentAssistant: () => void;
    performEditOnResult: (image: ImageData, action: 'remove-background' | 'enhance') => Promise<void>;
}

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode; text?: string }> = ({ onClick, title, children, text }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        title={title}
        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-interactive-bg hover:bg-interactive-hover-bg text-white transition-colors w-24"
    >
        {children}
        {text && <span className="text-xs">{text}</span>}
    </button>
);

const ImageResultMessage: React.FC<ImageResultMessageProps> = ({
    image,
    onSendToEdit,
    onAddToGallery,
    onDownload,
    onRequestContentAssistant,
    performEditOnResult,
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsFullScreen(false);
            }
        };
        if (isFullScreen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullScreen]);
    
    const handleQuickEdit = (action: 'remove-background' | 'enhance') => {
        performEditOnResult(image, action);
        setIsFullScreen(false); // Close modal after initiating action
    };
    
    const handleAdvancedEdit = () => {
        onSendToEdit();
        setIsFullScreen(false);
    };

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-2">
            <div className="relative group w-full checkerboard-bg rounded-xl">
                <img
                    src={image.objectUrl}
                    alt="Resultado da IA"
                    className="w-full h-auto object-contain max-h-96 rounded-xl cursor-pointer"
                    onClick={() => setIsFullScreen(true)}
                />
                <div
                    onClick={() => setIsFullScreen(true)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer rounded-xl"
                    aria-hidden="true"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 0h-4" />
                    </svg>
                </div>
            </div>
            <div className="flex gap-2 bg-secondary-bg/60 backdrop-blur-md p-2 rounded-full">
                <button title="Enviar para Edição" onClick={onSendToEdit} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                <button title="Adicionar à Galeria" onClick={onAddToGallery} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
                <button title="Assistente de Conteúdo" onClick={onRequestContentAssistant} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></button>
                <button title="Baixar" onClick={onDownload} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></button>
            </div>

            {isFullScreen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-4 gap-4"
                    onClick={() => setIsFullScreen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Visualização em tela cheia"
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 text-5xl leading-none z-[70]"
                        aria-label="Fechar tela cheia"
                    >&times;</button>
                    
                    <div className="flex-grow flex items-center justify-center max-w-[90vw] max-h-[calc(90vh-120px)]">
                       <img
                            src={image.objectUrl}
                            alt="Resultado da IA em tela cheia"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                    
                     <div className="flex-shrink-0 flex items-center justify-center gap-2 bg-secondary-bg/60 backdrop-blur-md p-2 rounded-full">
                        <ActionButton onClick={() => handleQuickEdit('remove-background')} title="Remover Fundo" text="Fundo">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </ActionButton>
                        <ActionButton onClick={() => handleQuickEdit('enhance')} title="Melhorar Qualidade" text="Melhorar">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        </ActionButton>
                        <ActionButton onClick={handleAdvancedEdit} title="Edição Avançada" text="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </ActionButton>
                         <div className="w-px h-10 bg-white/30"></div>
                        <ActionButton onClick={onAddToGallery} title="Adicionar à Galeria" text="Galeria">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </ActionButton>
                        <ActionButton onClick={onRequestContentAssistant} title="Assistente de Conteúdo" text="Legendas">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </ActionButton>
                        <ActionButton onClick={onDownload} title="Baixar" text="Baixar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        </ActionButton>
                     </div>
                </div>
            )}
        </div>
    );
};

export default ImageResultMessage;