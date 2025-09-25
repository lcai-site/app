import React, { useEffect, useRef, useState } from 'react';
import type { ContentAssistantData, ImageData, MarketingPersona } from '../../types';
import { analyzeImageForContent } from '../../services/geminiService';

const ContentAssistantModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    image: ImageData | null;
    businessInfo: string;
}> = ({ isOpen, onClose, image, businessInfo }) => {
    const [data, setData] = useState<ContentAssistantData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [composedPost, setComposedPost] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState<MarketingPersona | null>(null);
    
    // States for interactive selection
    const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
    const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => modalRef.current?.querySelector('button')?.focus(), 100);
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    useEffect(() => {
        const analyze = async () => {
            if (isOpen && image && selectedPersona && !data) {
                const apiKey = localStorage.getItem('userConfigValue');
                if (!apiKey) {
                    setError('Por favor, configure sua chave de API nas Configurações.');
                    setIsLoading(false);
                    return;
                }
                
                setIsLoading(true);
                setError(null);
                setComposedPost('');
                setSelectedCaption(null); // Reset selections
                setSelectedHashtags(new Set()); // Reset selections
                try {
                    const result = await analyzeImageForContent(apiKey, image.base64, image.mimeType, selectedPersona, businessInfo);
                    setData(result);
                } catch (e: any) {
                    setError(e.message || "Falha ao gerar conteúdo.");
                } finally {
                    setIsLoading(false);
                }
            }
        };
        analyze();
    }, [isOpen, image, data, businessInfo, selectedPersona]);
    
    useEffect(() => {
      // Reset all state when modal is closed
      if(!isOpen) {
        setData(null);
        setSelectedPersona(null);
        setSelectedCaption(null);
        setSelectedHashtags(new Set());
        setError(null);
      }
    }, [isOpen]);

    // Sync selections to the composedPost textarea
    useEffect(() => {
        const captionPart = selectedCaption || '';
        const hashtagsPart = Array.from(selectedHashtags).join(' ');

        let newComposedPost = captionPart;
        if (captionPart && hashtagsPart) {
            newComposedPost += `\n\n${hashtagsPart}`;
        } else if (!captionPart && hashtagsPart) {
            newComposedPost = hashtagsPart;
        }
        
        setComposedPost(newComposedPost);
    }, [selectedCaption, selectedHashtags]);

    const handleSelectCaption = (text: string) => {
        setSelectedCaption(prev => (prev === text ? null : text));
    };
    
    const handleToggleHashtag = (tag: string) => {
        const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
        setSelectedHashtags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(formattedTag)) {
                newSet.delete(formattedTag);
            } else {
                newSet.add(formattedTag);
            }
            return newSet;
        });
    };
    
    const handleCopyAll = () => {
        navigator.clipboard.writeText(composedPost);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} className="bg-secondary-bg/80 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl flex flex-col gap-4 max-h-[90vh]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="content-assistant-title">
                <div className="flex justify-between items-center flex-shrink-0">
                    <h2 id="content-assistant-title" className="text-2xl font-bold gradient-text">✨ Assistente de Conteúdo</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-3xl leading-none" aria-label="Fechar modal">&times;</button>
                </div>
                
                {!selectedPersona ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <h3 className="text-xl font-semibold text-text-primary text-center">Qual é o objetivo principal do seu post?</h3>
                        <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
                            <button onClick={() => setSelectedPersona('sell')} className="w-full flex-1 p-4 rounded-xl text-center cursor-pointer transition-all duration-300 bg-interactive-bg border border-transparent hover:border-interactive-hover-border hover:bg-interactive-hover-bg">
                                <div className="text-3xl mb-2" aria-hidden="true">🎯</div>
                                <div className="font-medium text-base text-text-primary">Vender um Produto</div>
                            </button>
                            <button onClick={() => setSelectedPersona('engage')} className="w-full flex-1 p-4 rounded-xl text-center cursor-pointer transition-all duration-300 bg-interactive-bg border border-transparent hover:border-interactive-hover-border hover:bg-interactive-hover-bg">
                                <div className="text-3xl mb-2" aria-hidden="true">❤️</div>
                                <div className="font-medium text-base text-text-primary">Gerar Engajamento</div>
                            </button>
                            <button onClick={() => setSelectedPersona('story')} className="w-full flex-1 p-4 rounded-xl text-center cursor-pointer transition-all duration-300 bg-interactive-bg border border-transparent hover:border-interactive-hover-border hover:bg-interactive-hover-bg">
                                <div className="text-3xl mb-2" aria-hidden="true">📖</div>
                                <div className="font-medium text-base text-text-primary">Contar uma História / Criar Marca</div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-y-auto flex-grow pr-3 space-y-6">
                            {isLoading && <div className="text-center text-text-secondary">Analisando imagem e gerando ideias...</div>}
                            {error && <div className="text-center text-error-text bg-error-bg p-3 rounded-md">{error}</div>}
                            {data && (
                                <>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">✍️ Sugestões de Legenda</h3>
                                        <div className="space-y-2">
                                            {data.captions.map((caption, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => handleSelectCaption(caption.text)} 
                                                    className={`w-full text-left bg-panel-bg p-3 rounded-lg cursor-pointer hover:bg-interactive-hover-bg transition-all duration-200 border-2 ${selectedCaption === caption.text ? 'border-accent-start' : 'border-transparent'}`}
                                                    aria-pressed={selectedCaption === caption.text}
                                                >
                                                    <p className="font-bold text-accent-start text-sm">{caption.tone}</p>
                                                    <p className="text-text-primary mt-1">{caption.text}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">📈 Hashtags Estratégicas</h3>
                                        <div className="space-y-3">
                                            {(['broad', 'niche', 'trending'] as const).map(category => (
                                                data.hashtags[category]?.length > 0 && (
                                                    <div key={category}>
                                                        <h4 className="font-semibold text-text-secondary capitalize">{category === 'broad' ? 'Amplo Alcance' : category === 'niche' ? 'Nicho Específico' : 'Em Alta'}</h4>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {data.hashtags[category].map((tag, i) => {
                                                                const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
                                                                const isSelected = selectedHashtags.has(formattedTag);
                                                                return (
                                                                    <button 
                                                                        key={i} 
                                                                        onClick={() => handleToggleHashtag(tag)} 
                                                                        className={`text-xs px-2 py-1 rounded-full transition-colors ${isSelected ? 'bg-accent-start text-white' : 'bg-interactive-hover-bg text-text-primary hover:bg-interactive-hover-bg'}`}
                                                                        aria-pressed={isSelected}
                                                                    >
                                                                        {tag}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex-shrink-0 pt-4 border-t border-glass-border">
                            <h3 className="text-lg font-semibold mb-2">Monte sua Legenda Final</h3>
                            <textarea 
                              className="w-full h-28 bg-panel-bg border border-glass-border rounded-lg p-2 focus:ring-2 focus:ring-accent-start resize-y"
                              value={composedPost}
                              onChange={(e) => setComposedPost(e.target.value)}
                              placeholder="Clique nas sugestões acima para montar sua legenda aqui..."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => {
                                    setComposedPost('');
                                    setSelectedCaption(null);
                                    setSelectedHashtags(new Set());
                                }} className="text-sm bg-interactive-bg hover:bg-interactive-hover-bg text-text-secondary font-medium py-2 px-4 rounded-lg transition-colors">Limpar</button>
                                <button onClick={handleCopyAll} className="text-sm bg-gradient-to-r from-accent-start to-accent-end text-white font-medium py-2 px-4 rounded-lg transition-opacity hover:opacity-90">
                                   {copySuccess ? 'Copiado!' : 'Copiar Tudo'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default ContentAssistantModal;