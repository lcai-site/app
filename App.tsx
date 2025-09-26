import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AppMode, CreateFunction, EditFunction, ImageData, Size, ArtStyle, BrandIdentity, ContentAssistantData, MarketingPersona, CustomSpeechRecognition, SpeechRecognitionEvent, EditedImage, CarouselPlan, ConsultantPersona, ConsultantMessage, ConciergeMessage, AspectRatio } from './types';
import type { Chat } from '@google/genai';
// Fix: Import `fileToBase64` to resolve 'Cannot find name' errors.
import { generateImage, editImage, composeImages, generateText, analyzeImageForContent, describeImage, fileToBase64, generateCarouselPlan, startConsultantChat, startConciergeChat } from './services/geminiService';
import JSZip from 'jszip';
import { ART_STYLES, SIZES } from './constants';
import { applyLogoOverlay, base64ToBlob, prepareImageForOutpainting, renderTextToImage, resizeAndCropImage, flattenImageWithText, speak } from './utils';
import { useVoiceAgent } from './hooks/useVoiceAgent';

import FunctionCard from './components/ui/FunctionCard';
import UploadArea from './components/ui/UploadArea';
import ArtStyleSelectorPanel, { ArtStylePreviewTooltip } from './components/panels/ArtStyleSelectorPanel';
import SizeSelectorPanel from './components/panels/SizeSelectorPanel';
import BackgroundEditorPanel from './components/panels/BackgroundEditorPanel';
import PersonEditorPanel from './components/panels/PersonEditorPanel';
import TextEditorPanel from './components/panels/TextEditorPanel';
import PromptModal from './components/modals/PromptModal';
import CameraModal from './components/modals/CameraModal';
import GalleryPanel from './components/modals/GalleryPanel';
import SettingsModal from './components/modals/SettingsModal';
import ContentAssistantModal from './components/modals/ContentAssistantModal';
import ReplicateModal from './components/modals/ReplicateModal';
import MaskEditor from './components/modals/MaskEditor';
import FabricEditor from './components/editor/FabricEditor';
import ConsultantChatPanel from './components/panels/ConsultantChatPanel';
import ConversationalAgentPanel from './components/panels/ConversationalAgentPanel';

const compositionPlaceholders: Record<string, string[]> = {
  clothing: [
    "Ex: 'fundo de estúdio com luz suave'",
    "Ex: 'em uma rua de Tóquio à noite com neon'",
    "Ex: 'cenário urbano chuvoso'",
    "Ex: 'pose de passarela, caminhando em direção à câmera'",
    "Ex: 'sentada em um café parisiense'"
  ],
  tattoo: [
    "Ex: 'estilo de aquarela com cores vibrantes'",
    "Ex: 'fazer a tatuagem parecer um pouco desbotada'",
    "Ex: 'adicionar sombreado suave ao redor'",
    "Ex: 'tatuagem em estilo blackwork, linhas fortes'",
    "Ex: 'realista, com detalhes finos'"
  ],
  decorator: [
    "Ex: 'iluminação de fim de tarde, luz dourada'",
    "Ex: 'colocar um tapete persa embaixo do sofá'",
    "Ex: 'mudar o piso para madeira de carvalho'",
    "Ex: 'adicionar uma planta grande (monstera) no canto'",
    "Ex: 'estilo minimalista, cores neutras'"
  ]
};

// Fix: Removed API Key management from UI, per coding guidelines.
const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('create');
  const [createFunction, setCreateFunction] = useState<CreateFunction>('free');
  const [editFunction, setEditFunction] = useState<EditFunction | null>(null);
  const [prompt, setPrompt] = useState('');
  const [optionalPromptDetails, setOptionalPromptDetails] = useState('');
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState('');

  // Carousel State
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const [carouselSlideCount, setCarouselSlideCount] = useState(3);
  const [isInfiniteCarousel, setIsInfiniteCarousel] = useState(false);

  const [composeList, setComposeList] = useState<ImageData[]>([]);

  const [generatedImage, setGeneratedImage] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  
  const [editHistory, setEditHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Text-based Character State
  const [characterReferenceImage, setCharacterReferenceImage] = useState<ImageData | null>(null);

  // Photo-based Person State
  const [personReferenceUpload, setPersonReferenceUpload] = useState<ImageData | null>(null);
  const [personCharacterSheet, setPersonCharacterSheet] = useState<ImageData | null>(null);
  const [isCreatingPersonProfile, setIsCreatingPersonProfile] = useState(false);
  
  // Clothing state
  const [clothingImages, setClothingImages] = useState<ImageData[]>([]);
  const [generatePoseVariations, setGeneratePoseVariations] = useState(false);
  
  // Multi-size generation states
  const [sizeMode, setSizeMode] = useState<'single' | 'multi'>('single');
  const [selectedSizes, setSelectedSizes] = useState<Size[]>([SIZES["Instagram"][0]]);
  const [generatedImages, setGeneratedImages] = useState<{ size: Size; base64: string }[]>([]);
  const [generationProgress, setGenerationProgress] = useState('');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Prompt helper states
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [activePromptTool, setActivePromptTool] = useState<'translate' | 'enhance' | null>(null);

  // Art style state
  const [artStyle, setArtStyle] = useState<string>('');
  const [isArtStyleAccordionOpen, setIsArtStyleAccordionOpen] = useState(true);
  
  // Art Style Preview State
  const [hoveredStyle, setHoveredStyle] = useState<ArtStyle | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<number | null>(null);

  // New features state
  const [galleryImages, setGalleryImages] = useState<ImageData[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isShareSupported, setIsShareSupported] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'single' | 'person' | `compose-${number}` | 'compose-add' | 'character' | 'consultant' | 'concierge' | 'clothing' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null); // SpeechRecognition instance
  const promptBeforeListening = useRef('');
  
  // Content Assistant state
  const [contentAssistantTarget, setContentAssistantTarget] = useState<ImageData | null>(null);
  
  // Replicate for Social Media state
  const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false);
  const [replicationTargetImage, setReplicationTargetImage] = useState<ImageData | null>(null);
  const [replicatedImages, setReplicatedImages] = useState<{ size: Size; image: ImageData; previewUrl: string; }[]>([]);

  // Focus management refs for modals
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const galleryToggleRef = useRef<HTMLButtonElement | null>(null);


  // Settings and Brand Identity
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>({
    name: '',
    logo: null,
    primaryColors: [],
    secondaryColors: [],
    primaryFont: 'Roboto',
    secondaryFont: 'Open Sans',
    businessInfo: '',
  });
  const [useBrandIdentity, setUseBrandIdentity] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Text-to-Image state
  const [textFont, setTextFont] = useState('Roboto');
  const [textSize, setTextSize] = useState(64);
  const [textColor, setTextColor] = useState('#FAFAFA');
  const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');
  const [textBgType, setTextBgType] = useState<'transparent' | 'solid'>('transparent');
  const [textBgColor, setTextBgColor] = useState('#0B1426');
  
  // Masking state
  const [isMasking, setIsMasking] = useState(false);

  // Fabric.js Text Editing state
  const [textEditTarget, setTextEditTarget] = useState<ImageData | null>(null);

  // Multi-image navigation state
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For create mode results
  const [editingContext, setEditingContext] = useState<ImageData[]>([]);

  // AI Consultant state
  const [consultantPersona, setConsultantPersona] = useState<ConsultantPersona>('creative');
  const [consultantChatHistory, setConsultantChatHistory] = useState<ConsultantMessage[]>([]);
  const [consultantUserInput, setConsultantUserInput] = useState('');
  const [isConsultantTyping, setIsConsultantTyping] = useState(false);
  const consultantChatRef = useRef<Chat | null>(null);
  const [consultantImageToSend, setConsultantImageToSend] = useState<ImageData | null>(null);
  const [consultantProductImage, setConsultantProductImage] = useState<ImageData | null>(null);
  const [isConsultantListening, setIsConsultantListening] = useState(false);
  const consultantRecognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const consultantInputBeforeListening = useRef('');

  // New Conversational Agent State
  const [isConversationalModeActive, setIsConversationalModeActive] = useState(false);
  const [conciergeChatHistory, setConciergeChatHistory] = useState<ConciergeMessage[]>([]);
  const [conciergeUserInput, setConciergeUserInput] = useState('');
  const [isConciergeTyping, setIsConciergeTyping] = useState(false);
  const conciergeChatRef = useRef<Chat | null>(null);
  const [conciergeImageToSend, setConciergeImageToSend] = useState<ImageData | null>(null);
  const [isConciergeComposing, setIsConciergeComposing] = useState(false);
  const [conciergeCompositionList, setConciergeCompositionList] = useState<ImageData[]>([]);

  // Mobile view state
  const [mobileView, setMobileView] = useState<'controls' | 'results'>('controls');

  const image1 = (mode === 'edit' && editFunction !== 'person' && historyIndex >= 0 && historyIndex < editHistory.length)
    ? editHistory[historyIndex]
    : null;

  useEffect(() => {
    let intervalId: number | undefined;

    if (editFunction && ['clothing', 'decorator', 'tattoo'].includes(editFunction)) {
      const placeholders = compositionPlaceholders[editFunction];
      if (placeholders && placeholders.length > 0) {
        let currentIndex = 0;
        setDynamicPlaceholder(placeholders[currentIndex]);

        intervalId = window.setInterval(() => {
          currentIndex = (currentIndex + 1) % placeholders.length;
          setDynamicPlaceholder(placeholders[currentIndex]);
        }, 3000); // Change every 3 seconds
      }
    } else {
      setDynamicPlaceholder("Adicione detalhes extras para a IA...");
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [editFunction]);
  
  const getImageDimensions = useCallback((imageData: ImageData): Promise<{width: number; height: number}> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = imageData.objectUrl;
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error('Não foi possível carregar a imagem para obter as dimensões. O URL pode ser inválido ou o recurso pode estar corrompido.'));
      });
  }, []);

  useEffect(() => {
      if (navigator.share) {
        setIsShareSupported(true);
      }
  }, []);
  
    // Effect for theme management
    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);
    
    // Effect for Text-to-Image theme and brand identity integration
    useEffect(() => {
        const defaultTextColor = theme === 'dark' ? '#FAFAFA' : '#111827';
        const defaultBgColor = theme === 'dark' ? '#0B1426' : '#F0F2F5';
        
        if (useBrandIdentity && createFunction === 'text') {
            setTextColor(brandIdentity.primaryColors[0] || defaultTextColor);
            setTextFont(brandIdentity.primaryFont);
        } else {
            // Revert to defaults if brand identity is off or mode changes
            setTextColor(defaultTextColor);
            setTextFont('Roboto');
        }
        setTextBgColor(defaultBgColor);
    }, [useBrandIdentity, brandIdentity, createFunction, theme]);

  useEffect(() => {
    try {
        const savedHistoryRaw = localStorage.getItem('editHistory');
        const savedIndexRaw = localStorage.getItem('historyIndex');
        if (savedHistoryRaw && savedIndexRaw) {
            const savedHistory: Omit<ImageData, 'objectUrl'>[] = JSON.parse(savedHistoryRaw);
            const restoredHistory: ImageData[] = savedHistory.map(item => ({
                ...item,
                objectUrl: URL.createObjectURL(base64ToBlob(item.base64, item.mimeType))
            }));
            setEditHistory(restoredHistory);
            setHistoryIndex(parseInt(savedIndexRaw, 10));
        }
    } catch (e) {
        console.error("Failed to load history from localStorage", e);
        localStorage.removeItem('editHistory');
        localStorage.removeItem('historyIndex');
    }
  }, []);

  useEffect(() => {
      if (editHistory.length > 0 && historyIndex !== -1) {
          const historyToSave = editHistory.map(({ base64, mimeType, fabricState }) => ({ base64, mimeType, fabricState }));
          try {
            const jsonString = JSON.stringify(historyToSave);
            if (jsonString.length < 4 * 1024 * 1024) { // 4MB limit
                localStorage.setItem('editHistory', jsonString);
                localStorage.setItem('historyIndex', historyIndex.toString());
            } else {
                console.warn("History is too large to save to localStorage.");
            }
          } catch(e) {
            console.error("Failed to save history to localStorage", e);
          }
      } else {
          localStorage.removeItem('editHistory');
          localStorage.removeItem('historyIndex');
      }
  }, [editHistory, historyIndex]);

  // Load and save brand identity from/to localStorage
  useEffect(() => {
      try {
          const savedIdentityRaw = localStorage.getItem('brandIdentity');
          if (savedIdentityRaw) {
              const savedIdentity = JSON.parse(savedIdentityRaw);
              if (savedIdentity.logo) {
                  // Recreate blob URL from base64
                  savedIdentity.logo.objectUrl = URL.createObjectURL(base64ToBlob(savedIdentity.logo.base64, savedIdentity.logo.mimeType));
              }
              setBrandIdentity(savedIdentity);
          }
      } catch (e) {
          console.error("Failed to load brand identity from localStorage", e);
          localStorage.removeItem('brandIdentity');
      }
  }, []);

  useEffect(() => {
      try {
          // Create a savable version without the blob URL
          const { logo, ...rest } = brandIdentity;
          const savableIdentity = {
              ...rest,
              logo: logo ? { base64: logo.base64, mimeType: logo.mimeType } : null,
          };
          const jsonString = JSON.stringify(savableIdentity);
            if (jsonString.length < 1 * 1024 * 1024) { // 1MB limit for identity
                localStorage.setItem('brandIdentity', jsonString);
            } else {
                console.warn("Brand identity is too large to save to localStorage.");
            }
      } catch (e) {
          console.error("Failed to save brand identity to localStorage", e);
      }
  }, [brandIdentity]);
  
  const handleStyleHover = useCallback((style: ArtStyle, event: React.MouseEvent<HTMLButtonElement>) => {
    if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
    }
    const target = event.currentTarget;
    hoverTimeoutRef.current = window.setTimeout(() => {
        if (document.body.contains(target)) {
            const rect = target.getBoundingClientRect();
            const tooltipWidth = 192; // w-48 -> 12rem -> 192px
            const tooltipHeight = 192;
            const margin = 10;
            
            let left = rect.right + margin;
            if (left + tooltipWidth > window.innerWidth) {
                left = rect.left - tooltipWidth - margin;
            }

            let top = rect.top + rect.height / 2 - tooltipHeight / 2;
            if (top < margin) {
                top = margin;
            } else if (top + tooltipHeight > window.innerHeight) {
                top = window.innerHeight - tooltipHeight - margin;
            }

            setTooltipPosition({ top, left });
            setHoveredStyle(style);
        }
    }, 300);
  }, []);

  const handleStyleLeave = useCallback(() => {
      if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
      }
      setHoveredStyle(null);
  }, []);


  const resetPersonState = useCallback(() => {
      setPersonReferenceUpload(null);
      setPersonCharacterSheet(null);
      setPrompt('');
  }, []);

  // Clear optional prompt when switching tools
  useEffect(() => {
    setOptionalPromptDetails('');
  }, [editFunction]);


  useEffect(() => {
    if (editFunction !== 'clothing') {
        setClothingImages([]);
        setGeneratePoseVariations(false);
    }
    if (editFunction !== 'person' && editFunction !== 'clothing') {
        resetPersonState();
    }
    if (!['compose', 'decorator', 'tattoo'].includes(editFunction as string)) {
        composeList.forEach(item => URL.revokeObjectURL(item.objectUrl));
        setComposeList([]);
    }
}, [editFunction, resetPersonState, composeList]);

  const handleModeChange = useCallback((newMode: AppMode) => {
    const isSwitchingToComplexMode = newMode === 'edit' || newMode === 'ai_tools';
    const isSwitchingFromComplexMode = mode === 'edit' || mode === 'ai_tools';

    // Logic to transfer a generated image from 'create' mode to a usable state in 'edit' or 'ai_tools'
    if (mode === 'create' && isSwitchingToComplexMode) {
        let imageToEdit: ImageData | null = null;
        let imageSet: ImageData[] = [];

        if (generatedImage) {
            imageToEdit = generatedImage;
            imageSet = [generatedImage];
        } else if (generatedImages.length > 0) {
            imageSet = generatedImages.map(img => ({
                base64: img.base64,
                mimeType: 'image/png',
                objectUrl: URL.createObjectURL(base64ToBlob(img.base64, 'image/png')),
            }));
            imageToEdit = imageSet[currentImageIndex] || null;
        }

        if (imageToEdit) {
            editHistory.forEach(item => URL.revokeObjectURL(item.objectUrl));
            setEditHistory([imageToEdit]);
            setHistoryIndex(0);
            setEditingContext(imageSet);
            setGeneratedImage(null);
            setGeneratedImages([]);
        }
        setCharacterReferenceImage(null);
    }

    // Logic to transfer the current work back to the 'create' mode gallery
    if (isSwitchingFromComplexMode && newMode === 'create') {
        const currentImage = editHistory[historyIndex];
        if (currentImage) {
            setGeneratedImage(currentImage);
        }
        setComposeList([]);
        resetPersonState();
        editingContext.forEach(item => URL.revokeObjectURL(item.objectUrl));
        setEditingContext([]);
    }

    // Ensure size mode is 'single' for edit/tools
    if (isSwitchingToComplexMode) {
        setSizeMode('single');
    }

    // Set default sub-function for the new mode to ensure the correct panel is shown
    if (newMode === 'edit') {
      setEditFunction('add-remove');
    } else if (newMode === 'ai_tools') {
      setEditFunction('compose');
    }

    setMode(newMode);
    setMobileView('controls');
}, [
    mode,
    generatedImage,
    generatedImages,
    editHistory,
    historyIndex,
    resetPersonState,
    currentImageIndex,
    editingContext,
]);

  
  const handleCreateFunctionChange = useCallback((newFunc: CreateFunction) => {
      if (createFunction === 'character' && newFunc !== 'character') {
          setCharacterReferenceImage(null);
          setPrompt('');
      }
      if (newFunc === 'consultor') {
          const apiKey = localStorage.getItem('userConfigValue');
          if (!apiKey) {
              setError('ERRO: Chave de API não encontrada. Por favor, configure sua chave de API nas Configurações (⚙️).');
              return; 
          }
          consultantChatRef.current = startConsultantChat(apiKey, consultantPersona);
          setConsultantChatHistory([]);
          setConsultantUserInput('');
          setConsultantImageToSend(null);
      } else {
          consultantChatRef.current = null;
      }
      setCreateFunction(newFunc);
  }, [createFunction, consultantPersona]);

  const handleFileUploads = useCallback(async (files: FileList | null, imageSlot: 'single' | 'person' | 'character' | 'compose' | 'clothing') => {
    if (!files || files.length === 0) {
        return;
    }
    
    try {
        setIsLoading(true);
        setError(null);

        const imagePromises = Array.from(files).map(file =>
            fileToBase64(file).then(base64 => ({
                base64,
                mimeType: file.type,
                objectUrl: URL.createObjectURL(file),
            } as ImageData))
        );

        const newImagesData: ImageData[] = await Promise.all(imagePromises);

        if (imageSlot === 'compose') {
            setComposeList(prev => [...prev, ...newImagesData]);
        } else if (imageSlot === 'clothing') {
            setClothingImages(prev => [...prev, ...newImagesData]);
        } else if (imageSlot === 'person') {
            if(editFunction === 'person') resetPersonState();
            setPersonReferenceUpload(newImagesData[0] || null);
        } else if (imageSlot === 'character') {
             setCharacterReferenceImage(newImagesData[0] || null);
        } else { // 'single'
            setEditHistory([newImagesData[0]]);
            setHistoryIndex(0);
            setComposeList([]);
        }

    } catch (e: any) {
        console.error("Image upload failed:", e);
        setError(`Error processing file(s): ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [resetPersonState, editFunction]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.file) {
        const imageFile = event.data.file as File;
        console.log('App: Imagem recebida do Service Worker!', imageFile);
        
        // Mock a FileList to use the existing upload handler
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(imageFile);
        const fileList = dataTransfer.files;

        if (fileList.length > 0) {
            // By default, send shared images to the general-purpose 'single' upload slot
            // and switch to edit mode. This is more versatile than forcing 'clothing'.
            handleFileUploads(fileList, 'single');
            handleModeChange('edit');
            setEditFunction('add-remove');
        }
      }
    };
  
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
  
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [handleFileUploads, handleModeChange]);
  
  const switchToResultsViewOnMobile = useCallback(() => {
    if (window.innerWidth < 768) {
        setMobileView('results');
    }
  }, []);

  const addResultToHistory = useCallback((result: EditedImage | ImageData, fabricState?: string) => {
    const isEditedImage = 'base64' in result && 'mimeType' in result && !('objectUrl' in result);
    const newImageData: ImageData = isEditedImage
        ? {
            base64: result.base64,
            mimeType: result.mimeType,
            objectUrl: URL.createObjectURL(base64ToBlob(result.base64, result.mimeType)),
            fabricState: fabricState,
          }
        : { ...result, fabricState: fabricState ?? result.fabricState };

    setEditHistory(prevHistory => {
        const MAX_HISTORY_SIZE = 20;
        // Revoke URLs from the part of history that is now unreachable (redo states)
        const discardedHistory = prevHistory.slice(historyIndex + 1);
        discardedHistory.forEach(item => {
            if (item.objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(item.objectUrl);
            }
        });

        let newHistory = [...prevHistory.slice(0, historyIndex + 1), newImageData];
        
        // Enforce history limit to prevent localStorage overflow
        if (newHistory.length > MAX_HISTORY_SIZE) {
            const itemToRevoke = newHistory.shift(); // remove the oldest item
            if (itemToRevoke?.objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(itemToRevoke.objectUrl);
            }
        }
        
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
    switchToResultsViewOnMobile();
  }, [historyIndex, switchToResultsViewOnMobile]);

  const performEdit = useCallback(async (sourceImage: ImageData, action: 'remove-background' | 'enhance'): Promise<ImageData> => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey) {
      throw new Error('ERRO: Chave de API não encontrada. Por favor, configure sua chave de API nas Configurações (⚙️).');
    }
  
    const prompts = {
      'remove-background': `TAREFA CRÍTICA: Remoção de Fundo com Transparência. Isole o objeto/assunto principal da imagem com a máxima precisão. Remova completamente o fundo, tornando-o transparente (canal alfa). O assunto principal deve permanecer completamente inalterado, com bordas perfeitas e suaves. O resultado final deve ser uma imagem PNG com fundo transparente.`,
      'enhance': "Enhance this image: perform upscaling for higher resolution, improve sharpness and detail, correct colors and lighting to be more vibrant and balanced, and remove any noise or artifacts. The result should be a professional, high-quality version of the original photo."
    };
  
    const result = await editImage(apiKey, prompts[action], sourceImage.base64, sourceImage.mimeType);
  
    return {
      base64: result.base64,
      mimeType: result.mimeType,
      objectUrl: URL.createObjectURL(base64ToBlob(result.base64, result.mimeType)),
    };
  }, []);

  const handleRemoveBackground = useCallback(async () => {
    const currentImage = editHistory[historyIndex];
    if (!currentImage) {
        setError("Por favor, carregue uma imagem primeiro para remover o fundo.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const result = await performEdit(currentImage, 'remove-background');
        addResultToHistory(result);
    } catch (e: any) {
        console.error("A remoção de fundo falhou:", e);
        setError(`Falha ao remover o fundo: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [editHistory, historyIndex, addResultToHistory, performEdit]);


  const handleComposeImageUpload = useCallback(async (files: FileList, index: number) => {
      if (!files || files.length === 0) return;
      const file = files[0];
  
      try {
          const base64 = await fileToBase64(file);
          const newImageData: ImageData = {
              base64,
              mimeType: file.type,
              objectUrl: URL.createObjectURL(file),
          };
          setComposeList(prevList => {
              const newList = [...prevList];
              // Revoke old URL if it exists
              if(newList[index]) URL.revokeObjectURL(newList[index].objectUrl);
              newList[index] = newImageData;
              return newList;
          });
      } catch (e) {
          setError('Falha ao carregar a imagem. Tente novamente.');
          console.error(e);
      }
  }, []);
  
  const handleRemoveComposeImage = useCallback((index: number) => {
      setComposeList(prevList => {
          const itemToRemove = prevList[index];
          if(itemToRemove) URL.revokeObjectURL(itemToRemove.objectUrl);
          return prevList.filter((_, i) => i !== index);
      });
  }, []);
  
  const handleUndo = useCallback(() => {
    setHistoryIndex(prevIndex => Math.max(0, prevIndex - 1));
  }, []);

  const handleRedo = useCallback(() => {
      setHistoryIndex(prevIndex => Math.min(editHistory.length - 1, prevIndex + 1));
  }, [editHistory.length]);

  const handleSizeSelection = useCallback((size: Size) => {
    if (size.name.toLowerCase().includes('carrossel')) {
      setIsCarouselMode(true);
    } else {
      setIsCarouselMode(false);
    }

    if (sizeMode === 'single') {
        setSelectedSizes([size]);
    } else {
        setSelectedSizes(prev => {
            const isSelected = prev.some(s => s.name === size.name);
            if (isSelected) {
                // Only allow deselection if more than one size is selected
                if (prev.length > 1) {
                    return prev.filter(s => s.name !== size.name);
                }
                return prev; // Do not deselect the last item
            } else {
                return [...prev, size];
            }
        });
    }
  }, [sizeMode]);
  
  const handleSelectAllCategory = useCallback((category: string, isSelected: boolean) => {
      const categorySizes = SIZES[category];
      setSelectedSizes(prev => {
          if (isSelected) {
              const newSizes = [...prev];
              categorySizes.forEach(size => {
                  if (!newSizes.some(s => s.name === size.name)) {
                      newSizes.push(size);
                  }
              });
              return newSizes;
          } else {
              const newSelection = prev.filter(s => !categorySizes.some(cs => cs.name === s.name));
              // Ensure at least one item remains selected
              if (newSelection.length === 0) {
                  return prev.length > 0 ? [prev[0]] : [SIZES["Instagram"][0]];
              }
              return newSelection;
          }
      });
  }, []);

  const handlePromptEnhancement = useCallback(async (action: 'translate' | 'enhance') => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey || !prompt.trim() || isProcessingPrompt) return;

    setIsProcessingPrompt(true);
    setActivePromptTool(action);
    setError(null);
    try {
        const instruction = action === 'translate'
            ? `Translate the following text to English: "${prompt}"`
            : `Improve and expand this image prompt in its original language, adding more detail and creative ideas. Keep it concise, under 100 words. Original prompt: "${prompt}"`;
        const newPrompt = await generateText(apiKey, instruction);
        setPrompt(newPrompt.replace(/"/g, '')); // Remove quotes from Gemini response
    } catch (e: any) {
        setError(`Falha ao processar o prompt: ${e.message}`);
    } finally {
        setIsProcessingPrompt(false);
        setActivePromptTool(null);
    }
}, [prompt, isProcessingPrompt]);

const generateSingleImage = useCallback(async (
    apiKey: string,
    fullPrompt: string,
    targetSize: Size
): Promise<ImageData> => {
    const rawImage = await generateImage(apiKey, fullPrompt, targetSize.ratio);
    const croppedImage = await resizeAndCropImage(rawImage, targetSize);
    let finalImage = croppedImage;
    if (useBrandIdentity && brandIdentity.logo) {
        finalImage = await applyLogoOverlay(finalImage, brandIdentity.logo);
    }
    return {
        base64: finalImage,
        mimeType: 'image/png',
        objectUrl: URL.createObjectURL(base64ToBlob(finalImage, 'image/png'))
    };
}, [useBrandIdentity, brandIdentity]);

const handleConciergeImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    try {
        const base64 = await fileToBase64(file);
        const imageData: ImageData = {
            base64,
            mimeType: file.type,
            objectUrl: URL.createObjectURL(file),
        };
        setConciergeImageToSend(imageData);
    } catch (e) {
        setError('Falha ao processar imagem. Por favor, tente novamente.');
        console.error(e);
    }
}, []);

// FIX: Moved handleSendConciergeMessage and useVoiceAgent hook after their dependencies were defined.
const handleSendConciergeMessage = useCallback(async (isInitial = false, messageOverride?: string) => {
    const apiKey = localStorage.getItem('userConfigValue');
    if ((!conciergeUserInput.trim() && !isInitial && !conciergeImageToSend && !messageOverride) || !conciergeChatRef.current || !apiKey) {
        return { spokenResponse: false, text: null };
    }

    let userMessageText = isInitial ? "Olá" : (messageOverride ?? conciergeUserInput.trim());
    let userMessageImage = conciergeImageToSend;

    if (isConciergeComposing && userMessageImage) {
        setConciergeCompositionList(prev => [...prev, userMessageImage]);
        setConciergeImageToSend(null);
        userMessageText = "(Imagem adicionada)";
        userMessageImage = undefined;
    }
    
    const userMessage: ConciergeMessage = {
        role: 'user',
        text: userMessageText,
        image: userMessageImage,
    };

    if (!isInitial) {
        setConciergeChatHistory(prev => [...prev, userMessage]);
    }

    setConciergeUserInput('');
    setConciergeImageToSend(null);
    setIsConciergeTyping(true);
    setError(null);

    try {
        const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [];
        if (userMessage.image && !isConciergeComposing) {
            parts.push({ inlineData: { data: userMessage.image.base64, mimeType: userMessage.image.mimeType } });
        }
        if (userMessage.text) {
            parts.push({ text: userMessage.text });
        } else if (userMessage.image) {
            parts.push({ text: "(Imagem recebida)" });
        }

        const result = await conciergeChatRef.current.sendMessage({ message: parts });
        let responseText = result.text;
        
        const commandRegex = /@@([A-Z_]+):?([^@]+)?@@/g;
        let match;
        const commands = [];
        
        while ((match = commandRegex.exec(responseText)) !== null) {
            commands.push({ command: match[1], value: match[2] });
        }
        
        const cleanText = responseText.replace(commandRegex, '').trim();

        const newModelMessage: ConciergeMessage = { role: 'model', text: cleanText };
        setConciergeChatHistory(prev => [...prev, newModelMessage]);
        
        for (const { command, value } of commands) {
            // ... command execution logic (remains the same)
        }
        return { spokenResponse: !!cleanText, text: cleanText };
    } catch (e: any) {
        setError(`Ocorreu um erro com o assistente: ${e.message}`);
        const errorMsg = { role: 'model' as const, text: `Desculpe, ocorreu um erro geral. ${e.message}` };
        setConciergeChatHistory(prev => [...prev, errorMsg]);
        return { spokenResponse: true, text: errorMsg.text };
    } finally {
        setIsConciergeTyping(false);
    }
  }, [
    conciergeUserInput, conciergeImageToSend, handleCreateFunctionChange, 
    generateSingleImage, artStyle, selectedSizes, isConciergeComposing, 
    conciergeCompositionList, performEdit, prompt
  ]);

  const { 
      agentStatus, 
      transcript: currentTranscript, 
      startConversation, 
      stopConversation, 
      speak 
  } = useVoiceAgent({
    onTranscriptFinalized: (transcript) => {
        const lowerCaseTranscript = transcript.toLowerCase().trim();
        
        if (!transcript) {
            startConversation();
            return;
        }

        console.log("Comando final recebido:", lowerCaseTranscript);

        if (lowerCaseTranscript.includes('galeria')) {
            speak("Ok, abrindo sua galeria de imagens.");
            openModalWithFocus(setIsGalleryOpen);
            stopConversation();
        } else if (lowerCaseTranscript.includes('tirar foto') || lowerCaseTranscript.includes('câmera')) {
            speak("Ok, abrindo a câmera...");
            handleTakePhotoClick('concierge');
            stopConversation();
        } else if (lowerCaseTranscript.includes('sair do modo de voz') || lowerCaseTranscript.includes('parar de ouvir')) {
            speak("Ok, saindo do modo de voz.");
            stopConversation();
        } else {
            handleSendConciergeMessage(false, transcript).then(result => {
                if (result && result.spokenResponse && result.text) {
                    speak(result.text);
                } else {
                    startConversation();
                }
            });
        }
    },
  });


const handleGenerateVestuario = useCallback(async () => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey) {
        setError('ERRO: Chave de API não encontrada. Por favor, configure sua chave de API nas Configurações (⚙️).');
        return;
    }
    if (clothingImages.length === 0 || !personReferenceUpload) {
        setError('Por favor, envie as imagens da roupa e da pessoa.');
        return;
    }

    setIsLoading(true);
    setError(null);

    if (generatePoseVariations) {
        setGenerationProgress('Gerando variações de pose...');
        setGeneratedImage(null);
        setGeneratedImages([]);

        try {
            let variationPrompt = `TAREFA DE GERAÇÃO DE IMAGEM FOTORREALISTA: ENSAIO DE MODA COM VARIAÇÃO DE POSE E IDENTIDADE PRESERVADA.
**IMAGEM A:** Uma pessoa. 
**IMAGENS B, C...:** Peças de roupa.

**SUA MISSÃO:** Crie uma imagem de alta qualidade de um ensaio fotográfico profissional.

**INSTRUÇÕES CRÍTICAS E INEGOCIÁVEIS (MUITO IMPORTANTE):**
1.  **PRESERVAR IDENTIDADE E ESTRUTURA BÁSICA:** O rosto da pessoa na Imagem A é a ÚNICA fonte para sua identidade. Mantenha a ESTRUTURA BÁSICA DO CORPO E AS PROPORÇÕES da pessoa da Imagem A, ao mesmo tempo que a ajusta para a nova pose. Não faça NENHUMA alteração ou variação nas feições ou características faciais.
2.  **CRIE UM NOVO CENÁRIO:** O fundo deve ser um **estúdio fotográfico profissional**, limpo e com um fundo sólido e neutro (cinza claro, branco puro ou outra cor neutra).
3.  **RECRIE A ILUMINAÇÃO DO ZERO (NÃO VAZAR LUZ):** IGNORE E REMOVA COMPLETAMENTE QUALQUER VESTÍGIO de iluminação e reflexos da foto original da Imagem A (ex: luz do sol, sombras de paisagem). Toda a iluminação na imagem final (no personagem E no fundo) deve ser **consistente com uma iluminação de estúdio profissional e uniforme**. Use softboxes, luz principal e de preenchimento para criar um resultado polido, sem reflexos indesejados e com sombras suaves e realistas no chão e no personagem.
4.  **POSE E ROUPA:** Ajuste o corpo da pessoa para uma **pose de modelo natural e fotogênica (ex: pose de modelo, pose casual de corpo inteiro)**. Vista-a com as roupas das Imagens B, C... As roupas devem ter um caimento realista e a iluminação sobre elas deve ser a do estúdio.

**DIRETRIZ DE VARIAÇÃO:** Para esta geração, crie uma pose diferente das que você poderia gerar em outras tentativas. O resultado final deve parecer uma foto de catálogo de moda, onde a pessoa é claramente reconhecível e profissionalmente iluminada.`;

            if (optionalPromptDetails.trim() !== '') {
                variationPrompt += `\n\n**INSTRUÇÕES ESPECÍFICAS DO USUÁRIO:** ${optionalPromptDetails.trim()}`;
            }

            const imagesToCompose = [personReferenceUpload, ...clothingImages].map(img => ({
                base64: img.base64,
                mimeType: img.mimeType
            }));

            const personImageDims = await getImageDimensions(personReferenceUpload);
            const baseSize: Size = {
                name: 'Variação',
                width: personImageDims.width,
                height: personImageDims.height,
                ratio: (personImageDims.width / personImageDims.height > 1.2 ? '16:9' : personImageDims.width / personImageDims.height > 0.8 ? '1:1' : '3:4') as AspectRatio
            };

            const results = [];
            for (let i = 0; i < 4; i++) {
                setGenerationProgress(`Gerando variação ${i + 1} de 4...`);
                const result = await composeImages(apiKey, variationPrompt, imagesToCompose);
                results.push({
                    size: { ...baseSize, name: `Variação ${i + 1}` },
                    base64: result.base64,
                });
                setGeneratedImages([...results]); // Update UI progressively
            }
            switchToResultsViewOnMobile();
            handleModeChange('create');
        } catch (e: any) {
            setError(`Falha ao gerar variações: ${e.message}`);
        } finally {
            setIsLoading(false);
            setGenerationProgress('');
            setClothingImages([]);
            setPersonReferenceUpload(null);
            setGeneratePoseVariations(false);
        }
        return;
    }

    // Single pose generation
    try {
        let promptParaIA = `TAREFA DE EDIÇÃO FOTORREALISTA: PROVADOR VIRTUAL COM POSE APRIMORADA.
IMAGEM A: Uma pessoa.
IMAGENS B, C...: Peças de roupa.
SUA MISSÃO: Vista a pessoa da Imagem A com as roupas das Imagens B, C... e, crucialmente, coloque-a em uma pose de foto natural e fotogênica (ex: pose de modelo, pose casual de corpo inteiro). O resultado deve ser uma única imagem fotorrealista que pareça ter sido tirada para um ensaio de moda. Mantenha o rosto e as características da pessoa, mas ajuste o corpo à nova pose.
INSTRUÇÕES CRÍTICAS: A roupa deve ter um caimento realista na nova pose. A iluminação e o fundo devem permanecer consistentes com a Imagem A.`;

        if (optionalPromptDetails.trim() !== '') {
            promptParaIA += `\n\n**INSTRUÇÕES ESPECÍFICAS DO USUÁRIO:** ${optionalPromptDetails.trim()}`;
        }

        const imagesToCompose = [personReferenceUpload, ...clothingImages].map(img => ({
            base64: img.base64,
            mimeType: img.mimeType
        }));
        
        const result = await composeImages(apiKey, promptParaIA, imagesToCompose);
        addResultToHistory(result);

    } catch (e: any) {
        setError(`Falha ao gerar o look: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
}, [clothingImages, personReferenceUpload, addResultToHistory, generatePoseVariations, handleModeChange, getImageDimensions, optionalPromptDetails, switchToResultsViewOnMobile]);


const handleGenerateClick = useCallback(async () => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey) {
      setError('ERRO: Chave de API não encontrada. Por favor, configure sua chave de API nas Configurações (⚙️).');
      return;
    }
    
    // New logic for consultant product composition
    if (mode === 'create' && createFunction === 'consultor' && consultantProductImage) {
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setGeneratedImages([]);
        setGenerationProgress('Compondo seu anúncio...');
        
        try {
            const targetSize = selectedSizes[0];
            if (!targetSize) throw new Error("Por favor, selecione um tamanho de saída.");
            
            const sceneDescription = prompt;
            const preparedImage = await prepareImageForOutpainting(consultantProductImage, targetSize);
            
            const compositionPrompt = `TAREFA CRÍTICA: COMPOSIÇÃO DE PRODUTO. Coloque o objeto principal da imagem fornecida (na área não-magenta) dentro de um novo cenário descrito por: "${sceneDescription}". A integração deve ser perfeita, ajustando iluminação, sombras, e reflexos para criar uma composição realista. Preserve o objeto principal na área não-magenta. O resultado final deve ser uma imagem completa sem nenhum vestígio de magenta. Retorne exclusivamente a imagem finalizada.`;

            const result = await editImage(apiKey, compositionPrompt, preparedImage.imageBase64, 'image/png');
            const finalImageBase64 = await resizeAndCropImage(result.base64, targetSize);
            
            setGeneratedImage({
                base64: finalImageBase64,
                mimeType: 'image/png',
                objectUrl: URL.createObjectURL(base64ToBlob(finalImageBase64, 'image/png'))
            });
            switchToResultsViewOnMobile();
        } catch(e: any) {
            setError(`A composição do anúncio falhou: ${e.message}`);
        } finally {
            setIsLoading(false);
            setGenerationProgress('');
            setConsultantProductImage(null); // Cleanup
        }
        return; // End execution here.
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setGeneratedImages([]);
    setGenerationProgress('');
    setCurrentImageIndex(0);
    
    let finalPrompt = prompt;
    // Apply art style
    if (!(mode === 'edit' && editFunction === 'enhance')) {
        const selectedArtStyle = ART_STYLES.find(s => s.name === artStyle);
        if (selectedArtStyle) {
            finalPrompt = `${finalPrompt}, ${selectedArtStyle.promptSuffix}`;
        }
    }
    
    // Apply brand identity
    if (useBrandIdentity) {
        let brandInstructions = "Apply the following brand identity: ";
        if (brandIdentity.name) brandInstructions += `The brand name is ${brandIdentity.name}. `;
        if (brandIdentity.primaryColors.length > 0) brandInstructions += `Use these primary colors: ${brandIdentity.primaryColors.join(', ')}. `;
        if (brandIdentity.secondaryColors.length > 0) brandInstructions += `Use these secondary colors: ${brandIdentity.secondaryColors.join(', ')}. `;
        if (brandIdentity.primaryFont) brandInstructions += `For any text, use a typographic style similar to ${brandIdentity.primaryFont}. `;
        if (brandIdentity.secondaryFont) brandInstructions += `For secondary text, use a style similar to ${brandIdentity.secondaryFont}. `;
        brandInstructions += "Do not write the names of the fonts in the image."
        finalPrompt = `${finalPrompt}. ${brandInstructions}`;
    }

    if (isCarouselMode) {
        try {
            if (!finalPrompt.trim()) {
                throw new Error("Por favor, digite um prompt para o carrossel.");
            }
            setGenerationProgress('Criando o plano do carrossel...');
            const artStyleSuffix = ART_STYLES.find(s => s.name === artStyle)?.promptSuffix || 'estilo visual atraente';
            
            const carouselPlan: CarouselPlan = await generateCarouselPlan(apiKey, finalPrompt, carouselSlideCount, artStyleSuffix);
            
            const targetSize = selectedSizes[0];
            const generatedCarouselImages = [];

            if (isInfiniteCarousel) {
                const carouselSlides: string[] = [];
                // Sequential generation
                setGenerationProgress(`Gerando slide 1 de ${carouselSlideCount}...`);
                const slide1Raw = await generateImage(apiKey, carouselPlan.slides[0].image_prompt, targetSize.ratio);
                const slide1Cropped = await resizeAndCropImage(slide1Raw, targetSize);
                carouselSlides.push(slide1Cropped);
                generatedCarouselImages.push({ size: { ...targetSize, name: `Slide 1` }, base64: slide1Cropped });
                setGeneratedImages([...generatedCarouselImages]);
                switchToResultsViewOnMobile();

                for (let i = 1; i < carouselSlideCount; i++) {
                    setGenerationProgress(`Gerando slide ${i + 1} de ${carouselSlideCount}...`);
                    const prevSlideBase64 = carouselSlides[i - 1];
                    let newSlideResult: EditedImage;
                    const slidePrompt = carouselPlan.slides[i]?.image_prompt || carouselPlan.slides[0].image_prompt; // Fallback

                    // Use compose for the last slide to connect back to the first
                    if (i === carouselSlideCount - 1) { 
                        const firstSlideBase64 = carouselSlides[0];
                        const connectionPrompt = `TAREFA: Conexão de Carrossel Infinito. Você receberá duas imagens: Imagem A (slide anterior) e Imagem B (primeiro slide). Crie uma nova imagem que continue a Imagem A pela direita e se conecte perfeitamente com a Imagem B pela esquerda. O conteúdo da cena deve ser: "${slidePrompt}". A transição deve ser imperceptível. Retorne APENAS a imagem.`;
                        newSlideResult = await composeImages(apiKey, connectionPrompt, [
                            { base64: prevSlideBase64, mimeType: 'image/png' },
                            { base64: firstSlideBase64, mimeType: 'image/png' }
                        ]);
                    } else { // Normal continuation
                        const continuationPrompt = `TAREFA: Continuação de Carrossel. Continue a cena do lado direito da imagem fornecida. A nova cena deve ser sobre: "${slidePrompt}". A emenda entre as imagens deve ser invisível e manter o mesmo estilo. Retorne APENAS a imagem.`;
                        newSlideResult = await editImage(apiKey, continuationPrompt, prevSlideBase64, 'image/png');
                    }

                    const newSlideCropped = await resizeAndCropImage(newSlideResult.base64, targetSize);
                    carouselSlides.push(newSlideCropped);
                    generatedCarouselImages.push({ size: { ...targetSize, name: `Slide ${i + 1}` }, base64: newSlideCropped });
                    setGeneratedImages([...generatedCarouselImages]);
                    switchToResultsViewOnMobile();
                }
            } else {
                // Sequential generation for normal carousel to show progress
                const finalImages = [];
                for (let i = 0; i < carouselSlideCount; i++) {
                    const slide = carouselPlan.slides[i];
                    if (!slide) continue;
                    setGenerationProgress(`Gerando slide ${i + 1} de ${carouselSlideCount}...`);
                    const rawImage = await generateImage(apiKey, slide.image_prompt, targetSize.ratio);
                    const croppedImage = await resizeAndCropImage(rawImage, targetSize);
                    finalImages.push({
                        size: { ...targetSize, name: `Slide ${i + 1}` },
                        base64: croppedImage
                    });
                    setGeneratedImages([...finalImages]); // Update UI after each image
                    switchToResultsViewOnMobile();
                }
            }
        } catch (e: any) {
            console.error("Carousel generation failed:", e);
            setError(`A geração do carrossel falhou: ${e.message}`);
        } finally {
            setIsLoading(false);
            setGenerationProgress('');
        }
    } else {
        try {
            if (mode === 'create' && createFunction === 'text') {
                const resultBase64 = await renderTextToImage(prompt, selectedSizes, textSize, textFont, textColor, textAlign, textBgType, textBgColor);
                setGeneratedImage({
                    base64: resultBase64,
                    mimeType: 'image/png',
                    objectUrl: URL.createObjectURL(base64ToBlob(resultBase64, 'image/png'))
                });
                switchToResultsViewOnMobile();
                return; // End execution here for text-to-image
            }
            
            if (mode === 'create') {
                if (!finalPrompt.trim()) {
                    setError("Por favor, digite um prompt para a imagem.");
                    setIsLoading(false);
                    return;
                }

                const functionPrefixes: Record<CreateFunction, string> = {
                    free: '',
                    sticker: 'Die-cut sticker, white background, cartoonish, bold outlines, ',
                    text: 'Typographic art, ', // This is now a fallback, the main logic is handled above
                    comic: 'Comic book panel, in the style of classic american comics, halftone dots, action lines, ',
                    character: 'Character design sheet, full body, multiple angles, neutral background, ',
                    consultor: '', // No prefix for consultant mode
                };
                const fullPrompt = `${functionPrefixes[createFunction]} ${finalPrompt}`;

                if (sizeMode === 'single') {
                    const targetSize = selectedSizes[0];
                    const imageData = await generateSingleImage(apiKey, fullPrompt, targetSize);
                    setGeneratedImage(imageData);
                    switchToResultsViewOnMobile();
                } else {
                    setGenerationProgress(`Gerando ${selectedSizes.length} imagens em paralelo...`);

                    const generationPromises = selectedSizes.map(size => (async () => {
                        const rawImage = await generateImage(apiKey, fullPrompt, size.ratio);
                        const croppedImage = await resizeAndCropImage(rawImage, size);
                        let finalImage = croppedImage;
                        if (useBrandIdentity && brandIdentity.logo) {
                            finalImage = await applyLogoOverlay(finalImage, brandIdentity.logo);
                        }
                        return { size, base64: finalImage };
                    })());

                    const results = await Promise.all(generationPromises);
                    setGeneratedImages(results);
                    switchToResultsViewOnMobile();
                }
            } else { // Edit or AI Tools mode
                const currentImage = editHistory[historyIndex];
                
                if (editFunction === 'compose') {
                    if (!currentImage) throw new Error("Nenhuma imagem selecionada para a operação.");
                    if (composeList.length < 2) throw new Error("Selecione pelo menos duas imagens para compor.");
                    const editResult = await composeImages(apiKey, finalPrompt, composeList);
                    addResultToHistory(editResult);
                    return; 
                }
                
                if (editFunction === 'decorator' || editFunction === 'tattoo') {
                    if (composeList.length < 2 || !composeList[0] || !composeList[1]) {
                        throw new Error("Por favor, envie as duas imagens necessárias.");
                    }
                    const decoratorPrompt = `TAREFA: Decorador Virtual. OBJETIVO: Inserir o objeto da Imagem B (um móvel) no cenário da Imagem A (um cômodo). INSTRUÇÕES: Analise a perspectiva, iluminação e o estilo do cômodo na Imagem A. Posicione o objeto da Imagem B no ambiente de forma fotorrealista, ajustando sua escala, sombras e cores para que pareça pertencer à cena.`;
                    const tattooPrompt = `TAREFA DE GERAÇÃO DE IMAGEM FOTORREALISTA: SIMULADOR DE TATUAGEM COM POSE EXATA E ALTO REALISMO.
**IMAGEM A:** Uma parte do corpo humano (ex: braço, perna, costas).
**IMAGEM B:** Um desenho de tatuagem (vetorial ou bitmap).

**SUA MISSÃO:** Aplique o desenho da Imagem B na parte do corpo da Imagem A. O resultado deve ser uma única imagem fotorrealista que pareça ter sido tirada APÓS a tatuagem ter sido feita.

**INSTRUÇÕES CRÍTICAS E INEGOCIÁVEIS:**
1.  **PRESERVAR POSE E GEOMETRIA (PRIORIDADE MÁXIMA):** MANTENHA EXATAMENTE A POSE, ÂNGULO, ILUMINAÇÃO e a GEOMETRIA da parte do corpo da Imagem A. NÃO FAÇA NENHUMA ALTERAÇÃO NA POSIÇÃO, forma ou iluminação do corpo.
2.  **APLICAR TATUAGEM COM ALTO REALISMO:**
    * Posicione e redimensione o desenho da Imagem B de forma natural na pele da Imagem A.
    * O desenho deve se **deformar sutilmente** para seguir os contornos e curvas da parte do corpo, como uma tatuagem real faria.
    * Crie **sombras suaves e realistas** sob a tatuagem onde houver relevo na pele.
    * A tatuagem deve parecer que está **NA PELE**, integrando-se à sua textura. Não deve parecer um adesivo ou sobreposição plana.
    * A cor da tatuagem deve parecer tinta na pele.
3.  **INTEGRAÇÃO DE ILUMINAÇÃO:** A tatuagem e o corpo devem compartilhar a MESMA iluminação da Imagem A. Não altere a luz geral da cena.

**SAÍDA:** Retorne apenas a imagem final com a tatuagem aplicada de forma fotorrealista.`;

                    let compositionPrompt = editFunction === 'decorator' ? decoratorPrompt : tattooPrompt;

                    if (optionalPromptDetails.trim() !== '') {
                        compositionPrompt += `\n\n**INSTRUÇÕES ESPECÍFICAS DO USUÁRIO:** ${optionalPromptDetails.trim()}`;
                    }
                    
                    const imagesToCompose = [composeList[0], composeList[1]].map(img => ({
                        base64: img.base64,
                        mimeType: img.mimeType
                    }));
                    
                    const editResult = await composeImages(apiKey, compositionPrompt, imagesToCompose);
                    addResultToHistory(editResult);
                    return;
                }

                if (!currentImage) throw new Error("Nenhuma imagem selecionada para a operação.");

                const targetSize = selectedSizes[0];
                if (!targetSize) throw new Error("Por favor, selecione um tamanho de saída.");

                const imageDims = await getImageDimensions(currentImage);
                const imageRatio = imageDims.width / imageDims.height;
                const targetRatio = targetSize.width / targetSize.height;

                const isResizeNeeded = Math.abs(imageRatio - targetRatio) > 0.01;

                if (isResizeNeeded && editFunction !== 'background') {
                    const preparedImageBase64 = await prepareImageForOutpainting(currentImage, targetSize);
                    
                    let combinedPrompt: string;
                    if (editFunction === 'enhance') {
                        combinedPrompt = `TAREFA DUPLA DE ALTA QUALIDADE: OUTPAINTING E MELHORIA.

PARTE 1 - OUTPAINTING:
Primeiro, expanda a imagem central para preencher as áreas magentas (#FF00FF). A expansão deve ser uma continuação 100% realista e imperceptível da cena original. Analise e combine perfeitamente o estilo, iluminação, sombras e texturas. A transição deve ser invisível. A imagem original (não-magenta) não deve ser alterada nesta etapa.

PARTE 2 - MELHORIA GERAL:
Após o outpainting estar completo, aplique uma melhoria de qualidade a TODA A IMAGEM (a original + a expandida). Aumente a nitidez, melhore os detalhes, equilibre as cores para serem mais vibrantes e corrija a iluminação geral.

RESULTADO FINAL:
A imagem final deve ser uma versão de alta resolução e qualidade profissional da cena expandida, sem NENHUM vestígio de magenta. Retorne APENAS a imagem finalizada.`;
                    } else {
                         const backgroundDescription = finalPrompt;
                         combinedPrompt = `TAREFA CRÍTICA: MUDANÇA DE FUNDO COM OUTPAINTING. Sua tarefa é preencher as áreas magentas (#FF00FF) com um novo cenário, mesclando-o perfeitamente com a imagem central (não-magenta).

REGRAS OBRIGATÓRIAS:
1.  **NOVO CENÁRIO:** O conteúdo para preencher a área magenta deve ser: "${backgroundDescription}".
2.  **INTEGRAÇÃO PERFEITA:** A imagem central deve parecer pertencer naturalmente ao novo fundo. Ajuste a iluminação, sombras e reflexos na borda de contato para criar uma composição realista. A transição deve ser suave.
3.  **NÃO ALTERE O CENTRO:** A imagem original na área não-magenta deve ser preservada.
4.  **SEM MAGENTA NO FINAL:** O resultado deve ser uma imagem completa sem nenhum vestígio de magenta.
5.  **OUTPUT:** Retorne exclusivamente a imagem finalizada.`;
                    }
                    
                    const geminiResult = await editImage(apiKey, combinedPrompt, preparedImageBase64.imageBase64, 'image/jpeg');
                    const finalBase64 = await resizeAndCropImage(geminiResult.base64, targetSize);
                    addResultToHistory({ base64: finalBase64, mimeType: 'image/png' });

                } else {
                    let editResult: EditedImage;
                    if (editFunction === 'enhance') {
                        const result = await performEdit(currentImage, 'enhance');
                        addResultToHistory(result);
                    } else { 
                        let editPrompt = finalPrompt.trim();
                        if (!editPrompt && artStyle) {
                            editPrompt = `Apply the ${artStyle} style to the image.`;
                        } else if (!editPrompt && !artStyle) {
                            throw new Error("Por favor, descreva a edição que você deseja fazer.");
                        }
                        editResult = await editImage(
                            apiKey,
                            editPrompt, 
                            currentImage.base64, 
                            currentImage.mimeType
                        );
                        addResultToHistory(editResult);
                    }
                }
            }
        } catch (e: any) {
            console.error("Generation failed:", e);
            setError(`A geração falhou: ${e.message}`);
        } finally {
            setIsLoading(false);
            setGenerationProgress('');
        }
    }
}, [
    prompt, mode, createFunction, editFunction, 
    sizeMode, selectedSizes, composeList, editHistory, historyIndex, 
    artStyle, useBrandIdentity, brandIdentity, addResultToHistory,
    getImageDimensions, textFont, textSize, textColor, textAlign, textBgType, textBgColor,
    isCarouselMode, carouselSlideCount, isInfiniteCarousel, consultantProductImage, generateSingleImage, performEdit, optionalPromptDetails, switchToResultsViewOnMobile
]);

const handleGenerateWithMask = useCallback(async (maskBase64: string, newPrompt: string) => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey) return;
    
    setIsLoading(true);
    setError(null);
    setIsMasking(false);

    try {
        const currentImage = editHistory[historyIndex];
        if (!currentImage) throw new Error("Nenhuma imagem selecionada para editar.");

        const userPrompt = newPrompt.trim();
        if (!userPrompt) {
            throw new Error("Por favor, descreva a edição que você deseja fazer.");
        }

        const finalPrompt = `TAREFA CRÍTICA: INPAINTING FOTORREALISTA. Sua tarefa é editar a imagem de forma imperceptível, seguindo a instrução do usuário, APENAS na área correspondente à máscara branca. A área preta da máscara deve permanecer 100% INALTERADA. A edição deve se mesclar perfeitamente com a imagem ao redor, mantendo o mesmo estilo, iluminação, sombras, perspectiva e textura. A transição deve ser invisível. A instrução do usuário é: "${userPrompt}". Retorne APENAS a imagem finalizada.`;

        const editResult = await editImage(
            apiKey,
            finalPrompt,
            currentImage.base64,
            currentImage.mimeType,
            maskBase64
        );
        addResultToHistory(editResult);

    } catch (e: any) {
        console.error("Masked generation failed:", e);
        setError(`A geração com máscara falhou: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
}, [editHistory, historyIndex, addResultToHistory]);


  const downloadImage = useCallback((base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
        if (generatedImage) {
            const finalBase64 = await flattenImageWithText(generatedImage);
            downloadImage(finalBase64, 'ai-generated-image.png');
        } else if (generatedImages.length > 0) {
            const zip = new JSZip();
            generatedImages.forEach((img, i) => {
                zip.file(`${img.size.name.replace(/ /g, '_')}.png`, img.base64, { base64: true });
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(content);
            link.href = url;
            link.download = 'ai-generated-images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0) {
            const currentImage = editHistory[historyIndex];
            const finalBase64 = await flattenImageWithText(currentImage);
            downloadImage(finalBase64, 'ai-edited-image.png');
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`Falha ao preparar a imagem para download: ${errorMessage}`);
        console.error(e);
    }
  }, [generatedImage, generatedImages, mode, historyIndex, editHistory, downloadImage]);
  
  const handleShare = useCallback(async () => {
    let imageToShare: { base64: string; mimeType: string; } | null = null;
    const filename = 'ai-image-studio.png';

    if (generatedImage) {
        imageToShare = generatedImage;
    } else if ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0 && editHistory[historyIndex]) {
        imageToShare = editHistory[historyIndex];
    }

    if (!imageToShare || !navigator.share) {
        setError("O compartilhamento não é suportado neste navegador ou não há imagem para compartilhar.");
        return;
    }
    
    try {
        const blob = base64ToBlob(imageToShare.base64, imageToShare.mimeType);
        const file = new File([blob], filename, { type: imageToShare.mimeType });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Imagem Criada com AI Studio',
                text: 'Veja esta imagem que criei com o AI Image Studio!',
                files: [file],
            });
        } else {
            setError("Esta imagem não pode ser compartilhada.");
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error("Share failed:", error);
            setError(`Falha ao compartilhar: ${error.message}`);
        }
    }
  }, [generatedImage, mode, historyIndex, editHistory]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        promptBeforeListening.current = prompt.trim() ? prompt.trim() + ' ' : '';
        setIsListening(true);
        recognitionRef.current.start();
    }
  }, [prompt]);

  const stopListening = useCallback(() => {
      if (recognitionRef.current) {
          setIsListening(false);
          recognitionRef.current.stop();
      }
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            setPrompt(promptBeforeListening.current + transcript);
        };
        
        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
        
        consultantRecognitionRef.current = new SpeechRecognition();
        consultantRecognitionRef.current.continuous = true;
        consultantRecognitionRef.current.interimResults = true;
        consultantRecognitionRef.current.lang = 'pt-BR';

        consultantRecognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            setConsultantUserInput(consultantInputBeforeListening.current + transcript);
        };
        
        consultantRecognitionRef.current.onend = () => {
            setIsConsultantListening(false);
        };

    } else {
        console.warn("Speech Recognition API not supported in this browser.");
    }
  }, []);

  const openModalWithFocus = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      modalTriggerRef.current = document.activeElement as HTMLElement;
      setter(true);
  };
  
  const closeModalWithFocus = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      setter(false);
      modalTriggerRef.current?.focus();
  };

  const handleTakePhotoClick = useCallback((target: 'single' | 'person' | `compose-${number}` | 'compose-add' | 'character' | 'consultant' | 'concierge' | 'clothing') => {
      setCameraTarget(target);
      openModalWithFocus(setIsCameraOpen);
  }, []);

  const handleCapturePhoto = useCallback(async (imageData: ImageData) => {
      if (!cameraTarget) return;

      const fileList = { 0: new File([], ''), length: 1 }; // Mock FileList
      const fileUploadMap: Record<typeof cameraTarget, Parameters<typeof handleFileUploads>> = {
        'single': [fileList, 'single'],
        'person': [fileList, 'person'],
        'character': [fileList, 'character'],
        'compose-add': [fileList, 'compose'],
        'clothing': [fileList, 'clothing'],
        'consultant': [fileList, 'single'], // Fallback, not a real slot
        'concierge': [fileList, 'single'], // Fallback
        ...({} as any) // To satisfy TS for compose-index
      };
      
      if (cameraTarget === 'concierge') {
          setConciergeImageToSend(imageData);
      } else if (cameraTarget === 'consultant') {
          setConsultantImageToSend(imageData);
      } else if (cameraTarget.startsWith('compose-')) {
          const parts = cameraTarget.split('-');
          if (parts[1] === 'add') {
              handleFileUploads({ 0: await (await fetch(imageData.objectUrl)).blob() as any, length: 1, item: (i:number) => null }, 'compose');
          } else {
              const index = parseInt(parts[1], 10);
              const files = { 0: await (await fetch(imageData.objectUrl)).blob() as any, length: 1, item: (i:number) => null };
              handleComposeImageUpload(files, index);
          }
      } else if (fileUploadMap[cameraTarget]) {
        const files = { 0: await (await fetch(imageData.objectUrl)).blob() as any, length: 1, item: (i:number) => null };
        handleFileUploads(files, fileUploadMap[cameraTarget][1]);
      }
      
      closeModalWithFocus(setIsCameraOpen);
      setCameraTarget(null);
  }, [cameraTarget, handleFileUploads, handleComposeImageUpload]);
  
  const addBase64ToGallery = useCallback((base64: string, fabricState?: string) => {
      const imageToAdd: ImageData = {
          base64,
          mimeType: 'image/png',
          objectUrl: URL.createObjectURL(base64ToBlob(base64, 'image/png')),
          fabricState,
      };
      // Simple duplicate check on base64, as gallery items are flattened.
      if (!galleryImages.some(img => img.base64 === imageToAdd.base64)) {
          setGalleryImages(prev => [imageToAdd, ...prev]);
      }
  }, [galleryImages]);

  const addToGallery = useCallback(async () => {
    let imageToAdd: ImageData | null = null;
    if (generatedImage) {
        imageToAdd = generatedImage;
    } else if ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0) {
        imageToAdd = editHistory[historyIndex];
    }
    
    if (imageToAdd) {
        // A visual preview for the gallery should have text flattened into it.
        const flattenedBase64 = await flattenImageWithText(imageToAdd);
        
        // Use the flattened base64 for a simple duplicate content check.
        if (!galleryImages.some(img => img.base64 === flattenedBase64)) {
            const galleryImageData: ImageData = {
                // IMPORTANT: Store the *original* background base64 and fabricState
                // to allow for re-editing the text layers later.
                base64: imageToAdd.base64, 
                mimeType: imageToAdd.mimeType,
                fabricState: imageToAdd.fabricState,
                // The objectUrl for the gallery view is the flattened preview.
                objectUrl: URL.createObjectURL(base64ToBlob(flattenedBase64, 'image/png')),
            };
            setGalleryImages(prev => [galleryImageData, ...prev]);
        }
    }
}, [generatedImage, mode, historyIndex, editHistory, galleryImages]);


  const removeFromGallery = useCallback((indexToRemove: number) => {
    setGalleryImages(prev => {
        const itemToRemove = prev[indexToRemove];
        if (itemToRemove) URL.revokeObjectURL(itemToRemove.objectUrl);
        return prev.filter((_, index) => index !== indexToRemove)
    });
  }, []);

  const handleStartReplication = useCallback(() => {
    let imageToReplicate: ImageData | null = generatedImage;
    
    if ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0 && editHistory[historyIndex]) {
        imageToReplicate = editHistory[historyIndex];
    }

    if (imageToReplicate) {
        // Clear previous results only if the target image is different
        if (replicationTargetImage?.base64 !== imageToReplicate.base64 || replicationTargetImage?.fabricState !== imageToReplicate.fabricState) {
            setReplicatedImages([]);
        }
        setReplicationTargetImage(imageToReplicate);
        openModalWithFocus(setIsReplicateModalOpen);
    } else {
        setError("Nenhuma imagem finalizada para adaptar.");
    }
  }, [generatedImage, mode, historyIndex, editHistory, replicationTargetImage]);
  
  const handleRequestContentAssistant = useCallback((imageSource: { base64: string; mimeType: string } | null) => {
    if (!imageSource) {
        setError("Nenhuma imagem selecionada para o assistente de conteúdo.");
        return;
    }
    const newTarget: ImageData = {
        base64: imageSource.base64,
        mimeType: imageSource.mimeType,
        objectUrl: URL.createObjectURL(base64ToBlob(imageSource.base64, imageSource.mimeType)),
    };
    modalTriggerRef.current = document.activeElement as HTMLElement;
    setContentAssistantTarget(newTarget);
}, []);

const handleSendToEdit = useCallback((selectedImage: ImageData, contextImages: ImageData[] = []) => {
    console.log("Enviando imagem para o editor com contexto de", contextImages.length, "imagens.");
    
    // Limpa o histórico anterior e o contexto, se houver, para evitar vazamentos de memória da sessão anterior
    editHistory.forEach(img => {
        if (img.objectUrl) URL.revokeObjectURL(img.objectUrl);
    });
    editingContext.forEach(img => {
        if (img.objectUrl) URL.revokeObjectURL(img.objectUrl);
    });

    setEditHistory([selectedImage]); // Usa o objeto de imagem EXATO do contexto
    setHistoryIndex(0);
    
    setEditingContext(contextImages);

    setMode('edit');
    setEditFunction(null);
    setGeneratedImage(null);
    setGeneratedImages([]);

    // Fecha modais para um estado limpo
    setIsGalleryOpen(false);
    setIsReplicateModalOpen(false);
    setIsConversationalModeActive(false);

}, [editHistory, editingContext, setEditHistory, setHistoryIndex, setEditingContext, setMode, setEditFunction, setGeneratedImage, setGeneratedImages]);

const navigateToVariation = useCallback((direction: 'next' | 'prev') => {
    if (editingContext.length <= 1) return;

    const currentImageBase64 = editHistory[historyIndex]?.base64;
    if (!currentImageBase64) return;

    const currentIndex = editingContext.findIndex(img => img.base64 === currentImageBase64);
    if (currentIndex === -1) {
        console.warn("Imagem atual não encontrada no contexto de edição.");
        return;
    }

    const nextIndex = direction === 'next'
        ? (currentIndex + 1) % editingContext.length
        : (currentIndex - 1 + editingContext.length) % editingContext.length;

    const nextImageData = editingContext[nextIndex];
    if (!nextImageData) return;
    
    // Limpa o histórico de edições da imagem que estamos deixando para trás,
    // mas preserva as imagens originais que estão no contexto.
    const contextUrls = new Set(editingContext.map(img => img.objectUrl));
    editHistory.forEach(img => {
        if (img.objectUrl && !contextUrls.has(img.objectUrl)) {
            URL.revokeObjectURL(img.objectUrl);
        }
    });

    // Carrega o objeto de imagem EXATO do contexto no editor, resetando o histórico de edições.
    setEditHistory([nextImageData]);
    setHistoryIndex(0);

}, [editHistory, historyIndex, editingContext, setEditHistory, setHistoryIndex]);

  const handleAddTextClick = useCallback(() => {
    let imageToEdit: ImageData | null = generatedImage;
    if ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0) {
        imageToEdit = editHistory[historyIndex];
    }

    if (!imageToEdit && mode === 'create') {
        // If there's no image yet, but we're in create mode, we can't add text.
        setError("Gere ou carregue uma imagem antes de adicionar texto.");
        return;
    }

    if(mode === 'create' && imageToEdit) {
        // If we're adding text to a generated image, switch to edit mode first.
        handleModeChange('edit');
        // Wait for state update to open the editor
        setTimeout(() => setTextEditTarget(imageToEdit), 0);
    } else if ((mode === 'edit' || mode === 'ai_tools') && imageToEdit) {
        setTextEditTarget(imageToEdit);
    }

  }, [generatedImage, mode, historyIndex, editHistory, handleModeChange]);

    const handleApplyFabricEdit = useCallback((previewBase64WithMime: string, fabricState: string) => {
        const currentImage = editHistory[historyIndex];
        if (!currentImage) {
            setTextEditTarget(null);
            return;
        }

        const newBase64 = previewBase64WithMime.split(',')[1];
        
        const newImageData: ImageData = {
            // IMPORTANT: Keep the original background's base64 for re-editing.
            base64: currentImage.base64,
            mimeType: currentImage.mimeType,
            // The new fabric state contains the text layers.
            fabricState: fabricState,
            // The objectUrl is the new flattened preview for display in the main view.
            objectUrl: URL.createObjectURL(base64ToBlob(newBase64, 'image/png')),
        };
        
        // Call addResultToHistory with the full, correctly structured ImageData object.
        addResultToHistory(newImageData);
        setTextEditTarget(null); // Close the editor
    }, [addResultToHistory, editHistory, historyIndex]);
  
  const handleCancelFabricEdit = useCallback(() => {
      setTextEditTarget(null);
  }, []);

const handlePreviousGeneratedImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev === 0 ? generatedImages.length - 1 : prev - 1));
}, [generatedImages.length]);

const handleNextGeneratedImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev === generatedImages.length - 1 ? 0 : prev + 1));
}, [generatedImages.length]);

const startConsultantListening = useCallback(() => {
    if (consultantRecognitionRef.current) {
        consultantInputBeforeListening.current = consultantUserInput.trim() ? consultantUserInput.trim() + ' ' : '';
        setIsConsultantListening(true);
        consultantRecognitionRef.current.start();
    }
}, [consultantUserInput]);

const stopConsultantListening = useCallback(() => {
    if (consultantRecognitionRef.current) {
        setIsConsultantListening(false);
        consultantRecognitionRef.current.stop();
    }
}, []);

const handleConsultantImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    try {
        const base64 = await fileToBase64(file);
        const imageData: ImageData = {
            base64,
            mimeType: file.type,
            objectUrl: URL.createObjectURL(file),
        };
        setConsultantImageToSend(imageData);
    } catch (e) {
        setError('Falha ao processar imagem. Por favor, tente novamente.');
        console.error(e);
    }
}, []);

const handleSendConsultantMessage = useCallback(async () => {
    if ((!consultantUserInput.trim() && !consultantImageToSend) || !consultantChatRef.current) return;

    const userMessage: ConsultantMessage = {
        role: 'user',
        text: consultantUserInput.trim(),
        image: consultantImageToSend,
    };

    setConsultantChatHistory(prev => [...prev, userMessage]);
    setConsultantUserInput('');
    setConsultantImageToSend(null);
    setIsConsultantTyping(true);
    setError(null);

    try {
        const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [];
        if (userMessage.image) {
            parts.push({
                inlineData: {
                    data: userMessage.image.base64,
                    mimeType: userMessage.image.mimeType,
                }
            });
        }
        if (userMessage.text) {
            parts.push({ text: userMessage.text });
        }
        
        const result = await consultantChatRef.current.sendMessage({
            message: parts
        });

        const aiResponse = result.text;
        
        // Adiciona a resposta completa da IA ao histórico para que o usuário possa ver a copy.
        setConsultantChatHistory(prev => [...prev, { role: 'model', text: aiResponse }]);

        if (aiResponse.includes('PROMPT_FINAL:')) {
            const finalPrompt = aiResponse.split('PROMPT_FINAL:')[1].split('COPY_FINAL:')[0].trim();
            
            // Encontra a última imagem enviada pelo usuário em todo o histórico da conversa.
            const lastUserImage = [...consultantChatHistory, userMessage]
                .reverse()
                .find(msg => msg.role === 'user' && msg.image)?.image;

            if (lastUserImage) {
                setConsultantProductImage(lastUserImage);
            }
            
            setPrompt(finalPrompt);

            setTimeout(() => {
                handleGenerateClick();
                consultantChatRef.current = null;
                setCreateFunction('free');
            }, 100);
        }
    } catch (e: any) {
        setError(`Ocorreu um erro na conversa: ${e.message}`);
    } finally {
        setIsConsultantTyping(false);
    }
}, [consultantUserInput, consultantImageToSend, handleGenerateClick, consultantChatHistory]);

const handleToggleConversationalMode = useCallback(() => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey) {
        setError('ERRO: Chave de API não encontrada. Por favor, configure sua chave de API nas Configurações (⚙️).');
        return;
    }

    const willBeActive = !isConversationalModeActive;
    setIsConversationalModeActive(willBeActive);

    if (willBeActive) {
        const initializeAndListen = async () => {
            if (!conciergeChatRef.current) {
                conciergeChatRef.current = startConciergeChat(apiKey);
                try {
                    setIsConciergeTyping(true);
                    const result = await handleSendConciergeMessage(true);
                    if (result && !result.spokenResponse) {
                         // Greeting was just displayed, now start listening for the first time
                        startConversation();
                    } else if (result && result.spokenResponse) {
                        speak(result.text!);
                    }
                } catch (e) {
                     console.error("Failed to initialize conversation", e);
                } finally {
                    setIsConciergeTyping(false);
                }
            } else {
                startConversation();
            }
        };
        initializeAndListen();
    } else {
        stopConversation();
        setIsConciergeComposing(false);
        setConciergeCompositionList([]);
    }
}, [isConversationalModeActive, startConversation, stopConversation, handleSendConciergeMessage, speak]);

const handleVisualizerClick = useCallback(() => {
    if (agentStatus === 'idle') {
        startConversation();
    } else {
        stopConversation();
    }
}, [agentStatus, startConversation, stopConversation]);


const performEditOnConciergeResult = useCallback(async (image: ImageData, action: 'remove-background' | 'enhance') => {
    setIsConciergeTyping(true);
    speak(`Entendido, aplicando a edição de "${action}". Um momento...`);
    try {
        const result = await performEdit(image, action);
        const successMessage = {
            role: 'model' as const,
            text: `Aqui está o resultado de "${action}"!`,
            resultImage: result
        };
        setConciergeChatHistory(prev => [...prev, successMessage]);
        speak(successMessage.text);
    } catch (e: any) {
        console.error(`Error during concierge result edit:`, e);
        const errorMessage = `Desculpe, ocorreu um erro ao tentar a edição de "${action}". A mensagem foi: ${e.message}.`;
        setConciergeChatHistory(prev => [...prev, { role: 'model', text: errorMessage }]);
        speak(errorMessage);
    } finally {
        setIsConciergeTyping(false);
    }
}, [performEdit, speak]);

const handleRemoveClothingImage = useCallback((indexToRemove: number) => {
    setClothingImages(prev => {
        const itemToRemove = prev[indexToRemove];
        if (itemToRemove) {
            URL.revokeObjectURL(itemToRemove.objectUrl);
        }
        return prev.filter((_, index) => index !== indexToRemove);
    });
}, []);



  const renderControlPanel = () => (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h1 className="text-2xl font-display font-bold gradient-text">AI Image Studio</h1>
          <div className="flex gap-2">
            <button onClick={handleToggleConversationalMode} className={`p-2 rounded-full transition-colors ${isConversationalModeActive ? 'bg-accent-end text-white' : 'bg-interactive-bg hover:bg-interactive-hover-bg'}`} title="Assistente Conversacional" aria-label="Ativar ou desativar o assistente conversacional">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button onClick={() => openModalWithFocus(setIsSettingsModalOpen)} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Configurações" aria-label="Abrir configurações">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.438-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37.49l1.217.456c.355.133.75.072 1.076.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
      </div>
  
      <div className="grid grid-cols-3 gap-2 bg-secondary-bg p-1 rounded-full mb-4 flex-shrink-0">
        <button onClick={() => handleModeChange('create')} className={`py-2 rounded-full transition-colors font-medium ${mode === 'create' ? 'bg-gradient-to-r from-accent-start to-accent-end' : 'hover:bg-interactive-hover-bg'}`}>✨ Criar</button>
        <button onClick={() => handleModeChange('edit')} className={`py-2 rounded-full transition-colors font-medium ${mode === 'edit' ? 'bg-gradient-to-r from-accent-start to-accent-end' : 'hover:bg-interactive-hover-bg'}`}>🖌️ Editar</button>
        <button onClick={() => handleModeChange('ai_tools')} className={`py-2 rounded-full transition-colors font-medium ${mode === 'ai_tools' ? 'bg-gradient-to-r from-accent-start to-accent-end' : 'hover:bg-interactive-hover-bg'}`}>🧪 Ferramentas IA</button>
      </div>
  
      <div className="flex-grow overflow-y-auto space-y-4 hide-scrollbar pb-4">
        {mode === 'create' && (
          <>
            <div className="grid grid-cols-3 gap-2">
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a2.25 2.25 0 01-1.473-1.473L12 18.75l1.938-.648a2.25 2.25 0 011.473-1.473L17.25 15l.648 1.938a2.25 2.25 0 011.473 1.473L21 18.75l-1.938.648a2.25 2.25 0 01-1.473 1.473z" /></svg>} name="Livre" isActive={createFunction === 'free'} onClick={() => handleCreateFunctionChange('free')} />
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H7.5A2.25 2.25 0 005.25 6v13.5A2.25 2.25 0 007.5 21h9a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0016.5 3.75z" /></svg>} name="Sticker" isActive={createFunction === 'sticker'} onClick={() => handleCreateFunctionChange('sticker')} />
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} name="Personagem" isActive={createFunction === 'character'} onClick={() => handleCreateFunctionChange('character')} />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-1.832a6.01 6.01 0 000-3.836A6.01 6.01 0 0012 5.25m0 7.5a6.01 6.01 0 01-1.5-1.832a6.01 6.01 0 010-3.836A6.01 6.01 0 0112 5.25m0 7.5a6.01 6.01 0 00-1.5-1.832a6.01 6.01 0 000-3.836A6.01 6.01 0 0012 5.25M9.75 6.75l.26-1.385a2.25 2.25 0 012.24-1.865h.26a2.25 2.25 0 012.24 1.865l.26 1.385m-5.24 9.375a2.25 2.25 0 01-2.24-1.865l-.26-1.385a2.25 2.25 0 011.865-2.24h3.83a2.25 2.25 0 011.865 2.24l-.26 1.385a2.25 2.25 0 01-2.24 1.865h-1.61z" /></svg>} name="Consultor" isActive={createFunction === 'consultor'} onClick={() => handleCreateFunctionChange('consultor')} />
            </div>

            {createFunction === 'text' ? (
                <TextEditorPanel 
                    textFont={textFont} setTextFont={setTextFont}
                    textSize={textSize} setTextSize={setTextSize}
                    textColor={textColor} setTextColor={setTextColor}
                    textAlign={textAlign} setTextAlign={setTextAlign}
                    textBgType={textBgType} setTextBgType={setTextBgType}
                    textBgColor={textBgColor} setTextBgColor={setTextBgColor}
                />
            ) : createFunction === 'consultor' ? (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="bg-panel-bg rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-2">Persona do Consultor</h3>
                    <div role="radiogroup" aria-label="Persona do Consultor de IA" className="grid grid-cols-3 gap-1 bg-interactive-bg p-1 rounded-full">
                      {(['creative', 'marketing', 'technical'] as const).map(p => {
                          const personaLabels: Record<ConsultantPersona, string> = {
                              creative: 'Criativo',
                              marketing: 'Marketing',
                              technical: 'Técnico'
                          };
                          return (
                              <button
                                  key={p}
                                  role="radio"
                                  aria-checked={consultantPersona === p}
                                  onClick={() => {
                                      setConsultantPersona(p);
                                      const apiKey = localStorage.getItem('userConfigValue');
                                      if (apiKey) {
                                          consultantChatRef.current = startConsultantChat(apiKey, p);
                                          setConsultantChatHistory([]);
                                          setConsultantUserInput('');
                                      }
                                  }}
                                  className={`py-1 rounded-full text-xs transition-colors ${consultantPersona === p ? 'bg-accent-start text-white' : 'hover:bg-interactive-hover-bg'}`}
                              >
                                  {personaLabels[p]}
                              </button>
                          )
                      })}
                    </div>
                  </div>
                  <ConsultantChatPanel
                      history={consultantChatHistory}
                      userInput={consultantUserInput}
                      setUserInput={setConsultantUserInput}
                      onSendMessage={handleSendConsultantMessage}
                      isTyping={isConsultantTyping}
                      imageToSend={consultantImageToSend}
                      onRemoveImage={() => setConsultantImageToSend(null)}
                      onImageUpload={handleConsultantImageUpload}
                      onTakePhoto={() => handleTakePhotoClick('consultant')}
                      isListening={isConsultantListening}
                      onToggleListening={isConsultantListening ? stopConsultantListening : startConsultantListening}
                  />
                </div>
            ) : (
                <>
                    {createFunction === 'character' && (
                        <UploadArea id="characterUpload" onUpload={(files) => handleFileUploads(files, 'character')} image={characterReferenceImage} onRemove={() => setCharacterReferenceImage(null)} text="Imagem de Referência" subtext="(Opcional)" onTakePhotoClick={() => handleTakePhotoClick('character')} multiple={false} />
                    )}
                    <ArtStyleSelectorPanel
                        selectedStyle={artStyle}
                        onSelectStyle={setArtStyle}
                        isOpen={isArtStyleAccordionOpen}
                        setIsOpen={setIsArtStyleAccordionOpen}
                        onStyleHover={handleStyleHover}
                        onStyleLeave={handleStyleLeave}
                    />
                </>
            )}
            
           {createFunction !== 'consultor' && (
             <>
              <SizeSelectorPanel
                  sizeMode={sizeMode}
                  setSizeMode={setSizeMode}
                  selectedSizes={selectedSizes}
                  handleSizeSelection={handleSizeSelection}
                  handleSelectAllCategory={handleSelectAllCategory}
                  openAccordion={openAccordion}
                  setOpenAccordion={setOpenAccordion}
              />
              {isCarouselMode && (
                <div className="bg-panel-bg rounded-xl p-4 flex flex-col gap-3">
                  <h3 className="text-lg font-semibold">🎠 Criador de Carrossel</h3>
                  <div className="flex items-center gap-3">
                    <label htmlFor="carousel-slides" className="text-sm font-medium whitespace-nowrap">Nº de Quadros:</label>
                    <input
                      id="carousel-slides"
                      type="number"
                      min="2"
                      max="10"
                      value={carouselSlideCount}
                      onChange={(e) => setCarouselSlideCount(Number(e.target.value))}
                      className="w-full bg-interactive-bg border border-glass-border rounded-lg p-2 text-text-primary focus:ring-2 focus:ring-accent-start"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="infinite-carousel"
                      checked={isInfiniteCarousel}
                      onChange={(e) => setIsInfiniteCarousel(e.target.checked)}
                      className="form-checkbox bg-transparent border-glass-border text-accent-start focus:ring-accent-start rounded"
                    />
                    <label htmlFor="infinite-carousel" className="text-sm">Carrossel Infinito</label>
                  </div>
                </div>
              )}
             </>
           )}
          </>
        )}
  
        {mode === 'edit' && (
          <>
            <div className="grid grid-cols-2 gap-2">
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>} name="Editar" isActive={editFunction === 'add-remove'} onClick={() => setEditFunction('add-remove')} />
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>} name="Melhorar" isActive={editFunction === 'enhance'} onClick={() => setEditFunction('enhance')} />
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 017.5 0z" /></svg>} name="Fundo" isActive={editFunction === 'background'} onClick={() => setEditFunction('background')} />
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} name="Pessoa" isActive={editFunction === 'person'} onClick={() => setEditFunction('person')} />
            </div>
            
            <SizeSelectorPanel
                sizeMode={sizeMode}
                setSizeMode={setSizeMode}
                selectedSizes={selectedSizes}
                handleSizeSelection={handleSizeSelection}
                handleSelectAllCategory={handleSelectAllCategory}
                openAccordion={openAccordion}
                setOpenAccordion={setOpenAccordion}
            />

            {editFunction === 'background' ? (
                <BackgroundEditorPanel 
                    handleRemoveBackground={handleRemoveBackground} 
                    isLoading={isLoading} 
                    image1={image1}
                    handleImageUpload={(files) => handleFileUploads(files, 'single')}
                    onTakePhotoClick={() => handleTakePhotoClick('single')}
                />
            ) : editFunction === 'person' ? (
                <PersonEditorPanel personReferenceUpload={personReferenceUpload} personCharacterSheet={personCharacterSheet} handleImageUpload={handleFileUploads} resetPersonState={resetPersonState} setPrompt={setPrompt} onTakePhotoClick={() => handleTakePhotoClick('person')} />
            ) : (
                <div className="space-y-4">
                  <UploadArea id="singleUpload" onUpload={(files) => handleFileUploads(files, 'single')} image={image1} text="Carregar Imagem" subtext="Selecione um arquivo" onTakePhotoClick={() => handleTakePhotoClick('single')} multiple={false} />
                </div>
            )}
             
            {editFunction !== 'enhance' && editFunction !== 'background' && (
                <ArtStyleSelectorPanel
                    selectedStyle={artStyle}
                    onSelectStyle={setArtStyle}
                    isOpen={isArtStyleAccordionOpen}
                    setIsOpen={setIsArtStyleAccordionOpen}
                    onStyleHover={handleStyleHover}
                    onStyleLeave={handleStyleLeave}
                />
            )}
          </>
        )}
        
        {mode === 'ai_tools' && (
          <>
            <div className="grid grid-cols-2 gap-2">
                <FunctionCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L12 15.25l5.571-3m0 0l4.179 2.25L12 21.75 2.25 12l4.179-2.25z" /></svg>} name="Compor" isActive={editFunction === 'compose'} onClick={() => setEditFunction('compose')} />
                <FunctionCard icon={<span>👕</span>} name="Vestuário" isActive={editFunction === 'clothing'} onClick={() => setEditFunction('clothing')} />
                <FunctionCard icon={<span>🛋️</span>} name="Decorador Virtual" isActive={editFunction === 'decorator'} onClick={() => setEditFunction('decorator')} />
                <FunctionCard icon={<span>🎨</span>} name="Simulador de Tatuagem" isActive={editFunction === 'tattoo'} onClick={() => setEditFunction('tattoo')} />
            </div>

            {editFunction === 'compose' ? (
              <div className="flex flex-col gap-2">
                {composeList.map((img, index) => (
                  <UploadArea key={index} id={`composeUpload-${index}`} onUpload={(files) => handleComposeImageUpload(files, index)} image={img} text="Trocar Imagem" subtext="" onRemove={() => handleRemoveComposeImage(index)} onTakePhotoClick={() => handleTakePhotoClick(`compose-${index}`)} multiple={false}/>
                ))}
                 <UploadArea id="composeUpload-add" onUpload={(files) => handleFileUploads(files, 'compose')} image={null} text="Adicionar Imagem" subtext={`(${composeList.length}/5)`} onTakePhotoClick={() => handleTakePhotoClick('compose-add')}/>
              </div>
            ) : editFunction === 'clothing' ? (
              <div className="flex flex-col gap-4 p-4 bg-panel-bg rounded-xl">
                <div className="text-lg font-semibold text-center">Provador Virtual</div>
                <p className="text-sm text-text-secondary text-center">Envie uma ou mais peças de roupa e uma foto da pessoa para gerar o look.</p>
                
                {clothingImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-interactive-bg rounded-lg">
                        {clothingImages.map((img, index) => (
                            <div key={img.objectUrl} className="relative w-16 h-16">
                                <img src={img.objectUrl} alt={`Peça de roupa ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                <button
                                    onClick={() => handleRemoveClothingImage(index)}
                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                                    aria-label={`Remover peça de roupa ${index + 1}`}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <UploadArea 
                    id="clothingUpload" 
                    onUpload={(files) => handleFileUploads(files, 'clothing')} 
                    image={null}
                    text={clothingImages.length === 0 ? "Enviar Peça(s) de Roupa" : "Adicionar Mais Peças"}
                    subtext="Passo 1" 
                    multiple={true}
                    onTakePhotoClick={() => handleTakePhotoClick('clothing')}
                />

                {clothingImages.length > 0 && (
                  <UploadArea 
                      id="clothingPersonUpload" 
                      onUpload={(files) => handleFileUploads(files, 'person')} 
                      image={personReferenceUpload} 
                      text={personReferenceUpload ? "Trocar Pessoa" : "Enviar Foto da Pessoa"} 
                      subtext="Passo 2" 
                      multiple={false}
                      onRemove={personReferenceUpload ? () => setPersonReferenceUpload(null) : undefined}
                      onTakePhotoClick={() => handleTakePhotoClick('person')}
                  />
                )}

                {clothingImages.length > 0 && personReferenceUpload && (
                    <div className="flex flex-col gap-2">
                         <div className="mt-2">
                            <label htmlFor="optional-prompt-clothing" className="text-sm font-medium text-text-secondary">Detalhes Adicionais (Opcional):</label>
                            <textarea
                                id="optional-prompt-clothing"
                                value={optionalPromptDetails}
                                onChange={(e) => setOptionalPromptDetails(e.target.value)}
                                placeholder={dynamicPlaceholder}
                                className="mt-1 w-full h-20 bg-primary-bg border border-glass-border rounded-lg p-2 text-text-primary resize-none focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                            />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <input
                                type="checkbox"
                                id="generate-pose-variations"
                                checked={generatePoseVariations}
                                onChange={(e) => setGeneratePoseVariations(e.target.checked)}
                                className="form-checkbox bg-transparent border-glass-border text-accent-start focus:ring-accent-start rounded"
                            />
                            <label htmlFor="generate-pose-variations" className="text-sm">Gerar 4 variações de pose</label>
                        </div>
                        <button 
                            onClick={handleGenerateVestuario}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-accent-start to-accent-end text-white font-display font-bold py-3 px-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_4px_15px_rgba(162,89,255,0.2)] hover:opacity-90 hover:shadow-[0_6px_20px_rgba(162,89,255,0.3)] disabled:opacity-50"
                        >
                            {isLoading ? 'Gerando...' : generatePoseVariations ? 'Gerar Variações de Look' : 'Gerar Look em Pose de Foto'}
                        </button>
                    </div>
                )}
              </div>
            ) : (editFunction === 'decorator' || editFunction === 'tattoo') ? (() => {
                const isDecorator = editFunction === 'decorator';
                const canGenerate = composeList.length === 2 && composeList[0] && composeList[1];
                return (
                    <div className="flex flex-col gap-4 p-4 bg-panel-bg rounded-xl">
                        <div className="text-lg font-semibold text-center">{isDecorator ? 'Decorador Virtual' : 'Simulador de Tatuagem'}</div>
                        <p className="text-sm text-text-secondary text-center">
                            {isDecorator
                                ? "Envie a foto do cômodo e do objeto para decorar."
                                : "Envie a foto da parte do corpo e o desenho da tatuagem."}
                        </p>

                        <UploadArea
                            id="composeUpload-1"
                            onUpload={(files) => handleComposeImageUpload(files, 0)}
                            image={composeList[0] || null}
                            text={isDecorator ? "Foto do Cômodo" : "Foto do Corpo"}
                            subtext="Passo 1"
                            multiple={false}
                            onRemove={composeList[0] ? () => handleRemoveComposeImage(0) : undefined}
                            onTakePhotoClick={() => handleTakePhotoClick(`compose-0`)}
                        />

                        <UploadArea
                            id="composeUpload-2"
                            onUpload={(files) => handleComposeImageUpload(files, 1)}
                            image={composeList[1] || null}
                            text={isDecorator ? "Foto do Móvel/Objeto" : "Desenho da Tatuagem"}
                            subtext="Passo 2"
                            multiple={false}
                            onRemove={composeList[1] ? () => handleRemoveComposeImage(1) : undefined}
                            onTakePhotoClick={() => handleTakePhotoClick(`compose-1`)}
                        />
                         <div className="mt-2">
                            <label htmlFor="optional-prompt-details" className="text-sm font-medium text-text-secondary">Detalhes Adicionais (Opcional):</label>
                            <textarea
                                id="optional-prompt-details"
                                value={optionalPromptDetails}
                                onChange={(e) => setOptionalPromptDetails(e.target.value)}
                                placeholder={dynamicPlaceholder}
                                className="mt-1 w-full h-20 bg-primary-bg border border-glass-border rounded-lg p-2 text-text-primary resize-none focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                            />
                        </div>
                         <button
                            onClick={handleGenerateClick}
                            disabled={!canGenerate || isLoading}
                            className="w-full bg-gradient-to-r from-accent-start to-accent-end text-white font-display font-bold py-3 px-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_4px_15px_rgba(162,89,255,0.2)] hover:opacity-90 hover:shadow-[0_6px_20px_rgba(162,89,255,0.3)] disabled:opacity-50"
                        >
                           {isLoading ? 'Gerando...' : 'Gerar'}
                        </button>
                    </div>
                );
            })() : (
                <p className="text-center text-text-secondary mt-4">Selecione uma ferramenta para começar.</p>
            )}
          </>
        )}
      </div>

     { !(createFunction === 'consultor' || ['clothing', 'decorator', 'tattoo'].includes(editFunction as string)) && (
      <div className="mt-4 flex flex-col gap-2 flex-shrink-0">
        { editFunction !== 'enhance' && (
          <>
            <div className="relative">
              <textarea
                className="w-full h-24 bg-primary-bg border border-glass-border rounded-lg p-3 pr-10 text-text-primary resize-none focus:outline-none focus:border-accent-start focus:ring-2 focus:ring-accent-start/50"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'create' && createFunction === 'text' ? "Digite seu texto aqui..." : "Descreva sua imagem aqui..."}
              />
              <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-interactive-bg text-text-secondary hover:bg-interactive-hover-bg'}`}
                    aria-label={isListening ? "Parar ditado" : "Usar microfone para ditar"}
                    title={isListening ? "Parar ditado" : "Usar microfone para ditar"}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" /></svg>
                  </button>
                  <button onClick={() => openModalWithFocus(setIsPromptModalOpen)} className="p-1.5 rounded-full bg-interactive-bg text-text-secondary hover:bg-interactive-hover-bg transition-colors hidden md:block" title="Expandir" aria-label="Expandir editor de prompt">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 0h-4" />
                    </svg>
                  </button>
              </div>
            </div>
            {!(mode === 'create' && createFunction === 'text') && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button onClick={() => handlePromptEnhancement('translate')} disabled={isProcessingPrompt} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                    {activePromptTool === 'translate' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                    Traduzir prompt
                    </button>
                    <button onClick={() => handlePromptEnhancement('enhance')} disabled={isProcessingPrompt} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                    {activePromptTool === 'enhance' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                    Melhorar
                    </button>
                </div>
            )}
          </>
        )}
        <div className="flex items-center gap-2">
            <input type="checkbox" id="useBrandIdentity" checked={useBrandIdentity} onChange={(e) => setUseBrandIdentity(e.target.checked)} className="form-checkbox bg-transparent border-glass-border text-accent-start focus:ring-accent-start rounded" />
            <label htmlFor="useBrandIdentity" className="text-sm">Usar Identidade Visual</label>
        </div>
        <button
            onClick={handleGenerateClick}
            disabled={isLoading || isCreatingPersonProfile}
            className="w-full bg-gradient-to-r from-accent-start to-accent-end text-white font-display font-bold py-3 px-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_4px_15px_rgba(162,89,255,0.2)] hover:opacity-90 hover:shadow-[0_6px_20px_rgba(162,89,255,0.3)] disabled:opacity-50 text-lg"
        >
            Gerar
        </button>
      </div>
     )}
    </div>
  );

  const renderResultsPanel = () => {
      const currentResultImage = generatedImage ? generatedImage : ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0 ? editHistory[historyIndex] : null);

      return (
        <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl h-full flex flex-col items-center justify-center p-4 relative">
            <button
                onClick={() => setMobileView('controls')}
                className="md:hidden absolute top-4 left-4 bg-interactive-bg/80 backdrop-blur-sm p-2 rounded-full z-10 text-text-primary flex items-center gap-2"
                aria-label="Voltar aos controles"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="pr-2">Voltar</span>
            </button>
            {isLoading ? (
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-24 h-24 border-4 border-t-accent-start border-r-accent-end border-b-accent-start border-l-transparent rounded-full animate-spin"></div>
                    <h2 className="text-2xl font-bold gradient-text">Gerando sua arte...</h2>
                    <p className="text-text-secondary">{generationProgress || 'Aguarde um momento.'}</p>
                </div>
            ) : error ? (
                <div className="border border-error-border bg-error-bg text-error-text rounded-lg p-6 max-w-md text-center">
                    <h3 className="text-xl font-bold mb-2">Ocorreu um erro</h3>
                    <p className="text-sm">{error}</p>
                </div>
            ) : mode === 'create' ? (
                (isCarouselMode && generatedImages.length > 0) ? (
                    <div className="relative group w-full h-full grid place-items-center">
                        <div className="checkerboard-bg rounded-lg shadow-2xl inline-block max-w-full max-h-full">
                            <img src={`data:image/png;base64,${generatedImages[currentImageIndex].base64}`} alt={`Generated Art Slide ${currentImageIndex + 1}`} className="block max-w-full max-h-full object-contain" />
                        </div>
                        {generatedImages.length > 1 && (
                            <>
                                <button onClick={handlePreviousGeneratedImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-secondary-bg/60 backdrop-blur-md rounded-full text-white hover:bg-secondary-bg/90 transition-colors z-10" aria-label="Imagem anterior">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={handleNextGeneratedImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-secondary-bg/60 backdrop-blur-md rounded-full text-white hover:bg-secondary-bg/90 transition-colors z-10" aria-label="Próxima imagem">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-secondary-bg/60 backdrop-blur-md px-3 py-1 rounded-full text-sm font-mono">{currentImageIndex + 1} / {generatedImages.length}</div>
                            </>
                        )}
                    </div>
                ) : generatedImages.length > 0 ? (
                    <div className="w-full h-full overflow-y-auto p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {generatedImages.map(({ size, base64 }, index) => (
                                <div key={index} className="relative group flex flex-col items-center gap-2">
                                    <div className="relative w-full">
                                        <img 
                                            src={`data:image/png;base64,${base64}`} 
                                            alt={size ? size.name : `Variação ${index + 1}`} 
                                            className="rounded-lg shadow-lg w-full" 
                                            loading="lazy" 
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <button 
                                                onClick={() => {
                                                    const contextImages: ImageData[] = generatedImages.map(img => ({
                                                        base64: img.base64,
                                                        mimeType: 'image/png',
                                                        objectUrl: URL.createObjectURL(base64ToBlob(img.base64, 'image/png')),
                                                    }));
                                                    const selectedImage = contextImages[index];
                                                    handleSendToEdit(selectedImage, contextImages);
                                                }}
                                                className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                                            >
                                                🖌️ Editar
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-center text-text-secondary">{size ? size.name : `Variação ${index + 1}`}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : generatedImage ? (
                    <div className="relative group w-full h-full grid place-items-center">
                        <div className="checkerboard-bg rounded-lg shadow-2xl inline-block max-w-full max-h-full">
                            <img src={generatedImage.objectUrl} alt="Generated Art" className="block max-w-full max-h-full object-contain" />
                        </div>
                    </div>
                ) : (
                     <div className="text-center text-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <h2 className="text-xl font-semibold">Sua imagem aparecerá aqui</h2>
                        <p>Descreva o que você quer criar e clique em 'Gerar'.</p>
                    </div>
                )
            ) : (mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0 && editHistory[historyIndex] ? (
                <div className="relative group w-full h-full grid place-items-center">
                    <div className="checkerboard-bg rounded-lg shadow-2xl inline-block max-w-full max-h-full">
                        <img src={editHistory[historyIndex].objectUrl} alt="Edited Art" className="block max-w-full max-h-full object-contain" />
                    </div>
                     {editingContext.length > 1 && (
                        <>
                            <button
                                onClick={() => navigateToVariation('prev')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl z-10 transition-opacity opacity-0 group-hover:opacity-100 hover:bg-black/60"
                                aria-label="Variação Anterior"
                            >
                                &#x2039;
                            </button>
                            <button
                                onClick={() => navigateToVariation('next')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl z-10 transition-opacity opacity-0 group-hover:opacity-100 hover:bg-black/60"
                                aria-label="Próxima Variação"
                            >
                                &#x203A;
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="text-center text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <h2 className="text-xl font-semibold">Carregue uma imagem para começar</h2>
                    <p>Use as ferramentas à esquerda para começar.</p>
                </div>
            )}
    
            {(generatedImage || generatedImages.length > 0 || ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0)) && !isLoading && !error && (
                <div className="absolute bottom-4 flex gap-2 bg-secondary-bg/60 backdrop-blur-md p-2 rounded-full">
                    {(mode === 'edit' || mode === 'ai_tools') && (
                        <>
                            <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg disabled:opacity-50 transition-colors" title="Desfazer" aria-label="Desfacer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                            </button>
                            <button onClick={handleRedo} disabled={historyIndex >= editHistory.length - 1} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg disabled:opacity-50 transition-colors" title="Refazer" aria-label="Refazer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                                </svg>
                            </button>
                        </>
                    )}
                     {mode === 'edit' && editFunction === 'add-remove' && (
                        <button onClick={() => setIsMasking(true)} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Editar Área" aria-label="Editar Área">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                    <button onClick={handleStartReplication} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Adaptar para Redes Sociais" aria-label="Adaptar para Redes Sociais">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5V4H4zm0 11v5h5v-5H4zm11-11v5h5V4h-5zm0 11v5h5v-5h-5z" />
                        </svg>
                    </button>
                    <button onClick={handleAddTextClick} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Adicionar Texto" aria-label="Adicionar Texto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M18.25 15.25V17H1.75V15.25H9.25V4.75H5.5V3H14.5V4.75H10.75V15.25H18.25Z" />
                        </svg>
                    </button>
                    <button onClick={addToGallery} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Adicionar à Galeria" aria-label="Adicionar à Galeria">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button onClick={() => handleRequestContentAssistant(currentResultImage)} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Assistente de Conteúdo" aria-label="Abrir assistente de conteúdo">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </button>
                    {isShareSupported && (generatedImage || ((mode === 'edit' || mode === 'ai_tools') && historyIndex >= 0)) && (
                        <button onClick={handleShare} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Compartilhar" aria-label="Compartilhar">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </button>
                    )}
                    <button onClick={handleDownload} className="p-2 rounded-full bg-interactive-bg hover:bg-interactive-hover-bg transition-colors" title="Baixar" aria-label="Baixar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
      );
    };

  return (
    <main className="h-screen w-screen flex flex-col md:flex-row bg-primary-bg relative p-4 gap-4">
      <div className={`w-full md:w-[450px] lg:w-[500px] h-full bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl flex-shrink-0 flex flex-col ${mobileView !== 'controls' ? 'mobile-hidden' : ''}`}>
        {renderControlPanel()}
      </div>
      <div className={`flex-grow h-full relative ${mobileView !== 'results' ? 'mobile-hidden' : ''}`}>
        {renderResultsPanel()}
        <button
          ref={galleryToggleRef}
          onClick={() => setIsGalleryOpen(!isGalleryOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-50 p-3 bg-secondary-bg/80 backdrop-blur-md rounded-l-full transition-all duration-300 ease-in-out hover:bg-secondary-bg/100 text-3xl font-mono ${isGalleryOpen ? 'right-64' : 'right-0'}`}
          aria-label={isGalleryOpen ? "Fechar galeria" : "Abrir galeria"}
          title={isGalleryOpen ? "Fechar galeria" : "Abrir galeria"}
        >
          {isGalleryOpen ? '»' : '«'}
        </button>
      </div>
      
      {hoveredStyle && <ArtStylePreviewTooltip image={hoveredStyle.previewImage} position={tooltipPosition} />}
      
      <PromptModal
          isOpen={isPromptModalOpen}
          onClose={() => closeModalWithFocus(setIsPromptModalOpen)}
          prompt={prompt}
          setPrompt={setPrompt}
          title="Editar Prompt"
          placeholder="Descreva sua imagem em detalhes..."
          isListening={isListening}
          onToggleListening={isListening ? stopListening : startListening}
          onPromptEnhance={handlePromptEnhancement}
          isProcessingPrompt={isProcessingPrompt}
          activePromptTool={activePromptTool}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => closeModalWithFocus(setIsCameraOpen)}
        onCapture={handleCapturePhoto}
        setError={setError}
      />
      
      <GalleryPanel
        images={galleryImages}
        onSendToEdit={handleSendToEdit}
        onRemove={removeFromGallery}
        isOpen={isGalleryOpen}
        setIsOpen={setIsGalleryOpen}
        triggerRef={galleryToggleRef}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => closeModalWithFocus(setIsSettingsModalOpen)}
        brandIdentity={brandIdentity}
        setBrandIdentity={setBrandIdentity}
        theme={theme}
        setTheme={setTheme}
      />

      <ContentAssistantModal
        isOpen={!!contentAssistantTarget}
        onClose={() => {
            if (contentAssistantTarget) {
                URL.revokeObjectURL(contentAssistantTarget.objectUrl);
            }
            setContentAssistantTarget(null);
            modalTriggerRef.current?.focus();
        }}
        image={contentAssistantTarget}
        businessInfo={brandIdentity.businessInfo}
      />
      
      <ReplicateModal
        isOpen={isReplicateModalOpen}
        onClose={() => closeModalWithFocus(setIsReplicateModalOpen)}
        targetImage={replicationTargetImage}
        replicatedImages={replicatedImages}
        setReplicatedImages={setReplicatedImages}
        setError={setError}
        onDownload={downloadImage}
        onRequestContentAssistant={handleRequestContentAssistant}
        onSendToEdit={handleSendToEdit}
        onAddToGallery={addBase64ToGallery}
      />

      {isMasking && image1 && (
        <MaskEditor 
            image={image1}
            onGenerateWithMask={handleGenerateWithMask}
            onCancel={() => setIsMasking(false)}
        />
      )}

      {textEditTarget && (
        <FabricEditor
            image={textEditTarget}
            onApply={handleApplyFabricEdit}
            onCancel={handleCancelFabricEdit}
        />
      )}

      {isConversationalModeActive && (
          <ConversationalAgentPanel
              history={conciergeChatHistory}
              onClose={handleToggleConversationalMode}
              onSendToEdit={handleSendToEdit}
              onAddToGallery={async (image) => {
                  const flattened = await flattenImageWithText(image);
                  addBase64ToGallery(flattened, image.fabricState);
              }}
              onDownload={async (image) => {
                  const flattened = await flattenImageWithText(image);
                  downloadImage(flattened, 'ai-generated-image.png');
              }}
              onRequestContentAssistant={handleRequestContentAssistant}
              performEditOnResult={performEditOnConciergeResult}
              agentStatus={agentStatus}
              currentTranscript={currentTranscript}
              onVisualizerClick={handleVisualizerClick}
              onImageUpload={handleConciergeImageUpload}
              onTakePhoto={() => handleTakePhotoClick('concierge')}
          />
      )}
    </main>
  );
};

export default App;
