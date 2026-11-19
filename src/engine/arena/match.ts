/**
 * Partida da Arena: loja, ouro, níveis, banco, tabuleiro, estrelas e rodadas.
 *
 * Todo comando é puro: recebe a partida e devolve uma nova (ou um erro). Os
 * adversários controlados pelo jogo usam as mesmas regras e o mesmo estoque.
 */
import { createRng, restoreRng } from '../core/index.ts';
import type { Rng } from '../core/index.ts';
import type { ArenaDef, GameContent, MarcaId } from '../definitions.ts';
import type { ArenaBattleResult, ArenaSide, ArenaUnitInst } from './battle.ts';
import { countMarcas, simulateArenaBattle } from './battle.ts';

export interface ArenaPlayer {
  id: number;
  nome: string;
  bot: boolean;
  heroi: string;
  vida: number;
  ouro: number;
  nivel: number;
  xp: number;
  banco: Array<ArenaUnitInst | null>;
  /** 0 a 3: fileira da frente; 4 a 7: fileira de trás. */
  tabuleiro: Array<ArenaUnitInst | null>;
  loja: Array<string | null>;
  rolagensGratis: number;
  /** Rodada em que caiu (null = ainda vivo). */
  caiuNaRodada: number | null;
  vitorias: number;
  derrotas: number;
}

export interface ArenaMatch {
  rodada: number;
  rngState: number;
  proximoUid: number;
  jogadores: ArenaPlayer[];
  /** Cópias de cada unidade ainda disponíveis para as lojas. */
  estoque: Record<string, number>;
  fim: boolean;
}

export interface ArenaFight {
  a: number;
  /** Adversário; com `fantasma`, é uma cópia de alguém que não perde vida. */
  b: number;
  fantasma: boolean;
  vencedor: 0 | 1 | null;
  danoA: number;
  danoB: number;
}

export interface RoundReport {
  rodada: number;
  lutas: ArenaFight[];
  /** A luta do jogador (jogador 0), com eventos e quadros para assistir. */
  minha: { luta: ArenaFight; batalha: ArenaBattleResult; souA: boolean } | null;
}

export type MatchResult<E = object> =
  | ({ partida: ArenaMatch; erro?: undefined } & E)
  | ({ partida?: undefined; erro: string } & { [K in keyof E]?: undefined });

/* ---------- Ajudantes ---------- */

const EU = 0;

function clone(m: ArenaMatch): ArenaMatch {
  return structuredClone(m);
}

function ok(m: ArenaMatch): MatchResult {
  return { partida: m };
}

export function boardCount(p: ArenaPlayer): number {
  return p.tabuleiro.filter(Boolean).length;
}

export function xpToLevel(arena: ArenaDef, nivel: number): number {
  return arena.regras.xpParaNivel[nivel - 1] ?? Infinity;
}

/** Valor de venda: custo × cópias usadas (1, 3 ou 9). */
export function unitValue(arena: ArenaDef, u: ArenaUnitInst): number {
  const custo = arena.unidades[u.def]?.custo ?? 1;
  return custo * 3 ** (u.estrelas - 1);
}

function gainXp(arena: ArenaDef, p: ArenaPlayer, xp: number): void {
  if (p.nivel >= arena.regras.nivelMax) return;
  p.xp += xp;
  while (p.nivel < arena.regras.nivelMax && p.xp >= xpToLevel(arena, p.nivel)) {
    p.xp -= xpToLevel(arena, p.nivel);
    p.nivel++;
  }
  if (p.nivel >= arena.regras.nivelMax) p.xp = 0;
}

function returnShop(m: ArenaMatch, p: ArenaPlayer): void {
  for (const id of p.loja) if (id) m.estoque[id] = (m.estoque[id] ?? 0) + 1;
  p.loja = p.loja.map(() => null);
}

function rollShop(m: ArenaMatch, arena: ArenaDef, p: ArenaPlayer, rng: Rng): void {
  returnShop(m, p);
  const regras = arena.regras;
  const chances = regras.chances[p.nivel - 1] ?? regras.chances[0]!;
  p.loja = [];
  for (let i = 0; i < regras.tamanhoLoja; i++) {
    let r = rng.next() * 100;
    let custo = 1;
    for (let c = 0; c < chances.length; c++) {
      r -= chances[c] ?? 0;
      if (r < 0) {
        custo = c + 1;
        break;
      }
    }
    // Do custo sorteado para baixo, até achar algo no estoque.
    let escolhido: string | null = null;
    for (let c = custo; c >= 1 && !escolhido; c--) {
      const opcoes = Object.values(arena.unidades).filter(
        (u) => u.custo === c && (m.estoque[u.id] ?? 0) > 0,
      );
      const total = opcoes.reduce((s, u) => s + (m.estoque[u.id] ?? 0), 0);
      let k = rng.next() * total;
      for (const u of opcoes) {
        k -= m.estoque[u.id] ?? 0;
        if (k < 0) {
          escolhido = u.id;
          break;
        }
      }
    }
    if (escolhido) m.estoque[escolhido] = (m.estoque[escolhido] ?? 0) - 1;
    p.loja.push(escolhido);
  }
}

/** Junta 3 cópias iguais (mesma unidade, mesmas estrelas) numa versão melhor. */
function mergeAll(m: ArenaMatch, p: ArenaPlayer): void {
  for (let mudou = true; mudou;) {
    mudou = false;
    const grupos = new Map<string, Array<{ onde: 'banco' | 'tabuleiro'; i: number }>>();
    const anota = (onde: 'banco' | 'tabuleiro', lista: Array<ArenaUnitInst | null>) =>
      lista.forEach((u, i) => {
        if (!u || u.estrelas >= 3) return;
        const k = `${u.def}:${u.estrelas}`;
        grupos.set(k, [...(grupos.get(k) ?? []), { onde, i }]);
      });
    anota('tabuleiro', p.tabuleiro);
    anota('banco', p.banco);
    for (const [k, lugares] of grupos) {
      if (lugares.length < 3) continue;
      const [def, estrelas] = k.split(':') as [string, string];
      const tres = lugares.slice(0, 3);
      for (const l of tres) p[l.onde][l.i] = null;
      const destino = tres[0]!;
      p[destino.onde][destino.i] = {
        uid: `u${m.proximoUid++}`,
        def,
        estrelas: Number(estrelas) + 1,
      };
      mudou = true;
      break;
    }
  }
}

function player(m: ArenaMatch, id: number): ArenaPlayer {
  const p = m.jogadores[id];
  if (!p) throw new Error(`Jogador desconhecido: ${id}`);
  return p;
}

/* ---------- Criação ---------- */

export function createMatch(
  content: GameContent,
  semente: number,
  heroi: string,
  nome: string,
): ArenaMatch {
  const arena = content.arena;
  const regras = arena.regras;
  const rng = createRng(semente);
  const estoque: Record<string, number> = {};
  for (const u of Object.values(arena.unidades)) estoque[u.id] = regras.copias[u.custo - 1] ?? 0;
  const herois = Object.keys(arena.herois);
  const nomes = [...arena.nomesBots];
  const jogadores: ArenaPlayer[] = [];
  for (let i = 0; i < regras.jogadores; i++) {
    const bot = i !== EU;
    const h = bot ? herois[Math.floor(rng.next() * herois.length)]! : heroi;
    const efeito = arena.herois[h]?.efeito ?? {};
    const nomeBot = nomes.splice(Math.floor(rng.next() * nomes.length), 1)[0] ?? `Rival ${i}`;
    jogadores.push({
      id: i,
      nome: bot ? nomeBot : nome,
      bot,
      heroi: h,
      vida: regras.vidaJogador + (efeito.vidaJogador ?? 0),
      ouro: (regras.renda[0] ?? 0) + (efeito.ouroInicial ?? 0),
      nivel: regras.nivelInicial,
      xp: 0,
      banco: new Array<ArenaUnitInst | null>(regras.banco).fill(null),
      tabuleiro: new Array<ArenaUnitInst | null>(regras.colunas * 2).fill(null),
      loja: [],
      rolagensGratis: efeito.rolagemGratis ?? 0,
      caiuNaRodada: null,
      vitorias: 0,
      derrotas: 0,
    });
  }
  const m: ArenaMatch = {
    rodada: 1,
    rngState: 0,
    proximoUid: 1,
    jogadores,
    estoque,
    fim: false,
  };
  for (const p of jogadores) rollShop(m, arena, p, rng);
  m.rngState = rng.getState();
  return m;
}

/* ---------- Comandos do jogador ---------- */

function buyFor(m: ArenaMatch, arena: ArenaDef, p: ArenaPlayer, slot: number): string | null {
  const id = p.loja[slot];
  if (!id) return 'Nada para comprar aqui.';
  const def = arena.unidades[id];
  if (!def) return 'Unidade desconhecida.';
  if (p.ouro < def.custo) return 'Ouro insuficiente.';
  const livre = p.banco.indexOf(null);
  // Banco cheio: só dá para comprar se a compra fechar uma fusão.
  const iguais = [...p.banco, ...p.tabuleiro].filter((u) => u?.def === id && u.estrelas === 1);
  if (livre < 0 && iguais.length < 2) return 'Banco cheio. Venda ou ponha alguém no tabuleiro.';
  p.ouro -= def.custo;
  p.loja[slot] = null;
  const novo: ArenaUnitInst = { uid: `u${m.proximoUid++}`, def: id, estrelas: 1 };
  if (livre >= 0) p.banco[livre] = novo;
  else {
    // Funde direto com as duas cópias que já existem.
    let tirados = 0;
    let destino: { onde: 'tabuleiro' | 'banco'; i: number } | null = null;
    for (const onde of ['tabuleiro', 'banco'] as const) {
      p[onde].forEach((u, i) => {
        if (tirados < 2 && u?.def === id && u.estrelas === 1) {
          p[onde][i] = null;
          destino ??= { onde, i };
          tirados++;
        }
      });
    }
    if (destino) {
      const d = destino as { onde: 'tabuleiro' | 'banco'; i: number };
      p[d.onde][d.i] = { uid: `u${m.proximoUid++}`, def: id, estrelas: 2 };
    }
  }
  mergeAll(m, p);
  return null;
}

export function buyUnit(m: ArenaMatch, content: GameContent, slot: number): MatchResult {
  if (m.fim) return { erro: 'A partida acabou.' };
  const novo = clone(m);
  const erro = buyFor(novo, content.arena, player(novo, EU), slot);
  return erro ? { erro } : ok(novo);
}

export function sellUnit(m: ArenaMatch, content: GameContent, uid: string): MatchResult {
  if (m.fim) return { erro: 'A partida acabou.' };
  const novo = clone(m);
  const p = player(novo, EU);
  for (const onde of ['banco', 'tabuleiro'] as const) {
    const i = p[onde].findIndex((u) => u?.uid === uid);
    if (i < 0) continue;
    const u = p[onde][i]!;
    p.ouro += unitValue(content.arena, u);
    novo.estoque[u.def] = (novo.estoque[u.def] ?? 0) + 3 ** (u.estrelas - 1);
    p[onde][i] = null;
    return ok(novo);
  }
  return { erro: 'Unidade não encontrada.' };
}

function rerollFor(m: ArenaMatch, arena: ArenaDef, p: ArenaPlayer, rng: Rng): string | null {
  if (p.rolagensGratis > 0) p.rolagensGratis--;
  else if (p.ouro < arena.regras.custoRolar) return 'Ouro insuficiente.';
  else p.ouro -= arena.regras.custoRolar;
  rollShop(m, arena, p, rng);
  return null;
}

export function rerollShop(m: ArenaMatch, content: GameContent): MatchResult {
  if (m.fim) return { erro: 'A partida acabou.' };
  const novo = clone(m);
  const rng = restoreRng(novo.rngState);
  const erro = rerollFor(novo, content.arena, player(novo, EU), rng);
  if (erro) return { erro };
  novo.rngState = rng.getState();
  return ok(novo);
}

function buyXpFor(arena: ArenaDef, p: ArenaPlayer): string | null {
  if (p.nivel >= arena.regras.nivelMax) return 'Nível máximo.';
  if (p.ouro < arena.regras.custoXp) return 'Ouro insuficiente.';
  p.ouro -= arena.regras.custoXp;
  gainXp(arena, p, arena.regras.xpPorCompra);
  return null;
}

export function buyXp(m: ArenaMatch, content: GameContent): MatchResult {
  if (m.fim) return { erro: 'A partida acabou.' };
  const novo = clone(m);
  const erro = buyXpFor(content.arena, player(novo, EU));
  return erro ? { erro } : ok(novo);
}

export type Lugar = { onde: 'banco' | 'tabuleiro'; i: number };

/** Move (ou troca) uma unidade entre banco e tabuleiro. */
export function moveUnit(
  m: ArenaMatch,
  content: GameContent,
  uid: string,
  destino: Lugar,
): MatchResult {
  if (m.fim) return { erro: 'A partida acabou.' };
  const novo = clone(m);
  const p = player(novo, EU);
  let origem: Lugar | null = null;
  for (const onde of ['banco', 'tabuleiro'] as const) {
    const i = p[onde].findIndex((u) => u?.uid === uid);
    if (i >= 0) origem = { onde, i };
  }
  if (!origem) return { erro: 'Unidade não encontrada.' };
  if (destino.i < 0 || destino.i >= p[destino.onde].length) return { erro: 'Lugar inválido.' };
  const a = p[origem.onde][origem.i] ?? null;
  const b = p[destino.onde][destino.i] ?? null;
  if (origem.onde === 'banco' && destino.onde === 'tabuleiro' && !b) {
    if (boardCount(p) >= p.nivel)
      return { erro: `No nível ${p.nivel}, cabem ${p.nivel} unidades no tabuleiro.` };
  }
  p[origem.onde][origem.i] = b;
  p[destino.onde][destino.i] = a;
  void content;
  return ok(novo);
}

/* ---------- Adversários do jogo ---------- */

function favoriteMarca(arena: ArenaDef, p: ArenaPlayer): MarcaId | null {
  const todos = [...p.tabuleiro, ...p.banco];
  if (!todos.some(Boolean)) return null;
  const qtd = countMarcas(arena, todos);
  let melhor: MarcaId | null = null;
  for (const [mId, q] of Object.entries(qtd) as Array<[MarcaId, number]>)
    if (!melhor || q > qtd[melhor]) melhor = mId;
  return melhor;
}

/** Põe as melhores unidades no tabuleiro: corpo a corpo na frente, à distância atrás. */
function arrangeBoard(arena: ArenaDef, p: ArenaPlayer): void {
  const todas = [...p.tabuleiro, ...p.banco].filter((u): u is ArenaUnitInst => !!u);
  const valor = (u: ArenaUnitInst) => u.estrelas * 10 + (arena.unidades[u.def]?.custo ?? 0);
  todas.sort((a, b) => valor(b) - valor(a));
  const noCampo = todas.slice(0, p.nivel);
  const resto = todas.slice(p.nivel);
  const cols = arena.regras.colunas;
  p.tabuleiro = new Array<ArenaUnitInst | null>(cols * 2).fill(null);
  const frente = noCampo.filter((u) => (arena.unidades[u.def]?.alcance ?? 1) <= 1);
  const tras = noCampo.filter((u) => (arena.unidades[u.def]?.alcance ?? 1) > 1);
  const ordem = [1, 2, 0, 3];
  const por = (lista: ArenaUnitInst[], linha: number, sobra: ArenaUnitInst[]) => {
    for (const u of lista) {
      const col = ordem.find((c) => !p.tabuleiro[linha * cols + c]);
      if (col === undefined) sobra.push(u);
      else p.tabuleiro[linha * cols + col] = u;
    }
  };
  const sobra: ArenaUnitInst[] = [];
  por(frente, 0, sobra);
  por(tras, 1, sobra);
  const sobra2: ArenaUnitInst[] = [];
  por(sobra, 0, sobra2);
  por(sobra2, 1, []);
  p.banco = new Array<ArenaUnitInst | null>(arena.regras.banco).fill(null);
  resto.slice(0, arena.regras.banco).forEach((u, i) => (p.banco[i] = u));
}

function botTurn(m: ArenaMatch, arena: ArenaDef, p: ArenaPlayer, rng: Rng): void {
  const regras = arena.regras;
  // Sobe de nível quando sobra ouro (guardando para os juros).
  while (p.nivel < regras.nivelMax && p.ouro >= regras.custoXp + 12 && m.rodada >= 3)
    buyXpFor(arena, p);
  for (let rolagens = 0; rolagens < 4; rolagens++) {
    const fav = favoriteMarca(arena, p);
    const temQtd = (id: string) => [...p.banco, ...p.tabuleiro].filter((u) => u?.def === id).length;
    for (let s = 0; s < p.loja.length; s++) {
      const id = p.loja[s];
      if (!id) continue;
      const def = arena.unidades[id];
      if (!def) continue;
      const unidades = [...p.banco, ...p.tabuleiro].filter(Boolean).length;
      const quer =
        temQtd(id) > 0 ||
        (fav !== null && def.marcas.includes(fav)) ||
        unidades < p.nivel + 1 ||
        rng.next() < 0.15;
      if (quer && p.ouro >= def.custo) {
        if (buyFor(m, arena, p, s)) {
          // Banco cheio: vende a unidade mais barata do banco e tenta de novo.
          const i = p.banco.reduce(
            (melhor, u, k) =>
              u && (melhor < 0 || unitValue(arena, u) < unitValue(arena, p.banco[melhor]!))
                ? k
                : melhor,
            -1,
          );
          if (i >= 0) {
            const u = p.banco[i]!;
            p.ouro += unitValue(arena, u);
            m.estoque[u.def] = (m.estoque[u.def] ?? 0) + 3 ** (u.estrelas - 1);
            p.banco[i] = null;
            buyFor(m, arena, p, s);
          }
        }
      }
    }
    const reserva = Math.min(regras.jurosCada * regras.jurosMax, m.rodada * 3);
    if (p.ouro - regras.custoRolar < reserva && p.rolagensGratis <= 0) break;
    rerollFor(m, arena, p, rng);
  }
  arrangeBoard(arena, p);
}

/* ---------- Rodada ---------- */

function alive(m: ArenaMatch): ArenaPlayer[] {
  return m.jogadores.filter((p) => p.caiuNaRodada === null);
}

/** Pares da rodada: rodízio entre os vivos; com número ímpar, alguém enfrenta um fantasma. */
export function pairings(m: ArenaMatch, rng: Rng): Array<[number, number, boolean]> {
  const vivos = alive(m).map((p) => p.id);
  const n = vivos.length;
  if (n < 2) return [];
  // Rodízio clássico (método do círculo).
  const lista = n % 2 === 0 ? [...vivos] : [...vivos, -1];
  const k = lista.length;
  const giro = (m.rodada - 1) % (k - 1);
  const fixos = lista[0]!;
  const roda = lista.slice(1);
  const rodada = [fixos, ...roda.slice(giro), ...roda.slice(0, giro)];
  const pares: Array<[number, number, boolean]> = [];
  for (let i = 0; i < k / 2; i++) {
    const a = rodada[i]!;
    const b = rodada[k - 1 - i]!;
    if (a === -1 || b === -1) {
      const sozinho = a === -1 ? b : a;
      const outros = vivos.filter((v) => v !== sozinho);
      pares.push([sozinho, outros[Math.floor(rng.next() * outros.length)]!, true]);
    } else pares.push([a, b, false]);
  }
  return pares;
}

function side(p: ArenaPlayer): ArenaSide {
  return { tabuleiro: p.tabuleiro, heroi: p.heroi };
}

/** Fecha a rodada: adversários jogam, todas as lutas acontecem, vem a renda da próxima. */
export function endRound(
  m: ArenaMatch,
  content: GameContent,
): MatchResult<{ relatorio: RoundReport }> {
  if (m.fim) return { erro: 'A partida acabou.' };
  const arena = content.arena;
  const regras = arena.regras;
  const novo = clone(m);
  const rng = restoreRng(novo.rngState);
  for (const p of alive(novo)) if (p.bot) botTurn(novo, arena, p, rng);

  const relatorio: RoundReport = { rodada: novo.rodada, lutas: [], minha: null };
  for (const [a, b, fantasma] of pairings(novo, rng)) {
    const pa = player(novo, a);
    const pb = player(novo, b);
    const minha = a === EU || (b === EU && !fantasma);
    const batalha = simulateArenaBattle(
      content,
      side(pa),
      side(pb),
      Math.floor(rng.next() * 2 ** 31),
      minha,
    );
    // Quem perde leva: base + unidades vivas do vencedor + 1 a cada 5 rodadas.
    const dano = (vivas: number) => regras.danoBase + vivas + Math.floor(novo.rodada / 5);
    const luta: ArenaFight = {
      a,
      b,
      fantasma,
      vencedor: batalha.vencedor,
      danoA:
        batalha.vencedor === 0
          ? 0
          : batalha.vencedor === 1
            ? dano(batalha.vivas[1])
            : regras.danoBase,
      danoB:
        fantasma || batalha.vencedor === 1
          ? 0
          : batalha.vencedor === 0
            ? dano(batalha.vivas[0])
            : regras.danoBase,
    };
    pa.vida -= luta.danoA;
    if (!fantasma) pb.vida -= luta.danoB;
    if (batalha.vencedor === 0) {
      pa.vitorias++;
      pa.ouro += regras.bonusVitoria;
      if (!fantasma) pb.derrotas++;
    } else {
      pa.derrotas++;
      if (batalha.vencedor === 1 && !fantasma) {
        pb.vitorias++;
        pb.ouro += regras.bonusVitoria;
      }
    }
    relatorio.lutas.push(luta);
    if (minha) relatorio.minha = { luta, batalha, souA: a === EU };
  }
  for (const p of novo.jogadores)
    if (p.caiuNaRodada === null && p.vida <= 0) {
      p.vida = 0;
      p.caiuNaRodada = novo.rodada;
    }

  const vivos = alive(novo);
  if (
    vivos.length <= 1 ||
    player(novo, EU).caiuNaRodada !== null ||
    novo.rodada >= regras.rodadasMax
  ) {
    novo.fim = true;
    novo.rngState = rng.getState();
    return { partida: novo, relatorio };
  }

  novo.rodada++;
  const renda = regras.renda[Math.min(novo.rodada - 1, regras.renda.length - 1)] ?? 0;
  for (const p of vivos) {
    const efeito = arena.herois[p.heroi]?.efeito ?? {};
    const juros = Math.min(regras.jurosMax, Math.floor(p.ouro / regras.jurosCada));
    p.ouro += renda + juros;
    gainXp(arena, p, regras.xpPorRodada + (efeito.xpExtra ?? 0));
    p.rolagensGratis = efeito.rolagemGratis ?? 0;
    rollShop(novo, arena, p, rng);
  }
  novo.rngState = rng.getState();
  return { partida: novo, relatorio };
}

/** Classificação: quem caiu por último fica à frente; empate, mais vida. */
export function standings(m: ArenaMatch): ArenaPlayer[] {
  return [...m.jogadores].sort((a, b) => {
    const ca = a.caiuNaRodada ?? Infinity;
    const cb = b.caiuNaRodada ?? Infinity;
    if (ca !== cb) return cb - ca;
    return b.vida - a.vida;
  });
}

export function placement(m: ArenaMatch): number {
  return standings(m).findIndex((p) => p.id === EU) + 1;
}

/** Joga a fase de compras do jogador como um adversário do jogo faria (simulador e testes). */
export function autoTurn(m: ArenaMatch, content: GameContent): ArenaMatch {
  const novo = clone(m);
  const rng = restoreRng(novo.rngState);
  botTurn(novo, content.arena, player(novo, EU), rng);
  novo.rngState = rng.getState();
  return novo;
}
