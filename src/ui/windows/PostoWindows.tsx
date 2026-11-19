/** Janelas dos personagens do Posto: mercadora, baú, altar e mesa de expedições. */
import type { ReactNode } from 'react';
import { useState } from 'react';
import { CONTEUDO } from '../../content/index.ts';
import { sellValue } from '../../engine/items/items.ts';
import { Abilities } from '../screens/Abilities/Abilities.tsx';
import { Expedition } from '../screens/Expedition/Expedition.tsx';
import { Hunter } from '../screens/Hunter/Hunter.tsx';
import { COR_RARIDADE, nomeItem } from '../items.ts';
import { useGame } from '../store/game.ts';
import { ItemCard } from './Inventory.tsx';
import s from './Windows.module.css';

export function Janela({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <div className={s.janela} role="dialog" aria-label={titulo}>
      <header className={s.topo}>
        <strong>{titulo}</strong>
        <button className={s.fechar} onClick={onFechar} aria-label="Fechar">
          ✕
        </button>
      </header>
      {children}
    </div>
  );
}

export function Merchant({ onFechar }: { onFechar: () => void }) {
  const estado = useGame((g) => g.estado);
  const vender = useGame((g) => g.vender);
  const comprar = useGame((g) => g.comprarPocoes);
  const [ver, setVer] = useState<string | null>(null);
  const p = CONTEUDO.itens.pocao;
  const comuns = estado.mochila.filter((i) => i.raridade === 'comum');
  const item = estado.mochila.find((i) => i.uid === ver);
  const faltam = p.maximo - estado.pocoes;
  return (
    <Janela titulo="Mercadora" onFechar={onFechar}>
      <div className={s.corpo}>
        <section className={s.lista}>
          <h3>Poções de vida</h3>
          <p className={s.muted}>
            Curam {Math.round(p.curaPct * 100)}% da vida (tecla Q), recarga de {p.recargaS} s. Você
            tem {estado.pocoes} de {p.maximo}.
          </p>
          <div className={s.acoes}>
            <button
              className={s.botao}
              disabled={faltam <= 0 || estado.ouro < p.preco}
              onClick={() => comprar(1)}
            >
              Comprar 1 ({p.preco} ●)
            </button>
            <button
              className={s.botaoSec}
              disabled={faltam <= 0 || estado.ouro < p.preco}
              onClick={() => comprar(Math.min(faltam, Math.floor(estado.ouro / p.preco)))}
            >
              Encher ({Math.min(faltam, Math.floor(estado.ouro / p.preco)) * p.preco} ●)
            </button>
          </div>
          <h3>Vender da mochila</h3>
          {estado.mochila.length === 0 && <p className={s.muted}>A mochila está vazia.</p>}
          {comuns.length > 1 && (
            <button className={s.botaoSec} onClick={() => vender(comuns.map((i) => i.uid))}>
              Vender todos os Comuns ({comuns.reduce((t, i) => t + sellValue(CONTEUDO, i), 0)} ●)
            </button>
          )}
          {estado.mochila.map((i) => (
            <div key={i.uid} className={s.linha}>
              <button
                className={s.fechar}
                style={{ color: COR_RARIDADE[i.raridade], fontSize: '0.85rem', textAlign: 'left' }}
                onClick={() => setVer(i.uid)}
              >
                {nomeItem(i)}
              </button>
              <button className={s.botaoSec} onClick={() => vender([i.uid])}>
                {sellValue(CONTEUDO, i)} ●
              </button>
            </div>
          ))}
        </section>
        <section className={s.detalhe}>
          {item ? (
            <ItemCard
              item={item}
              comparar={estado.cacador.equipamento[CONTEUDO.itens.bases[item.base]?.slot ?? 'arma']}
            />
          ) : (
            <p className={s.muted}>Toque no nome de um item para ver os detalhes.</p>
          )}
        </section>
      </div>
    </Janela>
  );
}

export function Chest({ onFechar }: { onFechar: () => void }) {
  const estado = useGame((g) => g.estado);
  const guardar = useGame((g) => g.guardar);
  const retirar = useGame((g) => g.retirar);
  const it = CONTEUDO.itens;
  return (
    <Janela titulo="Baú do Posto" onFechar={onFechar}>
      <div className={s.corpo}>
        <section className={s.lista}>
          <h3>
            Mochila{' '}
            <span className={s.muted}>
              {estado.mochila.length} / {it.capacidadeMochila}
            </span>
          </h3>
          {estado.mochila.length === 0 && <p className={s.muted}>Vazia.</p>}
          {estado.mochila.map((i) => (
            <div key={i.uid} className={s.linha}>
              <span style={{ color: COR_RARIDADE[i.raridade] }}>{nomeItem(i)}</span>
              <button className={s.botaoSec} onClick={() => guardar(i.uid)}>
                Guardar →
              </button>
            </div>
          ))}
          {estado.mochila.length > 0 && (
            <button
              className={s.botao}
              onClick={() => estado.mochila.forEach((i) => guardar(i.uid))}
            >
              Guardar tudo
            </button>
          )}
        </section>
        <section className={s.lista}>
          <h3>
            Baú{' '}
            <span className={s.muted}>
              {estado.bau.length} / {it.capacidadeBau}
            </span>
          </h3>
          <p className={s.muted}>O que está no baú nunca se perde.</p>
          {estado.bau.map((i) => (
            <div key={i.uid} className={s.linha}>
              <button className={s.botaoSec} onClick={() => retirar(i.uid)}>
                ← Pegar
              </button>
              <span style={{ color: COR_RARIDADE[i.raridade] }}>{nomeItem(i)}</span>
            </div>
          ))}
        </section>
      </div>
    </Janela>
  );
}

export function Altar({ onFechar }: { onFechar: () => void }) {
  const [aba, setAba] = useState<'atributos' | 'habilidades'>('atributos');
  return (
    <Janela titulo="Altar da Vigília" onFechar={onFechar}>
      <div className={s.abas}>
        <button
          className={aba === 'atributos' ? s.botao : s.botaoSec}
          onClick={() => setAba('atributos')}
        >
          Atributos
        </button>
        <button
          className={aba === 'habilidades' ? s.botao : s.botaoSec}
          onClick={() => setAba('habilidades')}
        >
          Habilidades
        </button>
      </div>
      <div className={s.rolagem}>{aba === 'atributos' ? <Hunter /> : <Abilities />}</div>
    </Janela>
  );
}

export function ExpeditionTable({ onFechar }: { onFechar: () => void }) {
  return (
    <Janela titulo="Mesa de Expedições" onFechar={onFechar}>
      <div className={s.rolagem}>
        <Expedition />
      </div>
    </Janela>
  );
}
