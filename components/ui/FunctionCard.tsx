import React from 'react';

const FunctionCard: React.FC<{ icon?: React.ReactNode; name: string; isActive: boolean; onClick: () => void; }> = ({ name, isActive, onClick }) => (
    <button
        type="button"
        aria-label={`Selecionar função ${name}`}
        className={`w-full p-3 rounded-lg text-center cursor-pointer transition-all duration-200 font-medium text-base ${isActive ? 'bg-gradient-to-r from-accent-start to-accent-end text-white' : 'bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary'}`}
        onClick={onClick}
    >
        {name}
    </button>
);

export default FunctionCard;