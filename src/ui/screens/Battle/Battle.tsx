import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTENT, TEST_DECK, getEncounter } from '../../../content/encounters.ts';
import type { CombatState, CommandResult, EnemyUnit } from '../../../engine/combat/index.ts';
import {
  allyIntent,
  aliveEnemies,
  cannotPlay,
  computeDamage,
  endTurn,
  playCard,
  previewIntent,
  startCombat,
} from '../../../engine/combat/index.ts';
import { Card } from '../../components/Card/Card.tsx';
import { Hud } from '../../components/Hud/Hud.tsx';
import { ResultModal } from '../../components/ResultModal/ResultModal.tsx';
import type { FloatingNumber, IntentView } from '../../components/Unit/Unit.tsx';
import { Unit } from '../../components/Unit/Unit.tsx';
import { describeEffects, describeEvent } from './text.ts';
import styles from './Battle.module.css';

const C = CONTENT;
const MAX_LOG = 60;

export interface BattleProps {
  encontroId: string;
  semente: number;
  onRepetir: () => void;
  onNovaSemente: () => void;
  onVoltar: () => void;
}

function enemyIntent(estado: CombatState, inimigo: EnemyUnit): IntentView | null {
  const p = previewIntent(estado, C, inimigo);
  if (!p) return null;
  const partes = [`${p.acao.nome}: ${describeEffects(p.acao.efeitos)}`];
  if (p.danoJogador !== null) partes.push(`Dano real em você: ${p.danoJogador}.`);
  if (p.danoAliado !== null) partes.push(`Dano real no aliado: ${p.danoAliado}.`);
  if (p.acao.aviso) partes.push(p.acao.aviso + '.');
  return {
    tipos: p.acao.tipos,
    nome: p.acao.nome,
    valor: p.danoJogador ?? undefined,
    golpes: p.golpes,
    dica: partes.join('\n'),
    aviso: p.acao.aviso,
  };
}

function allyIntentView(estado: CombatState): IntentView | null {
  const acao = allyIntent(estado, C);
  if (!acao || !estado.aliado) return null;
  const alvo = aliveEnemies(estado)[0];
  const golpe = acao.efeitos.find((e) => e.tipo === 'dano');
  const valor =
    golpe && alvo ? computeDamage(golpe.valor, estado.aliado.status, alvo.status) : undefined;
  const motivo =
    acao.id === 'proteger'
      ? 'Um inimigo vai atacar, então ela protege você.'
      : 'Nenhum inimigo vai atacar, então ela ataca.';
  return {
    tipos: acao.tipos,
    nome: acao.nome,
    valor,
    dica: `${acao.nome}: ${describeEffects(acao.efeitos)}\n${motivo}\nAge no fim do seu turno.`,
  };
}

export function Battle({ encontroId, semente, onRepetir, onNovaSemente, onVoltar }: BattleProps) {
  const encontro = getEncounter(encontroId);
  const [inicio] = useState(() => startCombat(C, encontro, TEST_DECK, semente));
  const [estado, setEstado] = useState<CombatState>(inicio.estado);
  const [log, setLog] = useState<string[]>(() =>
    inicio.eventos.flatMap((e) => describeEvent(e, inicio.estado, C) ?? []),
  );
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [avivar, setAvivar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'erro' | 'especial' } | null>(null);
  const [flutuantes, setFlutuantes] = useState<Record<string, FloatingNumber[]>>({});
  const contador = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const mostrarAviso = useCallback(
    (texto: string, tipo: 'erro' | 'especial') => {
      setAviso({ texto, tipo });
      later(() => setAviso((a) => (a?.texto === texto ? null : a)), tipo === 'erro' ? 2500 : 4000);
    },
    [later],
  );

  const aplicar = useCallback(
    (r: CommandResult) => {
      if (r.erro) {
        mostrarAviso(r.erro, 'erro');
        return;
      }
      setEstado(r.estado);
      setSelecionada(null);
      setAvivar(false);
      const linhas = r.eventos.flatMap((e) => describeEvent(e, r.estado, C) ?? []);
      setLog((l) => [...l, ...linhas].slice(-MAX_LOG));

      const novos: Record<string, FloatingNumber[]> = {};
      const add = (uid: string, texto: string, tipo: FloatingNumber['tipo']) => {
        (novos[uid] ??= []).push({ key: contador.current++, texto, tipo });
      };
      for (const e of r.eventos) {
        if (e.tipo === 'dano')
          add(
            e.alvo,
            e.valor - e.bloqueado > 0 ? `-${e.valor - e.bloqueado}` : 'Bloqueado',
            'dano',
          );
        if (e.tipo === 'perdaDeVida') add(e.alvo, `-${e.valor}`, 'veneno');
        if (e.tipo === 'bloqueio') add(e.alvo, `+${e.valor}`, 'bloqueio');
        if (e.tipo === 'especialAtivado') mostrarAviso(e.anuncio, 'especial');
      }
      if (Object.keys(novos).length > 0) {
        setFlutuantes(novos);
        later(() => setFlutuantes({}), 950);
      }
    },
    [later, mostrarAviso],
  );

  const cartaSelecionada = estado.mao.find((c) => c.uid === selecionada);
  const defSelecionada = cartaSelecionada ? C.cartas[cartaSelecionada.defId] : undefined;
  const esperandoAlvo = defSelecionada?.alvo === 'inimigo';

  const clicarCarta = (uid: string) => {
    const instancia = estado.mao.find((c) => c.uid === uid);
    const def = instancia ? C.cartas[instancia.defId] : undefined;
    if (!def || estado.resultado) return;
    const motivo = cannotPlay(estado, C, { carta: uid, alvo: aliveEnemies(estado)[0]?.uid });
    if (motivo) {
      mostrarAviso(motivo, 'erro');
      return;
    }
    if (selecionada === uid && def.alvo === 'nenhum') {
      aplicar(playCard(estado, C, { carta: uid, avivar }));
      return;
    }
    setSelecionada(selecionada === uid ? null : uid);
    setAvivar(false);
  };

  const clicarInimigo = (uid: string) => {
    if (!selecionada || !esperandoAlvo) return;
    aplicar(playCard(estado, C, { carta: selecionada, alvo: uid, avivar }));
  };

  const dicaSelecao = !defSelecionada
    ? 'Escolha uma carta.'
    : esperandoAlvo
      ? `${defSelecionada.nome}: clique num inimigo para jogar.`
      : `${defSelecionada.nome}: clique de novo na carta para jogar.`;

  return (
    <div className={styles.battle}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={onVoltar}>
          ← Encontros
        </button>
        <h1 className={styles.title}>
          {encontro.nome} <span>· Turno {estado.turno}</span>
        </h1>
        <span
          className={styles.seed}
          data-tip="Mande esta semente para reproduzir exatamente esta partida."
          data-tip-pos="below"
        >
          Semente {estado.semente}
        </span>
      </header>

      {aviso && (
        <div className={`${styles.banner} ${styles[aviso.tipo]}`} role="status">
          {aviso.texto}
        </div>
      )}

      <div className={styles.arena}>
        <section className={styles.allies} aria-label="Você e seu aliado">
          <Unit
            unidade={estado.jogador}
            destaque={Boolean(flutuantes['jogador']?.some((f) => f.tipo !== 'bloqueio'))}
            flutuantes={flutuantes['jogador'] ?? []}
          />
          {estado.aliado ? (
            <Unit
              unidade={estado.aliado}
              intencao={allyIntentView(estado)}
              destaque={Boolean(flutuantes[estado.aliado.uid]?.length)}
              flutuantes={flutuantes[estado.aliado.uid] ?? []}
            />
          ) : (
            <div
              className={styles.emptySlot}
              data-tip="Espaço de Vínculo. Use uma carta de Invocação para chamar um aliado."
            >
              Vínculo vazio
            </div>
          )}
        </section>
        <section className={styles.enemies} aria-label="Inimigos">
          {estado.inimigos.map((i) => (
            <Unit
              key={i.uid}
              unidade={i}
              intencao={enemyIntent(estado, i)}
              alvoValido={esperandoAlvo && i.vida > 0}
              destaque={Boolean(flutuantes[i.uid]?.some((f) => f.tipo !== 'bloqueio'))}
              flutuantes={flutuantes[i.uid] ?? []}
              onClick={() => clicarInimigo(i.uid)}
            />
          ))}
        </section>
      </div>

      <section className={styles.controls}>
        <Hud
          energia={estado.energia}
          energiaMax={C.jogador.energiaPorTurno}
          brasa={estado.brasa}
          brasaMax={C.jogador.brasaMax}
          compra={estado.compra.length}
          descarte={estado.descarte.length}
          consumidas={estado.consumidas.length}
          rituais={estado.rituais}
          podeEncerrar={!estado.resultado}
          onEncerrar={() => aplicar(endTurn(estado, C))}
        />
        <p className={styles.hint}>{dicaSelecao}</p>
        <div className={styles.hand} aria-label="Sua mão">
          {estado.mao.map((c) => {
            const def = C.cartas[c.defId];
            if (!def) return null;
            return (
              <Card
                key={c.uid}
                def={def}
                jogavel={estado.energia >= def.custo && !estado.resultado}
                selecionada={selecionada === c.uid}
                brasa={estado.brasa}
                avivar={selecionada === c.uid && avivar}
                onClick={() => clicarCarta(c.uid)}
                onToggleAvivar={() => setAvivar((a) => !a)}
              />
            );
          })}
        </div>
      </section>

      <details className={styles.log}>
        <summary>Registro: {log[log.length - 1] ?? ''}</summary>
        <ol>
          {log
            .slice()
            .reverse()
            .map((linha, i) => (
              <li key={log.length - i}>{linha}</li>
            ))}
        </ol>
      </details>

      <ResultModal
        estado={estado}
        content={C}
        onRepetir={onRepetir}
        onNovaSemente={onNovaSemente}
        onVoltar={onVoltar}
      />
    </div>
  );
}
