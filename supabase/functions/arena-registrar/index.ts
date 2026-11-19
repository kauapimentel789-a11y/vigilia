// Confere uma partida da Arena e, se ela bater, grava o time no banco de rivais
// e soma a Glória no ranking. O cliente manda só a semente, o herói, os ids dos
// rivais que enfrentou e a lista de comandos; o servidor refaz tudo.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { conferir } from './motor.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: u, error: errUser } = await comoUsuario.auth.getUser();
  if (errUser || !u.user) return resposta({ erro: 'Entre na sua conta.' }, 401);
  const userId = u.user.id;

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: 'Corpo inválido.' }, 400);
  }
  const ids = Array.isArray(corpo.rivais) ? corpo.rivais : [];
  if (ids.length > 3) return resposta({ erro: 'Rivais demais.' }, 400);

  const db = createClient(url, servico);
  // Rivais: carregados pelo id, nunca do que o cliente mandou.
  const reais = ids.filter((x): x is number => typeof x === 'number');
  const rivais: unknown[] = [];
  if (reais.length > 0) {
    const { data, error } = await db
      .from('arena_retratos')
      .select('id, nome, heroi, times')
      .in('id', reais);
    if (error) return resposta({ erro: 'Falha ao ler rivais.' }, 500);
    for (const id of reais) {
      const r = data.find((x) => x.id === id);
      if (!r) return resposta({ erro: 'Rival não encontrado.' }, 400);
      rivais.push(r);
    }
  }

  const c = conferir(corpo.semente, corpo.heroi, rivais, corpo.comandos);
  if (c.erro) return resposta({ erro: `Partida recusada: ${c.erro}` }, 422);

  const { data: perfil } = await db
    .from('perfis')
    .select('nome')
    .eq('user_id', userId)
    .maybeSingle();
  const nome = perfil?.nome ?? 'Caçador';

  // A mesma semente só conta uma vez por jogador.
  const { error: errIns } = await db.from('arena_retratos').insert({
    user_id: userId,
    semente: corpo.semente,
    nome,
    heroi: c.retrato?.heroi ?? corpo.heroi,
    times: c.retrato?.times ?? [],
    lugar: c.lugar,
  });
  if (errIns) {
    if (errIns.code === '23505') return resposta({ erro: 'Essa partida já foi registrada.' }, 409);
    return resposta({ erro: 'Falha ao gravar a partida.' }, 500);
  }

  const { error: errRank } = await db.rpc('arena_somar', {
    p_user: userId,
    p_nome: nome,
    p_gloria: c.gloria ?? 0,
    p_lugar: c.lugar,
  });
  if (errRank) return resposta({ erro: 'Falha ao atualizar o ranking.' }, 500);

  return resposta({ lugar: c.lugar, gloria: c.gloria });
});
