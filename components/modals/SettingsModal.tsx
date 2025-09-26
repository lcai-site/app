import React, { useEffect, useRef, useState } from 'react';
import type { BrandIdentity, ImageData } from '../../types';
import { FONT_OPTIONS } from '../../constants';
import UploadArea from '../ui/UploadArea';
import { fileToBase64 } from '../../utils';

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    brandIdentity: BrandIdentity;
    setBrandIdentity: React.Dispatch<React.SetStateAction<BrandIdentity>>;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}> = ({ isOpen, onClose, brandIdentity, setBrandIdentity, theme, setTheme }) => {
    const [newPrimaryColor, setNewPrimaryColor] = useState('#FFFFFF');
    const [newSecondaryColor, setNewSecondaryColor] = useState('#FFFFFF');
    const [apiKey, setApiKey] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => modalRef.current?.focus(), 100);
            const savedApiKey = localStorage.getItem('userConfigValue') || '';
            setApiKey(savedApiKey);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleUpdate = <K extends keyof BrandIdentity>(key: K, value: BrandIdentity[K]) => {
        setBrandIdentity(prev => ({ ...prev, [key]: value }));
    };

    const handleAddColor = (type: 'primary' | 'secondary') => {
        const color = type === 'primary' ? newPrimaryColor : newSecondaryColor;
        const colorArray = type === 'primary' ? brandIdentity.primaryColors : brandIdentity.secondaryColors;
        if (color && !colorArray.includes(color)) {
            handleUpdate(type === 'primary' ? 'primaryColors' : 'secondaryColors', [...colorArray, color]);
        }
    };

    const handleRemoveColor = (type: 'primary' | 'secondary', colorToRemove: string) => {
        const colorArray = type === 'primary' ? brandIdentity.primaryColors : brandIdentity.secondaryColors;
        handleUpdate(type === 'primary' ? 'primaryColors' : 'secondaryColors', colorArray.filter(c => c !== colorToRemove));
    };

    const handleLogoUpload = async (file: File) => {
        if (!file) return;
        try {
            const base64 = await fileToBase64(file);
            handleUpdate('logo', { base64, mimeType: file.type, objectUrl: URL.createObjectURL(file) });
        } catch (error) {
            console.error("Failed to upload logo:", error);
        }
    };

    const handleSaveApiKey = () => {
        localStorage.setItem('userConfigValue', apiKey);
        setSaveStatus('Salvo com sucesso!');
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const handlePasteApiKey = (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pastedText = event.clipboardData.getData('text/plain');
      setApiKey(pastedText);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} tabIndex={-1} className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl flex flex-col gap-4 max-h-[90vh] text-text-primary" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
                <div className="flex justify-between items-center flex-shrink-0">
                    <h2 id="settings-modal-title" className="text-2xl font-bold font-display">Configurações</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-3xl leading-none" aria-label="Fechar modal">&times;</button>
                </div>
                
                <div className="overflow-y-auto flex-grow pr-3 space-y-6">
                    {/* Appearance */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold border-b border-glass-border pb-2">🌙 Aparência</h3>
                        <div role="radiogroup" aria-label="Tema da aplicação" className="grid grid-cols-2 gap-2 bg-panel-bg p-1 rounded-full">
                            <button role="radio" aria-checked={theme === 'dark'} onClick={() => setTheme('dark')} className={`py-2 rounded-full transition-colors text-sm font-medium ${theme === 'dark' ? 'bg-gradient-to-r from-accent-start to-accent-end text-white' : 'hover:bg-interactive-hover-bg text-text-primary'}`}>Escuro</button>
                            <button role="radio" aria-checked={theme === 'light'} onClick={() => setTheme('light')} className={`py-2 rounded-full transition-colors text-sm font-medium ${theme === 'light' ? 'bg-gradient-to-r from-accent-start to-accent-end text-white' : 'hover:bg-interactive-hover-bg text-text-primary'}`}>Claro</button>
                        </div>
                    </div>
                    
                    {/* API Key */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold border-b border-glass-border pb-2">🔑 Chave de API do Google AI</h3>
                        <p className="text-sm text-text-secondary">
                            Sua chave de API é armazenada localmente no seu navegador e nunca é enviada para nossos servidores.
                        </p>
                        <div className="flex gap-2 items-center">
                            <input
                                id="config-input"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                onPaste={handlePasteApiKey}
                                placeholder="Cole sua chave de API aqui"
                                className="flex-grow bg-panel-bg border border-glass-border rounded-lg p-2 focus:ring-2 focus:ring-accent-start text-text-primary"
                                aria-label="Campo para a Chave de API"
                            />
                            <button onClick={handleSaveApiKey} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-2 px-3 rounded-lg text-sm transition-colors">Salvar</button>
                        </div>
                        {saveStatus && <p className="text-sm text-green-400">{saveStatus}</p>}
                    </div>

                    <h2 className="text-2xl font-bold font-display pt-4">Identidade Visual do Negócio</h2>
                    
                    {/* Logo and Brand Name */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold border-b border-glass-border pb-2">🏢 Logo & Nome da Marca</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <UploadArea id="logoUpload" onUpload={handleLogoUpload} image={brandIdentity.logo} text="Upload Logo" subtext="Clique para selecionar" onRemove={() => handleUpdate('logo', null)} className="h-40"/>
                            <div className="space-y-2">
                                <label htmlFor="brandName" className="text-sm font-medium text-text-secondary">Nome da Marca</label>
                                <input id="brandName" type="text" value={brandIdentity.name} onChange={(e) => handleUpdate('name', e.target.value)} placeholder="Ex: Acme Inc." className="w-full bg-primary-bg border border-glass-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50" />
                            </div>
                        </div>
                    </div>

                    {/* Business Info */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold border-b border-glass-border pb-2">ℹ️ Informações do Negócio</h3>
                        <div className="space-y-2">
                            <label htmlFor="businessInfo" className="text-sm font-medium text-text-secondary">
                                Descreva seu negócio (tom de voz, público-alvo, produtos, etc.). Isso ajudará a IA a criar legendas mais relevantes.
                            </label>
                            <textarea
                                id="businessInfo"
                                value={brandIdentity.businessInfo}
                                onChange={(e) => handleUpdate('businessInfo', e.target.value)}
                                placeholder="Ex: Somos uma marca de café artesanal focada em sustentabilidade. Nosso tom é amigável e educativo, e nosso público são jovens adultos que apreciam produtos de qualidade."
                                className="w-full h-24 bg-primary-bg border border-glass-border rounded-lg p-2 text-text-primary resize-y focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                            />
                        </div>
                    </div>

                    {/* Color Palette */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold border-b border-glass-border pb-2">🎨 Paleta de Cores</h3>
                        {/* Primary Colors */}
                        <div className="space-y-2">
                            <label htmlFor="newPrimaryColorInput" className="text-sm font-medium text-text-secondary">Cores Primárias</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" aria-label="Seletor de cor primária" value={newPrimaryColor} onChange={(e) => setNewPrimaryColor(e.target.value)} className="w-10 h-10 p-0 border-none rounded-md cursor-pointer bg-transparent appearance-none" />
                                <input id="newPrimaryColorInput" type="text" value={newPrimaryColor} onChange={(e) => setNewPrimaryColor(e.target.value)} className="flex-grow bg-primary-bg border border-glass-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50" />
                                <button onClick={() => handleAddColor('primary')} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-2 px-3 rounded-lg text-sm transition-colors">Adicionar</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {brandIdentity.primaryColors.map(color => (<div key={color} className="flex items-center gap-2 bg-panel-bg p-1.5 rounded-full"><div className="w-5 h-5 rounded-full border border-glass-border" style={{ backgroundColor: color }}></div><span className="text-xs font-mono">{color}</span><button onClick={() => handleRemoveColor('primary', color)} className="text-red-400 hover:text-red-300 text-lg leading-none" aria-label={`Remover cor primária ${color}`}>&times;</button></div>))}
                            </div>
                        </div>
                        {/* Secondary Colors */}
                        <div className="space-y-2">
                            <label htmlFor="newSecondaryColorInput" className="text-sm font-medium text-text-secondary">Cores Secundárias</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" aria-label="Seletor de cor secundária" value={newSecondaryColor} onChange={(e) => setNewSecondaryColor(e.target.value)} className="w-10 h-10 p-0 border-none rounded-md cursor-pointer bg-transparent appearance-none" />
                                <input id="newSecondaryColorInput" type="text" value={newSecondaryColor} onChange={(e) => setNewSecondaryColor(e.target.value)} className="flex-grow bg-primary-bg border border-glass-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50" />
                                <button onClick={() => handleAddColor('secondary')} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-2 px-3 rounded-lg text-sm transition-colors">Adicionar</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {brandIdentity.secondaryColors.map(color => (<div key={color} className="flex items-center gap-2 bg-panel-bg p-1.5 rounded-full"><div className="w-5 h-5 rounded-full border border-glass-border" style={{ backgroundColor: color }}></div><span className="text-xs font-mono">{color}</span><button onClick={() => handleRemoveColor('secondary', color)} className="text-red-400 hover:text-red-300 text-lg leading-none" aria-label={`Remover cor secundária ${color}`}>&times;</button></div>))}
                            </div>
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold border-b border-glass-border pb-2">✒️ Tipografia</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="primaryFont" className="text-sm font-medium text-text-secondary">Fonte Primária</label>
                                <div className="relative mt-1">
                                    <select 
                                        id="primaryFont" 
                                        value={brandIdentity.primaryFont} 
                                        onChange={(e) => handleUpdate('primaryFont', e.target.value)} 
                                        className="w-full bg-primary-bg border border-glass-border rounded-lg p-2 appearance-none text-text-primary focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                                        style={{ fontFamily: brandIdentity.primaryFont }}
                                    >
                                        {FONT_OPTIONS.map(font => (
                                            <option key={font} value={font} style={{ fontFamily: font, backgroundColor: 'var(--color-background-secondary)' }}>{font}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="secondaryFont" className="text-sm font-medium text-text-secondary">Fonte Secundária</label>
                                <div className="relative mt-1">
                                    <select 
                                        id="secondaryFont" 
                                        value={brandIdentity.secondaryFont} 
                                        onChange={(e) => handleUpdate('secondaryFont', e.target.value)} 
                                        className="w-full bg-primary-bg border border-glass-border rounded-lg p-2 appearance-none text-text-primary focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                                        style={{ fontFamily: brandIdentity.secondaryFont }}
                                    >
                                        {FONT_OPTIONS.map(font => (
                                            <option key={font} value={font} style={{ fontFamily: font, backgroundColor: 'var(--color-background-secondary)' }}>{font}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={onClose} className="w-full bg-gradient-to-r from-accent-start to-accent-end font-display text-white font-bold py-3 px-4 rounded-full mt-4 shadow-[0_4px_15px_rgba(162,89,255,0.2)] hover:opacity-90 hover:shadow-[0_6px_20px_rgba(162,89,255,0.3)] flex-shrink-0">
                    Concluído
                </button>
            </div>
        </div>
    );
};

export default SettingsModal;