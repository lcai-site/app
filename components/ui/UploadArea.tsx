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
        e.stopPropagation(); // Necessary to allow drop
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
        // Reset file input to allow uploading the same file again
        e.target.value = '';
    };

    return (
    <div className="flex flex-col gap-2">
        <div 
            className={`relative group border-2 rounded-xl p-6 text-center cursor-pointer transition-all duration-300 h-32 flex flex-col justify-center items-center bg-panel-bg ${isDragOver ? 'border-solid border-accent-start' : 'border-dashed border-dashed-border'} hover:border-accent-start ${className}`}
            onClick={() => document.getElementById(id)?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDragOver && (
                <div className="absolute inset-0 bg-secondary-bg/80 backdrop-blur-sm flex flex-col justify-center items-center rounded-xl z-10 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-accent-start animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <p className="mt-2 font-semibold text-text-primary">Solte a imagem para carregar</p>
                </div>
            )}
            {!image ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-text-secondary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <div className="font-semibold text-text-primary">{text}</div>
                    <div className="text-xs text-text-secondary">{subtext}</div>
                </>
            ) : (
                <>
                    <img src={image.objectUrl} alt="Preview" id={id.replace('Upload', 'Preview')} className="absolute inset-0 w-full h-full object-contain p-2 rounded-xl" loading="lazy" />
                    {onRemove && (
                        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-lg leading-none p-0" aria-label="Remover imagem">&times;</button>
                    )}
                </>
            )}
            <input type="file" id={id} accept="image/*" className="hidden" onChange={handleFileChange} multiple={multiple} />
        </div>
        {onTakePhotoClick && (
            <button onClick={onTakePhotoClick} className="w-full text-sm bg-interactive-bg border border-glass-border hover:bg-interactive-hover-bg text-text-primary font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                Tirar Foto
            </button>
        )}
    </div>
)};

export default UploadArea;