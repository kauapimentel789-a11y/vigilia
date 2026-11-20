/**
 * Clima de cada mapa: cores próprias, partículas no ar e um tom por cima de tudo.
 * Só visual. Cada portal deve parecer um lugar diferente, não o mesmo chão com outro nome.
 */

export type Particula = 'poeira' | 'cinzas' | 'brasas' | 'bolhas' | 'esporos' | 'gotas' | 'fumaca';

export interface Ambiente {
  /** Cores que substituem as do tema (chão, paredes, luz...). */
  cores?: Partial<{
    chao: string;
    chaoB: string;
    detalhe: string;
    paredeTopo: string;
    paredeFace: string;
    agua: string;
    luz: string;
    sombra: string;
  }>;
  particulas: Particula[];
  /** Quantas partículas na tela (padrão 40). */
  densidade?: number;
  /** Névoa que passa devagar pelo chão, em "r,g,b". */
  nevoa?: string;
  /** Tom por cima da cena, em "r,g,b,a". */
  tom?: string;
  /** Raios de luz caindo do alto (Véu). */
  raios?: boolean;
}

export const AMBIENTES: Record<string, Ambiente> = {
  posto: { particulas: ['poeira'], densidade: 18, tom: '120,100,200,0.04' },
  cinza1: {
    cores: { chao: '#1d1e24', chaoB: '#1b1c21', paredeTopo: '#34343c', luz: '255,205,150' },
    particulas: ['poeira', 'cinzas'],
    tom: '160,140,120,0.05',
  },
  cinza2: {
    cores: {
      chao: '#18201f',
      chaoB: '#161d1c',
      detalhe: '#20302b',
      paredeTopo: '#2b3a36',
      paredeFace: '#101816',
      agua: '#1b3324',
      luz: '210,235,170',
    },
    particulas: ['gotas'],
    nevoa: '90,140,100',
    tom: '60,120,80,0.06',
  },
  cinza3: {
    cores: {
      chao: '#1e1a24',
      chaoB: '#1c1822',
      detalhe: '#2a2236',
      paredeTopo: '#3a2f48',
      paredeFace: '#140f1a',
      luz: '220,190,255',
    },
    particulas: ['esporos'],
    densidade: 50,
    nevoa: '120,80,160',
    tom: '120,60,160,0.07',
  },
  cinza4: {
    cores: {
      chao: '#23221f',
      chaoB: '#201f1c',
      detalhe: '#302e29',
      paredeTopo: '#45423b',
      paredeFace: '#171612',
      luz: '240,230,200',
    },
    particulas: ['poeira'],
    nevoa: '200,200,190',
    tom: '220,210,180,0.04',
  },
  cinza5: {
    cores: {
      chao: '#181d27',
      chaoB: '#161b24',
      detalhe: '#212a3a',
      paredeTopo: '#2d3a50',
      paredeFace: '#0e121b',
      luz: '180,210,255',
    },
    particulas: ['cinzas'],
    densidade: 55,
    tom: '80,120,200,0.07',
  },
  exameBrasa: {
    cores: { chao: '#24201a', chaoB: '#211d18', paredeTopo: '#463a28', luz: '255,220,150' },
    particulas: ['brasas', 'poeira'],
    tom: '255,200,100,0.05',
  },
  brasa1: {
    cores: { chao: '#211b19', chaoB: '#1e1816', paredeTopo: '#3a2c26' },
    particulas: ['fumaca', 'brasas'],
    densidade: 30,
    tom: '140,80,50,0.06',
  },
  brasa2: {
    cores: { chao: '#251a17', chaoB: '#221714', paredeTopo: '#43291f', luz: '255,150,90' },
    particulas: ['brasas'],
    densidade: 65,
    tom: '255,110,40,0.07',
  },
  brasa3: {
    cores: { chao: '#1f1c1c', chaoB: '#1c1919', paredeTopo: '#3a3030' },
    particulas: ['brasas', 'fumaca'],
    nevoa: '220,200,190',
    tom: '200,120,90,0.05',
  },
  brasa4: {
    cores: { chao: '#1b1716', chaoB: '#191514', paredeTopo: '#2f2725', luz: '255,160,110' },
    particulas: ['cinzas'],
    densidade: 70,
    tom: '60,30,30,0.1',
  },
  brasa5: {
    cores: { chao: '#241f17', chaoB: '#211c14', paredeTopo: '#4a3a22', luz: '255,210,130' },
    particulas: ['brasas'],
    densidade: 55,
    tom: '255,190,80,0.07',
  },
  exameVeu: { particulas: ['bolhas'], densidade: 35, tom: '60,200,190,0.05' },
  veu1: {
    cores: { chao: '#15212a', chaoB: '#131e26', paredeTopo: '#22404c' },
    particulas: ['bolhas', 'poeira'],
    raios: true,
    tom: '60,180,200,0.06',
  },
  veu2: {
    cores: { chao: '#132428', chaoB: '#112125', paredeTopo: '#1d4a50', agua: '#0b4650' },
    particulas: ['bolhas', 'gotas'],
    densidade: 45,
    tom: '40,200,210,0.07',
  },
  veu3: {
    cores: {
      chao: '#171a28',
      chaoB: '#151824',
      detalhe: '#20253a',
      paredeTopo: '#2a2f50',
      paredeFace: '#0b0d18',
      luz: '190,200,255',
    },
    particulas: ['bolhas'],
    nevoa: '80,90,160',
    raios: true,
    tom: '70,60,160,0.08',
  },
};

function h(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Partículas do ar: cada uma nasce de um número fixo e anda com o tempo, então não
 * precisa guardar estado. Coordenadas em pixels do mundo, dentro da área visível.
 */
export function drawAmbiente(
  ctx: CanvasRenderingContext2D,
  amb: Ambiente,
  vista: { x: number; y: number; largura: number; altura: number },
  t: number,
): void {
  const n = amb.densidade ?? 40;
  const { x: vx, y: vy, largura: L, altura: A } = vista;
  // Névoa: manchas grandes e suaves que atravessam a tela.
  if (amb.nevoa) {
    for (let i = 0; i < 6; i++) {
      const vel = 8 + h(i + 50) * 10;
      const px =
        vx + ((((h(i) * 2000 + (t / 1000) * vel) % (L + 400)) + L + 400) % (L + 400)) - 200;
      const py = vy + h(i + 9) * A;
      const r = 120 + h(i + 3) * 160;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${amb.nevoa},0.08)`);
      g.addColorStop(1, `rgba(${amb.nevoa},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  for (const tipo of amb.particulas) {
    for (let i = 0; i < n; i++) {
      const a = h(i * 3.1 + tipo.length);
      const b = h(i * 7.7 + tipo.length * 3);
      const c = h(i * 1.3 + 11);
      const s = t / 1000;
      let px: number;
      let py: number;
      let cor: string;
      let tam: number;
      let alfa: number;
      if (tipo === 'poeira') {
        px = a * L + Math.sin(s * 0.3 + i) * 20;
        py = b * A + Math.cos(s * 0.25 + i) * 14;
        cor = '220,210,190';
        alfa = 0.18 + 0.15 * Math.sin(s + i);
        tam = 1.5;
      } else if (tipo === 'cinzas') {
        const vel = 12 + c * 18;
        px = a * L + Math.sin(s * 0.8 + i) * 18;
        py = (b * A + s * vel) % A;
        cor = '190,190,200';
        alfa = 0.35;
        tam = 2;
      } else if (tipo === 'brasas') {
        const vel = 20 + c * 35;
        px = a * L + Math.sin(s * 1.6 + i) * 10;
        py = A - ((b * A + s * vel) % A);
        cor = c > 0.5 ? '255,170,70' : '255,110,50';
        alfa = 0.5 + 0.4 * Math.sin(s * 6 + i);
        tam = 2;
      } else if (tipo === 'bolhas') {
        const vel = 14 + c * 20;
        px = a * L + Math.sin(s * 1.2 + i) * 8;
        py = A - ((b * A + s * vel) % A);
        ctx.strokeStyle = `rgba(170,240,235,${0.25 + 0.15 * c})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(vx + px, vy + py, 1.5 + c * 2.5, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      } else if (tipo === 'esporos') {
        px = a * L + Math.sin(s * 0.4 + i * 2) * 30;
        py = b * A + Math.cos(s * 0.35 + i) * 24;
        cor = c > 0.5 ? '200,140,255' : '150,255,170';
        alfa = 0.3 + 0.35 * Math.sin(s * 2 + i);
        tam = 2;
      } else if (tipo === 'gotas') {
        const vel = 90 + c * 60;
        px = a * L;
        py = (b * A + s * vel) % A;
        cor = '150,200,220';
        alfa = 0.35;
        ctx.fillStyle = `rgba(${cor},${alfa})`;
        ctx.fillRect(vx + px, vy + py, 1, 5);
        continue;
      } else {
        // fumaça: bolotas cinza que sobem e somem.
        const vel = 10 + c * 8;
        const ciclo = ((b * A + s * vel) % A) / A;
        px = a * L + Math.sin(s * 0.5 + i) * 20;
        py = A - ciclo * A;
        const r = 10 + ciclo * 30;
        const g = ctx.createRadialGradient(vx + px, vy + py, 0, vx + px, vy + py, r);
        g.addColorStop(0, `rgba(90,85,85,${0.12 * (1 - ciclo)})`);
        g.addColorStop(1, 'rgba(90,85,85,0)');
        ctx.fillStyle = g;
        ctx.fillRect(vx + px - r, vy + py - r, r * 2, r * 2);
        continue;
      }
      ctx.fillStyle = `rgba(${cor},${Math.max(0, alfa)})`;
      ctx.fillRect(Math.round(vx + px), Math.round(vy + py), tam, tam);
    }
  }
}

/** Raios de luz caindo na diagonal (feitos depois da sombra, somando luz). */
export function drawRaios(
  ctx: CanvasRenderingContext2D,
  vista: { x: number; y: number; largura: number; altura: number },
  t: number,
): void {
  const { x, y, largura: L, altura: A } = vista;
  for (let i = 0; i < 4; i++) {
    const base = x + h(i + 70) * L + Math.sin(t / 3000 + i) * 30;
    const larg = 40 + h(i + 80) * 60;
    const alfa = 0.035 + 0.02 * Math.sin(t / 1400 + i * 2);
    const g = ctx.createLinearGradient(0, y, 0, y + A);
    g.addColorStop(0, `rgba(170,240,230,${alfa})`);
    g.addColorStop(1, 'rgba(170,240,230,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(base, y);
    ctx.lineTo(base + larg, y);
    ctx.lineTo(base + larg - A * 0.35, y + A);
    ctx.lineTo(base - A * 0.35, y + A);
    ctx.closePath();
    ctx.fill();
  }
}
