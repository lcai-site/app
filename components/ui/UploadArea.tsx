import React, { useState } from 'react';
import type { ImageData } from '../../types';

const UploadArea: React.FC<{
    id: string;
    onUpload: (files: FileList) => void;
    image: ImageData | null;
    text: string;
    subtext: string;
    onTakePhotoClick?: () => void;
    onRemove?: () => void;
    className?: string;
    multiple?: boolean;
}> = ({ id, onUpload, image, text, subtext, onTakePhotoClick, onRemove, className = '', multiple = true }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onUpload(files);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onUpload(files);
        }
        e.target.value = '';
    };

    return (
        <div 
            className={`relative group bg-secondary-bg rounded-xl transition-all duration-300 ${isDragOver ? 'ring-2 ring-accent-start ring-offset-2 ring-offset-primary-bg' : ''} ${className}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className="relative w-full h-40 border-2 border-dashed border-dashed-border rounded-xl p-4 text-center cursor-pointer flex flex-col justify-center items-center"
                onClick={() => document.getElementById(id)?.click()}
            >
                {!image ? (
                    <>
                        <div className="w-12 h-12 bg-interactive-bg rounded-lg flex items-center justify-center mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-text-secondary">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.33-2.33 3 3 0 013.75 5.75M12 14.25v2.25" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-text-primary">
                            <span className="text-accent-start">Clique para enviar</span> ou arraste e solte
                        </p>
                        <p className="text-xs text-text-secondary mt-1">PNG, JPG, WEBP</p>
                    </>
                ) : (
                    <>
                        <img src={image.objectUrl} alt="Preview" id={id.replace('Upload', 'Preview')} className="absolute inset-0 w-full h-full object-cover rounded-xl" loading="lazy" />
                        {onRemove && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="absolute top-2 right-2 bg-primary-bg/70 text-text-primary backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                aria-label="Remover imagem"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        )}
                    </>
                )}
                <input type="file" id={id} accept="image/*" className="hidden" onChange={handleFileChange} multiple={multiple} />
            </div>
             {onTakePhotoClick && !image && (
                <button
                    onClick={onTakePhotoClick}
                    className="w-full text-sm bg-interactive-bg border border-glass-border hover:bg-interactive-hover-bg text-text-primary font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 mt-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                    Tirar Foto
                </button>
            )}
        </div>
    )
};

export default UploadArea;