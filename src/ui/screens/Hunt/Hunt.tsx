/**
 * Caçar: o mapa jogável. A tela roda o mundo em passos fixos, desenha no
 * canvas e mostra o HUD por cima. As regras ficam todas no motor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTEUDO } from '../../../content/index.ts';
import { isPortalOpen } from '../../../engine/game/game.ts';
import { buildProfile } from '../../../engine/hunter/stats.ts';
import type { RtEvent } from '../../../engine/realtime/state.ts';
import { heroOf } from '../../../engine/realtime/state.ts';
import { loadMap } from '../../../engine/realtime/world.ts';
import { chebyshev, isWalkable } from '../../../engine/world/map.ts';
import { useGame } from '../../store/game.ts';
import { COR_RARIDADE, nomeItem } from '../../items.ts';
import { Inventory } from '../../windows/Inventory.tsx';
import { takeGroundItem } from '../../../engine/realtime/world.ts';
import type { Camera } from './render.ts';
import { TILE, actorPos, cameraFor, render } from './render.ts';
import type { Sessao } from './session.ts';
import { efeitosVisuais, getSessao, passo, trocarMapa } from './session.ts';
import s from './Hunt.module.css';

interface Hud {
  mapa: string;
  vida: number;
  vidaMax: number;
  bloqueio: number;
  alvo: { nome: string; vida: number; vidaMax: number; chefe: boolean } | null;
  habilidades: Array<{ nome: string; resta: number; total: number }>;
  caido: boolean;
}

function hudOf(se: Sessao): Hud {
  const h = heroOf(se.w);
  const alvo = se.w.atores.find((a) => a.uid === h.alvo && a.vida > 0);
  return {
    mapa: CONTEUDO.mapas[se.w.mapa]?.nome ?? se.w.mapa,
    vida: h.vida,
    vidaMax: h.vidaMax,
    bloqueio: h.bloqueio,
    alvo: alvo
      ? { nome: alvo.nome, vida: alvo.vida, vidaMax: alvo.vidaMax, chefe: alvo.chefe }
      : null,
    habilidades: se.perfil.habilidades.map((x) => ({
      nome: x.def.nome,
      resta: se.w.recargas[x.def.id] ?? 0,
      total: x.recargaMs,
    })),
    caido: se.w.heroiCaido,
  };
}

const TECLAS_DIR: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function Hunt() {
  const cacador = useGame((g) => g.estado.cacador);
  const perfil = useMemo(() => buildProfile(cacador, CONTEUDO), [cacador]);
  const perfilRef = useRef(perfil);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera | null>(null);
  const [hud, setHud] = useState<Hud>(() => hudOf(getSessao(perfil)));
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [janela, setJanela] = useState<'mochila' | null>(null);
  const alternarRef = useRef<(j: 'mochila') => void>(() => {});
  useEffect(() => {
    alternarRef.current = (j) => setJanela((atual) => (atual === j ? null : j));
  }, []);
  const msgTimer = useRef(0);

  useEffect(() => {
    perfilRef.current = perfil;
  }, [perfil]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const avisar = (texto: string) => {
      setMensagem(texto);
      window.clearTimeout(msgTimer.current);
      msgTimer.current = window.setTimeout(() => setMensagem(null), 2600);
    };

    const tratar = (se: Sessao, ev: RtEvent) => {
      efeitosVisuais(se, ev);
      if (ev.tipo === 'aviso') avisar(ev.texto);
      if (ev.tipo === 'abate') {
        const portal = CONTEUDO.mapas[se.w.mapa]?.portal;
        if (!portal) return;
        const r = useGame.getState().recompensarAbate(portal, ev);
        if (!r) return;
        const h = heroOf(se.w);
        se.flutuantes.push({
          x: h.x,
          y: h.y - 0.4,
          texto: `+${r.xp} XP`,
          cor: '#8b7cf6',
          nasceu: se.agora,
        });
        if (r.ouro > 0)
          se.flutuantes.push({
            x: h.x + 0.6,
            y: h.y - 0.1,
            texto: `+${r.ouro} ●`,
            cor: '#f2b56b',
            nasceu: se.agora + 120,
          });
        if (r.primeiraVitoria)
          avisar(`${CONTEUDO.portais[portal]?.nome} fechado! O próximo portal se abriu.`);
        else if (r.levelsGanhos > 0)
          avisar(`Subiu de level! (${useGame.getState().estado.cacador.level})`);
      }
      if (ev.tipo === 'itemNoChao') {
        for (const id of ev.ids) {
          const g = se.w.chao.find((c) => c.id === id);
          if (!g) continue;
          if (!useGame.getState().pegarItem(g.item)) {
            avisar('Mochila cheia. Jogue algo fora ou volte ao Posto.');
            break;
          }
          takeGroundItem(se.w, id);
          se.flutuantes.push({
            x: g.x,
            y: g.y - 0.3,
            texto: nomeItem(g.item),
            cor: COR_RARIDADE[g.item.raridade],
            nasceu: se.agora,
          });
        }
      }
      if (ev.tipo === 'portao') {
        const def = CONTEUDO.mapas[ev.destino];
        if (!def) return avisar(`${ev.rotulo}: em breve.`);
        const estado = useGame.getState().estado;
        if (def.portal) {
          if (estado.expedicao)
            return avisar('O caçador está em expedição. Chame-o de volta primeiro.');
          if (!isPortalOpen(estado, CONTEUDO, def.portal))
            return avisar(`${ev.rotulo} ainda está fechado. Feche o portal anterior.`);
        }
        trocarMapa(se, ev.destino);
      }
    };

    let ultimo = performance.now();
    let acumulado = 0;
    let hudEm = 0;
    let raf = 0;
    const tick = CONTEUDO.mundo.tickMs;

    const quadro = (agora: number) => {
      const se = getSessao(perfilRef.current);
      acumulado += Math.min(250, agora - ultimo);
      ultimo = agora;
      se.agora = agora;
      while (acumulado >= tick) {
        acumulado -= tick;
        for (const ev of passo(se)) tratar(se, ev);
      }
      const dpr = window.devicePixelRatio || 1;
      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      if (
        canvas.width !== Math.round(largura * dpr) ||
        canvas.height !== Math.round(altura * dpr)
      ) {
        canvas.width = Math.round(largura * dpr);
        canvas.height = Math.round(altura * dpr);
      }
      const alpha = acumulado / tick;
      const cam = cameraFor(se, largura, altura, alpha);
      camRef.current = cam;
      render(ctx, se, cam, alpha, dpr);
      if (agora - hudEm > 100) {
        hudEm = agora;
        setHud(hudOf(se));
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    /* ---------- Teclado ---------- */
    const seguradas = new Set<string>();
    const atualizarDir = () => {
      let dx = 0;
      let dy = 0;
      for (const k of seguradas) {
        const d = TECLAS_DIR[k];
        if (d) {
          dx += d[0];
          dy += d[1];
        }
      }
      getSessao(perfilRef.current).dir = [Math.sign(dx), Math.sign(dy)];
    };
    const proximoAlvo = (se: Sessao) => {
      const h = heroOf(se.w);
      const r = CONTEUDO.mundo.raioRevelado;
      const perto = se.w.atores
        .filter(
          (a) =>
            a.lado === 'inimigo' && a.vida > 0 && (a.x - h.x) ** 2 + (a.y - h.y) ** 2 <= r * r + 1,
        )
        .sort((a, b) => chebyshev(a.x, a.y, h.x, h.y) - chebyshev(b.x, b.y, h.x, h.y));
      if (perto.length === 0) return avisar('Nenhum inimigo à vista.');
      const i = perto.findIndex((a) => a.uid === h.alvo);
      se.fila.push({ alvo: perto[(i + 1) % perto.length]!.uid });
    };
    const baixo = (e: KeyboardEvent) => {
      const alvoEl = e.target as HTMLElement | null;
      if (
        alvoEl &&
        (alvoEl.tagName === 'INPUT' || alvoEl.tagName === 'SELECT' || alvoEl.tagName === 'TEXTAREA')
      )
        return;
      const se = getSessao(perfilRef.current);
      if (TECLAS_DIR[e.code]) {
        e.preventDefault();
        seguradas.add(e.code);
        atualizarDir();
      } else if (/^Digit[1-4]$/.test(e.code)) {
        se.fila.push({ habilidade: Number(e.code.slice(5)) - 1 });
      } else if (e.code === 'Tab') {
        e.preventDefault();
        proximoAlvo(se);
      } else if (e.code === 'KeyI') {
        alternarRef.current('mochila');
      } else if (e.code === 'Escape') {
        se.fila.push({ alvo: null });
      }
    };
    const cima = (e: KeyboardEvent) => {
      if (seguradas.delete(e.code)) atualizarDir();
    };
    const soltarTudo = () => {
      seguradas.clear();
      atualizarDir();
    };

    /* ---------- Mouse e toque ---------- */
    const clique = (e: PointerEvent) => {
      const cam = camRef.current;
      if (!cam) return;
      const se = getSessao(perfilRef.current);
      const rect = canvas.getBoundingClientRect();
      const wx = (e.clientX - rect.left + cam.x) / TILE;
      const wy = (e.clientY - rect.top + cam.y) / TILE;
      const tx = Math.floor(wx);
      const ty = Math.floor(wy);
      const monstro = se.w.atores.find((a) => {
        if (a.lado !== 'inimigo' || a.vida <= 0) return false;
        const [ax, ay] = actorPos(a, 0, CONTEUDO.mundo.tickMs);
        return Math.abs(ax + 0.5 - wx) < 0.65 && Math.abs(ay + 0.5 - wy) < 0.65;
      });
      if (monstro) {
        se.fila.push({ alvo: monstro.uid });
        return;
      }
      const m = loadMap(CONTEUDO.mapas[se.w.mapa]!);
      if (isWalkable(m, tx, ty) && se.w.revelado[ty * m.largura + tx])
        se.fila.push({ irPara: [tx, ty] });
    };

    window.addEventListener('keydown', baixo);
    window.addEventListener('keyup', cima);
    window.addEventListener('blur', soltarTudo);
    canvas.addEventListener('pointerdown', clique);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', baixo);
      window.removeEventListener('keyup', cima);
      window.removeEventListener('blur', soltarTudo);
      canvas.removeEventListener('pointerdown', clique);
      window.clearTimeout(msgTimer.current);
      getSessao(perfilRef.current).dir = [0, 0];
    };
  }, []);

  const usar = (i: number) => getSessao(perfilRef.current).fila.push({ habilidade: i });
  const voltar = () => {
    const se = getSessao(perfilRef.current);
    trocarMapa(se, 'posto');
    setHud(hudOf(se));
  };

  return (
    <section className={s.tela} aria-label="Mapa de caça">
      <canvas ref={canvasRef} className={s.canvas} data-testid="mapa" />

      <div className={s.topoEsq}>
        <strong>{hud.mapa}</strong>
        <div className={s.barra} aria-label={`Vida ${hud.vida} de ${hud.vidaMax}`}>
          <span className={s.vida} style={{ width: `${(hud.vida / hud.vidaMax) * 100}%` }} />
          <em>
            {hud.vida} / {hud.vidaMax}
            {hud.bloqueio > 0 && <span className={s.bloq}> ⛨ {hud.bloqueio}</span>}
          </em>
        </div>
      </div>

      {hud.alvo && (
        <div className={s.alvo}>
          <span className={hud.alvo.chefe ? s.chefe : undefined}>{hud.alvo.nome}</span>
          <div className={s.barra}>
            <span
              className={s.vidaAlvo}
              style={{ width: `${(hud.alvo.vida / hud.alvo.vidaMax) * 100}%` }}
            />
            <em>
              {hud.alvo.vida} / {hud.alvo.vidaMax}
            </em>
          </div>
        </div>
      )}

      {mensagem && (
        <div className={s.mensagem} role="status">
          {mensagem}
        </div>
      )}

      {janela === 'mochila' && <Inventory onFechar={() => setJanela(null)} />}

      <div className={s.habilidades}>
        {hud.habilidades.map((h, i) => {
          const pct = h.total > 0 ? h.resta / h.total : 0;
          return (
            <button
              key={h.nome}
              className={s.hab}
              onClick={() => usar(i)}
              disabled={hud.caido}
              title={`${h.nome} (tecla ${i + 1})`}
            >
              <span className={s.tecla}>{i + 1}</span>
              <span className={s.habNome}>{h.nome}</span>
              {h.resta > 0 && (
                <span className={s.recarga} style={{ height: `${pct * 100}%` }}>
                  {Math.ceil(h.resta / 1000)}
                </span>
              )}
            </button>
          );
        })}
        <button
          className={s.hab}
          onClick={() => setJanela((j) => (j ? null : 'mochila'))}
          title="Mochila (tecla I)"
        >
          <span className={s.tecla}>I</span>
          <span className={s.habNome}>Mochila</span>
        </button>
      </div>

      <p className={s.ajuda}>
        WASD ou setas: andar · Clique no chão: ir até lá · Clique no monstro ou Tab: atacar · 1 a 4:
        habilidades · I: mochila · Esc: soltar alvo
      </p>

      {hud.caido && (
        <div className={s.caido}>
          <h2>Você caiu</h2>
          <p>Nada de XP foi perdido. Volte ao Posto para se recompor.</p>
          <button className={s.botao} onClick={voltar} autoFocus>
            Voltar ao Posto
          </button>
        </div>
      )}
    </section>
  );
}
