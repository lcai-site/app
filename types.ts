// Fix: The original file imported types from itself, causing circular reference errors.
// The types are now defined directly based on their usage in the application.
export type AppMode = 'create' | 'edit' | 'ai_tools';

export type CreateFunction = 'free' | 'sticker' | 'text' | 'comic' | 'character' | 'consultor';

export type EditFunction = 'add-remove' | 'retouch' | 'background' | 'compose' | 'person' | 'enhance' | 'clothing' | 'decorator' | 'tattoo';

export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type MarketingPersona = 'sell' | 'engage' | 'story';

export type ConsultantPersona = 'creative' | 'marketing' | 'technical';

export type ImageData = {
  base64: string;
  mimeType: string;
  objectUrl: string;
  fabricState?: string;
};

export type ConsultantMessage = {
  role: 'user' | 'model';
  text: string;
  image?: ImageData;
};

export type ConciergeMessage = {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string; // For model to show examples
  resultImage?: ImageData; // For AI-generated interactive results
  image?: ImageData; // For user to send images
};

export interface Size {
  name: string;
  width: number;
  height: number;
  ratio: AspectRatio;
}

export interface ArtStyle {
  name: string;
  icon: string;
  promptSuffix: string;
  previewImage: string;
}

export interface BrandIdentity {
  name: string;
  logo: ImageData | null;
  primaryColors: string[];
  secondaryColors: string[];
  primaryFont: string;
  secondaryFont: string;
  businessInfo: string;
}

export interface ContentAssistantData {
  captions: {
    tone: string;
    text: string;
  }[];
  hashtags: {
    broad: string[];
    niche: string[];
    trending: string[];
  };
}

// Speech Recognition API Types for better type safety
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export interface EditedImage {
  base64: string;
  mimeType: string;
}

export interface CarouselSlidePlan {
  copy: string;
  image_prompt: string;
}

export interface CarouselPlan {
  slides: CarouselSlidePlan[];
}