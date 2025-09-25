import React from 'react';
import type { Size } from '../../types';
import { SIZES } from '../../constants';

const SizeSelectorPanel: React.FC<{
    sizeMode: 'single' | 'multi';
    setSizeMode: (mode: 'single' | 'multi') => void;
    selectedSizes: Size[];
    handleSizeSelection: (size: Size) => void;
    handleSelectAllCategory: (category: string, isSelected: boolean) => void;
    openAccordion: string | null;
    setOpenAccordion: (category: string | null) => void;
}> = ({ sizeMode, setSizeMode, selectedSizes, handleSizeSelection, handleSelectAllCategory, openAccordion, setOpenAccordion }) => (
    <div className="flex flex-col gap-4">
        <div className="text-lg font-semibold">📐 Tamanhos</div>
        <div role="radiogroup" aria-label="Modo de seleção de tamanho" className="grid grid-cols-2 gap-2 bg-panel-bg p-1 rounded-full">
            <button role="radio" aria-checked={sizeMode === 'single'} onClick={() => { setSizeMode('single'); if (selectedSizes.length > 1) handleSizeSelection(selectedSizes[0]); }} className={`py-2 rounded-full transition-colors text-sm font-medium ${sizeMode === 'single' ? 'bg-gradient-to-r from-accent-start to-accent-end' : 'hover:bg-interactive-hover-bg'}`}>Tamanho Único</button>
            <button role="radio" aria-checked={sizeMode === 'multi'} onClick={() => setSizeMode('multi')} className={`py-2 rounded-full transition-colors text-sm font-medium ${sizeMode === 'multi' ? 'bg-gradient-to-r from-accent-start to-accent-end' : 'hover:bg-interactive-hover-bg'}`}>Múltiplos Tamanhos</button>
        </div>
        <div className="flex flex-col gap-2">
            {Object.entries(SIZES).map(([category, sizes]) => {
                const isCategorySelected = sizeMode === 'multi' && sizes.every(s => selectedSizes.some(ss => ss.name === s.name));
                return (
                    <div key={category} className="bg-panel-bg rounded-xl">
                        <button onClick={() => setOpenAccordion(openAccordion === category ? null : category)} className="w-full text-left p-3 font-medium flex justify-between items-center hover:bg-interactive-hover-bg rounded-t-xl" aria-expanded={openAccordion === category}>
                            <span>{category}</span>
                            <span className={`transform transition-transform ${openAccordion === category ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
                        </button>
                        {openAccordion === category && (
                            <div className="p-3 border-t border-glass-border flex flex-col gap-2">
                                {sizeMode === 'multi' && (
                                    <label className="flex items-center gap-2 cursor-pointer text-accent-start/80 text-sm">
                                        <input type="checkbox" checked={isCategorySelected} onChange={(e) => handleSelectAllCategory(category, e.target.checked)} className="form-checkbox bg-transparent border-glass-border text-accent-start focus:ring-accent-start rounded" />
                                        Selecionar Todos
                                    </label>
                                )}
                                {sizes.map(size => (
                                    <label key={size.name} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-interactive-hover-bg rounded-md">
                                        <input
                                            type={sizeMode === 'single' ? 'radio' : 'checkbox'}
                                            name="size-selection"
                                            checked={selectedSizes.some(s => s.name === size.name)}
                                            onChange={() => handleSizeSelection(size)}
                                            className={sizeMode === 'single' ? 'form-radio bg-transparent border-glass-border text-accent-start focus:ring-accent-start' : 'form-checkbox bg-transparent border-glass-border text-accent-start focus:ring-accent-start rounded'}
                                        />
                                        <span className="text-sm">{size.name} <span className="text-text-secondary">({category === 'Impressão' ? `${(size.width / 11.8).toFixed(0)}x${(size.height / 11.8).toFixed(0)}mm` : `${size.width}x${size.height}px`})</span></span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

export default SizeSelectorPanel;
