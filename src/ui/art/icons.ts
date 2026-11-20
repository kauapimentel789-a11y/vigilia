/**
 * Ícones em pixel art (12 × 12), no mesmo estilo dos sprites: grade de
 * letras, cor por letra e contorno escuro gerado sozinho.
 */

export type IconeId =
  | 'ataque'
  | 'defesa'
  | 'cura'
  | 'pocao'
  | 'auto'
  | 'mochila'
  | 'moeda'
  | 'gloria'
  | 'xp'
  | 'portal'
  | 'livro'
  | 'ampulheta'
  | 'torre'
  | 'elmo'
  | 'coracao'
  | 'dado'
  | 'cristal'
  | 'eco';

interface IconeDef {
  grade: string[];
  cores: Record<string, string>;
}

export const ICONES: Record<IconeId, IconeDef> = {
  ataque: {
    grade: [
      '..........mm',
      '.........mwm',
      '........mwm.',
      '.......mwm..',
      '......mwm...',
      '.....mwm....',
      '..g.mwm.....',
      '..ggwm......',
      '...gg.......',
      '..bggg......',
      '.bb..g......',
      'bb..........',
    ],
    cores: { m: '#a9b0c2', w: '#f1f3fa', g: '#e8c65a', b: '#7a5a3a' },
  },
  defesa: {
    grade: [
      '............',
      '.bbbbbbbbbb.',
      '.bhhhbbbbbb.',
      '.bhbbggbbbb.',
      '.bhbggggbbb.',
      '.bbbbggbbbb.',
      '.bbbbggbbbb.',
      '..bbbbbbbb..',
      '..bbbbbbbb..',
      '...bbbbbb...',
      '....bbbb....',
      '.....bb.....',
    ],
    cores: { b: '#4a78b8', h: '#8fb8ea', g: '#e8c65a' },
  },
  cura: {
    grade: [
      '............',
      '....gggg....',
      '....ghgg....',
      '....ghgg....',
      '.ghhhgggggg.',
      '.gggggggggg.',
      '.gggggggggg.',
      '.ssssggssss.',
      '....gggg....',
      '....gggg....',
      '....ssss....',
      '............',
    ],
    cores: { g: '#5fc48a', h: '#b8f0cf', s: '#2f8a58' },
  },
  pocao: {
    grade: [
      '....bbbb....',
      '.....mm.....',
      '.....mm.....',
      '....mrrm....',
      '...mrrrrm...',
      '..mrhrrrrm..',
      '.mrhrrrrrrm.',
      '.mrrrrrrrrm.',
      '.mrrrrrrrrm.',
      '.msrrrrrrsm.',
      '..mssssssm..',
      '...mmmmmm...',
    ],
    cores: { b: '#7a5a3a', m: '#c9d4e8', r: '#d4475e', h: '#ff9aa8', s: '#8a2238' },
  },
  auto: {
    grade: [
      '............',
      '...vvvvv....',
      '..vv...vv.v.',
      '.vv.....vvv.',
      '.v.....vvvv.',
      '.v..........',
      '..........v.',
      '.vvvv.....v.',
      '.vvv.....vv.',
      '.v.vv...vv..',
      '....vvvvv...',
      '............',
    ],
    cores: { v: '#a497ff' },
  },
  mochila: {
    grade: [
      '............',
      '....bbbb....',
      '...b....b...',
      '..bbbbbbbb..',
      '.bhhbbbbbbb.',
      '.bhbbbbbbbb.',
      '.bbbggggbbb.',
      '.bbbgssgbbb.',
      '.bbbbbbbbbb.',
      '.bbbbbbbbbb.',
      '.ssssssssss.',
      '............',
    ],
    cores: { b: '#8a6440', h: '#c49a6c', g: '#e8c65a', s: '#5a4330' },
  },
  moeda: {
    grade: [
      '............',
      '....gggg....',
      '..gghhgggg..',
      '.ghhggggggs.',
      '.ghgggssggs.',
      '.ghggsggggs.',
      '.ghggsggggs.',
      '.ggggsggggs.',
      '.gggggssggs.',
      '..gggggggs..',
      '...ssssss...',
      '............',
    ],
    cores: { g: '#f2b56b', h: '#ffe3a8', s: '#b07a2a' },
  },
  gloria: {
    grade: [
      '.....gg.....',
      '.....gg.....',
      '....gggg....',
      '....ghgg....',
      'gggggggggggg',
      '.gghggggggs.',
      '..gggggggs..',
      '...gggggs...',
      '..gggs.ggs..',
      '..ggs...gs..',
      '.gs......gs.',
      '............',
    ],
    cores: { g: '#c9b8ff', h: '#ffffff', s: '#7a68d8' },
  },
  xp: {
    grade: [
      '.....vv.....',
      '....vhhv....',
      '...vhvvvv...',
      '..vhvvvvvv..',
      '.vhvvvvvvvs.',
      'vvvvvvvvvvss',
      '.vvvvvvvvss.',
      '..vvvvvvss..',
      '...vvvvss...',
      '....vvss....',
      '.....ss.....',
      '............',
    ],
    cores: { v: '#8b7cf6', h: '#d9d3ff', s: '#5a4bc0' },
  },
  portal: {
    grade: [
      '....vvvv....',
      '..vv....vv..',
      '.v..pppp..v.',
      '.v.pphhpp.v.',
      'v.pphhhhpp.v',
      'v.pphhhhpp.v',
      'v.pppphhpp.v',
      'v.pppppppp.v',
      '.v.pppppp.v.',
      '.v..pppp..v.',
      '..vv....vv..',
      '....vvvv....',
    ],
    cores: { v: '#8b7cf6', p: '#3a2f6e', h: '#c9b8ff' },
  },
  livro: {
    grade: [
      '............',
      '..pppppppp..',
      '.phppppppp..',
      '.phpppgppp..',
      '.phppgggpp..',
      '.phpppgppp..',
      '.phppppppp..',
      '.phppppppp..',
      '.pwwwwwwwwp.',
      '.ppppppppp..',
      '............',
      '............',
    ],
    cores: { p: '#7a3a5a', h: '#b06a8a', g: '#e8c65a', w: '#e8dccb' },
  },
  ampulheta: {
    grade: [
      '.mmmmmmmmmm.',
      '..wwwwwwww..',
      '..wggggggw..',
      '...wggggw...',
      '....wggw....',
      '.....ww.....',
      '....w..w....',
      '...w.gg.w...',
      '..w.gggg.w..',
      '..wggggggw..',
      '..wwwwwwww..',
      '.mmmmmmmmmm.',
    ],
    cores: { m: '#8a6440', w: '#c9d4e8', g: '#f2b56b' },
  },
  torre: {
    grade: [
      '............',
      '.ss.ssss.ss.',
      '.ssssssssss.',
      '..ssssssss..',
      '..shssssss..',
      '..shssddss..',
      '..shssddss..',
      '..shssssss..',
      '..shssssss..',
      '.ssssssssss.',
      'ssssssssssss',
      '............',
    ],
    cores: { s: '#9aa3b5', h: '#d8dce8', d: '#2a2f40' },
  },
  elmo: {
    grade: [
      '............',
      '....mmmm....',
      '...mhhmmm...',
      '..mhmmmmmm..',
      '..mhmmmmmm..',
      '..mddddddm..',
      '..mmmddmmm..',
      '..mmmddmmm..',
      '..mmmddmmm..',
      '...mmmmmm...',
      '............',
      '............',
    ],
    cores: { m: '#8b7cf6', h: '#d9d3ff', d: '#1a1530' },
  },
  coracao: {
    grade: [
      '............',
      '.rrr....rrr.',
      'rhhrr..rrrrr',
      'rhrrrrrrrrrr',
      'rrrrrrrrrrrr',
      'rrrrrrrrrrrs',
      '.rrrrrrrrrs.',
      '..rrrrrrrs..',
      '...rrrrrs...',
      '....rrss....',
      '.....ss.....',
      '............',
    ],
    cores: { r: '#d4475e', h: '#ff9aa8', s: '#8a2238' },
  },
  dado: {
    grade: [
      '............',
      '.wwwwwwwwww.',
      '.wdwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwdw.',
      '.wwwwddwwww.',
      '.wwwwddwwww.',
      '.wdwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwdw.',
      '.ssssssssss.',
      '............',
    ],
    cores: { w: '#e8dccb', d: '#2a2f40', s: '#a89a86' },
  },
  cristal: {
    grade: [
      '.....ww.....',
      '....wcca....',
      '...wccbba...',
      '...wcbbba...',
      '..wccbbbba..',
      '..wcbbbbba..',
      '..wcbbbbda..',
      '...cbbbda...',
      '...abbdda...',
      '....abda....',
      '.....aa.....',
      '............',
    ],
    cores: { w: '#e8fbff', c: '#9fe8ff', b: '#4fb8d8', d: '#2d7a9c', a: '#1f5670' },
  },
  eco: {
    grade: [
      '....wwww....',
      '..wwccccww..',
      '.wccccccccw.',
      '.wcceccecccw',
      'wccceccecccw',
      'wccccccccccw',
      'wccccccccccw',
      '.wccccccccw.',
      '.wcc.cc.ccw.',
      '..c..cc..c..',
      '.....c......',
      '............',
    ],
    cores: { w: '#bff2ff', c: '#6fcfe0', e: '#1a2a3a' },
  },
};

const CONTORNO = '#07080d';

/** Pixels do ícone em uma grade 14 × 14 com contorno: [x, y, cor]. */
export function iconPixels(id: IconeId): Array<[number, number, string]> {
  const { grade, cores } = ICONES[id];
  const cheio = (x: number, y: number) => {
    const c = grade[y - 1]?.[x - 1];
    return c !== undefined && c !== '.';
  };
  const out: Array<[number, number, string]> = [];
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 14; x++) {
      if (cheio(x, y)) out.push([x, y, cores[grade[y - 1]![x - 1]!] ?? '#fff']);
      else if (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1))
        out.push([x, y, CONTORNO]);
    }
  }
  return out;
}
