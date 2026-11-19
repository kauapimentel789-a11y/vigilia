import ui from './common.module.css';

interface Props {
  valor: number;
  max: number;
  cor?: string;
  rotulo?: string;
}

/** Barra simples de progresso (vida, XP, recarga...). */
export function ProgressBar({ valor, max, cor = 'var(--color-arcane)', rotulo }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  return (
    <div
      className={ui.bar}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(valor)}
      aria-label={rotulo}
    >
      <div className={ui.barFill} style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}
