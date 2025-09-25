import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ImageData, Size } from '../../types';
import JSZip from 'jszip';
import { describeImage, editImage } from '../../services/geminiService';
import { prepareImageForOutpainting, resizeAndCropImage, flattenImageWithText, transformFabricState } from '../../utils';
import { SIZES, SOCIAL_MEDIA_CATEGORIES } from '../../constants';
import { base64ToBlob } from '../../utils';

// Declaração para Fabric.js via CDN
declare var fabric: any;

const trapFocus = (element: HTMLElement | null) => {
  if (!element) return;
  const focusableSelectors = [
    'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object', 'embed',
    '[tabindex="0"]', '[contenteditable]'
  ].join(',');
  const focusables = [...element.querySelectorAll<HTMLElement>(focusableSelectors)];
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  function handle(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }
  element.addEventListener('keydown', handle);
  return () => element.removeEventListener('keydown', handle);
};

// Componente principal do Modal
const ReplicateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetImage: ImageData | null;
  replicatedImages: { size: Size; image: ImageData; previewUrl: string }[];
  setReplicatedImages: React.Dispatch<React.SetStateAction<{ size: Size; image: ImageData; previewUrl: string }[]>>;
  setError: (error: string | null) => void;
  onDownload: (base64: string, filename: string) => void;
  onRequestContentAssistant: (imageSource: { base64: string, mimeType: string }) => void;
  onSendToEdit: (imageData: ImageData) => void;
  onAddToGallery: (base64: string, fabricState?: string) => void;
}> = ({
  isOpen, onClose, targetImage, replicatedImages, setReplicatedImages, setError,
  onDownload, onRequestContentAssistant, onSendToEdit, onAddToGallery
}) => {
  const [selectedSizes, setSelectedSizes] = useState<Size[]>([]);
  const [isReplicating, setIsReplicating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>('Instagram');
  const [isZipping, setIsZipping] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to hold the latest replicatedImages to prevent stale closures in cleanup effects.
  const replicatedImagesRef = useRef(replicatedImages);
  replicatedImagesRef.current = replicatedImages;


  const generateDescriptiveFilename = (size: Size) => {
    const sanitizedName = size.name.toLowerCase()
      .replace(/\s*\(.*\)\s*/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, '_');
    return `${sanitizedName}_${size.width}x${size.height}.png`;
  };

  useEffect(() => {
    if (isOpen && modalRef.current) {
      setTimeout(() => {
        const el = modalRef.current?.querySelector('button:not(:disabled)');
        (el as HTMLElement)?.focus();
      }, 100);
      const cleanup = trapFocus(modalRef.current);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        cleanup && cleanup();
      };
    } else {
      setSelectedSizes([]);
      setIsReplicating(false);
      setProgressText('');
      setExpandedImageIndex(null);
    }
  }, [isOpen, onClose]);
  
  // This effect cleans up object URLs for previews ONLY when the component unmounts.
  // It uses a ref to get the latest list of images, preventing stale closures.
  // This fixes the bug where URLs were revoked prematurely as new images were generated.
  useEffect(() => {
    return () => {
      replicatedImagesRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, []); // Empty dependency array ensures cleanup happens only on unmount.

  useEffect(() => {
    if (expandedImageIndex !== null) {
      const cleanup = trapFocus(document.body);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setExpandedImageIndex(null);
        else if (e.key === 'ArrowRight')
          setExpandedImageIndex(prev => (prev === null || prev === replicatedImages.length - 1) ? 0 : prev + 1);
        else if (e.key === 'ArrowLeft')
          setExpandedImageIndex(prev => (prev === null || prev === 0) ? replicatedImages.length - 1 : prev - 1);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        cleanup && cleanup();
      };
    }
  }, [expandedImageIndex, replicatedImages.length]);

  const handleSizeSelection = (size: Size) => {
    setSelectedSizes(prev => {
      const isSelected = prev.some(s => s.name === size.name);
      return isSelected ? prev.filter(s => s.name !== size.name) : [...prev, size];
    });
  };

  const handleReplicate = useCallback(async () => {
    const apiKey = localStorage.getItem('userConfigValue');
    if (!apiKey) {
        setError('ERRO: Chave de API não encontrada. Por favor, configure sua chave de API nas Configurações (⚙️).');
        onClose();
        return;
    }
    if (!targetImage || selectedSizes.length === 0) return;

    setIsReplicating(true);
    setError(null);
    // Clean up old preview URLs before creating new ones
    replicatedImages.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setReplicatedImages([]);
    let sourceImageObjectUrlToRevoke: string | null = null;

    try {
        setProgressText('Preparando imagem-fonte...');

        // Helper function to get a flattened version of the source image
        const getFlattenedSourceImage = async (image: ImageData): Promise<ImageData> => {
            const flattenedBase64 = await flattenImageWithText(image);
            // Don't create a new object URL if the image was already flat
            if (flattenedBase64 === image.base64 && !image.fabricState) {
                return image;
            }
            const objectUrl = URL.createObjectURL(base64ToBlob(flattenedBase64, 'image/png'));
            return {
                base64: flattenedBase64,
                mimeType: 'image/png',
                objectUrl: objectUrl,
                fabricState: undefined, // The state is now flattened into the base64
            };
        };

        const sourceImage = await getFlattenedSourceImage(targetImage);
        if (sourceImage.objectUrl !== targetImage.objectUrl) {
            sourceImageObjectUrlToRevoke = sourceImage.objectUrl;
        }

        const getImageDimensions = (src: string): Promise<{width: number, height: number}> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => reject(new Error("Não foi possível carregar a imagem para obter as dimensões."));
                img.src = src;
            });
        };

        const sourceImageDimensions = await getImageDimensions(sourceImage.objectUrl);

        setProgressText(`Analisando conteúdo da imagem...`);
        const imageDescription = await describeImage(apiKey, sourceImage.base64, sourceImage.mimeType);
        
        // FIX: Removed the 'seed' parameter as it is not supported by the 'gemini-2.5-flash-image-preview' model.
        // This resolves the "parâmetro seed não é suportado" error.
        
        const results = [];
        for (let i = 0; i < selectedSizes.length; i++) {
            const size = selectedSizes[i];
            setProgressText(`Adaptando: ${size.name} (${i + 1}/${selectedSizes.length})...`);
            
            const transformData = await prepareImageForOutpainting(sourceImage, size);
            
            // FIX: Replaced the overly complex and aggressive prompt with a clearer, more direct one.
            // This improves the reliability of the outpainting process and reduces the chances of
            // the model failing and leaving the pink/magenta background.
            const prompt = `TAREFA: OUTPAINTING. Sua tarefa é preencher as áreas magenta (#FF00FF) desta imagem, estendendo o conteúdo existente de forma contínua e fotorrealista. A área original (não magenta) deve permanecer 100% inalterada. A transição entre o conteúdo original e o novo deve ser imperceptível, mantendo o mesmo estilo, iluminação, sombras e textura. Use esta descrição da imagem como guia para o conteúdo a ser estendido: '${imageDescription}'. Retorne apenas a imagem finalizada.`;

            const geminiResult = await editImage(
                apiKey,
                prompt,
                transformData.imageBase64,
                'image/png',
                undefined
            );
            const finalBgBase64 = await resizeAndCropImage(geminiResult.base64, size);
            
            const newFabricState = transformFabricState(targetImage.fabricState, transformData, sourceImageDimensions, size);

            const finalImageData: ImageData = {
                base64: finalBgBase64,
                mimeType: 'image/png',
                objectUrl: URL.createObjectURL(base64ToBlob(finalBgBase64, 'image/png')),
                fabricState: newFabricState,
            };
            
            const previewBase64 = await flattenImageWithText(finalImageData);
            const previewUrl = URL.createObjectURL(base64ToBlob(previewBase64, 'image/png'));
            
            const result = { size, image: finalImageData, previewUrl };
            results.push(result);
            setReplicatedImages([...results]);
        }
    } catch (e: any) {
        console.error("A replicação falhou:", e);
        setError(`A adaptação falhou: ${e.message || String(e)}`);
    } finally {
        setIsReplicating(false);
        setProgressText('');
        if (sourceImageObjectUrlToRevoke) {
            URL.revokeObjectURL(sourceImageObjectUrlToRevoke);
        }
    }
}, [targetImage, selectedSizes, setError, setReplicatedImages, onClose, replicatedImages]);

  // Download in ZIP optimized with feedback
  const handleDownloadAll = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    // Use the flattened preview base64 for zipping
    const imagePromises = replicatedImages.map(img => flattenImageWithText(img.image));
    try {
        const flattenedImages = await Promise.all(imagePromises);
        
        flattenedImages.forEach((base64, index) => {
            const imgData = replicatedImages[index];
            const filename = generateDescriptiveFilename(imgData.size);
            zip.file(filename, base64, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            setProgressText(`Compactando (${Math.round(metadata.percent)}%)...`);
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(content);
        link.href = url;
        link.download = 'adaptacoes-redes-sociais.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        setError('Falha ao gerar o arquivo ZIP.');
        console.error(e);
    } finally {
        setIsZipping(false);
        setProgressText('');
    }
  };

  // Overlay ARIA-friendly e foco automático (melhor UX)
  if (!isOpen) return null;

  const renderContent = () => {
    if (isReplicating || isZipping) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center h-full" aria-live="polite" role="status">
          <div className="w-16 h-16 border-4 border-t-accent-start border-r-accent-end border-b-accent-start border-l-transparent rounded-full animate-spin" />
          <h3 className="text-xl font-bold gradient-text">{isReplicating ? 'Adaptando Imagens...' : 'Gerando ZIP...'}</h3>
          <p className="text-text-secondary">{progressText}</p>
          {replicatedImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-grow p-1 mt-4">
              {replicatedImages.map(({ size, previewUrl }) => (
                <div key={size.name} className="flex flex-col items-center gap-2 animate-fade-in">
                  <img src={previewUrl} alt={size.name} className="rounded-lg shadow-lg w-full aspect-auto" loading="lazy" />
                  <p className="text-xs text-center text-text-secondary">{size.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (replicatedImages.length > 0) {
      return (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-grow p-1">
            {replicatedImages.map(({ size, previewUrl }, index) => (
              <div key={size.name} className="flex flex-col items-center gap-2">
                <button onClick={() => setExpandedImageIndex(index)} className="w-full p-0 border-none bg-transparent" aria-label={`Expandir imagem ${size.name}`}>
                  <img src={previewUrl} alt={size.name} className="rounded-lg shadow-lg w-full cursor-pointer transition-transform duration-200 hover:scale-105 aspect-auto" loading="lazy"/>
                </button>
                <p className="text-xs text-center text-text-secondary">{size.name}</p>
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 pt-4 flex gap-2">
            <button onClick={handleDownloadAll} className="w-full bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg" disabled={isZipping}>
              {isZipping ? 'Preparando ZIP...' : 'Baixar Todas (ZIP)'}
            </button>
            <button onClick={() => { setReplicatedImages([]); setSelectedSizes([]); }} className="bg-interactive-bg hover:bg-interactive-hover-bg text-text-primary font-bold py-3 px-4 rounded-lg">
              Gerar Novas
            </button>
          </div>
        </>
      );
    }
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow overflow-hidden">
          <div className="md:col-span-1 flex flex-col items-center gap-2">
            <p className="font-semibold text-text-secondary">Imagem Original</p>
            <img src={targetImage?.objectUrl} alt="Imagem para adaptar" className="rounded-lg w-full max-w-xs shadow-lg" loading="lazy" />
          </div>
          <div className="md:col-span-2 flex flex-col overflow-hidden">
            <p className="font-semibold text-text-secondary mb-2 flex-shrink-0">Selecione os formatos desejados</p>
            <div className="overflow-y-auto pr-2 space-y-2 flex-grow">
              {Object.entries(SIZES)
                .filter(([category]) => SOCIAL_MEDIA_CATEGORIES.includes(category))
                .map(([category, sizes]) => (
                  <div key={category} className="bg-panel-bg rounded-xl">
                    <button onClick={() => setOpenAccordion(openAccordion === category ? null : category)} className="w-full text-left p-3 font-medium flex justify-between items-center hover:bg-interactive-hover-bg rounded-xl" aria-expanded={openAccordion === category}>
                      <span>{category}</span>
                      <span className={`transform transition-transform ${openAccordion === category ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
                    </button>
                    {openAccordion === category && (
                      <div className="p-3 border-t border-glass-border flex flex-col gap-2">
                        {sizes.map(size => (
                          <label key={size.name} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-interactive-hover-bg rounded-md">
                            <input
                              type="checkbox"
                              checked={selectedSizes.some(s => s.name === size.name)}
                              onChange={() => handleSizeSelection(size)}
                              className="form-checkbox bg-transparent border-glass-border text-accent-start focus:ring-accent-start rounded h-5 w-5"
                            />
                            <span className="text-sm">{size.name} <span className="text-text-secondary">({size.width}x{size.height}px)</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 pt-4">
          <button
            onClick={handleReplicate}
            disabled={selectedSizes.length === 0 || isReplicating}
            className="w-full bg-gradient-to-r from-accent-start to-accent-end hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg"
          >
            Adaptar {selectedSizes.length > 0 ? `(${selectedSizes.length})` : ''}
          </button>
        </div>
      </>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="replicate-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-secondary-bg/95 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl p-6 w-full max-w-4xl flex flex-col gap-4 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
        role="document"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center flex-shrink-0">
          <h2 id="replicate-modal-title" className="text-2xl font-bold gradient-text">📲 Adaptar para Redes Sociais</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-3xl leading-none" aria-label="Fechar modal" tabIndex={0}>&times;</button>
        </div>
        {renderContent()}
      </div>
      {expandedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in"
          onClick={() => setExpandedImageIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={e => { e.stopPropagation(); setExpandedImageIndex(null); }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-5xl leading-none z-[70] transition-transform hover:scale-110"
            aria-label="Fechar imagem expandida"
            tabIndex={0}
          >&times;</button>
          {replicatedImages.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setExpandedImageIndex(prev => prev === 0 ? replicatedImages.length - 1 : prev! - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl z-[70] transition-colors"
                aria-label="Imagem anterior"
                tabIndex={0}
              >&#x2039;</button>
              <button
                onClick={e => { e.stopPropagation(); setExpandedImageIndex(prev => prev === replicatedImages.length - 1 ? 0 : prev! + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl z-[70] transition-colors"
                aria-label="Próxima imagem"
                tabIndex={0}
              >&#x203A;</button>
            </>
          )}

          <img
            src={replicatedImages[expandedImageIndex].previewUrl}
            alt={`Visualização expandida de ${replicatedImages[expandedImageIndex].size.name}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
            tabIndex={0}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md p-2 rounded-full flex items-center gap-2 z-[70]">
            <button
              onClick={async e => {
                e.stopPropagation();
                const img = replicatedImages[expandedImageIndex];
                const filename = generateDescriptiveFilename(img.size);
                const base64ToDownload = await flattenImageWithText(img.image);
                onDownload(base64ToDownload, filename);
              }}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors px-3 py-2"
              title="Baixar Imagem"
              tabIndex={0}
            >
              <span>⬇️</span> <span>Baixar</span>
            </button>
            <div className="w-px h-6 bg-white/30"></div>
            <button
              onClick={async e => {
                e.stopPropagation();
                const img = replicatedImages[expandedImageIndex];
                const base64ToAssist = await flattenImageWithText(img.image);
                onRequestContentAssistant({ base64: base64ToAssist, mimeType: 'image/png' });
                onClose();
              }}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors px-3 py-2"
              title="Gerar Legenda e Hashtags"
              tabIndex={0}
            >
              <span>🤖</span> <span>Assistente</span>
            </button>
            <div className="w-px h-6 bg-white/30"></div>
            <button
              onClick={e => {
                e.stopPropagation();
                const img = replicatedImages[expandedImageIndex];
                onSendToEdit(img.image);
                onClose();
              }}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors px-3 py-2"
              title="Editar"
              tabIndex={0}
            >
              <span>✍️</span> <span>Editar</span>
            </button>
            <div className="w-px h-6 bg-white/30"></div>
            <button
              onClick={async e => {
                e.stopPropagation();
                const img = replicatedImages[expandedImageIndex];
                const base64ToAdd = await flattenImageWithText(img.image);
                onAddToGallery(base64ToAdd);
              }}
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors px-3 py-2"
              title="Adicionar à Galeria"
              tabIndex={0}
            >
              <span>➕</span> <span>Add à Galeria</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplicateModal;