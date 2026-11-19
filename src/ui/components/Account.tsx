/**
 * Conta na nuvem: entrar, criar conta, nome de caçador e estado do save.
 * Também mostra a escolha de save quando a nuvem e o aparelho diferem.
 */
import { useState } from 'react';
import { progresso, useCloud } from '../cloud/cloud.ts';
import { useGame } from '../store/game.ts';
import ui from './common.module.css';

const hora = (ms: number) =>
  new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function Account() {
  const c = useCloud();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (!c.disponivel)
    return <p className={ui.muted}>A conta na nuvem não está disponível nesta versão.</p>;

  if (c.usuario) {
    return (
      <div className={ui.stack}>
        <p>
          Conectado como <strong>{c.nome ?? c.usuario.email}</strong>
          <span className={ui.muted}> · {c.usuario.email}</span>
        </p>
        <p className={ui.muted}>
          {c.status === 'salvando'
            ? 'Salvando na nuvem...'
            : c.status === 'erro'
              ? 'Não deu para salvar na nuvem agora. Tentamos de novo em instantes.'
              : c.salvoEm
                ? `Salvo na nuvem em ${hora(c.salvoEm)}.`
                : 'O save vai para a nuvem automaticamente.'}
        </p>
        {!c.nome && (
          <form
            className={ui.row}
            onSubmit={(e) => {
              e.preventDefault();
              void c.definirNome(nome.trim());
            }}
          >
            <input
              placeholder="Nome de caçador (aparece na Arena)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-label="Nome de caçador"
            />
            <button className={ui.button}>Salvar nome</button>
          </form>
        )}
        {c.mensagem && <p className={ui.muted}>{c.mensagem}</p>}
        <div className={ui.row}>
          <button className={ui.button} onClick={() => void c.salvarAgora()}>
            Salvar agora
          </button>
          <button className={ui.button} onClick={() => void c.sair()}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    if (modo === 'entrar') await c.entrar(email.trim(), senha);
    else await c.criarConta(email.trim(), senha, nome.trim());
    setOcupado(false);
  };

  return (
    <form className={ui.stack} onSubmit={(e) => void enviar(e)}>
      <p className={ui.muted}>
        Com uma conta, o progresso fica salvo na nuvem e você joga em qualquer aparelho. A Arena
        online também usa a conta.
      </p>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        aria-label="E-mail"
        required
      />
      <input
        type="password"
        placeholder="Senha (6 ou mais caracteres)"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
        aria-label="Senha"
        required
        minLength={6}
      />
      {modo === 'criar' && (
        <input
          placeholder="Nome de caçador"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label="Nome de caçador"
          required
        />
      )}
      {c.mensagem && <p className={ui.muted}>{c.mensagem}</p>}
      <div className={ui.row}>
        <button className={`${ui.button} ${ui.primary}`} disabled={ocupado}>
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          className={ui.small}
          onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}
        >
          {modo === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
        </button>
      </div>
    </form>
  );
}

/** Escolha entre o save da nuvem e o deste aparelho. */
export function SaveConflict() {
  const conflito = useCloud((c) => c.conflito);
  const resolver = useCloud((c) => c.resolverConflito);
  const local = useGame((g) => g.estado);
  if (!conflito) return null;
  const n = conflito.nuvem;
  const recomendado = progresso(n) >= progresso(local) ? 'nuvem' : 'local';
  return (
    <div className={ui.overlay} role="dialog" aria-modal="true" aria-label="Escolher save">
      <div className={ui.modal}>
        <h2 className={ui.title}>Qual progresso manter?</h2>
        <p className={ui.muted}>
          A sua conta tem um save diferente do que está neste aparelho. O outro será substituído.
        </p>
        <div className={ui.stack}>
          <button
            className={`${ui.button} ${recomendado === 'nuvem' ? ui.primary : ''}`}
            onClick={() => resolver('nuvem')}
          >
            Nuvem: level {n.cacador.level}, rank {n.rank}, salvo em {hora(conflito.salvoEm)}
          </button>
          <button
            className={`${ui.button} ${recomendado === 'local' ? ui.primary : ''}`}
            onClick={() => resolver('local')}
          >
            Este aparelho: level {local.cacador.level}, rank {local.rank}
          </button>
        </div>
      </div>
    </div>
  );
}
