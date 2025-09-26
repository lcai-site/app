import type { EditedImage, ImageData, Size } from "./types";

// Fix: Declare fabric as a global variable to resolve type errors,
// as it's loaded from a CDN.
declare var fabric: any;

// --- Voice Synthesis Enhancement ---
let voices: SpeechSynthesisVoice[] = [];

// Helper to load voices, which can be asynchronous in some browsers.
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
};

// Initial load attempt
loadVoices();

// The 'onvoiceschanged' event is the correct way to ensure voices are loaded.
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Speaks the given text using the browser's Speech Synthesis API.
 * It selects a high-quality Portuguese voice and handles text in chunks
 * to avoid browser limitations on utterance length.
 * @param {string} text The text to be spoken.
 * @param {() => void} [onEnd] An optional callback to execute when all speech is finished.
 */
export const speak = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
        // Cancel any previous speech to prevent overlap or queueing.
        window.speechSynthesis.cancel();
        
        const cleanText = text.replace(/\*/g, '');
        // Split text into chunks of 180 characters to avoid issues with long texts.
        const chunks = cleanText.match(/[\s\S]{1,180}/g) || [];

        if (chunks.length === 0) {
            if (onEnd) onEnd();
            return;
        }

        let chunkIndex = 0;
        const speakChunk = () => {
            if (chunkIndex >= chunks.length) {
                if (onEnd) onEnd(); // All chunks have been spoken
                return;
            }
            const chunk = chunks[chunkIndex];
            const utterance = new SpeechSynthesisUtterance(chunk);
            
            // Prioritize a high-quality Google voice if available.
            const ptBRVoice = voices.find(voice => voice.lang === 'pt-BR' && voice.name.includes('Google')) || voices.find(voice => voice.lang === 'pt-BR');
            if (ptBRVoice) {
                utterance.voice = ptBRVoice;
            }
            
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            utterance.onend = () => {
                chunkIndex++;
                speakChunk(); // Speak the next chunk
            };
            window.speechSynthesis.speak(utterance);
        };
        speakChunk(); // Start speaking the first chunk

    } else {
        console.warn("Speech Synthesis API is not supported in this browser.");
        if (onEnd) onEnd();
    }
};


export const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

// New utility to flatten an image with its fabric.js text state into a single base64 string.
export const flattenImageWithText = (image: ImageData): Promise<string> => {
    return new Promise((resolve, reject) => {
        // If there's no text state, the base64 is already the final image.
        if (!image.fabricState) {
            resolve(image.base64);
            return;
        }

        try {
            const state = JSON.parse(image.fabricState);
            const tempCanvasEl = document.createElement('canvas');
            // Use a StaticCanvas for this non-interactive task, it's lighter.
            const tempCanvas = new fabric.StaticCanvas(tempCanvasEl, {
                width: state.width,
                height: state.height,
            });

            const imageUrl = `data:${image.mimeType};base64,${image.base64}`;

            fabric.Image.fromURL(imageUrl, (bgImg: any) => {
                if (!bgImg || !bgImg.width) {
                    return reject(new Error("Não foi possível carregar a imagem de fundo para mesclagem."));
                }
                
                // Set the loaded image as the background
                tempCanvas.setBackgroundImage(bgImg, () => {
                    // Render the background first
                    tempCanvas.renderAll();
                    
                    // Manually enliven and add objects instead of using loadFromJSON,
                    // which would clear the background.
                    fabric.util.enlivenObjects(state.objects, (enlivenedObjects: any) => {
                        enlivenedObjects.forEach((obj: any) => {
                            tempCanvas.add(obj);
                        });
                        
                        // Render again with text objects on top
                        tempCanvas.renderAll();

                        const dataURL = tempCanvas.toDataURL({ format: 'png', quality: 1.0 });
                        const newBase64 = dataURL.split(',')[1];
                        tempCanvas.dispose(); // Clean up memory
                        if (!newBase64) {
                            return reject(new Error("Falha ao gerar base64 a partir do canvas mesclado."));
                        }
                        resolve(newBase64);
                    });
                }, {
                    // Scale background to fit the canvas size recorded in the state
                    scaleX: state.width / bgImg.width,
                    scaleY: state.height / bgImg.height,
                    crossOrigin: 'anonymous'
                });
            }, { crossOrigin: 'anonymous' });

        } catch (e) {
            console.error("Erro ao mesclar a imagem com o texto:", e);
            reject(new Error(`Falha ao mesclar texto na imagem: ${e instanceof Error ? e.message : String(e)}`));
        }
    });
};

// Modified to return transformation data along with the prepared image.
export const prepareImageForOutpainting = (
    sourceImage: ImageData, 
    targetSize: Size
): Promise<{ 
    imageBase64: string; 
    scale: number; 
    offsetX: number; 
    offsetY: number 
}> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        const ctx = canvas.getContext('2d');
        const outpaintingColor = '#FF00FF'; // Magenta for reliable AI instruction

        if (!ctx) {
            return reject(new Error("Não foi possível obter o contexto do canvas."));
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = sourceImage.objectUrl;

        img.onload = () => {
            ctx.fillStyle = outpaintingColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            const base64Image = canvas.toDataURL('image/png').split(',')[1];
            resolve({
                imageBase64: base64Image,
                scale: scale,
                offsetX: x,
                offsetY: y
            });
        };
        
        img.onerror = () => {
            reject(new Error('A imagem não pôde ser carregada para a preparação do canvas. O URL pode ser inválido ou o recurso pode estar corrompido.'));
        };
    });
};

// New utility to mathematically transform fabric.js state for a new canvas size.
export const transformFabricState = (
    originalStateJSON: string | undefined,
    transform: { scale: number; offsetX: number; offsetY: number },
    naturalImageDims: { width: number; height: number },
    targetSize: Size
): string | undefined => {
    if (!originalStateJSON) return undefined;
    
    try {
        const state = JSON.parse(originalStateJSON);
        if (!state.objects || !Array.isArray(state.objects)) return originalStateJSON;

        const editorCanvasWidth = state.width;
        const editorCanvasHeight = state.height;
        if (!editorCanvasWidth || !editorCanvasHeight) {
            console.warn("O estado do Fabric não possui dimensões do canvas. A transformação pode ser imprecisa.");
            return originalStateJSON;
        }

        // Calculate scaling from editor canvas to natural image.
        // This can be non-uniform if aspect ratios differ.
        const preScaleX = naturalImageDims.width / editorCanvasWidth;
        const preScaleY = naturalImageDims.height / editorCanvasHeight;
        
        // Use an average pre-scale factor to avoid distortion when scaling object dimensions.
        const avgPreScale = (preScaleX + preScaleY) / 2;

        // The final, uniform scale factor combines the pre-scale and the outpainting scale.
        const finalScale = avgPreScale * transform.scale;

        const transformedObjects = state.objects.map((obj: any) => {
            const newObj = { ...obj };
            
            // 1. Convert object position from editor space to natural image space.
            // Use specific X/Y scales for accurate positioning of the anchor point.
            const naturalLeft = newObj.left * preScaleX;
            const naturalTop = newObj.top * preScaleY;

            // 2. Apply the outpainting transformation (natural image space -> final canvas space).
            newObj.left = (naturalLeft * transform.scale) + transform.offsetX;
            newObj.top = (naturalTop * transform.scale) + transform.offsetY;

            // 3. Apply the UNIFORM final scale to the object's dimensions to prevent distortion.
            newObj.scaleX = (newObj.scaleX || 1) * finalScale;
            newObj.scaleY = (newObj.scaleY || 1) * finalScale;
            
            // Also scale text-specific properties uniformly.
            if (newObj.type.includes('text')) {
                 newObj.fontSize = (newObj.fontSize || 16) * finalScale;
            }
            newObj.strokeWidth = (newObj.strokeWidth || 0) * finalScale;

            return newObj;
        });
        
        // Return new state with transformed objects and updated canvas dimensions.
        const finalState = { 
            ...state, 
            objects: transformedObjects, 
            backgroundImage: undefined,
            width: targetSize.width,
            height: targetSize.height,
        };
        return JSON.stringify(finalState);

    } catch (e) {
        console.error("Falha ao transformar o estado do Fabric:", e);
        return originalStateJSON; // Return original on error
    }
};

// Helper function to resize and crop a generated image to exact target dimensions using a 'cover' strategy.
export const resizeAndCropImage = (imageBase64: string, targetSize: Size): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize.width;
        canvas.height = targetSize.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return reject(new Error("Não foi possível obter o contexto do canvas."));
        }

        const img = new Image();
        img.src = `data:image/png;base64,${imageBase64}`;

        img.onload = () => {
            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = canvas.width / canvas.height;

            let renderWidth, renderHeight, x, y;

            // 'cover' logic: scale the image to fill the canvas, cropping the excess.
            if (imgAspectRatio > canvasAspectRatio) {
                // Image is wider than canvas, so height is the constraining dimension
                renderHeight = canvas.height;
                renderWidth = img.width * (canvas.height / img.height);
                x = (canvas.width - renderWidth) / 2;
                y = 0;
            } else {
                // Image is taller than or same aspect as canvas, so width is the constraining dimension
                renderWidth = canvas.width;
                renderHeight = img.height * (canvas.width / img.width);
                x = 0;
                y = (canvas.height - renderHeight) / 2;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, x, y, renderWidth, renderHeight);

            const finalBase64 = canvas.toDataURL('image/png').split(',')[1];
            resolve(finalBase64);
        };
        
        img.onerror = () => {
            reject(new Error('A imagem não pôde ser carregada para redimensionamento. O URL pode ser inválido ou o recurso pode estar corrompido.'));
        };
    });
};

// Fix: Add and export renderTextToImage to resolve import errors.
export const renderTextToImage = (
    text: string,
    sizes: Size[],
    fontSize: number,
    fontFamily: string,
    fill: string,
    textAlign: 'left' | 'center' | 'right',
    bgType: 'transparent' | 'solid',
    bgColor: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!sizes || sizes.length === 0) {
            return reject(new Error("Nenhum tamanho selecionado para a geração de texto."));
        }
        const targetSize = sizes[0];

        try {
            // Use a StaticCanvas for this non-interactive task.
            const canvas = new fabric.StaticCanvas(null, {
                width: targetSize.width,
                height: targetSize.height,
            });

            if (bgType === 'solid') {
                canvas.backgroundColor = bgColor;
            }

            const textObject = new fabric.Textbox(text, {
                left: targetSize.width / 2,
                top: targetSize.height / 2,
                width: targetSize.width * 0.9, // Use 90% width to leave some padding
                originX: 'center',
                originY: 'center',
                fontSize: fontSize,
                fontFamily: fontFamily,
                fill: fill,
                textAlign: textAlign,
                splitByGrapheme: true,
            });

            canvas.add(textObject).renderAll();

            const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0 });
            const newBase64 = dataURL.split(',')[1];
            canvas.dispose(); // Clean up memory
            
            if (!newBase64) {
                return reject(new Error("Falha ao gerar base64 a partir do canvas de texto."));
            }
            resolve(newBase64);

        } catch (e) {
            console.error("Erro ao renderizar texto para imagem:", e);
            reject(new Error(`Falha ao renderizar texto para imagem: ${e instanceof Error ? e.message : String(e)}`));
        }
    });
};

export const applyLogoOverlay = (mainImageBase64: string, logoImage: ImageData): Promise<string> => {
    return new Promise((resolve, reject) => {
        const mainImage = new Image();
        mainImage.src = `data:image/png;base64,${mainImageBase64}`;
        mainImage.onload = () => {
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            logo.src = logoImage.objectUrl;
            logo.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = mainImage.width;
                canvas.height = mainImage.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error("Não foi possível obter o contexto do canvas."));
                }
                ctx.drawImage(mainImage, 0, 0);

                // Define logo size and position
                const padding = mainImage.width * 0.05;
                const logoMaxSize = mainImage.width * 0.15;
                const scale = Math.min(logoMaxSize / logo.width, logoMaxSize / logo.height);
                const logoWidth = logo.width * scale;
                const logoHeight = logo.height * scale;
                const x = canvas.width - logoWidth - padding;
                const y = canvas.height - logoHeight - padding;
                
                ctx.globalAlpha = 0.8; // Apply some transparency
                ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                
                const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
                resolve(resultBase64);
            };
            logo.onerror = () => reject(new Error('Falha ao carregar a imagem do logo.'));
        };
        mainImage.onerror = () => reject(new Error('Falha ao carregar a imagem principal.'));
    });
};
