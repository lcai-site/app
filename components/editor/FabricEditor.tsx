import React, { useRef, useEffect, useState } from 'react';
import type { ImageData } from '../../types';
import { FONT_OPTIONS } from '../../constants';
import { base64ToBlob } from '../../utils';

// Declara a variável global 'fabric' para o TypeScript, já que ela é carregada via CDN.
declare var fabric: any;

interface FabricEditorProps {
    image: ImageData;
    onApply: (previewBase64: string, fabricState: string) => void;
    onCancel: () => void;
}

const FabricEditor: React.FC<FabricEditorProps> = ({ image, onApply, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<any>(null); // fabric.Canvas
    const [activeObject, setActiveObject] = useState<any>(null);
    const [_, forceUpdate] = useState(0); // State to force re-renders for UI updates
    const isTextObject = activeObject && activeObject.type === 'i-text';

    useEffect(() => {
        const container = containerRef.current;
        const canvasElement = canvasRef.current;
        if (!container || !canvasElement || !image) return;

        const canvas = new fabric.Canvas(canvasElement);
        fabricCanvasRef.current = canvas;

        // Guias de centralização
        const vLine = new fabric.Line([0, 0, 0, 0], { stroke: '#FFFFFF', strokeWidth: 2, strokeDashArray: [5, 5], selectable: false, evented: false, visible: false });
        const hLine = new fabric.Line([0, 0, 0, 0], { stroke: '#FFFFFF', strokeWidth: 2, strokeDashArray: [5, 5], selectable: false, evented: false, visible: false });
        canvas.add(vLine, hLine);

        const pristineObjectUrl = URL.createObjectURL(base64ToBlob(image.base64, image.mimeType));

        fabric.Image.fromURL(pristineObjectUrl, (img: any) => {
            if (!img.width || !img.height) return;
            const { clientWidth, clientHeight } = container;
            const scale = Math.min(clientWidth / img.width, clientHeight / img.height);
            
            canvas.setWidth(img.width * scale);
            canvas.setHeight(img.height * scale);

            // Atualiza a posição das guias com o novo tamanho do canvas
            vLine.set({ x1: canvas.width / 2, y1: 0, x2: canvas.width / 2, y2: canvas.height });
            hLine.set({ x1: 0, y1: canvas.height / 2, x2: canvas.width, y2: canvas.height / 2 });

            const setBgAndRender = () => {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: scale,
                    scaleY: scale,
                    crossOrigin: 'anonymous'
                });
            };

            // Carrega os objetos do estado PRIMEIRO, e SÓ DEPOIS define o fundo no callback.
            // Isso previne que o fundo seja apagado pelo loadFromJSON.
            if (image.fabricState) {
                const state = JSON.parse(image.fabricState);
                // We only load objects, as the background is handled separately
                canvas.loadFromJSON({ objects: state.objects }, setBgAndRender);
            } else {
                setBgAndRender();
            }

        }, { crossOrigin: 'anonymous' });

        const SNAP_THRESHOLD = 5;

        const handleObjectMoving = (e: any) => {
            const obj = e.target;
            if (!obj) return;
            const canvasCenter = canvas.getCenter();
            const objCenter = obj.getCenterPoint();
            
            const snappedY = Math.abs(objCenter.y - canvasCenter.top) < SNAP_THRESHOLD;
            const snappedX = Math.abs(objCenter.x - canvasCenter.left) < SNAP_THRESHOLD;

            hLine.set({ visible: snappedY });
            vLine.set({ visible: snappedX });
        };
        
        const hideLines = () => {
            vLine.set({ visible: false });
            hLine.set({ visible: false });
            canvas.renderAll();
        };

        const updateActiveObject = (e: any) => setActiveObject(e.selected ? e.selected[0] : e.target);
        const clearActiveObject = () => setActiveObject(null);
        
        canvas.on('selection:created', updateActiveObject);
        canvas.on('selection:updated', updateActiveObject);
        canvas.on('selection:cleared', clearActiveObject);
        canvas.on('object:moving', handleObjectMoving);
        canvas.on('mouse:up', hideLines);

        return () => {
            URL.revokeObjectURL(pristineObjectUrl);
            canvas.off('selection:created', updateActiveObject);
            canvas.off('selection:updated', updateActiveObject);
            canvas.off('selection:cleared', clearActiveObject);
            canvas.off('object:moving', handleObjectMoving);
            canvas.off('mouse:up', hideLines);
            canvas.dispose();
        };
    }, [image]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
            // Permite excluir o objeto selecionado com a tecla Delete ou Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if(activeObject && document.activeElement?.tagName !== 'INPUT') {
                    e.preventDefault();
                    deleteActiveObject();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel, activeObject]);

    const addText = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const text = new fabric.IText('Clique para editar', {
            left: canvas.width / 2,
            top: canvas.height / 2,
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 1,
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            padding: 10,
            cornerSize: 15,
            transparentCorners: false,
            cornerColor: '#8B5CF6',
            borderColor: '#06B6D4'
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
    };

    const deleteActiveObject = () => {
        const canvas = fabricCanvasRef.current;
        if (activeObject) {
            canvas.remove(activeObject);
            setActiveObject(null);
            canvas.discardActiveObject().renderAll();
        }
    };

    const updateProperty = (prop: string, value: any) => {
        const canvas = fabricCanvasRef.current;
        if (!isTextObject || !canvas) return;
        activeObject.set(prop, value);
        canvas.renderAll();
        forceUpdate(c => c + 1); // Force re-render to update UI controls
    };

    const handleApply = () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            canvas.discardActiveObject().renderAll();
            const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
            
            // Export only the objects and canvas dimensions, not the background image.
            // This creates a robust, URL-independent state.
            const state = canvas.toJSON();
            const objectsOnlyState = {
                objects: state.objects,
                width: canvas.getWidth(),
                height: canvas.getHeight(),
            };
            const fabricState = JSON.stringify(objectsOnlyState);

            onApply(dataURL, fabricState);
        }
    };
    
    const fontFamily = isTextObject ? activeObject.get('fontFamily') : 'Arial';
    const fill = isTextObject ? activeObject.get('fill') : '#ffffff';
    const stroke = isTextObject ? activeObject.get('stroke') : '#000000';
    const strokeWidth = isTextObject ? activeObject.get('strokeWidth') : 1;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
            <div 
                className="absolute top-4 bg-secondary-bg/80 backdrop-blur-md p-2 rounded-full flex items-center gap-3 shadow-lg"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={addText} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-2 px-3 rounded-lg text-sm transition-colors">Adicionar Texto</button>
                <button onClick={deleteActiveObject} disabled={!activeObject} className="bg-interactive-bg hover:bg-red-500/50 text-text-primary font-bold py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:hover:bg-interactive-bg">Excluir</button>
                
                <div className="w-px h-6 bg-glass-border"></div>

                <select value={fontFamily} onChange={e => updateProperty('fontFamily', e.target.value)} disabled={!isTextObject} className="bg-interactive-bg border border-glass-border rounded-md px-2 py-1.5 text-xs text-text-primary focus:ring-accent-start focus:ring-1 disabled:opacity-50">
                    {FONT_OPTIONS.map(font => <option key={font} value={font} style={{ fontFamily: font, backgroundColor: 'var(--primary-bg)' }}>{font}</option>)}
                </select>
                
                <label className="flex items-center gap-1 cursor-pointer" title="Cor do Texto">
                    <input type="color" value={fill} onChange={e => updateProperty('fill', e.target.value)} disabled={!isTextObject} className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent disabled:opacity-50" aria-label="Cor do texto" />
                </label>
                
                <label className="flex items-center gap-1 cursor-pointer" title="Cor da Borda">
                    <input type="color" value={stroke} onChange={e => updateProperty('stroke', e.target.value)} disabled={!isTextObject} className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent disabled:opacity-50" aria-label="Cor da borda do texto" />
                </label>
                
                <input type="number" min="0" max="10" step="0.5" value={strokeWidth} onChange={e => updateProperty('strokeWidth', parseFloat(e.target.value))} disabled={!isTextObject} className="w-16 bg-interactive-bg border border-glass-border rounded-md px-2 py-1.5 text-xs text-text-primary focus:ring-accent-start focus:ring-1 disabled:opacity-50" aria-label="Espessura da borda" />
            </div>

            <div ref={containerRef} className="relative w-full h-[calc(100%-100px)] flex items-center justify-center">
                <canvas ref={canvasRef} className="shadow-2xl"/>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1.2 flex gap-4">
                <button onClick={onCancel} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-3 px-6 rounded-lg transition-colors">Cancelar</button>
                <button onClick={handleApply} className="bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-opacity">Aplicar</button>
            </div>
        </div>
    );
};

export default FabricEditor;