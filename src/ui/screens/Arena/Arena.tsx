/**
 * Arena: auto-battler contra adversários do jogo.
 *
 * Saguão (herói e Glória) → fase de compras (loja, banco, tabuleiro) → luta
 * assistida → próxima rodada, até sobrar um. A tela só chama a store.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTEUDO } from '../../../content/index.ts';
import type { ArenaUnitInst } from '../../../engine/arena/battle.ts';
import { activeMarcas, countMarcas } from '../../../engine/arena/battle.ts';
import type { ArenaMatch, Lugar } from '../../../engine/arena/match.ts';
import { boardCount, standings, unitValue, xpToLevel } from '../../../engine/arena/match.ts';
import type { MarcaId } from '../../../engine/definitions.ts';
import { MARCAS } from '../../../engine/definitions.ts';
import type { ArenaRoundOutcome } from '../../../engine/game/arena.ts';
import { isHeroUnlocked } from '../../../engine/game/arena.ts';
import type { LinhaRanking, ResultadoOnline } from '../../cloud/arena.ts';
import { buscarRanking, buscarRivais, registrarPartida } from '../../cloud/arena.ts';
import { useCloud } from '../../cloud/cloud.ts';
import { Sprite } from '../../art/Sprite.tsx';
import { APARENCIA_ARENA } from '../../art/sprites.ts';
import ui from '../../components/common.module.css';
import { useGame } from '../../store/game.ts';
import s from './Arena.module.css';

const A = CONTEUDO.arena;
const R = A.regras;

export const COR_MARCA: Record<MarcaId, string> = {
  cinzas: '#9aa3b5',
  ossos: '#d8d0b8',
  veu: '#8b7cf6',
  chama: '#ff9a3c',
  abismo: '#4fb3a6',
};

const COR_CUSTO = ['', '#7d8499', '#4fa3c7', '#b07cf6'];

export function Arena() {
  const partida = useGame((g) => g.estado.arena.partida);
  const [rodada, setRodada] = useState<ArenaRoundOutcome | null>(null);
  if (rodada?.relatorio.minha) {
    return (
      <Replay
        resultado={rodada}
        partida={partida}
        onFim={() =>
          setRodada(
            rodada.fim ? { ...rodada, relatorio: { ...rodada.relatorio, minha: null } } : null,
          )
        }
      />
    );
  }
  if (!partida) return <Saguao />;
  if (partida.fim)
    return <Final partida={partida} fim={rodada?.fim ?? null} onSair={() => setRodada(null)} />;
  return <Compras partida={partida} onLuta={setRodada} />;
}

/* ---------- Saguão ---------- */

function Saguao() {
  const estado = useGame((g) => g.estado);
  const escolher = useGame((g) => g.arenaHeroi);
  const comecar = useGame((g) => g.arenaComecar);
  const gastar = useGame((g) => g.gastarGloria);
  const usuario = useCloud((c) => c.usuario);
  const nome = useCloud((c) => c.nome);
  const [buscando, setBuscando] = useState(false);
  const ar = estado.arena;
  const iniciar = async () => {
    setBuscando(true);
    const rivais = await buscarRivais(R.jogadores - 1);
    setBuscando(false);
    comecar(rivais, nome ?? 'Você');
  };
  return (
    <div className={s.saguao}>
      <section className={ui.panel}>
        <div className={ui.row}>
          <h2 className={ui.title}>Arena</h2>
          <span className={ui.spacer} />
          <span className={ui.tag}>Glória {ar.gloria}</span>
        </div>
        <p className={ui.muted}>
          Monte um time na loja, posicione no tabuleiro e veja a luta acontecer sozinha. Você
          enfrenta {R.jogadores - 1} rivais; quem perde a luta perde vida. Três cópias iguais viram
          uma de ★★. Unidades da mesma marca ativam bônus.
        </p>
        <p className={ui.muted}>
          Partidas: {ar.partidas}
          {ar.melhorLugar ? ` · melhor colocação: ${ar.melhorLugar}º` : ''}
        </p>
        <p className={ui.muted}>
          {usuario
            ? 'Conectado: seus rivais podem ser times montados por outros jogadores, e o resultado vai para o ranking.'
            : 'Sem conta, os rivais são controlados pelo jogo. Entre na aba Caçador para enfrentar outros jogadores.'}
        </p>
        <button
          className={`${ui.button} ${ui.primary}`}
          disabled={buscando}
          onClick={() => void iniciar()}
        >
          {buscando ? 'Procurando rivais…' : 'Começar partida'}
        </button>
      </section>

      <Ranking />

      <section className={ui.panel}>
        <h2 className={ui.title}>Herói da Arena</h2>
        <p className={ui.muted}>
          Um poder passivo para a partida. Todos começam com o Vigia; os outros são liberados pelos
          Selos dos chefes da Caçada.
        </p>
        <ul className={s.herois}>
          {Object.values(A.herois).map((h) => {
            const livre = isHeroUnlocked(estado, CONTEUDO, h.id);
            const ativo = ar.heroi === h.id;
            return (
              <li key={h.id}>
                <button
                  className={`${s.heroi} ${ativo ? s.ativo : ''}`}
                  disabled={!livre}
                  onClick={() => escolher(h.id)}
                  aria-pressed={ativo}
                >
                  <strong>
                    {livre ? '' : '🔒 '}
                    {h.nome}
                  </strong>
                  <span>{h.descricao}</span>
                  {!livre && h.selo && (
                    <span className={ui.muted}>Pede: {CONTEUDO.selos[h.selo]?.nome}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={ui.panel}>
        <h2 className={ui.title}>Glória</h2>
        <p className={ui.muted}>
          Ganha pela colocação ({R.gloria.map((g, i) => `${i + 1}º: ${g}`).join(', ')}). Troque por
          ajuda na Caçada.
        </p>
        <div className={ui.row}>
          <button
            className={ui.button}
            disabled={ar.gloria < A.ofertas.pocao.custo}
            onClick={() => gastar('pocao')}
          >
            1 poção ({A.ofertas.pocao.custo} Glória)
          </button>
          <button
            className={ui.button}
            disabled={ar.gloria < A.ofertas.ouro.custo}
            onClick={() => gastar('ouro')}
          >
            {A.ofertas.ouro.porLevel * estado.cacador.level} ouro ({A.ofertas.ouro.custo} Glória)
          </button>
        </div>
      </section>

      <section className={ui.panel}>
        <h2 className={ui.title}>Marcas</h2>
        <ul className={s.marcasLista}>
          {MARCAS.map((m) => (
            <li key={m}>
              <MarcaChip m={m} />
              <span className={ui.muted}>
                {A.marcas[m].niveis.map((n) => `(${n.qtd}) ${n.texto}`).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Fase de compras ---------- */

function Compras({
  partida,
  onLuta,
}: {
  partida: ArenaMatch;
  onLuta: (r: ArenaRoundOutcome) => void;
}) {
  const comprar = useGame((g) => g.arenaComprar);
  const vender = useGame((g) => g.arenaVender);
  const rolar = useGame((g) => g.arenaRolar);
  const xp = useGame((g) => g.arenaXp);
  const mover = useGame((g) => g.arenaMover);
  const lutar = useGame((g) => g.arenaLutar);
  const sair = useGame((g) => g.arenaSair);
  const [sel, setSel] = useState<string | null>(null);
  const [desistir, setDesistir] = useState(false);
  const eu = partida.jogadores[0]!;
  const todas = [...eu.tabuleiro, ...eu.banco];
  const escolhida = todas.find((u) => u?.uid === sel) ?? null;

  const clicar = (lugar: Lugar) => {
    const aqui = eu[lugar.onde][lugar.i] ?? null;
    if (sel && aqui?.uid !== sel) {
      if (mover(sel, lugar)) setSel(null);
      return;
    }
    setSel(aqui && aqui.uid !== sel ? aqui.uid : null);
  };

  const ativos = activeMarcas(A, eu.tabuleiro);
  const qtd = countMarcas(A, eu.tabuleiro);
  const prox = xpToLevel(A, eu.nivel);

  return (
    <div className={s.compras}>
      <div className={s.barra}>
        <strong>Rodada {partida.rodada}</strong>
        <span className={s.vida}>♥ {eu.vida}</span>
        <span className={s.ouro}>● {eu.ouro}</span>
        <span>
          Nível {eu.nivel}
          {eu.nivel < R.nivelMax && (
            <span className={ui.muted}>
              {' '}
              ({eu.xp}/{prox} XP)
            </span>
          )}
        </span>
        <span className={ui.muted}>
          Tabuleiro {boardCount(eu)}/{eu.nivel}
        </span>
        <span className={ui.spacer} />
        <button
          className={ui.button}
          onClick={xp}
          disabled={eu.ouro < R.custoXp || eu.nivel >= R.nivelMax}
        >
          XP +{R.xpPorCompra} ({R.custoXp}●)
        </button>
        <button
          className={ui.button}
          onClick={rolar}
          disabled={eu.rolagensGratis <= 0 && eu.ouro < R.custoRolar}
        >
          Rolar ({eu.rolagensGratis > 0 ? 'grátis' : `${R.custoRolar}●`})
        </button>
        <button
          className={`${ui.button} ${ui.primary}`}
          onClick={() => {
            setSel(null);
            const r = lutar();
            if (r) onLuta(r);
          }}
        >
          Lutar ▶
        </button>
      </div>

      <div className={s.meio}>
        <section className={`${ui.panel} ${s.campo}`}>
          <div className={ui.row}>
            <h2 className={ui.title}>Tabuleiro</h2>
            <span className={ui.muted}>
              Frente em cima. Corpo a corpo atrás de um aliado espera a frente cair.
            </span>
          </div>
          <div className={s.tabuleiro}>
            {eu.tabuleiro.map((u, i) => (
              <Casa
                key={i}
                u={u}
                sel={sel}
                rotulo={i < R.colunas ? 'frente' : 'trás'}
                onClick={() => clicar({ onde: 'tabuleiro', i })}
              />
            ))}
          </div>
          <h3 className={s.subtitulo}>Banco</h3>
          <div className={s.banco}>
            {eu.banco.map((u, i) => (
              <Casa key={i} u={u} sel={sel} onClick={() => clicar({ onde: 'banco', i })} />
            ))}
          </div>
          <h3 className={s.subtitulo}>Loja</h3>
          <div className={s.loja}>
            {eu.loja.map((id, i) => {
              const def = id ? A.unidades[id] : undefined;
              return (
                <button
                  key={i}
                  className={s.carta}
                  disabled={!def || eu.ouro < def.custo}
                  onClick={() => comprar(i)}
                  style={def ? { borderColor: COR_CUSTO[def.custo] } : undefined}
                >
                  {def ? (
                    <>
                      <Sprite ap={APARENCIA_ARENA[def.id]} tamanho={40} />
                      <span className={s.cartaNome}>{def.nome}</span>
                      <span className={s.marcasMini}>
                        {def.marcas.map((m) => (
                          <MarcaChip key={m} m={m} mini />
                        ))}
                      </span>
                      <span className={s.custo}>{def.custo}●</span>
                    </>
                  ) : (
                    <span className={ui.muted}>vendida</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className={s.lateral}>
          {escolhida ? (
            <Detalhe
              u={escolhida}
              onVender={() => {
                vender(escolhida.uid);
                setSel(null);
              }}
            />
          ) : (
            <section className={ui.panel}>
              <p className={ui.muted}>
                Toque numa unidade para ver detalhes; depois toque num lugar vazio (ou em outra
                unidade) para mover.
              </p>
            </section>
          )}
          <section className={ui.panel}>
            <h2 className={ui.title}>Marcas ativas</h2>
            <ul className={s.marcasLista}>
              {MARCAS.filter((m) => qtd[m] > 0).map((m) => {
                const nivel = A.marcas[m].niveis[ativos[m]];
                const proximo = A.marcas[m].niveis[ativos[m] + 1];
                return (
                  <li key={m} className={nivel ? '' : s.inativa}>
                    <MarcaChip m={m} /> {qtd[m]}
                    {proximo ? `/${proximo.qtd}` : ''}
                    <span className={ui.muted}> {nivel?.texto ?? ''}</span>
                  </li>
                );
              })}
              {MARCAS.every((m) => qtd[m] === 0) && (
                <li className={ui.muted}>Nenhuma unidade no tabuleiro.</li>
              )}
            </ul>
          </section>
          <Jogadores partida={partida} />
          <section className={ui.panel}>
            {desistir ? (
              <div className={ui.row}>
                <span>Desistir? Não ganha Glória.</span>
                <button className={ui.danger} onClick={sair}>
                  Desistir
                </button>
                <button className={ui.button} onClick={() => setDesistir(false)}>
                  Voltar
                </button>
              </div>
            ) : (
              <button className={ui.small} onClick={() => setDesistir(true)}>
                Desistir da partida
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Casa({
  u,
  sel,
  rotulo,
  onClick,
}: {
  u: ArenaUnitInst | null | undefined;
  sel: string | null;
  rotulo?: string;
  onClick: () => void;
}) {
  const def = u ? A.unidades[u.def] : undefined;
  return (
    <button
      className={`${s.casa} ${u && u.uid === sel ? s.selecionada : ''} ${sel && !u ? s.destino : ''}`}
      onClick={onClick}
      style={def ? { borderColor: COR_CUSTO[def.custo] } : undefined}
      aria-label={def ? `${def.nome} ${u!.estrelas} estrelas` : `Lugar vazio ${rotulo ?? ''}`}
    >
      {def && u ? (
        <>
          <span className={s.estrelas}>{'★'.repeat(u.estrelas)}</span>
          <Sprite ap={APARENCIA_ARENA[def.id]} tamanho={32} />
          <span className={s.casaNome}>{def.nome}</span>
          <span className={s.marcasMini}>
            {def.marcas.map((m) => (
              <MarcaChip key={m} m={m} mini />
            ))}
          </span>
        </>
      ) : (
        <span className={s.vazio}>{rotulo ?? ''}</span>
      )}
    </button>
  );
}

function Detalhe({ u, onVender }: { u: ArenaUnitInst; onVender: () => void }) {
  const def = A.unidades[u.def]!;
  const mult = R.multEstrela[u.estrelas - 1] ?? 1;
  return (
    <section className={ui.panel}>
      <div className={ui.row}>
        <h2 className={ui.title}>
          {def.nome} <span className={s.estrelas}>{'★'.repeat(u.estrelas)}</span>
        </h2>
      </div>
      <div className={s.marcasMini}>
        {def.marcas.map((m) => (
          <MarcaChip key={m} m={m} />
        ))}
      </div>
      <p className={ui.muted}>
        Vida {Math.round(def.vida * mult)} · Ataque {Math.round(def.ataque * mult)} · Velocidade{' '}
        {def.velocidade} · {def.alcance > 1 ? `Alcance ${def.alcance}` : 'Corpo a corpo'}
      </p>
      <p>
        <strong>{def.habilidade.nome}:</strong> {def.habilidade.descricao}
      </p>
      <button className={ui.button} onClick={onVender}>
        Vender (+{unitValue(A, u)}●)
      </button>
    </section>
  );
}

export function MarcaChip({ m, mini = false }: { m: MarcaId; mini?: boolean }) {
  return (
    <span
      className={mini ? s.chipMini : s.chip}
      style={{ color: COR_MARCA[m], borderColor: COR_MARCA[m] }}
      title={A.marcas[m].nome}
    >
      {mini ? A.marcas[m].nome.slice(0, 2) : A.marcas[m].nome}
    </span>
  );
}

function Jogadores({ partida }: { partida: ArenaMatch }) {
  return (
    <section className={ui.panel}>
      <h2 className={ui.title}>Jogadores</h2>
      <ul className={s.jogadores}>
        {standings(partida).map((p) => (
          <li key={p.id} className={p.caiuNaRodada !== null ? s.caido : ''}>
            <span>
              {p.bot ? p.nome : <strong>{p.nome}</strong>}
              <span className={ui.muted}>
                {' '}
                · {A.herois[p.heroi]?.nome}
                {p.sombra ? ' · jogador' : ''}
              </span>
            </span>
            <span className={s.vida}>♥ {p.vida}</span>
            <div className={s.vidaBarra}>
              <div
                style={{
                  width: `${Math.max(0, (p.vida / (R.vidaJogador + 6)) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ranking() {
  const disponivel = useCloud((c) => c.disponivel);
  const [linhas, setLinhas] = useState<LinhaRanking[] | null>(null);
  useEffect(() => {
    if (disponivel) void buscarRanking().then(setLinhas);
  }, [disponivel]);
  if (!disponivel) return null;
  return (
    <section className={ui.panel}>
      <h2 className={ui.title}>Ranking da Arena</h2>
      {linhas === null ? (
        <p className={ui.muted}>Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className={ui.muted}>Ninguém pontuou ainda. Seja o primeiro.</p>
      ) : (
        <ol className={s.ranking}>
          {linhas.map((l, i) => (
            <li key={`${l.nome}-${i}`}>
              <span>{l.nome}</span>
              <span className={ui.muted}>
                {l.partidas} partidas · {l.vitorias} vitórias
              </span>
              <strong>{l.gloria}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ---------- Luta ---------- */

function Replay({
  resultado,
  partida,
  onFim,
}: {
  resultado: ArenaRoundOutcome;
  partida: ArenaMatch | null;
  onFim: () => void;
}) {
  const minha = resultado.relatorio.minha!;
  const b = minha.batalha;
  const [vel, setVel] = useState(1);
  const [t, setT] = useState(0);
  const velRef = useRef(vel);
  useEffect(() => {
    velRef.current = vel;
  }, [vel]);
  const acabou = t >= b.duracaoMs;

  useEffect(() => {
    let raf = 0;
    let ultimo = performance.now();
    const passo = (agora: number) => {
      const dt = Math.min(100, agora - ultimo);
      ultimo = agora;
      setT((x) => Math.min(b.duracaoMs, x + dt * velRef.current));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [b.duracaoMs]);

  const quadro = useMemo(() => {
    let q = b.quadros[0]!;
    for (const f of b.quadros) {
      if (f.t > t) break;
      q = f;
    }
    return q;
  }, [b.quadros, t]);

  const meu = minha.souA ? 0 : 1;
  const outro = (minha.souA ? minha.luta.b : minha.luta.a) as number;
  const rival = partida?.jogadores[outro];
  const recentes = b.eventos.filter(
    (e) =>
      e.t <= t &&
      e.t > t - 700 &&
      (e.tipo === 'dano' ||
        e.tipo === 'cura' ||
        e.tipo === 'perdaDeVida' ||
        e.tipo === 'habilidade'),
  );

  const lado = (time: 0 | 1, cima: boolean) => {
    // O rival aparece em cima com a frente perto do meio; o seu time, embaixo, frente em cima.
    const linhas = cima ? [1, 0] : [0, 1];
    return (
      <div className={s.ladoLuta}>
        {linhas.map((linha) => (
          <div key={linha} className={s.linhaLuta}>
            {Array.from({ length: R.colunas }, (_, col) => {
              const pos = linha * R.colunas + col;
              const idx = b.unidades.findIndex((u) => u.time === time && u.pos === pos);
              const un = b.unidades[idx];
              const v = quadro.u[idx];
              if (!un || !v) return <div key={col} className={s.vagaLuta} />;
              const [vida, bloqueio, mana] = v;
              const flut = recentes.filter((e) =>
                e.tipo === 'habilidade' ? e.origem === un.uid : 'alvo' in e && e.alvo === un.uid,
              );
              return (
                <div key={col} className={`${s.lutador} ${vida <= 0 ? s.morto : ''}`}>
                  <span className={s.estrelas}>{'★'.repeat(un.estrelas)}</span>
                  <Sprite
                    ap={APARENCIA_ARENA[un.def]}
                    tamanho={36}
                    className={time === 1 ? s.espelhado : undefined}
                  />
                  <span className={s.casaNome}>{un.nome}</span>
                  <div className={s.hp}>
                    <div style={{ width: `${(vida / un.vidaMax) * 100}%` }} />
                    {bloqueio > 0 && (
                      <div
                        className={s.hpBloqueio}
                        style={{ width: `${Math.min(100, (bloqueio / un.vidaMax) * 100)}%` }}
                      />
                    )}
                  </div>
                  <div className={s.mana}>
                    <div style={{ width: `${mana}%` }} />
                  </div>
                  <div className={s.flutuantes}>
                    {flut.slice(-2).map((e, k) => (
                      <span
                        key={k}
                        className={
                          e.tipo === 'cura'
                            ? s.fCura
                            : e.tipo === 'habilidade'
                              ? s.fHab
                              : e.tipo === 'perdaDeVida'
                                ? s.fStatus
                                : s.fDano
                        }
                      >
                        {e.tipo === 'habilidade'
                          ? e.nome
                          : e.tipo === 'cura'
                            ? `+${e.valor}`
                            : 'valor' in e
                              ? `${e.valor}${e.tipo === 'dano' && e.critico ? '!' : ''}`
                              : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const venceu = b.vencedor === meu;
  const empate = b.vencedor === null;
  const dano = minha.souA ? minha.luta.danoA : minha.luta.danoB;

  return (
    <div className={s.replay}>
      <div className={s.barra}>
        <strong>Rodada {resultado.relatorio.rodada}</strong>
        <span>
          contra {rival?.nome ?? 'rival'}
          {minha.luta.fantasma ? ' (cópia)' : ''}
        </span>
        <span className={ui.muted}>{(t / 1000).toFixed(1)} s</span>
        <span className={ui.spacer} />
        {[1, 2, 4].map((v) => (
          <button
            key={v}
            className={`${ui.small} ${vel === v ? s.velAtiva : ''}`}
            onClick={() => setVel(v)}
          >
            {v}×
          </button>
        ))}
        <button className={ui.small} onClick={() => setT(b.duracaoMs)}>
          Pular
        </button>
      </div>
      <div className={s.arenaLuta}>
        {lado(meu === 0 ? 1 : 0, true)}
        <div className={s.meioLuta} />
        {lado(meu as 0 | 1, false)}
      </div>
      {acabou && (
        <div className={s.resultadoLuta}>
          <strong className={venceu ? s.vitoria : s.derrota}>
            {venceu ? 'Vitória!' : empate ? 'Empate (tempo esgotado)' : 'Derrota'}
          </strong>
          {dano > 0 && <span>−{dano} ♥</span>}
          <button className={`${ui.button} ${ui.primary}`} onClick={onFim}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Fim ---------- */

function Final({
  partida,
  fim,
  onSair,
}: {
  partida: ArenaMatch;
  fim: ArenaRoundOutcome['fim'];
  onSair: () => void;
}) {
  const sair = useGame((g) => g.arenaSair);
  const lugar = standings(partida).findIndex((p) => p.id === 0) + 1;
  const [online, setOnline] = useState<ResultadoOnline | null>(null);
  const enviado = useRef(false);
  useEffect(() => {
    const registro = fim?.registro;
    if (!registro || enviado.current) return;
    enviado.current = true;
    void registrarPartida(registro).then(setOnline);
  }, [fim]);
  return (
    <div className={s.saguao}>
      <section className={ui.panel}>
        <h2 className={ui.title}>Fim da partida</h2>
        <p className={s.lugar}>{lugar}º lugar</p>
        {fim && <p>+{fim.gloria} Glória</p>}
        {online && <p className={ui.muted}>{online.mensagem}</p>}
        <button
          className={`${ui.button} ${ui.primary}`}
          onClick={() => {
            sair();
            onSair();
          }}
        >
          Voltar ao saguão
        </button>
      </section>
      <Jogadores partida={partida} />
    </div>
  );
}
