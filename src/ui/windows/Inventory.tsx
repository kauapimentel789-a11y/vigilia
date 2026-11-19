/**
 * Mochila e Equipamento (tecla I): vestir, tirar e jogar fora itens.
 * Ao escolher um item, mostra a diferença para o que está vestido.
 */
import { useState } from 'react';
import { CONTEUDO } from '../../content/index.ts';
import { SLOTS } from '../../engine/definitions.ts';
import type { SlotId } from '../../engine/definitions.ts';
import type { ItemInstance } from '../../engine/items/items.ts';
import { sellValue } from '../../engine/items/items.ts';
import {
  COR_RARIDADE,
  NOME_RARIDADE,
  NOME_SLOT,
  compareStats,
  nomeItem,
  slotItem,
  statLines,
  statValue,
  statsItem,
} from '../items.ts';
import { useGame } from '../store/game.ts';
import s from './Windows.module.css';

type Escolha = { onde: 'mochila'; uid: string } | { onde: 'vestido'; slot: SlotId } | null;

export function ItemCard({
  item,
  comparar,
}: {
  item: ItemInstance;
  comparar?: ItemInstance | undefined;
}) {
  const slot = slotItem(item);
  const linhas = statLines(statsItem(item));
  const diff = comparar ? statLines(compareStats(statsItem(item), statsItem(comparar))) : null;
  return (
    <div className={s.card}>
      <strong style={{ color: COR_RARIDADE[item.raridade] }}>{nomeItem(item)}</strong>
      <span className={s.muted}>
        {NOME_RARIDADE[item.raridade]} · {slot ? NOME_SLOT[slot] : '?'} · nível{' '}
        {CONTEUDO.itens.bases[item.base]?.nivel}
      </span>
      <ul className={s.stats}>
        {linhas.map((l) => (
          <li key={l.id}>
            {l.nome} <b>{statValue(l.id, l.valor)}</b>
          </li>
        ))}
      </ul>
      {diff && (
        <div className={s.diff}>
          <span className={s.muted}>Comparado ao vestido:</span>
          {diff.length === 0 ? (
            <span className={s.muted}> igual</span>
          ) : (
            <ul className={s.stats}>
              {diff.map((l) => (
                <li key={l.id} className={l.valor > 0 ? s.melhor : s.pior}>
                  {l.nome} {statValue(l.id, l.valor)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <span className={s.muted}>Vende por {sellValue(CONTEUDO, item)} ●</span>
    </div>
  );
}

export function Slot({
  item,
  rotulo,
  ativo,
  onClick,
}: {
  item?: ItemInstance | undefined;
  rotulo?: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`${s.slot} ${ativo ? s.ativo : ''}`}
      style={item ? { borderColor: COR_RARIDADE[item.raridade] } : undefined}
      onClick={onClick}
      title={item ? nomeItem(item) : rotulo}
    >
      {item ? (
        <>
          <span className={s.icone} style={{ color: COR_RARIDADE[item.raridade] }}>
            {ICONE[slotItem(item) ?? 'arma']}
          </span>
          <span className={s.slotNome}>{CONTEUDO.itens.bases[item.base]?.nome}</span>
        </>
      ) : (
        <span className={s.muted}>{rotulo}</span>
      )}
    </button>
  );
}

export const ICONE: Record<SlotId, string> = {
  arma: '⚔',
  cabeca: '⛑',
  peito: '⛨',
  maos: '✋',
  pes: '👢',
  amuleto: '◈',
};

export function Inventory({ onFechar }: { onFechar: () => void }) {
  const estado = useGame((g) => g.estado);
  const equipar = useGame((g) => g.equiparItem);
  const desequipar = useGame((g) => g.desequipar);
  const descartar = useGame((g) => g.descartar);
  const [escolha, setEscolha] = useState<Escolha>(null);
  const eq = estado.cacador.equipamento;
  const cap = CONTEUDO.itens.capacidadeMochila;

  const item =
    escolha?.onde === 'mochila'
      ? estado.mochila.find((i) => i.uid === escolha.uid)
      : escolha?.onde === 'vestido'
        ? eq[escolha.slot]
        : undefined;
  const vestidoIgual =
    item && escolha?.onde === 'mochila' ? eq[slotItem(item) ?? 'arma'] : undefined;

  return (
    <div className={s.janela} role="dialog" aria-label="Mochila e equipamento">
      <header className={s.topo}>
        <strong>Mochila e equipamento</strong>
        <button className={s.fechar} onClick={onFechar} aria-label="Fechar">
          ✕
        </button>
      </header>
      <div className={s.corpo}>
        <section>
          <h3>Vestido</h3>
          <div className={s.equip}>
            {SLOTS.map((slot) => (
              <Slot
                key={slot}
                item={eq[slot]}
                rotulo={NOME_SLOT[slot]}
                ativo={escolha?.onde === 'vestido' && escolha.slot === slot}
                onClick={() => eq[slot] && setEscolha({ onde: 'vestido', slot })}
              />
            ))}
          </div>
          <h3>
            Mochila{' '}
            <span className={s.muted}>
              {estado.mochila.length} / {cap}
            </span>
          </h3>
          <div className={s.grade}>
            {Array.from({ length: cap }, (_, i) => {
              const it = estado.mochila[i];
              return (
                <Slot
                  key={it?.uid ?? `v${i}`}
                  item={it}
                  rotulo=""
                  ativo={!!it && escolha?.onde === 'mochila' && escolha.uid === it.uid}
                  onClick={() => it && setEscolha({ onde: 'mochila', uid: it.uid })}
                />
              );
            })}
          </div>
          <p className={s.muted}>
            Se você cair, perde o que está na mochila. O que está vestido fica.
          </p>
        </section>
        <section className={s.detalhe}>
          {item ? (
            <>
              <ItemCard item={item} comparar={vestidoIgual} />
              <div className={s.acoes}>
                {escolha?.onde === 'mochila' ? (
                  <>
                    <button
                      className={s.botao}
                      onClick={() => {
                        equipar(item.uid);
                        setEscolha(null);
                      }}
                    >
                      Vestir
                    </button>
                    <button
                      className={s.botaoSec}
                      onClick={() => {
                        descartar(item.uid);
                        setEscolha(null);
                      }}
                    >
                      Jogar fora
                    </button>
                  </>
                ) : (
                  <button
                    className={s.botaoSec}
                    onClick={() => {
                      if (escolha?.onde === 'vestido') desequipar(escolha.slot);
                      setEscolha(null);
                    }}
                  >
                    Tirar
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className={s.muted}>Escolha um item para ver os detalhes.</p>
          )}
        </section>
      </div>
    </div>
  );
}
