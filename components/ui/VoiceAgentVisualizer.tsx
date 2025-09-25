import React from 'react';

type AgentStatus = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceAgentVisualizerProps {
    status: AgentStatus;
    onClick: () => void;
}

const VoiceAgentVisualizer: React.FC<VoiceAgentVisualizerProps> = ({ status, onClick }) => {
    const statusClass = `status-${status}`;
    const MicIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
        </svg>
    );

    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center w-24 h-24 rounded-full focus:outline-none focus:ring-4 focus:ring-accent-start/50"
            aria-label={status === 'listening' ? 'Parar de ouvir' : 'Iniciar conversa por voz'}
        >
            <div className={`voice-visualizer-base ${statusClass}`}>
                {status !== 'processing' && <MicIcon />}
            </div>
        </button>
    );
};

export default VoiceAgentVisualizer;
