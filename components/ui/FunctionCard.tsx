import React from 'react';

const FunctionCard: React.FC<{ icon: React.ReactNode; name: string; isActive: boolean; onClick: () => void; }> = ({ icon, name, isActive, onClick }) => (
    <button
        type="button"
        aria-label={`Selecionar função ${name}`}
        className={`function-card p-4 rounded-xl text-center cursor-pointer transition-all duration-200 bg-secondary-bg border border-transparent hover:border-glass-border ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className="mb-2 h-8 w-8 mx-auto text-text-primary" aria-hidden="true">{icon}</div>
        <div className="font-medium text-sm text-text-primary">{name}</div>
    </button>
);

export default FunctionCard;