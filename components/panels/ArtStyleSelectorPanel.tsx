import React from 'react';
import type { ArtStyle } from '../../types';
import { ART_STYLES } from '../../constants';

// The tooltip is no longer needed as the styles themselves are previews.
export const ArtStylePreviewTooltip: React.FC<{
    image: string;
    position: { top: number; left: number };
}> = () => null;

const ArtStyleSelectorPanel: React.FC<{
    selectedStyle: string;
    onSelectStyle: (style: string) => void;
    // Accordion and hover props are no longer needed for the new design.
    isOpen?: boolean;
    setIsOpen?: (isOpen: boolean) => void;
    onStyleHover?: (style: ArtStyle, event: React.MouseEvent<HTMLButtonElement>) => void;
    onStyleLeave?: () => void;
}> = ({ selectedStyle, onSelectStyle }) => (
    <div className="bg-panel-bg rounded-xl p-4">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Estilo de Arte</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ART_STYLES.map(style => {
                const isSelected = style.name === selectedStyle;
                return (
                    <button
                        key={style.name}
                        onClick={() => onSelectStyle(isSelected ? '' : style.name)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel-bg focus:ring-accent-start transition-all duration-200 ${isSelected ? 'ring-2 ring-accent-start' : 'ring-1 ring-transparent hover:ring-1 hover:ring-dashed-border'}`}
                        aria-pressed={isSelected}
                    >
                        <img
                            src={style.previewImage}
                            alt={style.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                        <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-white text-xs font-bold truncate">{style.name}</p>
                        </div>

                        {isSelected && (
                            <div className="absolute top-2 right-2 bg-accent-start text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </button>
                )}
            )}
        </div>
    </div>
);

export default ArtStyleSelectorPanel;