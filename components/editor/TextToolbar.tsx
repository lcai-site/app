import React, { useState, useEffect, useCallback } from 'react';
import { FONT_OPTIONS } from '../../constants';

// Declara a variável global 'fabric' para o TypeScript.
declare var fabric: any;

interface TextToolbarProps {
    activeObject: any; // fabric.IText
    canvas: any; // fabric.Canvas
}

const TextToolbar: React.FC<TextToolbarProps> = ({ activeObject, canvas }) => {
    const [toolbarStyle, setToolbarStyle] = useState<React.CSSProperties>({});
    
    const updateProperty = (prop: string, value: any) => {
        if (!activeObject) return;
        activeObject.set(prop, value);
        canvas.renderAll();
    };

    const updatePosition = useCallback(() => {
        if (!activeObject) return;

        const { aCoords } = activeObject;
        if (!aCoords) return;

        const top = aCoords.tl.y - 60; // Posiciona a barra 60px acima do objeto.
        const left = (aCoords.tl.x + aCoords.tr.x) / 2;

        setToolbarStyle({
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            transform: 'translateX(-50%)',
            zIndex: 101, // Garante que a barra de ferramentas esteja acima do canvas.
        });
    }, [activeObject]);

    useEffect(() => {
        updatePosition();
        
        // Adiciona listeners para atualizar a posição da barra de ferramentas quando o objeto for movido.
        if (activeObject) {
            activeObject.on('moving', updatePosition);
            activeObject.on('scaling', updatePosition);
            activeObject.on('rotating', updatePosition);
        }

        return () => {
            if (activeObject) {
                activeObject.off('moving', updatePosition);
                activeObject.off('scaling', updatePosition);
                activeObject.off('rotating', updatePosition);
            }
        };
    }, [activeObject, updatePosition]);
    
    if (!activeObject) return null;

    return (
        <div style={toolbarStyle} className="bg-secondary-bg/80 backdrop-blur-md border border-glass-border p-2 rounded-full flex items-center gap-2 shadow-lg" onClick={e => e.stopPropagation()}>
            {/* Seletor de Fonte */}
            <select
                value={activeObject.fontFamily || 'Arial'}
                onChange={e => updateProperty('fontFamily', e.target.value)}
                className="bg-interactive-bg border border-glass-border rounded-md px-2 py-1 text-xs text-text-primary focus:ring-accent-start focus:ring-1"
            >
                {FONT_OPTIONS.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font, backgroundColor: 'var(--primary-bg)' }}>{font}</option>
                ))}
            </select>
            
            <div className="w-px h-5 bg-glass-border"></div>

            {/* Cor do Texto */}
            <label className="flex items-center gap-1 cursor-pointer">
                <span className="text-xs">Cor</span>
                <input
                    type="color"
                    value={activeObject.fill || '#ffffff'}
                    onChange={e => updateProperty('fill', e.target.value)}
                    className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                    aria-label="Cor do texto"
                />
            </label>
            
            <div className="w-px h-5 bg-glass-border"></div>

            {/* Cor da Borda */}
            <label className="flex items-center gap-1 cursor-pointer">
                 <span className="text-xs">Borda</span>
                <input
                    type="color"
                    value={activeObject.stroke || '#000000'}
                    onChange={e => updateProperty('stroke', e.target.value)}
                    className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                    aria-label="Cor da borda do texto"
                />
            </label>
            
             {/* Espessura da Borda */}
            <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={activeObject.strokeWidth || 0}
                onChange={e => updateProperty('strokeWidth', parseFloat(e.target.value))}
                className="w-12 bg-interactive-bg border border-glass-border rounded-md px-1 py-1 text-xs text-text-primary focus:ring-accent-start focus:ring-1"
                aria-label="Espessura da borda do texto"
            />
        </div>
    );
};

export default TextToolbar;
