import React from 'react';
import type { ImageData } from '../../types';
import UploadArea from '../ui/UploadArea';

const BackgroundEditorPanel: React.FC<{
    handleRemoveBackground: () => void;
    isLoading: boolean;
    image1: ImageData | null;
    handleImageUpload: (files: FileList, imageSlot: 'single') => void;
    onTakePhotoClick: () => void;
}> = ({ handleRemoveBackground, isLoading, image1, handleImageUpload, onTakePhotoClick }) => (
    <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 p-4 bg-panel-bg rounded-xl">
            <div className="text-lg font-semibold text-center">🖼️ Remoção de Fundo</div>
            
            {!image1 ? (
                <>
                    <p className="text-sm text-text-secondary text-center">Carregue uma imagem para começar a remover o fundo.</p>
                    <UploadArea 
                        id="backgroundUpload" 
                        onUpload={(files) => handleImageUpload(files, 'single')} 
                        image={null} 
                        text="Carregar Imagem" 
                        subtext="Selecione um arquivo" 
                        onTakePhotoClick={onTakePhotoClick} 
                        multiple={false}
                    />
                </>
            ) : (
                <>
                    <p className="text-sm text-text-secondary text-center">Pré-visualização da imagem. Clique abaixo para remover o fundo.</p>
                    <div className="relative group p-2">
                        <img src={image1.objectUrl} alt="Preview" className="w-full h-auto object-contain max-h-48 rounded-lg checkerboard-bg" />
                    </div>
                    <button 
                        onClick={handleRemoveBackground} 
                        disabled={isLoading} 
                        className="w-full bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 text-base shadow-lg shadow-accent-start/20 hover:shadow-accent-end/30"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Removendo...
                            </>
                        ) : 'Remover Fundo'}
                    </button>
                </>
            )}
        </div>
    </div>
);

export default BackgroundEditorPanel;