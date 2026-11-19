import type { CardDef } from '../../../engine/combat/index.ts';
import styles from './Card.module.css';

const TIPO: Record<CardDef['tipo'], string> = {
  ataque: 'Ataque',
  defesa: 'Defesa',
  tecnica: 'Técnica',
  invocacao: 'Invocação',
  ritual: 'Ritual',
};

const RARIDADE: Record<CardDef['raridade'], string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  rara: 'Rara',
};

const GLOSSARIO: Array<[RegExp, string]> = [
  [/Avivar/, 'Avivar X: ao jogar, você pode pagar X de Brasa para o efeito extra.'],
  [/Consumir/, 'Consumir: a carta sai do combate depois de jogada.'],
  [/Ritual/, 'Ritual: fica ativo até o fim do combate. Dispara a partir do próximo turno.'],
  [/Vulnerável/, 'Vulnerável: recebe 50% a mais de dano.'],
  [/Marca/, 'Marca: cada golpe recebido causa +X de dano.'],
  [/Veneno/, 'Veneno: perde X de vida no início do turno, ignorando bloqueio.'],
  [/Brasa/, 'Brasa: a energia que sobra no fim do turno vira Brasa (até 3).'],
];

export interface CardProps {
  def: CardDef;
  /** Há energia para jogar. */
  jogavel: boolean;
  selecionada: boolean;
  brasa: number;
  avivar: boolean;
  onClick: () => void;
  onToggleAvivar: () => void;
}

export function Card({
  def,
  jogavel,
  selecionada,
  brasa,
  avivar,
  onClick,
  onToggleAvivar,
}: CardProps) {
  const dica = GLOSSARIO.filter(([re]) => re.test(def.texto))
    .map(([, t]) => t)
    .join('\n');
  const podeAvivar = def.avivar ? brasa >= def.avivar.custo : false;
  const classes = [
    styles.card,
    styles[def.raridade],
    selecionada ? styles.selected : '',
    jogavel ? '' : styles.disabled,
  ].join(' ');

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={classes}
        onClick={onClick}
        aria-pressed={selecionada}
        aria-label={`${def.nome}, custo ${def.custo}. ${def.texto}`}
        {...(dica ? { 'data-tip': dica } : {})}
      >
        <span className={styles.cost}>{def.custo}</span>
        <span className={styles.art} aria-hidden="true">
          <span className={styles.artGlyph}>{TIPO[def.tipo].charAt(0)}</span>
        </span>
        <span className={styles.name}>{def.nome}</span>
        <span className={styles.meta}>
          {TIPO[def.tipo]} · {RARIDADE[def.raridade]}
        </span>
        <span className={styles.text}>{def.texto}</span>
      </button>
      {selecionada && def.avivar && (
        <button
          type="button"
          className={`${styles.avivar} ${avivar ? styles.avivarOn : ''}`}
          onClick={onToggleAvivar}
          disabled={!podeAvivar}
          aria-pressed={avivar}
          data-tip={
            podeAvivar
              ? `Pagar ${def.avivar.custo} Brasa para o efeito avivado.`
              : `Precisa de ${def.avivar.custo} Brasa. A carta pode ser jogada sem avivar.`
          }
          data-tip-pos="below"
        >
          Avivar {def.avivar.custo} {avivar ? '· ligado' : ''}
        </button>
      )}
    </div>
  );
}
