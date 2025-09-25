import React from 'react';
import type { ArtStyle } from '../../types';
import { ART_STYLES } from '../../constants';

export const ArtStylePreviewTooltip: React.FC<{
    image: string;
    position: { top: number; left: number };
}> = ({ image, position }) => (
    <div 
        className="fixed z-50 w-48 h-48 bg-secondary-bg/80 backdrop-blur-lg border border-glass-border rounded-xl shadow-2xl p-2 transform -translate-y-1/2 transition-opacity duration-200"
        style={{ top: position.top, left: position.left, pointerEvents: 'none' }}
    >
        <img src={image} alt="Art style preview" className="w-full h-full object-cover rounded-md" loading="lazy" />
    </div>
);

const ArtStyleSelectorPanel: React.FC<{
    selectedStyle: string;
    onSelectStyle: (style: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onStyleHover: (style: ArtStyle, event: React.MouseEvent<HTMLButtonElement>) => void;
    onStyleLeave: () => void;
}> = ({ selectedStyle, onSelectStyle, isOpen, setIsOpen, onStyleHover, onStyleLeave }) => (
    <div className="bg-panel-bg rounded-xl">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-3 font-medium flex justify-between items-center hover:bg-interactive-hover-bg rounded-xl" aria-expanded={isOpen}>
            <span className="flex items-center gap-2">
                🎨 Estilo de Arte
                <div className="relative group flex items-center">
                    <span className="cursor-help text-text-secondary" aria-hidden="true">?</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-secondary-bg border border-glass-border text-text-primary text-xs rounded-md py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg" role="tooltip">
                        Passe o mouse sobre um estilo para ver um exemplo.
                    </div>
                </div>
            </span>
            <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
        </button>
        {isOpen && (
            <div className="p-3 border-t border-glass-border grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ART_STYLES.map(style => (
                    <button
                        key={style.name}
                        onClick={() => onSelectStyle(style.name === selectedStyle ? '' : style.name)}
                        onMouseEnter={(e) => onStyleHover(style, e)}
                        onMouseLeave={onStyleLeave}
                        className={`p-2 rounded-lg text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center h-20 bg-interactive-bg hover:bg-interactive-hover-bg ${style.name === selectedStyle ? 'border border-accent-start' : 'border border-transparent'}`}
                        aria-pressed={style.name === selectedStyle}
                    >
                        <div className="text-2xl mb-1" aria-hidden="true">{style.icon}</div>
                        <div className="font-medium text-xs">{style.name}</div>
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default ArtStyleSelectorPanel;
