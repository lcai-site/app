import React from 'react';
import type { AppMode } from '../../types';

const BottomNav: React.FC<{
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
    onGenerateClick: () => void;
    isLoading: boolean;
}> = ({ mode, onModeChange, onGenerateClick, isLoading }) => {

    const navItems: { id: AppMode; label: string; icon: JSX.Element }[] = [
        {
            id: 'create',
            label: 'Criar',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
        },
        {
            id: 'edit',
            label: 'Editar',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
        },
        {
            id: 'ai_tools',
            label: 'Ferramentas',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L12 15.25l5.571-3m0 0l4.179 2.25L12 21.75 2.25 12l4.179-2.25z" /></svg>
        },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4">
            <div className="relative bg-secondary-bg/80 backdrop-blur-lg border border-glass-border rounded-full h-20 flex items-center justify-around shadow-2xl">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onModeChange(item.id)}
                        className={`flex flex-col items-center justify-center text-xs font-medium transition-colors w-20 ${
                            mode === item.id ? 'text-accent-start' : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <button
                        onClick={onGenerateClick}
                        disabled={isLoading}
                        className="w-16 h-16 bg-gradient-to-r from-accent-start to-accent-end rounded-full flex items-center justify-center text-white shadow-lg disabled:opacity-50"
                        aria-label="Gerar Imagem"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BottomNav;