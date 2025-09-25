import React from 'react';
import type { ImageData } from '../../types';
import UploadArea from '../ui/UploadArea';

const PersonEditorPanel: React.FC<{
    personReferenceUpload: ImageData | null;
    personCharacterSheet: ImageData | null;
    handleImageUpload: (files: FileList, imageSlot: 'person') => void;
    resetPersonState: () => void;
    setPrompt: (prompt: string) => void;
    onTakePhotoClick: () => void;
}> = ({ personReferenceUpload, personCharacterSheet, handleImageUpload, resetPersonState, setPrompt, onTakePhotoClick }) => {
    const scenarioIdeas = [
        "Foto de perfil profissional, fundo de escritório",
        "Rindo em um café",
        "Caminhando em uma praia ao pôr do sol",
        "Estilo cyberpunk em uma cidade de neon",
        "Como um personagem de fantasia em uma floresta",
        "Vestindo um terno elegante em um evento formal"
    ];

    return (
        <div className="flex flex-col gap-4 p-4 bg-panel-bg rounded-xl">
            {!personReferenceUpload ? (
                <>
                    <div className="text-lg font-semibold text-center">Passo 1: Carregar Foto</div>
                    <UploadArea id="personUpload" onUpload={(files) => handleImageUpload(files, 'person')} image={null} text="Foto de Referência" subtext="Selecione uma foto nítida" onTakePhotoClick={onTakePhotoClick} multiple={false} />
                </>
            ) : !personCharacterSheet ? (
                <>
                    <div className="text-lg font-semibold text-center">Passo 2: Criar Perfil</div>
                    <img src={personReferenceUpload.objectUrl} alt="Person Reference" className="rounded-lg border-2 border-accent-start max-h-48 w-auto mx-auto" loading="lazy" />
                    <p className="text-sm text-text-secondary text-center">Clique em 'Criar Perfil' para a IA analisar as características da pessoa.</p>
                    <button onClick={resetPersonState} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                        Escolher Outra Foto
                    </button>
                </>
            ) : (
                <>
                    <div className="text-lg font-semibold text-center">Passo 3: Gerar Cenas</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-xs text-center text-text-secondary mb-1">Original</p>
                            <img src={personReferenceUpload.objectUrl} alt="Person Reference" className="rounded-lg" loading="lazy" />
                        </div>
                        <div>
                            <p className="text-xs text-center text-text-secondary mb-1">Perfil IA</p>
                            <img src={personCharacterSheet.objectUrl} alt="AI Character Sheet" className="rounded-lg border-2 border-accent-start" loading="lazy" />
                        </div>
                    </div>
                    <div className="text-md font-semibold mt-2">💡 Ideias de Cenário</div>
                    <div className="flex flex-wrap gap-2">
                        {scenarioIdeas.map(idea => (
                            <button key={idea} onClick={() => setPrompt(idea)} className="text-xs bg-interactive-bg hover:bg-accent-start px-2 py-1 rounded-full transition-colors">{idea.split(',')[0]}</button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default PersonEditorPanel;