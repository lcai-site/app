import type { Size, ArtStyle } from './types';

export const SIZES: Record<string, Size[]> = {
  "Instagram": [
    { name: 'Post Quadrado (Feed)', width: 1080, height: 1080, ratio: '1:1' },
    { name: 'Post Retrato (Feed)', width: 1080, height: 1350, ratio: '3:4' },
    { name: 'Post Paisagem (Feed)', width: 1080, height: 566, ratio: '16:9' },
    { name: 'Carrossel (por item)', width: 1080, height: 1350, ratio: '3:4' },
    { name: 'Stories / Reels', width: 1080, height: 1920, ratio: '9:16' },
    { name: 'Foto de Perfil', width: 320, height: 320, ratio: '1:1' },
  ],
  "Facebook": [
    { name: 'Post com Imagem', width: 1200, height: 630, ratio: '16:9' },
    { name: 'Stories', width: 1080, height: 1920, ratio: '9:16' },
    { name: 'Foto de Capa', width: 851, height: 315, ratio: '16:9' },
    { name: 'Foto de Perfil', width: 180, height: 180, ratio: '1:1' },
    { name: 'Imagem de Evento', width: 1920, height: 1005, ratio: '16:9' },
  ],
  "TikTok": [
    { name: 'Vídeo Vertical', width: 1080, height: 1920, ratio: '9:16' },
    { name: 'Vídeo Horizontal', width: 1920, height: 1080, ratio: '16:9' },
    { name: 'Foto de Perfil', width: 200, height: 200, ratio: '1:1' },
  ],
  "YouTube": [
    { name: 'Thumbnail de Vídeo', width: 1280, height: 720, ratio: '16:9' },
    { name: 'Arte do Canal', width: 2560, height: 1440, ratio: '16:9' },
    { name: 'Foto de Perfil', width: 800, height: 800, ratio: '1:1' },
    { name: 'Shorts', width: 1080, height: 1920, ratio: '9:16' },
  ],
  "X (Twitter)": [
    { name: 'Post com Imagem Única', width: 1200, height: 675, ratio: '16:9' },
    { name: 'Post com Múltiplas Imagens', width: 1080, height: 1080, ratio: '1:1' },
    { name: 'Foto de Capa (Header)', width: 1500, height: 500, ratio: '16:9' },
    { name: 'Foto de Perfil', width: 400, height: 400, ratio: '1:1' },
  ],
  "Pinterest": [
    { name: 'Pin Padrão', width: 1000, height: 1500, ratio: '3:4' },
    { name: 'Pin Quadrado', width: 1080, height: 1080, ratio: '1:1' },
    { name: 'Pin Longo', width: 1000, height: 2100, ratio: '9:16' },
    { name: 'Foto de Perfil', width: 165, height: 165, ratio: '1:1' },
    { name: 'Capa de Board', width: 600, height: 600, ratio: '1:1' },
    { name: 'Pin Idea', width: 1080, height: 1920, ratio: '9:16' },
  ],
  "LinkedIn": [
    { name: 'Post Imagem Única', width: 1200, height: 627, ratio: '16:9' },
    { name: 'Post Imagem Quadrada', width: 1200, height: 1200, ratio: '1:1' },
    { name: 'Carrossel (por item)', width: 1080, height: 1080, ratio: '1:1' },
    { name: 'Foto de Perfil', width: 400, height: 400, ratio: '1:1' },
    { name: 'Banner de Perfil (Capa)', width: 1584, height: 396, ratio: '16:9' },
    { name: 'Banner de Empresa (Capa)', width: 1128, height: 191, ratio: '16:9' },
    { name: 'Imagem de Artigo', width: 1200, height: 627, ratio: '16:9' },
  ],
   "Substack": [
      { name: 'Imagem de Cabeçalho', width: 1200, height: 630, ratio: '16:9' },
      { name: 'Logo / Avatar', width: 256, height: 256, ratio: '1:1' },
      { name: 'Imagem Destacada (Post)', width: 1200, height: 630, ratio: '16:9' },
  ],
  "Impressão": [
    { name: 'A4 (210x297mm)', width: 2480, height: 3508, ratio: '3:4' },
    { name: 'Carta (216x279mm)', width: 2550, height: 3300, ratio: '3:4' },
    { name: 'Poster (254x339mm)', width: 3000, height: 4000, ratio: '3:4' },
    { name: 'Cartão de Visita (89x51mm)', width: 1050, height: 600, ratio: '16:9' },
  ],
  "Web": [
    { name: 'Wallpaper Desktop', width: 1920, height: 1080, ratio: '16:9' },
    { name: 'Wallpaper Mobile', width: 1080, height: 1920, ratio: '9:16' },
    { name: 'Banner Web', width: 728, height: 90, ratio: '16:9' },
    { name: 'Banner Quadrado', width: 300, height: 300, ratio: '1:1' },
  ],
};

export const SOCIAL_MEDIA_CATEGORIES = ["Instagram", "Facebook", "TikTok", "YouTube", "X (Twitter)", "Pinterest", "LinkedIn", "Substack"];

export const ART_STYLES: ArtStyle[] = [
    { name: 'Fotografia', icon: '📷', promptSuffix: 'realistic photography, cinematic, dramatic lighting', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757445123_8rp5z.png' },
    { name: 'Ghibli', icon: '🌸', promptSuffix: 'whimsical hand-drawn anime style, painted watercolor backgrounds, vibrant and nostalgic color palette, cinematic anime art', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444835_czvm4.png' },
    { name: 'Pixar', icon: '💡', promptSuffix: 'in the style of Pixar animation, 3D render, cute, family-friendly', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444833_8n4ps.png' },
    { name: 'Anime', icon: '🎌', promptSuffix: 'anime style, cel-shaded, detailed hair and eyes', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757443476_yxgpn.png' },
    { name: 'HQ', icon: '💬', promptSuffix: 'Comic book panel, in the style of classic american comics, halftone dots, action lines', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1758197486_4t3z2.png' },
    { name: 'Cyberpunk', icon: '🤖', promptSuffix: 'cyberpunk style, neon lighting, futuristic city, dystopian', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444835_8qzu9.png' },
    { name: 'Fantasia', icon: '🧙', promptSuffix: 'fantasy art, epic, detailed, Tolkein-esque, matte painting', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444833_la8km.png' },
    { name: 'Aquarela', icon: '🎨', promptSuffix: 'watercolor painting, soft edges, vibrant washes of color', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444834_hvzdl.png' },
    { name: '3D Render', icon: '🧊', promptSuffix: '3D render, high detail, octane render, trending on artstation', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757443475_4lc82.png' },
    { name: 'Steampunk', icon: '⚙️', promptSuffix: 'steampunk style, gears, brass, victorian era, intricate details', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444836_qgcyh.png' },
    { name: 'Pop Art', icon: '💥', promptSuffix: 'pop art style, bold colors, Ben-Day dots, in the style of Andy Warhol', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444835_6kchd.png' },
    { name: 'Minimalista', icon: '⚫', promptSuffix: 'minimalist, clean lines, simple shapes, limited color palette', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444834_f6z4d.png' },
    { name: 'Impressionismo', icon: '🖌️', promptSuffix: 'impressionist painting, visible brush strokes, focus on light, in the style of Monet', previewImage: 'https://sfmediastrg.s3.amazonaws.com/gallery/w3999/1757444751_z9fcs/1757444836_6t9kj.png' },
];

export const FONT_OPTIONS: string[] = [
    'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS',
    'Times New Roman', 'Georgia', 'Garamond', 'Courier New', 'Brush Script MT',
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
    'Source Sans Pro', 'Raleway', 'Poppins', 'Nunito', 'Merriweather',
    'Playfair Display', 'Lobster', 'Pacifico'
];