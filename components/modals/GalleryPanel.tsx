import React, { useEffect } from 'react';
import type { ImageData } from '../../types';

const GalleryPanel: React.FC<{
    images: ImageData[];
    onSendToEdit: (imageData: ImageData) => void;
    onRemove: (index: number) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
}> = ({ images, onSendToEdit, onRemove, isOpen, setIsOpen, triggerRef }) => {
    
    useEffect(() => {
        if (!isOpen && triggerRef.current) {
            triggerRef.current.focus();
        }
    }, [isOpen, triggerRef]);

    return (
        <div className={`fixed top-0 right-0 h-full bg-secondary-bg/60 backdrop-blur-xl border-l border-glass-border shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-64`}>
            <div className="p-4 h-full flex flex-col">
                <h2 className="text-xl font-bold mb-4">Galeria</h2>
                {images.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center mt-4">Nenhuma imagem salva ainda.</p>
                ) : (
                    <div className="overflow-y-auto flex-grow pr-1">
                        <div className="grid grid-cols-2 gap-2">
                            {images.map((image, index) => (
                                <div key={image.objectUrl} className="relative group aspect-square">
                                    <img src={image.objectUrl} alt={`Gallery item ${index}`} className="w-full h-full object-cover rounded-md" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-md">
                                        <button 
                                            onClick={() => onSendToEdit(image)} 
                                            className="bg-white/20 hover:bg-white/40 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors" 
                                            title="Editar"
                                            aria-label={`Editar imagem ${index + 1} da galeria`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => onRemove(index)} 
                                            className="bg-red-500/80 hover:bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors" 
                                            title="Remover"
                                            aria-label={`Remover imagem ${index + 1} da galeria`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GalleryPanel;