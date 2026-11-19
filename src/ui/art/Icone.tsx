/** Ícone de pixel art em SVG (nítido em qualquer tamanho). */
import { memo } from 'react';
import type { IconeId } from './icons.ts';
import { iconPixels } from './icons.ts';

export const Icone = memo(function Icone({
  id,
  tamanho = 20,
  className,
  titulo,
}: {
  id: IconeId;
  tamanho?: number;
  className?: string | undefined;
  titulo?: string;
}) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={tamanho}
      height={tamanho}
      shapeRendering="crispEdges"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      style={{ flex: 'none' }}
    >
      {iconPixels(id).map(([x, y, cor]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={cor} />
      ))}
    </svg>
  );
});
