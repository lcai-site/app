import React from 'react';
import type { Size } from '../../types';
import { SIZES } from '../../constants';

const ASPECT_RATIO_CLASSES: Record<string, string> = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '4:5': 'aspect-[4/5]',
    '3:4': 'aspect-[3/4]',
    '2:3': 'aspect-[2/3]',
    '3:2': 'aspect-[3/2]',
    // Add other ratios as needed
};

const SizeSelectorPanel: React.FC<{
    sizeMode: 'single' | 'multi';
    setSizeMode: (mode: 'single' | 'multi') => void;
    selectedSizes: Size[];
    handleSizeSelection: (size: Size) => void;
    // These are no longer needed for the new design
    handleSelectAllCategory?: (category: string, isSelected: boolean) => void;
    openAccordion?: string | null;
    setOpenAccordion?: (category: string | null) => void;
}> = ({ sizeMode, setSizeMode, selectedSizes, handleSizeSelection }) => (
    <div className="flex flex-col gap-4 bg-panel-bg rounded-xl p-4">
        <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">Tamanho</h3>
            <div role="radiogroup" aria-label="Modo de seleção de tamanho" className="grid grid-cols-2 gap-1 bg-secondary-bg p-1 rounded-full">
                <button
                    role="radio"
                    aria-checked={sizeMode === 'single'}
                    onClick={() => {
                        setSizeMode('single');
                        if (selectedSizes.length > 1) handleSizeSelection(selectedSizes[0]);
                    }}
                    className={`py-2 rounded-full transition-colors text-sm font-medium ${sizeMode === 'single' ? 'bg-gradient-to-r from-accent-start to-accent-end text-white' : 'hover:bg-interactive-hover-bg text-text-primary'}`}
                >
                    Tamanho Único
                </button>
                <button
                    role="radio"
                    aria-checked={sizeMode === 'multi'}
                    onClick={() => setSizeMode('multi')}
                    className={`py-2 rounded-full transition-colors text-sm font-medium ${sizeMode === 'multi' ? 'bg-gradient-to-r from-accent-start to-accent-end text-white' : 'hover:bg-interactive-hover-bg text-text-primary'}`}
                >
                    Múltiplos Tamanhos
                </button>
            </div>
        </div>

        <div className="flex flex-col gap-4">
            {Object.entries(SIZES).map(([category, sizes]) => (
                <div key={category}>
                    <h4 className="font-semibold text-text-secondary mb-2">{category}</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {sizes.map(size => {
                            const isSelected = selectedSizes.some(s => s.name === size.name);
                            const aspectRatioClass = ASPECT_RATIO_CLASSES[size.ratio] || 'aspect-square';

                            return (
                                <div
                                    key={size.name}
                                    onClick={() => handleSizeSelection(size)}
                                    className={`relative rounded-lg cursor-pointer group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel-bg focus:ring-accent-start transition-all duration-200 ${isSelected ? 'ring-2 ring-accent-start' : 'ring-1 ring-transparent hover:ring-1 hover:ring-dashed-border'}`}
                                    role={sizeMode === 'single' ? 'radio' : 'checkbox'}
                                    aria-checked={isSelected}
                                    tabIndex={0}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSizeSelection(size)}
                                >
                                    <div className={`w-full bg-secondary-bg rounded-md flex items-center justify-center p-2 ${aspectRatioClass}`}>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-text-primary truncate">{size.name}</p>
                                            <p className="text-[10px] text-text-secondary">{`${size.width}x${size.height}`}</p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="absolute -top-1 -right-1 bg-accent-start text-white rounded-full w-4 h-4 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default SizeSelectorPanel;