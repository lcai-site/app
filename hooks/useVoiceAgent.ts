
import { useState, useRef, useEffect, useCallback } from 'react';

type AgentStatus = 'idle' | 'listening' | 'processing' | 'speaking';

interface UseVoiceAgentProps {
  onTranscriptFinalized: (transcript: string) => void;
}

export const useVoiceAgent = ({ onTranscriptFinalized }: UseVoiceAgentProps) => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    console.log("useVoiceAgent: Hook montado.");
    // Fix: The 'SpeechRecognition' property is not standard on the window object.
    // Cast window to 'any' to access this browser-specific API without TypeScript errors.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("API de Reconhecimento de Voz NÃO SUPORTADA neste navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    // PONTOS DE VERIFICAÇÃO DOS EVENTOS
    recognition.onstart = () => {
      console.log("%cSUCESSO: Microfone ativado e escutando.", "color: lime; font-weight: bold;");
      setAgentStatus('listening');
    };

    recognition.onresult = (event: any) => {
      console.log("Voz: Resultado recebido do microfone.", event);
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        console.log("Voz: Transcrição finalizada:", finalTranscript);
        recognition.stop();
        onTranscriptFinalized(finalTranscript.trim());
      }
    };

    // O PONTO DE VERIFICAÇÃO MAIS IMPORTANTE
    recognition.onerror = (event: any) => {
      console.error("%cERRO CRÍTICO NO RECONHECIMENTO DE VOZ:", "color: red; font-size: 1.2em; font-weight: bold;", event.error);
      alert(`Ocorreu um erro com o microfone: ${event.error}. Verifique o console (F12) para mais detalhes.`);
      setAgentStatus('idle');
    };
    
    recognition.onend = () => {
      console.log("Voz: Evento 'onend' (escuta terminada) foi disparado.");
      // State is no longer set to 'idle' here to prevent race conditions
      // and allow the calling component to control the conversation flow.
    };

    recognitionRef.current = recognition;
    console.log("useVoiceAgent: Instância de reconhecimento criada e pronta.");
  }, [onTranscriptFinalized, agentStatus]);

  const speak = useCallback((text: string) => {
    if (!text || typeof window.speechSynthesis === 'undefined') {
      console.warn("Speech synthesis not available or no text provided.");
      setAgentStatus('idle');
      return;
    }

    setAgentStatus('processing');
    
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = window.speechSynthesis.getVoices();
    const ptBRVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) || voices.find(v => v.lang === 'pt-BR');
    if (ptBRVoice) {
      utterance.voice = ptBRVoice;
    }
    
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    utterance.onend = () => {
      if (recognitionRef.current) {
        setTranscript('');
        recognitionRef.current.start();
      } else {
        setAgentStatus('idle');
      }
    };
    
    utterance.onerror = (e) => {
        console.error("Error during speech synthesis:", e);
        setAgentStatus('idle');
    };
    
    setTimeout(() => {
        setAgentStatus('speaking');
        window.speechSynthesis.speak(utterance);
    }, 100);
  }, []);

  const startConversation = useCallback(() => {
    if (agentStatus === 'idle' && recognitionRef.current) {
      console.log("Voz: Tentando iniciar a escuta via startConversation...");
      setTranscript('');
      recognitionRef.current.start();
    } else {
      console.warn("Voz: Tentativa de iniciar a escuta falhou. Status atual:", agentStatus);
    }
  }, [agentStatus]);

  const stopConversation = useCallback(() => {
    console.log("Voz: Parando a conversa manualmente.");
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis.cancel();
    setAgentStatus('idle');
  }, []);

  return { agentStatus, transcript, startConversation, stopConversation, speak };
};
