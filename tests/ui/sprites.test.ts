import { describe, expect, it } from 'vitest';
import { CONTEUDO } from '../../src/content/index.ts';
import { APARENCIA, APARENCIA_ARENA, FORMAS, pixels } from '../../src/ui/art/sprites.ts';

describe('sprites', () => {
  it('toda forma é uma grade 16 × 16 com letras conhecidas', () => {
    for (const [nome, g] of Object.entries(FORMAS)) {
      expect(g, nome).toHaveLength(16);
      for (const linha of g) expect(linha, `${nome}: "${linha}"`).toMatch(/^[.bshawme]{16}$/);
    }
  });

  it('todo monstro e toda unidade da Arena têm aparência', () => {
    for (const id of Object.keys(CONTEUDO.inimigos)) expect(APARENCIA[id], id).toBeDefined();
    for (const id of Object.keys(CONTEUDO.arena.unidades))
      expect(APARENCIA_ARENA[id], id).toBeDefined();
  });

  it('o contorno envolve o desenho', () => {
    const px = pixels(APARENCIA.cacador!);
    expect(px).toHaveLength(18);
    expect(px[1]![7]).toBe('#07080d'); // acima do capuz
    expect(px[2]![7]).not.toBeNull();
  });
});

describe('ícones', () => {
  it('todo ícone é uma grade 12 × 12 com cores para cada letra', async () => {
    const { ICONES } = await import('../../src/ui/art/icons.ts');
    for (const [nome, d] of Object.entries(ICONES)) {
      expect(d.grade, nome).toHaveLength(12);
      for (const linha of d.grade) {
        expect(linha, `${nome}: "${linha}"`).toHaveLength(12);
        for (const c of linha) if (c !== '.') expect(d.cores[c], `${nome}: ${c}`).toBeDefined();
      }
    }
  });
});
