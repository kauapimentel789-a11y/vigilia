/**
 * Sprites em pixel art, todos desenhados em código (16 × 16).
 *
 * Cada forma é uma grade de letras; a cor vem de quem usa a forma. O contorno
 * escuro é gerado sozinho em volta de tudo que não é vazio, então as grades só
 * descrevem o recheio.
 *
 * Letras: b corpo · s sombra · h luz · a detalhe · w claro (rosto, osso) ·
 * m metal · e olhos · . vazio
 */

export type Forma =
  'cacador' | 'fera' | 'aranha' | 'armadura' | 'arqueiro' | 'chama' | 'manto' | 'ferreiro' | 'olho';

export const FORMAS: Record<Forma, string[]> = {
  cacador: [
    '................',
    '......aaaa......',
    '.....aaaaaa.....',
    '....aawwwwaa....',
    '....awewwewa....',
    '....aawwwwaa....',
    '...aaaaaaaaaa.m.',
    '..aabbbbbbbbaam.',
    '..abbbhbbbbbbam.',
    '..abbbhbbbbbbam.',
    '..aabbbbbbbbaaw.',
    '...abbbbbbbba...',
    '...bbssbbssbb...',
    '....ss....ss....',
    '....ss....ss....',
    '................',
  ],
  fera: [
    '................',
    '................',
    '................',
    '................',
    '...........b.b..',
    '..........bbbbb.',
    '..........bbbbeb',
    'b.........bbbbbw',
    '.b.bbbbbbbbbbbs.',
    '..bbhhhhbbbbbb..',
    '..bbbbbbbbbbbb..',
    '..sbbbbbbbbbbs..',
    '..sb.sb..sb.sb..',
    '..s..s...s..s...',
    '................',
    '................',
  ],
  aranha: [
    '................',
    '................',
    '................',
    '.s....aaaa....s.',
    '..s..abbbba..s..',
    '...sabhhbbbas...',
    's...bbbbbbbb...s',
    '.s.sbbbbbbbbs.s.',
    '..ssbbbbbbbbss..',
    '...sbeebbeebs...',
    '..s.sbbbbbbs.s..',
    '.s...ssbbss...s.',
    's.....s..s.....s',
    '................',
    '................',
    '................',
  ],
  armadura: [
    '................',
    '......mmmm......',
    '.....mmmmmm.....',
    '.....memmem.....',
    '.....mmmmmm.....',
    '...hbbbbbbbbh...',
    '..hhbbbbbbbbhh..',
    '..aabbbhhbbbbm..',
    '.aaaabbhhbbbbm..',
    '.aawaabbbbbbbm..',
    '.aaaabbbbbbbbm..',
    '..aabsbbbbsbbm..',
    '....bs....sb....',
    '....bs....sb....',
    '...sss....sss...',
    '................',
  ],
  arqueiro: [
    '................',
    '......bbbb......',
    '.....bbbbbb.....',
    '.....besseb.....',
    '.....bssssb.....',
    '....bbbbbbbb.m..',
    '...bbbbhbbbbbm..',
    '...bbbbhbbbbb.m.',
    '...bbaabbbbbb.m.',
    '...bbbbaabbbb.m.',
    '...bbbbbbaabm...',
    '....bbbbbbbb.m..',
    '....sbbbbbbs....',
    '.....s....s.....',
    '.....s....s.....',
    '................',
  ],
  chama: [
    '................',
    '.......h........',
    '......hh........',
    '......hbh...h...',
    '.....hbbh..hh...',
    '....hbbbbhhbh...',
    '....bbbbbbbbh...',
    '...hbbaaaabbbh..',
    '...bbaaaaaabbb..',
    '...bbaewweabb...',
    '...bbaaaaaabbb..',
    '....bbaaaabbb...',
    '.....bbbbbbb....',
    '......sbbbs.....',
    '................',
    '................',
  ],
  manto: [
    '................',
    '......aaaa......',
    '.....aaaaaa.....',
    '.....awwwwa.....',
    '.....aewwea.....',
    '.....awwwwa.....',
    '....bbaaaabb....',
    '...bbbbaabbbb...',
    '..wbbbbaabbbbw..',
    '...bbhbaabbbb...',
    '...bbhbaabbbb...',
    '..bbbbbaabbbbb..',
    '..bbbbbaabbbbb..',
    '..sbbbbbbbbbbs..',
    '..ssssssssssss..',
    '................',
  ],
  ferreiro: [
    '................',
    '................',
    '..mmm...........',
    '.mmmmm.bbbb.....',
    '.mmmmmbweewb....',
    '..ma..bwwwwb....',
    '..ab.bbbbbbbb...',
    '..abbbbhhbbbbb..',
    '...bbbbhhbbbbbb.',
    '...bbaaaaaabbbb.',
    '....baaaaaab.bb.',
    '....baaaaaab....',
    '....baaaaaab....',
    '....ss....ss....',
    '...sss....sss...',
    '................',
  ],
  olho: [
    '................',
    '................',
    '.....aaaaaa.....',
    '...aabbbbbbaa...',
    '..abbbbbbbbbba..',
    '.abbwwwwwwwwbba.',
    '.abwwwweewwwwba.',
    '.abwwweeeewwwba.',
    '.abwwwweewwwwba.',
    '.abbwwwwwwwwbba.',
    '..abbbbbbbbbba..',
    '...aabbbbbbaa...',
    '.....aaaaaa.....',
    '....s.s..s.s....',
    '....s....s......',
    '................',
  ],
};

export interface Aparencia {
  forma: Forma;
  /** Cor principal; sombra e luz saem dela. */
  cor: string;
  /** Cor de detalhe (capuz, escudo, avental). Sem ela, uma versão escura da principal. */
  detalhe?: string;
  /** Cor dos olhos. */
  olhos?: string;
}

/** Caçador e monstros da Caçada. */
export const APARENCIA: Record<string, Aparencia> = {
  cacador: { forma: 'cacador', cor: '#3a3550', detalhe: '#6c5ce7', olhos: '#d9d3ff' },
  carnical: { forma: 'fera', cor: '#9fae7e' },
  ratoDeCinza: { forma: 'fera', cor: '#8a7f70' },
  tecela: { forma: 'aranha', cor: '#6fb3a0', detalhe: '#d8e8e0' },
  sentinela: { forma: 'armadura', cor: '#9aa3b5', detalhe: '#d8d0b8' },
  arqueiro: { forma: 'arqueiro', cor: '#c49a6c', detalhe: '#5a4330' },
  cavaleiro: { forma: 'armadura', cor: '#7c7f99', detalhe: '#3d4258' },
  centelha: { forma: 'chama', cor: '#ff9a3c', detalhe: '#ffe08a' },
  caoDeEscoria: { forma: 'fera', cor: '#8c6a5a' },
  ferreiro: { forma: 'ferreiro', cor: '#9b8f86', detalhe: '#5a4330' },
  lancadora: { forma: 'arqueiro', cor: '#e0814f', detalhe: '#ffd27a' },
  escudeiro: { forma: 'armadura', cor: '#a7adb8', detalhe: '#6a7086' },
  acolita: { forma: 'manto', cor: '#7a2f3a', detalhe: '#e8a0b8' },
  guardiaLimiar: { forma: 'armadura', cor: '#d9c27a', detalhe: '#8b7cf6' },
  matilheiro: { forma: 'fera', cor: '#b0704a' },
  forjadora: { forma: 'ferreiro', cor: '#e0583f', detalhe: '#3b2d2a' },
  caldeira: { forma: 'olho', cor: '#5c1d0c', detalhe: '#ff7a3c', olhos: '#1a0805' },
  colosso: { forma: 'armadura', cor: '#6f5f5a', detalhe: '#ff7a3c' },
  arauto: { forma: 'manto', cor: '#ffcf5a', detalhe: '#b0402a' },
};

/** Unidades da Arena (ids próprios). */
export const APARENCIA_ARENA: Record<string, Aparencia> = {
  vigiaDeCinza: { forma: 'armadura', cor: '#9aa3b5', detalhe: '#5c6280' },
  ratoDeBrasa: { forma: 'fera', cor: '#c0603a' },
  acolitaPalida: { forma: 'manto', cor: '#4fb3a6', detalhe: '#d8e8e0' },
  arqueiroOco: { forma: 'arqueiro', cor: '#c49a6c', detalhe: '#5a4330' },
  carnical: { forma: 'fera', cor: '#9fae7e' },
  fagulha: { forma: 'chama', cor: '#ff9a3c', detalhe: '#ffe08a' },
  ferreiro: { forma: 'ferreiro', cor: '#9b8f86', detalhe: '#5a4330' },
  tecela: { forma: 'aranha', cor: '#8b7cf6', detalhe: '#d8e8e0' },
  sentinela: { forma: 'armadura', cor: '#d8d0b8', detalhe: '#9aa3b5' },
  caoDeEscoria: { forma: 'fera', cor: '#8c6a5a' },
  lancadora: { forma: 'arqueiro', cor: '#e0814f', detalhe: '#ffd27a' },
  cavaleiroOco: { forma: 'armadura', cor: '#7c7f99', detalhe: '#3d4258' },
  guardiaLimiar: { forma: 'armadura', cor: '#d9c27a', detalhe: '#8b7cf6' },
  arauto: { forma: 'manto', cor: '#ffcf5a', detalhe: '#b0402a' },
  caldeira: { forma: 'olho', cor: '#5c1d0c', detalhe: '#ff7a3c', olhos: '#1a0805' },
};

const CONTORNO = '#07080d';

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura a cor com preto (k < 0) ou branco (k > 0). */
export function tom(c: string, k: number): string {
  const alvo = k < 0 ? 0 : 255;
  const f = Math.abs(k);
  const [r, g, b] = hex(c).map((v) => Math.round(v + (alvo - v) * f));
  return `rgb(${r},${g},${b})`;
}

function paleta(ap: Aparencia): Record<string, string> {
  return {
    b: ap.cor,
    s: tom(ap.cor, -0.35),
    h: tom(ap.cor, 0.3),
    a: ap.detalhe ?? tom(ap.cor, -0.5),
    w: '#e8dccb',
    m: '#a9b0c2',
    e: ap.olhos ?? '#ffd27a',
  };
}

/** Grade 18 × 18 já com contorno: cada célula é uma cor ou null. */
export function pixels(ap: Aparencia): Array<Array<string | null>> {
  const g = FORMAS[ap.forma];
  const cores = paleta(ap);
  const N = 18;
  const out: Array<Array<string | null>> = Array.from({ length: N }, () =>
    new Array<string | null>(N).fill(null),
  );
  const cheio = (x: number, y: number) => {
    const linha = g[y - 1];
    const c = linha?.[x - 1];
    return c !== undefined && c !== '.';
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (cheio(x, y)) out[y]![x] = cores[g[y - 1]![x - 1]!] ?? ap.cor;
      else if (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1))
        out[y]![x] = CONTORNO;
    }
  }
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

/** O sprite pronto num canvas 18 × 18 (guardado para reuso). */
export function spriteCanvas(ap: Aparencia, olhos?: string): HTMLCanvasElement {
  const chave = `${ap.forma}|${ap.cor}|${ap.detalhe ?? ''}|${olhos ?? ap.olhos ?? ''}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const c = document.createElement('canvas');
  c.width = 18;
  c.height = 18;
  const ctx = c.getContext('2d')!;
  const px = pixels(olhos ? { ...ap, olhos } : ap);
  px.forEach((linha, y) =>
    linha.forEach((cor, x) => {
      if (!cor) return;
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  cache.set(chave, c);
  return c;
}

/** Desenha o sprite com o pé em (cx, base), com `tamanho` px de lado. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  ap: Aparencia,
  cx: number,
  base: number,
  tamanho: number,
  opcoes: { espelhar?: boolean; olhos?: string } = {},
): void {
  const img = spriteCanvas(ap, opcoes.olhos);
  const suave = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(cx - tamanho / 2);
  const y = Math.round(base - tamanho);
  if (opcoes.espelhar) {
    ctx.save();
    ctx.translate(x + tamanho, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, tamanho, tamanho);
    ctx.restore();
  } else ctx.drawImage(img, x, y, tamanho, tamanho);
  ctx.imageSmoothingEnabled = suave;
}
