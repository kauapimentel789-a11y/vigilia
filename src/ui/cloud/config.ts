/**
 * Endereço e chave pública do Supabase. A chave "publishable" é feita para
 * ficar no navegador: o que protege os dados são as regras (RLS) no banco.
 * Vazio = jogo só com save local.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';
