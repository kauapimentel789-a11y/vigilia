/**
 * Conta e save na nuvem (Supabase).
 *
 * O jogo continua funcionando sem conta: o save local é a fonte principal.
 * Com conta, o save também vai para a nuvem (a cada mudança, no máximo a cada
 * 20 s) e, ao entrar num aparelho novo, o jogador escolhe qual save manter.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { CONTEUDO } from '../../content/index.ts';
import type { GameState } from '../../engine/game/game.ts';
import { deserialize, serialize } from '../../engine/save/save.ts';
import { useGame } from '../store/game.ts';
import { SUPABASE_KEY, SUPABASE_URL } from './config.ts';

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export interface Conflito {
  nuvem: GameState;
  salvoEm: number;
}

interface CloudStore {
  disponivel: boolean;
  usuario: { id: string; email: string } | null;
  nome: string | null;
  status: 'ocioso' | 'salvando' | 'salvo' | 'erro';
  salvoEm: number | null;
  conflito: Conflito | null;
  mensagem: string | null;
  entrar(email: string, senha: string): Promise<void>;
  criarConta(email: string, senha: string, nome: string): Promise<void>;
  sair(): Promise<void>;
  definirNome(nome: string): Promise<void>;
  resolverConflito(usar: 'nuvem' | 'local'): void;
  salvarAgora(): Promise<void>;
}

const NOME_OK = /^[\p{L}\p{N} _.-]{3,20}$/u;

export const useCloud = create<CloudStore>()((set, get) => ({
  disponivel: !!supabase,
  usuario: null,
  nome: null,
  status: 'ocioso',
  salvoEm: null,
  conflito: null,
  mensagem: null,

  async entrar(email, senha) {
    if (!supabase) return;
    set({ mensagem: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) set({ mensagem: traduzir(error.message) });
  },

  async criarConta(email, senha, nome) {
    if (!supabase) return;
    if (!NOME_OK.test(nome)) {
      set({ mensagem: 'O nome precisa ter de 3 a 20 letras, números, espaço, ponto ou traço.' });
      return;
    }
    set({ mensagem: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) return set({ mensagem: traduzir(error.message) });
    if (!data.session)
      set({ mensagem: 'Conta criada. Confirme pelo link no seu e-mail e depois entre.' });
  },

  async sair() {
    if (!supabase) return;
    await enviar();
    await supabase.auth.signOut();
    set({ usuario: null, nome: null, salvoEm: null, status: 'ocioso', conflito: null });
  },

  async definirNome(nome) {
    const u = get().usuario;
    if (!supabase || !u) return;
    if (!NOME_OK.test(nome))
      return set({
        mensagem: 'O nome precisa ter de 3 a 20 letras, números, espaço, ponto ou traço.',
      });
    const { error } = await supabase.from('perfis').upsert({ user_id: u.id, nome });
    if (error)
      return set({
        mensagem:
          error.code === '23505'
            ? 'Esse nome já é de outro caçador.'
            : 'Não deu para salvar o nome.',
      });
    set({ nome, mensagem: null });
  },

  resolverConflito(usar) {
    const c = get().conflito;
    if (!c) return;
    if (usar === 'nuvem') useGame.getState().substituirEstado(c.nuvem);
    set({ conflito: null });
    void enviar();
  },

  salvarAgora: () => enviar(),
}));

function traduzir(msg: string): string {
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Esse e-mail já tem conta. Use Entrar.';
  if (/password/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/email/i.test(msg)) return 'Confira o e-mail.';
  return msg;
}

/** Nível e XP somados, para comparar dois saves. */
export function progresso(e: GameState): number {
  return e.cacador.level * 1e9 + e.cacador.xp;
}

let ultimoEnviado: GameState | null = null;
let enviando: Promise<void> | null = null;

async function enviar(): Promise<void> {
  const u = useCloud.getState().usuario;
  if (!supabase || !u || useCloud.getState().conflito) return;
  const estado = useGame.getState().estado;
  if (estado === ultimoEnviado) return;
  if (enviando) await enviando;
  const agora = Date.now();
  useCloud.setState({ status: 'salvando' });
  enviando = (async () => {
    const { error } = await supabase
      .from('saves')
      .upsert({
        user_id: u.id,
        dados: serialize(estado, agora),
        versao: estado.versao,
        salvo_em: new Date(agora).toISOString(),
      });
    if (error) useCloud.setState({ status: 'erro' });
    else {
      ultimoEnviado = estado;
      useCloud.setState({ status: 'salvo', salvoEm: agora });
    }
  })();
  await enviando;
  enviando = null;
}

async function aoEntrar(id: string, email: string): Promise<void> {
  if (!supabase) return;
  useCloud.setState({ usuario: { id, email }, mensagem: null });
  const [{ data: perfil }, { data: save }] = await Promise.all([
    supabase.from('perfis').select('nome').eq('user_id', id).maybeSingle(),
    supabase.from('saves').select('dados, salvo_em').eq('user_id', id).maybeSingle(),
  ]);
  let nome = (perfil as { nome?: string } | null)?.nome ?? null;
  if (!nome) {
    const { data } = await supabase.auth.getUser();
    const sugerido = (data.user?.user_metadata as { nome?: string } | undefined)?.nome;
    if (sugerido && NOME_OK.test(sugerido)) {
      const { error } = await supabase.from('perfis').upsert({ user_id: id, nome: sugerido });
      if (!error) nome = sugerido;
    }
  }
  useCloud.setState({ nome });
  const linha = save as { dados?: string; salvo_em?: string } | null;
  if (linha?.dados) {
    const r = deserialize(linha.dados, CONTEUDO);
    if (r.estado) {
      const local = useGame.getState().estado;
      // Igual ao deste aparelho: nada a decidir.
      if (JSON.stringify(r.estado) !== JSON.stringify(local)) {
        useCloud.setState({ conflito: { nuvem: r.estado, salvoEm: r.salvoEm } });
        return;
      }
    }
  }
  await enviar();
}

if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((evento, sessao) => {
    const u = sessao?.user;
    if (u && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) {
      if (useCloud.getState().usuario?.id !== u.id) void aoEntrar(u.id, u.email ?? '');
    }
    if (evento === 'SIGNED_OUT') useCloud.setState({ usuario: null, nome: null });
  });
  // Envia no máximo a cada 20 s, e ao esconder a aba.
  window.setInterval(() => void enviar(), 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void enviar();
  });
}
