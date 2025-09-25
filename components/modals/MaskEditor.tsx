import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageData } from '../../types';

const MaskEditor: React.FC<{
    image: ImageData;
    onGenerateWithMask: (maskBase64: string, prompt: string) => void;
    onCancel: () => void;
}> = ({ image, onGenerateWithMask, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [tool, setTool] = useState<'brush' | 'rectangle' | 'circle' | 'eraser'>('brush');
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

    const [phase, setPhase] = useState<'drawing' | 'prompting'>('drawing');
    const [maskPrompt, setMaskPrompt] = useState('');
    const [savedMask, setSavedMask] = useState<string | null>(null);


    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        const img = imageRef.current;
        if (canvas && previewCanvas && img && img.complete) {
            const { width, height } = img.getBoundingClientRect();
             [canvas, previewCanvas].forEach(c => {
                if(c) {
                    // No need for inline positioning styles with the grid layout
                    c.width = width;
                    c.height = height;
                }
            });
        }
    }, []);

    useEffect(() => {
        const img = imageRef.current;
        if (img) {
            img.onload = resizeCanvas;
        }
        window.addEventListener('resize', resizeCanvas);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [resizeCanvas, image, onCancel]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getCoords(e);
        if (!coords) return;
        
        setIsDrawing(true);
        if (tool === 'brush' || tool === 'eraser') {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
        } else {
            setStartPos(coords);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoords(e);
        if (!coords) return;

        if (tool === 'brush' || tool === 'eraser') {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = `rgba(139, 92, 246, 0.7)`;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        } else if (startPos) {
            const previewCtx = previewCanvasRef.current?.getContext('2d');
            const canvas = previewCanvasRef.current;
            if (!previewCtx || !canvas) return;
            
            previewCtx.clearRect(0, 0, canvas.width, canvas.height);
            previewCtx.fillStyle = `rgba(139, 92, 246, 0.5)`;
            previewCtx.strokeStyle = `rgba(139, 92, 246, 1)`;
            previewCtx.lineWidth = 2;

            if (tool === 'rectangle') {
                const width = coords.x - startPos.x;
                const height = coords.y - startPos.y;
                previewCtx.fillRect(startPos.x, startPos.y, width, height);
                previewCtx.strokeRect(startPos.x, startPos.y, width, height);
            } else if (tool === 'circle') {
                const dx = coords.x - startPos.x;
                const dy = coords.y - startPos.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                previewCtx.beginPath();
                previewCtx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
                previewCtx.fill();
                previewCtx.stroke();
            }
        }
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const mainCtx = canvasRef.current?.getContext('2d');
        if (!mainCtx) {
            setIsDrawing(false);
            return;
        }

        setIsDrawing(false);

        if (tool === 'brush' || tool === 'eraser') {
            mainCtx.closePath();
        } else if (startPos) {
            const previewCanvas = previewCanvasRef.current;
            const previewCtx = previewCanvas?.getContext('2d');
            if (!previewCanvas || !previewCtx) return;
            
            const finalCoords = getCoords(e);
            if (!finalCoords) {
                setStartPos(null);
                return;
            }

            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            
            mainCtx.fillStyle = `rgba(139, 92, 246, 0.7)`;
            mainCtx.globalCompositeOperation = 'source-over';
            
            if (tool === 'rectangle') {
                const width = finalCoords.x - startPos.x;
                const height = finalCoords.y - startPos.y;
                mainCtx.fillRect(startPos.x, startPos.y, width, height);
            } else if (tool === 'circle') {
                const dx = finalCoords.x - startPos.x;
                const dy = finalCoords.y - startPos.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                mainCtx.beginPath();
                mainCtx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
                mainCtx.fill();
            }
            setStartPos(null);
        }
    };
    
    const handleConfirmSelection = () => {
        const overlayCanvas = canvasRef.current;
        const img = imageRef.current;
        if (!overlayCanvas || !img) return;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = img.naturalWidth;
        maskCanvas.height = img.naturalHeight;
        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return;

        const scaleX = img.naturalWidth / overlayCanvas.width;
        const scaleY = img.naturalHeight / overlayCanvas.height;

        ctx.save();
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(overlayCanvas, 0, 0);
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 0) {
                data[i] = 255; data[i+1] = 255; data[i+2] = 255;
            } else {
                data[i] = 0; data[i+1] = 0; data[i+2] = 0;
            }
            data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        
        setSavedMask(maskCanvas.toDataURL('image/png').split(',')[1]);
        setPhase('prompting');
    };

    const handleGenerate = () => {
        if (savedMask && maskPrompt) {
            onGenerateWithMask(savedMask, maskPrompt);
        }
    };
    
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-secondary-bg/80 backdrop-blur-md p-3 rounded-full flex items-center gap-4 z-10 shadow-lg">
                <div className="flex items-center gap-2">
                    <label htmlFor="brushSize" className="text-sm text-text-primary whitespace-nowrap">Tamanho: {brushSize}</label>
                    <input type="range" id="brushSize" min="5" max="150" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-32 accent-accent-start"/>
                </div>
                <div className="w-px h-6 bg-glass-border"></div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setTool('brush')} className={`p-2 rounded-full transition-colors ${tool === 'brush' ? 'bg-accent-start' : 'hover:bg-interactive-hover-bg'}`} title="Pincel" aria-label="Selecionar ferramenta Pincel" aria-pressed={tool === 'brush'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                    </button>
                    <button onClick={() => setTool('rectangle')} className={`p-2 rounded-full transition-colors ${tool === 'rectangle' ? 'bg-accent-start' : 'hover:bg-interactive-hover-bg'}`} title="Retângulo" aria-label="Selecionar ferramenta Retângulo" aria-pressed={tool === 'rectangle'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>
                    </button>
                     <button onClick={() => setTool('circle')} className={`p-2 rounded-full transition-colors ${tool === 'circle' ? 'bg-accent-start' : 'hover:bg-interactive-hover-bg'}`} title="Círculo" aria-label="Selecionar ferramenta Círculo" aria-pressed={tool === 'circle'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>
                    </button>
                    <button onClick={() => setTool('eraser')} className={`p-2 rounded-full transition-colors ${tool === 'eraser' ? 'bg-accent-start' : 'hover:bg-interactive-hover-bg'}`} title="Borracha" aria-label="Selecionar ferramenta Borracha" aria-pressed={tool === 'eraser'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 00-.517-3.86l-2.387-.477a2 2 0 00-.547-1.806zM15 5.111L8 12.111" />
                        </svg>
                    </button>
                </div>
                 <div className="w-px h-6 bg-glass-border"></div>
                 <button onClick={clearCanvas} className="p-2 rounded-full transition-colors hover:bg-interactive-hover-bg" title="Limpar Seleção" aria-label="Limpar seleção">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>

            <div ref={containerRef} className="relative w-full h-[calc(100%-120px)] grid place-items-center">
                <img ref={imageRef} src={image.objectUrl} alt="Editing target" className="max-w-full max-h-full object-contain pointer-events-none col-start-1 row-start-1" onLoad={resizeCanvas}/>
                <canvas 
                    ref={canvasRef}
                    className="cursor-crosshair col-start-1 row-start-1"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ visibility: phase === 'drawing' ? 'visible' : 'hidden' }}
                />
                 <canvas 
                    ref={previewCanvasRef}
                    className="cursor-crosshair pointer-events-none col-start-1 row-start-1"
                />
            </div>
            
            {phase === 'drawing' ? (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                    <button onClick={onCancel} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-3 px-6 rounded-lg">Cancelar</button>
                    <button onClick={handleConfirmSelection} className="bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg">Confirmar Seleção</button>
                </div>
            ) : (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-secondary-bg/80 backdrop-blur-md p-4 rounded-xl flex items-center gap-3 shadow-2xl">
                    <input 
                        type="text"
                        value={maskPrompt}
                        onChange={(e) => setMaskPrompt(e.target.value)}
                        placeholder="Descreva a alteração para a área selecionada..."
                        className="flex-grow bg-panel-bg border border-glass-border rounded-lg p-3 focus:ring-2 focus:ring-accent-start text-text-primary"
                        autoFocus
                    />
                    <button onClick={handleGenerate} disabled={!maskPrompt.trim()} className="bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg">
                        Gerar
                    </button>
                </div>
            )}
        </div>
    );
};

export default MaskEditor;
