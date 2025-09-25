import React, { useEffect, useRef } from 'react';
import type { ImageData } from '../../types';
import { base64ToBlob } from '../../utils';

const CameraModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageData: ImageData) => void;
    setError: (error: string) => void;
}> = ({ isOpen, onClose, onCapture, setError }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const captureButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const startCamera = async () => {
            if (isOpen) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    setTimeout(() => captureButtonRef.current?.focus(), 100);
                } catch (err) {
                    console.error("Error accessing camera:", err);
                    setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
                    onClose();
                }
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isOpen, onClose, setError]);
    
    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    const handleCapture = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const newImageData: ImageData = {
            base64,
            mimeType: 'image/png',
            objectUrl: URL.createObjectURL(base64ToBlob(base64, 'image/png'))
        };
        onCapture(newImageData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-secondary-bg/80 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl flex flex-col gap-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="camera-modal-title">
                <h2 id="camera-modal-title" className="text-2xl font-bold text-center">Tirar Foto</h2>
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-black"></video>
                <div className="flex justify-center gap-4">
                    <button ref={captureButtonRef} onClick={handleCapture} className="bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg shadow-lg">Capturar</button>
                    <button onClick={onClose} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-3 px-6 rounded-lg">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default CameraModal;
