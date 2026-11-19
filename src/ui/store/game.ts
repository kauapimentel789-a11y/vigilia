/**
 * Store do jogo (Zustand): guarda o estado e chama os comandos puros do motor.
 *
 * Nenhuma regra de jogo mora aqui. Cada ação chama um comando do motor e, se ele
 * devolver erro, mostra a mensagem; se devolver estado, troca o estado.
 */
import { create } from 'zustand';
import { CONTEUDO } from '../../content/index.ts';
import type { AtributoId, SlotId } from '../../engine/definitions.ts';
import type { ItemInstance } from '../../engine/items/items.ts';
import type { ExpeditionGains } from '../../engine/expedition/expedition.ts';
import { accruedGains } from '../../engine/expedition/expedition.ts';
import type { GameState, KillReward } from '../../engine/game/game.ts';
import {
  advanceTime,
  changeBehavior,
  collectExpedition,
  equip,
  newGame,
  respec,
  rewardKill,
  pickUp,
  equipItem,
  unequipItem,
  discardItem,
  sellItems,
  buyPotions,
  consumePotion,
  storeItem,
  retrieveItem,
  dieInMap,
  spendPoint,
  startExpedition,
  upgrade,
} from '../../engine/game/game.ts';
import type { Comportamento } from '../../engine/hunter/hunter.ts';
import type { ArenaRoundOutcome } from '../../engine/game/arena.ts';
import {
  arenaAction,
  chooseArenaHero,
  leaveArenaMatch,
  playArenaRound,
  spendGloria,
  startArenaMatch,
} from '../../engine/game/arena.ts';
import type { ArenaComando } from '../../engine/arena/replay.ts';
import type { ArenaRetrato, Lugar } from '../../engine/arena/match.ts';
import { clearSave, loadSave, writeSave } from './persist.ts';

/** Ausência mínima para mostrar o relatório de retorno. */
const AUSENCIA_MINIMA_MS = 60_000;

export interface Relatorio {
  ganhos: ExpeditionGains;
  /** Já coletado (true) ou só uma prévia do que está esperando (false). */
  coletado: boolean;
  levelsGanhos: number;
  itens?: ItemInstance[];
  semEspaco: number;
}

interface Store {
  estado: GameState;
  aviso: string | null;
  relatorio: Relatorio | null;

  avisar(texto: string | null): void;
  gastarPonto(a: AtributoId, delta: number): void;
  redistribuir(): void;
  equipar(ids: string[]): void;
  melhorar(id: string): void;
  definirComportamento(c: Comportamento): void;
  /** Mapa: guarda um item achado. Devolve false se a mochila está cheia. */
  pegarItem(item: ItemInstance): boolean;
  equiparItem(uid: string): void;
  desequipar(slot: SlotId): void;
  descartar(uid: string): void;
  vender(uids: string[]): void;
  comprarPocoes(qtd: number): void;
  /** Mapa: gasta uma poção. false se não há poções. */
  gastarPocao(): boolean;
  guardar(uid: string): void;
  retirar(uid: string): void;
  /** Mapa: o caçador caiu. Devolve quantos itens da mochila foram perdidos. */
  morrer(): number;
  arenaHeroi(id: string): void;
  arenaComecar(rivais?: ArenaRetrato[], nome?: string): void;
  arenaComprar(slot: number): void;
  arenaVender(uid: string): void;
  arenaRolar(): void;
  arenaXp(): void;
  arenaMover(uid: string, destino: Lugar): boolean;
  /** Fecha a rodada e devolve o relatório (a luta do jogador para assistir). */
  arenaLutar(): ArenaRoundOutcome | null;
  arenaSair(): void;
  gastarGloria(oferta: 'pocao' | 'ouro'): void;
  /** Mapa: paga um abate. Devolve a recompensa para a tela mostrar. */
  recompensarAbate(
    portal: string,
    abate: { xp: number; ouro: number; chefe: boolean },
  ): KillReward | null;
  enviarExpedicao(portal: string): void;
  coletar(encerrar?: boolean): void;
  fecharRelatorio(): void;
  apagarProgresso(): void;
  /** Painel de teste: faz o tempo passar para a expedição. */
  avancarTempo(ms: number): void;
  /** Troca o estado inteiro (save vindo da nuvem). */
  substituirEstado(estado: GameState): void;
}

const semente = () => Math.floor(Math.random() * 2 ** 31);

function initial(): Pick<Store, 'estado' | 'aviso' | 'relatorio'> {
  const r = loadSave();
  if (r.tipo === 'novo')
    return { estado: newGame(CONTEUDO, semente(), Date.now()), aviso: null, relatorio: null };
  if (r.tipo === 'corrompido') {
    return {
      estado: newGame(CONTEUDO, semente(), Date.now()),
      aviso: `${r.erro} Uma cópia foi guardada e o jogo recomeçou.`,
      relatorio: null,
    };
  }
  const exp = r.estado.expedicao;
  const agora = Date.now();
  const relatorio =
    exp && agora - r.salvoEm >= AUSENCIA_MINIMA_MS
      ? {
          ganhos: accruedGains(exp, agora, CONTEUDO, r.estado.cacador),
          coletado: false,
          levelsGanhos: 0,
          semEspaco: 0,
        }
      : null;
  return { estado: r.estado, aviso: null, relatorio };
}

export const useGame = create<Store>()((set, get) => {
  /** Aplica o resultado de um comando do motor. */
  const apply = (r: { estado?: GameState | undefined; erro?: string | undefined }): boolean => {
    if (r.erro !== undefined || !r.estado) {
      set({ aviso: r.erro ?? 'Algo deu errado.' });
      return false;
    }
    set({ estado: r.estado, aviso: null });
    return true;
  };

  const partida = (c: Exclude<ArenaComando, { t: 'lutar' }>) =>
    apply(arenaAction(get().estado, CONTEUDO, c));

  return {
    ...initial(),

    avisar: (aviso) => set({ aviso }),
    gastarPonto: (a, delta) => apply(spendPoint(get().estado, CONTEUDO, a, delta)),
    redistribuir: () => apply(respec(get().estado, CONTEUDO)),
    equipar: (ids) => apply(equip(get().estado, CONTEUDO, ids)),
    melhorar: (id) => apply(upgrade(get().estado, CONTEUDO, id)),
    definirComportamento: (c) => apply(changeBehavior(get().estado, c)),

    pegarItem(item) {
      const r = pickUp(get().estado, CONTEUDO, item);
      if (r.erro !== undefined) return false;
      set({ estado: r.estado });
      return true;
    },
    equiparItem: (uid) => apply(equipItem(get().estado, CONTEUDO, uid)),
    desequipar: (slot) => apply(unequipItem(get().estado, CONTEUDO, slot)),
    descartar: (uid) => apply(discardItem(get().estado, uid)),
    vender: (uids) => apply(sellItems(get().estado, CONTEUDO, uids)),
    comprarPocoes: (qtd) => apply(buyPotions(get().estado, CONTEUDO, qtd)),
    gastarPocao() {
      const r = consumePotion(get().estado);
      if (r.erro !== undefined) return false;
      set({ estado: r.estado });
      return true;
    },
    guardar: (uid) => apply(storeItem(get().estado, CONTEUDO, uid)),
    arenaHeroi: (id) => apply(chooseArenaHero(get().estado, CONTEUDO, id)),
    arenaComecar: (rivais = [], nome) =>
      apply(startArenaMatch(get().estado, CONTEUDO, rivais, nome)),
    arenaComprar: (slot) => partida({ t: 'comprar', slot }),
    arenaVender: (uid) => partida({ t: 'vender', uid }),
    arenaRolar: () => partida({ t: 'rolar' }),
    arenaXp: () => partida({ t: 'xp' }),
    arenaMover: (uid, destino) => partida({ t: 'mover', uid, destino }),
    arenaLutar() {
      const r = playArenaRound(get().estado, CONTEUDO);
      if (!apply(r) || !r.resultado) return null;
      return r.resultado;
    },
    arenaSair: () => apply(leaveArenaMatch(get().estado)),
    gastarGloria: (oferta) => apply(spendGloria(get().estado, CONTEUDO, oferta)),
    retirar: (uid) => apply(retrieveItem(get().estado, CONTEUDO, uid)),
    morrer() {
      const r = dieInMap(get().estado);
      if (r.erro !== undefined) return 0;
      set({ estado: r.estado });
      return r.perdidos;
    },
    recompensarAbate(portal, abate) {
      const r = rewardKill(get().estado, CONTEUDO, portal, abate);
      return apply(r) && r.recompensa ? r.recompensa : null;
    },

    enviarExpedicao: (portal) => apply(startExpedition(get().estado, CONTEUDO, portal, Date.now())),
    coletar(encerrar = false) {
      const r = collectExpedition(get().estado, CONTEUDO, Date.now(), encerrar);
      if (apply(r) && r.ganhos) {
        set({
          relatorio: {
            ganhos: r.ganhos,
            coletado: true,
            levelsGanhos: r.levelsGanhos ?? 0,
            itens: r.itens ?? [],
            semEspaco: r.semEspaco ?? 0,
          },
        });
      }
    },
    fecharRelatorio: () => set({ relatorio: null }),

    apagarProgresso() {
      clearSave();
      set({
        estado: newGame(CONTEUDO, semente(), Date.now()),
        relatorio: null,
        aviso: null,
      });
    },
    avancarTempo: (ms) => set({ estado: advanceTime(get().estado, ms) }),
    substituirEstado: (estado) => set({ estado, relatorio: null, aviso: null }),
  };
});

/* Autosave: a cada mudança de estado, a cada 30 s e ao esconder ou fechar a aba. */
let ultimoSalvo: GameState | null = null;
const salvar = () => {
  const { estado } = useGame.getState();
  ultimoSalvo = estado;
  writeSave(estado);
};
useGame.subscribe((s) => {
  if (s.estado !== ultimoSalvo) salvar();
});
if (typeof window !== 'undefined') {
  window.setInterval(salvar, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') salvar();
  });
  window.addEventListener('pagehide', salvar);
}
