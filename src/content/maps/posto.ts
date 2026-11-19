/**
 * Posto da Vigília: a base segura. Sem monstros.
 * Legenda: # parede · . chão · , chão com detalhe · ~ água · @ início · 1-5 portões dos portais
 * M mercadora · B baú · A altar dos atributos · X mesa de expedições
 */
import type { MapDef } from '../../engine/definitions.ts';

export const POSTO: MapDef = {
  id: 'posto',
  nome: 'Posto da Vigília',
  tipo: 'posto',
  linhas: [
    '############################',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,#####,,,,,,,,,,,,,,#####,#',
    '#,#M.B#,,,,,,,,,,,,,,#A.X#,#',
    '#,#...#,,,,~~~~~~,,,,#...#,#',
    '#,##.##,,,,~~~~~~,,,,##.##,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,@.,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,1,,,,2,,,,3,,,,4,,,,5,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '############################',
  ],
  legenda: {
    objetos: { M: 'mercadora', B: 'bau', A: 'altar', X: 'expedicao' },
    portoes: {
      '1': { destino: 'cinza1', rotulo: 'Cinza I' },
      '2': { destino: 'cinza2', rotulo: 'Cinza II' },
      '3': { destino: 'cinza3', rotulo: 'Cinza III' },
      '4': { destino: 'cinza4', rotulo: 'Cinza IV' },
      '5': { destino: 'cinza5', rotulo: 'Cinza V' },
    },
  },
};
