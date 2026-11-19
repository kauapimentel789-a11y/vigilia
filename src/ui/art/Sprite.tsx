/** Um sprite de pixel art num canvas pequeno, para as telas fora do mapa. */
import { useEffect, useRef } from 'react';
import type { Aparencia } from './sprites.ts';
import { drawSprite } from './sprites.ts';

export function Sprite({
  ap,
  tamanho = 36,
  className,
}: {
  ap: Aparencia | undefined;
  tamanho?: number;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !ap) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    c.width = tamanho * dpr;
    c.height = tamanho * dpr;
    ctx.clearRect(0, 0, c.width, c.height);
    drawSprite(ctx, ap, c.width / 2, c.height, c.width);
  }, [ap, tamanho]);
  if (!ap) return null;
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: tamanho, height: tamanho, imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  );
}
