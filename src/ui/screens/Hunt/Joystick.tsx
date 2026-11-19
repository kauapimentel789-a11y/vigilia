/** Joystick virtual para telas de toque: 8 direções, como as setas. */
import { useRef, useState } from 'react';
import s from './Hunt.module.css';

export function Joystick({ onDir }: { onDir: (d: [number, number]) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [pino, setPino] = useState<[number, number]>([0, 0]);

  const mover = (e: React.PointerEvent) => {
    const r = base.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const max = r.width / 2 - 14;
    const k = dist > max ? max / dist : 1;
    setPino([dx * k, dy * k]);
    if (dist < 14) return onDir([0, 0]);
    const ang = Math.atan2(dy, dx);
    const setor = Math.round(ang / (Math.PI / 4));
    onDir([
      Math.round(Math.cos((setor * Math.PI) / 4)),
      Math.round(Math.sin((setor * Math.PI) / 4)),
    ]);
  };
  const soltar = () => {
    setPino([0, 0]);
    onDir([0, 0]);
  };

  return (
    <div
      ref={base}
      className={s.joystick}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        mover(e);
      }}
      onPointerMove={(e) => e.buttons > 0 && mover(e)}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      aria-label="Joystick: arraste para andar"
    >
      <span className={s.pino} style={{ transform: `translate(${pino[0]}px, ${pino[1]}px)` }} />
    </div>
  );
}
