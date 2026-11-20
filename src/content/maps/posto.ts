/**
 * Posto da Vigília: a base segura. Sem monstros.
 * Legenda: # parede · . chão · , chão com detalhe · ~ água · @ início · 1-5 portões da Cinza
 * R Exame de Rank · 6-0 portões da Brasa · V Exame do Véu · P Q W portões do Véu
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
    '#,#M.B#,,,,,,~~~~,,,,#A.X#,#',
    '#,#...#,,,,~~~~~~~,,,#...#,#',
    '#,##.##,,,~~~~~~~~~,,##.##,#',
    '#,,,,,,,,,,,~~~~~~,,,,,,,,,#',
    '#,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,@.,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,1,,,,2,,,,3,,,,4,,,,5,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,R,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,6,,,,7,,,,8,,,,9,,,,0,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,V,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,P,,,,,,Q,,,,,,W,,,,,,#',
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
      R: { destino: 'exameBrasa', rotulo: 'Exame de Rank' },
      '6': { destino: 'brasa1', rotulo: 'Brasa I' },
      '7': { destino: 'brasa2', rotulo: 'Brasa II' },
      '8': { destino: 'brasa3', rotulo: 'Brasa III' },
      '9': { destino: 'brasa4', rotulo: 'Brasa IV' },
      '0': { destino: 'brasa5', rotulo: 'Brasa V' },
      V: { destino: 'exameVeu', rotulo: 'Exame do Véu' },
      P: { destino: 'veu1', rotulo: 'Véu I' },
      Q: { destino: 'veu2', rotulo: 'Véu II' },
      W: { destino: 'veu3', rotulo: 'Véu III' },
    },
  },
};
