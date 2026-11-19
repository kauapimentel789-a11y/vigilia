/** Formatação de números e tempos para a interface. */
const nf = new Intl.NumberFormat('pt-BR');

export const num = (n: number) => nf.format(Math.floor(n));

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function duracao(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(ss).padStart(2, '0')} s`;
  return `${ss} s`;
}
