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
