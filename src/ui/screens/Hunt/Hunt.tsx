/**
 * Caçar: o mapa jogável. A tela roda o mundo em passos fixos, desenha no
 * canvas e mostra o HUD por cima. As regras ficam todas no motor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTEUDO } from '../../../content/index.ts';
import { isPortalOpen, rankAtLeast } from '../../../engine/game/game.ts';
import { buildProfile } from '../../../engine/hunter/stats.ts';
import { ECOS, activeEcoProfile, hasBindRoom } from '../../../engine/game/ecos.ts';
import type { RtEvent } from '../../../engine/realtime/state.ts';
import { heroOf } from '../../../engine/realtime/state.ts';
import { loadMap } from '../../../engine/realtime/world.ts';
import { chebyshev, isWalkable, objectAt } from '../../../engine/world/map.ts';
import type { AbilityDef } from '../../../engine/definitions.ts';
import { Icone } from '../../art/Icone.tsx';
import type { IconeId } from '../../art/icons.ts';
import { useGame } from '../../store/game.ts';
import { COR_RARIDADE, nomeItem } from '../../items.ts';
import { Inventory } from '../../windows/Inventory.tsx';
import { Joystick } from './Joystick.tsx';
import { Altar, Chest, ExpeditionTable, Merchant } from '../../windows/PostoWindows.tsx';
import { takeGroundItem } from '../../../engine/realtime/world.ts';
import type { Camera } from './render.ts';
import { TILE, actorPos, cameraFor, render, renderOverlay } from './render.ts';
import type { Sessao } from './session.ts';
import { efeitosVisuais, getSessao, passo, registrar, trocarMapa } from './session.ts';
import s from './Hunt.module.css';

interface Hud {
  mapa: string;
  vida: number;
  vidaMax: number;
  bloqueio: number;
  alvo: {
    nome: string;
    vida: number;
    vidaMax: number;
    chefe: boolean;
    vinculavel: boolean;
  } | null;
  habilidades: Array<{
    nome: string;
    categoria: AbilityDef['categoria'];
    resta: number;
    total: number;
  }>;
  caido: boolean;
  pocaoResta: number;
  auto: boolean;
}

type JanelaId = 'mochila' | 'mercadora' | 'bau' | 'altar' | 'expedicao';
const ICONE_CATEGORIA: Record<AbilityDef['categoria'], IconeId> = {
  ataque: 'ataque',
  defesa: 'defesa',
  cura: 'cura',
};

const JANELAS = new Set<string>(['mochila', 'mercadora', 'bau', 'altar', 'expedicao']);

function hudOf(se: Sessao): Hud {
  const h = heroOf(se.w);
  const alvo = se.w.atores.find((a) => a.uid === h.alvo && a.vida > 0);
  return {
    mapa: CONTEUDO.mapas[se.w.mapa]?.nome ?? se.w.mapa,
    vida: h.vida,
    vidaMax: h.vidaMax,
    bloqueio: h.bloqueio,
    alvo: alvo
      ? {
          nome: alvo.nome,
          vida: alvo.vida,
          vidaMax: alvo.vidaMax,
          chefe: alvo.chefe,
          vinculavel: !alvo.chefe && !alvo.invocado && alvo.vida / alvo.vidaMax <= ECOS.limiteVida,
        }
      : null,
    habilidades: se.perfil.habilidades.map((x) => ({
      nome: x.def.nome,
      categoria: x.def.categoria,
      resta: se.w.recargas[x.def.id] ?? 0,
      total: x.recargaMs,
    })),
    caido: se.w.heroiCaido,
    pocaoResta: se.w.recargaPocao,
    auto: se.auto,
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
  const ecos = useGame((g) => g.estado.ecos);
  const perfil = useMemo(() => {
    const p = buildProfile(cacador, CONTEUDO);
    const eco = activeEcoProfile(ecos, CONTEUDO);
    return eco ? { ...p, eco } : p;
  }, [cacador, ecos]);
  const cristais = ecos?.cristais ?? 0;
  const perfilRef = useRef(perfil);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera | null>(null);
  /** Aproximação do mapa em telas pequenas (celular): tiles maiores, mais fáceis de tocar. */
  const zoomRef = useRef(1);
  const alvoRef = useRef<() => void>(() => {});
  const [hud, setHud] = useState<Hud>(() => hudOf(getSessao(perfil)));
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ajuda, setAjuda] = useState(false);
  const [janela, setJanela] = useState<JanelaId | null>(null);
  const [perdidos, setPerdidos] = useState(0);
  const pocoes = useGame((g) => g.estado.pocoes);
  const alternarRef = useRef<(j: JanelaId | null) => void>(() => {});
  useEffect(() => {
    alternarRef.current = (j) => setJanela((atual) => (j === null || atual === j ? null : j));
  }, []);
  const msgTimer = useRef(0);
  const beberRef = useRef<() => void>(() => {});
  const vincularRef = useRef<() => void>(() => {});
  const alternarAutoRef = useRef<() => void>(() => {});

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
      if (ev.tipo === 'interagir' && JANELAS.has(ev.objeto)) setJanela(ev.objeto as JanelaId);
      if (ev.tipo === 'pocao') useGame.getState().gastarPocao();
      if (ev.tipo === 'vinculo') {
        const g = useGame.getState();
        g.gastarCristal();
        const nome = CONTEUDO.inimigos[ev.defId]?.nome ?? 'A criatura';
        if (!ev.sucesso) {
          avisar(`${nome} quebrou o vínculo! Enfraqueça mais e tente de novo.`);
          registrar(se, `${nome} escapou do cristal`, '#ff8a8a');
          return;
        }
        const portal = CONTEUDO.mapas[se.w.mapa]?.portal;
        const rank = (portal && CONTEUDO.portais[portal]?.rank) || 'cinza';
        const eco = g.vincularEco(ev.defId, rank);
        if (!eco) return;
        const ativo = useGame.getState().estado.ecos?.ativo === eco.uid;
        avisar(
          ativo
            ? `${nome} agora é seu Eco e luta ao seu lado!`
            : `${nome} foi vinculado. Veja na aba Ecos.`,
        );
        registrar(se, `Eco vinculado: ${nome}`, '#9fe8ff');
      }
      if (ev.tipo === 'enigma') {
        avisar('O relicário mostra a ordem das runas. Memorize e pise nelas!');
        registrar(se, 'Enigma das runas começou', '#f2d27a');
      }
      if (ev.tipo === 'enigmaFalhou') {
        const t =
          ev.motivo === 'tempo'
            ? 'O tempo acabou! A maldição chama os guardiões.'
            : 'Runa errada! A maldição chama os guardiões.';
        avisar(t);
        registrar(se, t, '#ff8a8a');
      }
      if (ev.tipo === 'enigmaResolvido') {
        avisar('Enigma resolvido! O relicário se abre.');
        registrar(se, 'Relicário aberto', '#f2d27a');
      }
      if (ev.tipo === 'especial') {
        avisar(ev.anuncio);
        registrar(se, ev.anuncio, '#ff8a8a');
      }
      if (ev.tipo === 'heroiCaiu') {
        setJanela(null);
        setPerdidos(useGame.getState().morrer());
      }
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
        const nome = se.w.atores.find((a) => a.uid === ev.alvo)?.nome ?? 'Monstro';
        registrar(se, `${nome} derrotado: +${r.xp} XP, +${r.ouro} ouro`);
        if (r.selo) registrar(se, `Ganhou ${CONTEUDO.selos[r.selo]?.nome ?? 'um Selo'}`, '#f2b56b');
        if (r.promovido) {
          const rank = CONTEUDO.ranks[r.promovido]?.nome ?? r.promovido;
          avisar(`Aprovado no Exame! Agora você é rank ${rank}. Novos portais no Posto.`);
          registrar(se, `Rank ${rank}!`, '#ff9a3c');
        } else if (r.primeiraVitoria) {
          avisar(`${CONTEUDO.portais[portal]?.nome} fechado! O próximo portal se abriu.`);
          registrar(se, `${CONTEUDO.portais[portal]?.nome} fechado!`, '#f2b56b');
        } else if (r.ecoNiveis) {
          const e = useGame.getState().estado.ecos;
          const eco = e?.lista.find((x) => x.uid === e.ativo);
          if (eco) {
            const nome = se.perfil.eco?.nome ?? 'Eco';
            avisar(
              eco.nivel === 10 || eco.nivel === 20
                ? `${nome} despertou! Nível ${eco.nivel}: ganhou um dom.`
                : `${nome} subiu para o nível ${eco.nivel}.`,
            );
            registrar(se, `${nome}: nível ${eco.nivel}`, '#9fe8ff');
          }
        } else if (r.levelsGanhos > 0) {
          avisar(`Subiu de level! (${useGame.getState().estado.cacador.level})`);
          registrar(se, `Level ${useGame.getState().estado.cacador.level}!`, '#8b7cf6');
        }
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
          registrar(se, `Pegou ${nomeItem(g.item)}`, COR_RARIDADE[g.item.raridade]);
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
          const p = CONTEUDO.portais[def.portal];
          if (p && !rankAtLeast(estado.rank, p.rank))
            return avisar(
              `${ev.rotulo} pede rank ${CONTEUDO.ranks[p.rank]?.nome}. Passe no Exame de Rank.`,
            );
          if (!isPortalOpen(estado, CONTEUDO, def.portal))
            return avisar(`${ev.rotulo} ainda está fechado. Feche o portal anterior.`);
        }
        trocarMapa(se, ev.destino);
      }
    };

    const toque = window.matchMedia('(pointer: coarse)').matches;
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
        const est = useGame.getState().estado;
        const cheia = est.mochila.length >= CONTEUDO.itens.capacidadeMochila;
        for (const ev of passo(se, est.pocoes, cheia)) tratar(se, ev);
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
      const zoom = Math.min(largura, altura) < 520 ? 1.4 : largura < 760 ? 1.2 : 1;
      zoomRef.current = zoom;
      const cam = cameraFor(se, largura / zoom, altura / zoom, alpha);
      camRef.current = cam;
      render(ctx, se, cam, alpha, dpr * zoom);
      renderOverlay(ctx, se, { ...cam, largura, altura }, dpr, toque);
      if (agora - hudEm > 100) {
        hudEm = agora;
        setHud(hudOf(se));
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    const alternarAuto = () => {
      const se = getSessao(perfilRef.current);
      if (se.auto) {
        se.auto = false;
        return avisar('Auto-caçar desligado.');
      }
      const portal = CONTEUDO.mapas[se.w.mapa]?.portal;
      if (!portal) return avisar('Auto-caçar funciona dentro dos portais.');
      if (!useGame.getState().estado.portaisFechados.includes(portal))
        return avisar('Feche este portal (derrote o chefe) para liberar o auto-caçar aqui.');
      se.auto = true;
      avisar('Auto-caçar ligado. Qualquer comando seu tem prioridade.');
    };
    alternarAutoRef.current = alternarAuto;

    const beber = () => {
      if (useGame.getState().estado.pocoes <= 0)
        return avisar('Sem poções. Compre na Mercadora do Posto.');
      getSessao(perfilRef.current).fila.push({ pocao: true });
    };
    beberRef.current = beber;

    const vincular = () => {
      const est = useGame.getState().estado;
      if ((est.ecos?.cristais ?? 0) <= 0)
        return avisar('Sem Cristais de Vínculo. Compre na Mercadora do Posto.');
      if (!hasBindRoom(est))
        return avisar(`Você já tem ${ECOS.maximo} Ecos. Liberte um na aba Ecos.`);
      getSessao(perfilRef.current).fila.push({ vincular: true });
    };
    vincularRef.current = vincular;

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
      } else if (e.code === 'KeyQ') {
        beber();
      } else if (e.code === 'KeyR') {
        alternarAuto();
      } else if (e.code === 'KeyC') {
        vincular();
      } else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const h = heroOf(se.w);
        const m = loadMap(CONTEUDO.mapas[se.w.mapa]!);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (objectAt(m, h.x + dx, h.y + dy)) {
              se.fila.push({ interagir: [h.x + dx, h.y + dy] });
              return;
            }
        avisar('Nada por perto para usar.');
      } else if (e.code === 'Escape') {
        alternarRef.current(null);
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
      const z = zoomRef.current;
      const wx = ((e.clientX - rect.left) / z + cam.x) / TILE;
      const wy = ((e.clientY - rect.top) / z + cam.y) / TILE;
      const tx = Math.floor(wx);
      const ty = Math.floor(wy);
      // No toque o dedo é impreciso: aceita um pouco mais longe e pega o mais perto.
      const folga = e.pointerType === 'touch' ? 0.95 : 0.65;
      let monstro: (typeof se.w.atores)[number] | undefined;
      let melhor = Infinity;
      for (const a of se.w.atores) {
        if (a.lado !== 'inimigo' || a.vida <= 0) continue;
        const [ax, ay] = actorPos(a, 0, CONTEUDO.mundo.tickMs);
        const dx = Math.abs(ax + 0.5 - wx);
        const dy = Math.abs(ay + 0.5 - wy);
        if (dx < folga && dy < folga && dx + dy < melhor) {
          melhor = dx + dy;
          monstro = a;
        }
      }
      if (monstro) {
        se.fila.push({ alvo: monstro.uid });
        return;
      }
      const m = loadMap(CONTEUDO.mapas[se.w.mapa]!);
      if (objectAt(m, tx, ty) && se.w.revelado[ty * m.largura + tx]) {
        se.fila.push({ interagir: [tx, ty] });
        return;
      }
      if (isWalkable(m, tx, ty) && se.w.revelado[ty * m.largura + tx])
        se.fila.push({ irPara: [tx, ty] });
    };

    alvoRef.current = () => proximoAlvo(getSessao(perfilRef.current));

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

  const pctPocao = hud.pocaoResta / (CONTEUDO.itens.pocao.recargaS * 1000);

  return (
    <section className={s.tela} aria-label="Mapa de caça">
      <div className={s.quadro}>
        <canvas
          ref={canvasRef}
          className={s.canvas}
          data-testid="mapa"
          onContextMenu={(e) => e.preventDefault()}
        />
        <Joystick
          onDir={(d) => {
            getSessao(perfilRef.current).dir = d;
          }}
        />

        <div className={s.topoEsq}>
          <strong className={s.mapaNome}>
            <Icone id="portal" tamanho={16} />
            {hud.mapa}
          </strong>
          <div className={s.barra} aria-label={`Vida ${hud.vida} de ${hud.vidaMax}`}>
            <span className={s.vida} style={{ width: `${(hud.vida / hud.vidaMax) * 100}%` }} />
            {hud.bloqueio > 0 && (
              <span
                className={s.bloqueioBarra}
                style={{ width: `${Math.min(100, (hud.bloqueio / hud.vidaMax) * 100)}%` }}
              />
            )}
            <em>
              {hud.vida} / {hud.vidaMax}
              {hud.bloqueio > 0 && <span className={s.bloq}> ⛨ {hud.bloqueio}</span>}
            </em>
          </div>
        </div>

        {hud.alvo && (
          <div className={`${s.alvo} ${hud.alvo.chefe ? s.alvoChefe : ''}`}>
            <span className={hud.alvo.chefe ? s.chefe : undefined}>
              {hud.alvo.chefe ? '♛ ' : ''}
              {hud.alvo.nome}
            </span>
            <div className={s.barra}>
              <span
                className={s.vidaAlvo}
                style={{ width: `${(hud.alvo.vida / hud.alvo.vidaMax) * 100}%` }}
              />
              <em>
                {hud.alvo.vida} / {hud.alvo.vidaMax}
              </em>
            </div>
            {hud.alvo.vinculavel && (
              <button className={s.vinculavel} onClick={() => vincularRef.current()}>
                <Icone id="cristal" tamanho={14} /> Enfraquecido: C para vincular
              </button>
            )}
          </div>
        )}

        {mensagem && (
          <div className={s.mensagem} role="status">
            {mensagem}
          </div>
        )}

        {ajuda && (
          <div className={s.ajuda} role="dialog" aria-label="Controles">
            <strong>Controles</strong>
            <dl>
              <dt>WASD / setas</dt>
              <dd>andar (ou clique no chão)</dd>
              <dt>Clique / Tab</dt>
              <dd>escolher alvo</dd>
              <dt>1 a 4</dt>
              <dd>habilidades</dd>
              <dt>Q</dt>
              <dd>poção</dd>
              <dt>Espaço / E</dt>
              <dd>falar, abrir baú, relicário</dd>
              <dt>C</dt>
              <dd>lançar Cristal de Vínculo (monstro abaixo de 30% de vida)</dd>
              <dt>R</dt>
              <dd>auto-caçar</dd>
              <dt>I</dt>
              <dd>mochila</dd>
              <dt>Esc</dt>
              <dd>soltar alvo, fechar</dd>
            </dl>
          </div>
        )}

        {hud.caido && (
          <div className={s.caido}>
            <h2>Você caiu</h2>
            <p>
              Nada de XP foi perdido.
              {perdidos > 0 &&
                ` Você perdeu ${perdidos} ${perdidos === 1 ? 'item' : 'itens'} da mochila.`}
            </p>
            <button className={s.botao} onClick={voltar} autoFocus>
              Voltar ao Posto
            </button>
          </div>
        )}
      </div>

      {janela === 'mochila' && <Inventory onFechar={() => setJanela(null)} />}
      {janela === 'mercadora' && <Merchant onFechar={() => setJanela(null)} />}
      {janela === 'bau' && <Chest onFechar={() => setJanela(null)} />}
      {janela === 'altar' && <Altar onFechar={() => setJanela(null)} />}
      {janela === 'expedicao' && <ExpeditionTable onFechar={() => setJanela(null)} />}

      <div className={s.dock}>
        <div className={`${s.grupo} ${s.grupoHab}`}>
          {Array.from({ length: CONTEUDO.progressao.espacosDeHabilidade }, (_, i) => {
            const h = hud.habilidades[i];
            if (!h)
              return (
                <div key={i} className={`${s.slot} ${s.slotVazio}`} aria-hidden>
                  <span className={s.tecla}>{i + 1}</span>
                </div>
              );
            const pct = h.total > 0 ? h.resta / h.total : 0;
            return (
              <button
                key={h.nome}
                className={s.slot}
                onClick={() => usar(i)}
                disabled={hud.caido}
                title={`${h.nome} (tecla ${i + 1})`}
                aria-label={h.nome}
              >
                <span className={s.tecla}>{i + 1}</span>
                <Icone id={ICONE_CATEGORIA[h.categoria]} tamanho={28} />
                <span className={s.slotNome}>{h.nome}</span>
                {h.resta > 0 && (
                  <span className={s.recarga} style={{ '--p': pct } as React.CSSProperties}>
                    {Math.ceil(h.resta / 1000)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <span className={s.divisor} aria-hidden />
        <div className={`${s.grupo} ${s.grupoUtil}`}>
          <button
            className={`${s.slot} ${s.slotAlvo}`}
            onClick={() => alvoRef.current()}
            disabled={hud.caido}
            title="Próximo alvo (tecla Tab)"
            aria-label="Próximo alvo"
          >
            <span className={s.tecla}>Tab</span>
            <span className={s.mira} aria-hidden />
            <span className={s.slotNome}>Alvo</span>
          </button>
          <button
            className={s.slot}
            onClick={() => beberRef.current()}
            disabled={hud.caido || pocoes <= 0}
            title="Poção de vida (tecla Q)"
            aria-label={`Poção de vida, ${pocoes} restantes`}
          >
            <span className={s.tecla}>Q</span>
            <Icone id="pocao" tamanho={28} />
            <span className={s.contagem}>{pocoes}</span>
            <span className={s.slotNome}>Poção</span>
            {hud.pocaoResta > 0 && (
              <span className={s.recarga} style={{ '--p': pctPocao } as React.CSSProperties}>
                {Math.ceil(hud.pocaoResta / 1000)}
              </span>
            )}
          </button>
          <button
            className={`${s.slot} ${hud.alvo?.vinculavel && cristais > 0 ? s.ligado : ''}`}
            onClick={() => vincularRef.current()}
            disabled={hud.caido}
            title="Cristal de Vínculo (tecla C): vincula um monstro enfraquecido como Eco"
            aria-label={`Cristal de Vínculo, ${cristais} restantes`}
          >
            <span className={s.tecla}>C</span>
            <Icone id="cristal" tamanho={28} />
            <span className={s.contagem}>{cristais}</span>
            <span className={s.slotNome}>Vincular</span>
          </button>
          <button
            className={`${s.slot} ${hud.auto ? s.ligado : ''}`}
            onClick={() => alternarAutoRef.current()}
            disabled={hud.caido}
            title="Auto-caçar (tecla R): só em portais já fechados"
            aria-pressed={hud.auto}
          >
            <span className={s.tecla}>R</span>
            <Icone id="auto" tamanho={28} className={hud.auto ? s.girando : undefined} />
            <span className={s.slotNome}>{hud.auto ? 'Auto ligado' : 'Auto'}</span>
          </button>
          <button
            className={s.slot}
            onClick={() => setJanela((j) => (j ? null : 'mochila'))}
            title="Mochila (tecla I)"
          >
            <span className={s.tecla}>I</span>
            <Icone id="mochila" tamanho={28} />
            <span className={s.slotNome}>Mochila</span>
          </button>
          <button
            className={`${s.slot} ${s.slotAjuda} ${ajuda ? s.ligado : ''}`}
            onClick={() => setAjuda((v) => !v)}
            title="Controles"
            aria-pressed={ajuda}
          >
            <span className={s.interrogacao}>?</span>
            <span className={s.slotNome}>Ajuda</span>
          </button>
        </div>
      </div>
    </section>
  );
}
