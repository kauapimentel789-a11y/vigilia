import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTEUDO } from '../../../content/index.ts';
import type { BattleEvent, UnitSnapshot } from '../../../engine/autobattle/state.ts';
import { activeStatuses, STATUS_DEFS } from '../../../engine/statuses/statuses.ts';
import ui from '../../components/common.module.css';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { num } from '../../format.ts';
import type { CombateAtual } from '../../store/game.ts';
import { MOTIVO, describe, intentName } from './text.ts';
import s from './AutoBattle.module.css';

const VELOCIDADES = [1, 2, 4] as const;
const FLUTUANTE_MS = 900;

interface Props {
  combate: CombateAtual;
  onVoltar: () => void;
  onRepetir: () => void;
  podeRepetir: boolean;
}

type Flutuante = { id: number; texto: string; tipo: 'dano' | 'cura' | 'critico' | 'veneno' };

function UnitCard({ u, flutuantes }: { u: UnitSnapshot; flutuantes: Flutuante[] }) {
  const intencao = u.lado === 'inimigo' ? intentName(u.defId, u.intencao) : null;
  const morto = u.vida <= 0;
  return (
    <div className={`${s.unit} ${u.lado === 'cacador' ? s.cacador : ''} ${morto ? s.morto : ''}`}>
      {intencao && !morto && (
        <div className={`${s.intencao} ${intencao.forte ? s.forte : ''}`}>
          {intencao.forte ? '⚠ ' : ''}
          {intencao.nome}
        </div>
      )}
      <div className={s.retrato} aria-hidden>
        {u.lado === 'cacador' ? '◆' : '✶'}
        <div className={s.flutuantes}>
          {flutuantes.slice(0, 4).map((f, i) => (
            <span
              key={f.id}
              className={`${s.flutuante} ${s[f.tipo]}`}
              style={{ marginTop: -i * 16 }}
            >
              {f.texto}
            </span>
          ))}
        </div>
      </div>
      <strong className={s.nome}>{u.nome}</strong>
      <div className={s.vida}>
        <ProgressBar
          valor={u.vida}
          max={u.vidaMax}
          cor="var(--color-health)"
          rotulo={`Vida de ${u.nome}`}
        />
        <span className={s.numeros}>
          {u.vida}/{u.vidaMax}
          {u.bloqueio > 0 && <span className={s.bloqueio}> ⛨{u.bloqueio}</span>}
        </span>
      </div>
      {!morto && (
        <ProgressBar valor={u.carga} max={1} cor="var(--color-text-muted)" rotulo="Próxima ação" />
      )}
      <div className={s.status}>
        {activeStatuses(u.status).map(([id, q]) => (
          <span key={id} className={ui.tag} data-tip={STATUS_DEFS[id].descricao(q)}>
            {STATUS_DEFS[id].nome} {q}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AutoBattle({ combate, onVoltar, onRepetir, podeRepetir }: Props) {
  const { batalha, recompensa } = combate;
  const portal = CONTEUDO.portais[combate.portal]!;
  const tick = CONTEUDO.progressao.combate.tickMs;
  const [t, setT] = useState(0);
  const [vel, setVel] = useState<(typeof VELOCIDADES)[number]>(2);
  const velRef = useRef(vel);
  useEffect(() => {
    velRef.current = vel;
  }, [vel]);
  const fim = t >= batalha.duracaoMs;

  useEffect(() => {
    if (fim) return;
    let anterior = performance.now();
    let id = 0;
    const passo = (agora: number) => {
      const dt = Math.min(100, agora - anterior);
      anterior = agora;
      setT((x) => Math.min(batalha.duracaoMs, x + dt * velRef.current));
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [fim, batalha.duracaoMs]);

  const quadro = batalha.quadros[Math.min(batalha.quadros.length - 1, Math.floor(t / tick))]!;
  const nomes = useMemo(() => {
    const m: Record<string, string> = { cacador: 'Portador' };
    for (const e of batalha.eventos)
      if (e.tipo === 'onda') for (const i of e.inimigos) m[i.uid] = i.nome;
    return m;
  }, [batalha.eventos]);

  const passados = useMemo(() => {
    let fimIdx = 0;
    while (fimIdx < batalha.eventos.length && batalha.eventos[fimIdx]!.t <= t) fimIdx++;
    return fimIdx;
  }, [batalha.eventos, t]);

  const flutuantes: Record<string, Flutuante[]> = {};
  const banners: string[] = [];
  for (let i = passados - 1; i >= 0; i--) {
    const e = batalha.eventos[i] as BattleEvent;
    if (e.t < t - FLUTUANTE_MS * Math.max(1, vel / 2)) break;
    const add = (uid: string, f: Omit<Flutuante, 'id'>) =>
      (flutuantes[uid] ??= []).push({ ...f, id: i });
    if (e.tipo === 'dano' && (e.valor > 0 || e.bloqueado > 0)) {
      add(e.alvo, {
        texto: e.valor > 0 ? `−${e.valor}` : `⛨${e.bloqueado}`,
        tipo: e.critico ? 'critico' : 'dano',
      });
    }
    if (e.tipo === 'perdaDeVida') add(e.alvo, { texto: `−${e.valor}`, tipo: 'veneno' });
    if (e.tipo === 'cura') add(e.alvo, { texto: `+${e.valor}`, tipo: 'cura' });
    if (e.tipo === 'bloqueio') add(e.alvo, { texto: `⛨+${e.valor}`, tipo: 'cura' });
    if (e.tipo === 'especial') banners.push(e.anuncio);
  }

  const registro: string[] = [];
  for (let i = passados - 1; i >= 0 && registro.length < 7; i--) {
    const texto = describe(batalha.eventos[i] as BattleEvent, nomes);
    if (texto) registro.push(texto);
  }

  const [cacador, ...inimigos] = quadro.unidades;
  const habilidades = Object.keys(quadro.recargas);

  return (
    <div className={s.tela}>
      <header className={ui.row}>
        <strong>{portal.nome}</strong>
        <span className={ui.tag}>
          Onda {quadro.onda}/{batalha.totalOndas}
        </span>
        <span className={ui.muted}>{(t / 1000).toFixed(1)} s</span>
        <span className={ui.spacer} />
        {!fim && (
          <>
            {VELOCIDADES.map((v) => (
              <button
                key={v}
                className={v === vel ? ui.primary : ui.small}
                onClick={() => setVel(v)}
                aria-pressed={v === vel}
              >
                {v}×
              </button>
            ))}
            <button className={ui.button} onClick={() => setT(batalha.duracaoMs)}>
              Pular
            </button>
          </>
        )}
      </header>

      {banners[0] && !fim && <div className={s.banner}>{banners[0]}</div>}

      <div className={s.arena}>
        <div className={s.lado}>
          {cacador && <UnitCard u={cacador} flutuantes={flutuantes[cacador.uid] ?? []} />}
        </div>
        <div className={s.versus} aria-hidden>
          ⟡
        </div>
        <div className={`${s.lado} ${s.inimigos}`}>
          {inimigos.map((u) => (
            <UnitCard key={u.uid} u={u} flutuantes={flutuantes[u.uid] ?? []} />
          ))}
        </div>
      </div>

      <div className={s.habilidades}>
        {habilidades.map((id) => {
          const resta = quadro.recargas[id] ?? 0;
          return (
            <span key={id} className={`${s.hab} ${resta <= 0 ? s.pronta : ''}`}>
              {CONTEUDO.habilidades[id]?.nome ?? id}
              <small>{resta > 0 ? `${(resta / 1000).toFixed(1)} s` : 'pronta'}</small>
            </span>
          );
        })}
      </div>

      <ol className={s.registro} aria-live="off">
        {registro.map((r, i) => (
          <li key={`${passados}-${i}`} style={{ opacity: 1 - i * 0.12 }}>
            {r}
          </li>
        ))}
      </ol>

      {fim && (
        <div className={ui.overlay}>
          <div className={ui.modal} role="dialog" aria-label="Resultado">
            <h2
              className={`${ui.title} ${batalha.resultado === 'vitoria' ? s.vitoria : s.derrota}`}
            >
              {batalha.resultado === 'vitoria' ? `${portal.nome} fechado!` : 'Derrota'}
            </h2>
            <p>{MOTIVO[batalha.motivo]}</p>
            {batalha.resultado === 'vitoria' ? (
              <p>
                +{num(recompensa.xp)} XP · +{num(recompensa.ouro)} ouro
                {recompensa.primeiraVitoria && ' (bônus de primeira vitória)'}
                {recompensa.levelsGanhos > 0 && (
                  <strong className={s.level}> · Subiu {recompensa.levelsGanhos} level!</strong>
                )}
              </p>
            ) : (
              <p className={ui.muted}>
                Chegou à onda {batalha.ondaAlcancada} de {batalha.totalOndas}. Farme numa Expedição,
                distribua pontos ou ajuste as habilidades e tente de novo.
              </p>
            )}
            <p className={ui.muted}>
              Dano causado {num(batalha.stats.danoCausado)} · recebido{' '}
              {num(batalha.stats.danoRecebido)} · curado {num(batalha.stats.curaTotal)} ·{' '}
              {(batalha.duracaoMs / 1000).toFixed(1)} s
            </p>
            <div className={ui.row}>
              <button className={ui.button} onClick={() => setT(0)}>
                Rever
              </button>
              <span className={ui.spacer} />
              <button className={ui.button} onClick={onRepetir} disabled={!podeRepetir}>
                Lutar de novo
              </button>
              <button className={ui.primary} onClick={onVoltar}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
