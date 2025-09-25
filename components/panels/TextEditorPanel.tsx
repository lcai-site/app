import React from 'react';
import { FONT_OPTIONS } from '../../constants';

const TextEditorPanel: React.FC<{
    textFont: string; setTextFont: (f: string) => void;
    textSize: number; setTextSize: (s: number) => void;
    textColor: string; setTextColor: (c: string) => void;
    textAlign: 'left' | 'center' | 'right'; setTextAlign: (a: 'left' | 'center' | 'right') => void;
    textBgType: 'transparent' | 'solid'; setTextBgType: (t: 'transparent' | 'solid') => void;
    textBgColor: string; setTextBgColor: (c: string) => void;
}> = ({ textFont, setTextFont, textSize, setTextSize, textColor, setTextColor, textAlign, setTextAlign, textBgType, setTextBgType, textBgColor, setTextBgColor }) => (
    <div className="flex flex-col gap-4 p-4 bg-panel-bg rounded-xl">
      <h3 className="text-lg font-semibold text-center">Editor de Texto</h3>
      
      <div>
        <label htmlFor="textFont" className="text-sm font-medium text-text-secondary">Fonte</label>
        <div className="relative mt-1">
            <select id="textFont" value={textFont} onChange={(e) => setTextFont(e.target.value)} className="w-full bg-interactive-bg border border-glass-border rounded-lg p-2 appearance-none focus:ring-2 focus:ring-accent-start text-text-primary" style={{ fontFamily: textFont }}>
                {FONT_OPTIONS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font, backgroundColor: 'rgb(var(--secondary-bg-rgb))' }}>{font}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/></svg>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div>
              <label htmlFor="textSize" className="text-sm font-medium text-text-secondary">Tamanho ({textSize}px)</label>
              <input type="range" id="textSize" min="12" max="256" value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value, 10))} className="w-full h-2 bg-interactive-bg rounded-lg appearance-none cursor-pointer accent-accent-start mt-2" />
          </div>
          <div>
              <label htmlFor="textColor" className="text-sm font-medium text-text-secondary">Cor do Texto</label>
              <div className="relative mt-1">
                  <input type="color" id="textColor" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-10 p-1 border border-glass-border rounded-lg cursor-pointer bg-interactive-bg" />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-text-secondary">{textColor.toUpperCase()}</span>
              </div>
          </div>
      </div>

      <div>
          <label className="text-sm font-medium text-text-secondary">Alinhamento</label>
          <div role="radiogroup" aria-label="Alinhamento do texto" className="grid grid-cols-3 gap-1 bg-interactive-bg p-1 rounded-full mt-1">
              <button role="radio" aria-checked={textAlign === 'left'} onClick={() => setTextAlign('left')} className={`py-1 rounded-full text-sm transition-colors ${textAlign === 'left' ? 'bg-accent-start text-white' : 'hover:bg-interactive-hover-bg'}`}>Esquerda</button>
              <button role="radio" aria-checked={textAlign === 'center'} onClick={() => setTextAlign('center')} className={`py-1 rounded-full text-sm transition-colors ${textAlign === 'center' ? 'bg-accent-start text-white' : 'hover:bg-interactive-hover-bg'}`}>Centro</button>
              <button role="radio" aria-checked={textAlign === 'right'} onClick={() => setTextAlign('right')} className={`py-1 rounded-full text-sm transition-colors ${textAlign === 'right' ? 'bg-accent-start text-white' : 'hover:bg-interactive-hover-bg'}`}>Direita</button>
          </div>
      </div>

      <div>
          <label className="text-sm font-medium text-text-secondary">Fundo</label>
          <div role="radiogroup" aria-label="Fundo do texto" className="grid grid-cols-2 gap-1 bg-interactive-bg p-1 rounded-full mt-1">
              <button role="radio" aria-checked={textBgType === 'transparent'} onClick={() => setTextBgType('transparent')} className={`py-1 rounded-full text-sm transition-colors ${textBgType === 'transparent' ? 'bg-accent-start text-white' : 'hover:bg-interactive-hover-bg'}`}>Transparente</button>
              <button role="radio" aria-checked={textBgType === 'solid'} onClick={() => setTextBgType('solid')} className={`py-1 rounded-full text-sm transition-colors ${textBgType === 'solid' ? 'bg-accent-start text-white' : 'hover:bg-interactive-hover-bg'}`}>Sólido</button>
          </div>
          {textBgType === 'solid' && (
              <div className="relative mt-2">
                  <input type="color" id="textBgColor" value={textBgColor} onChange={(e) => setTextBgColor(e.target.value)} className="w-full h-10 p-1 border border-glass-border rounded-lg cursor-pointer bg-interactive-bg" />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-text-secondary">{textBgColor.toUpperCase()}</span>
              </div>
          )}
      </div>

    </div>
);

export default TextEditorPanel;
