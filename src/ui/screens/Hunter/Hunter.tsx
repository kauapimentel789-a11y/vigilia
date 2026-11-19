import { useState } from 'react';
import { CONTEUDO } from '../../../content/index.ts';
import type { AtributoId } from '../../../engine/definitions.ts';
import { ATRIBUTOS } from '../../../engine/definitions.ts';
import { deriveStats } from '../../../engine/hunter/stats.ts';
import ui from '../../components/common.module.css';
import { pct } from '../../format.ts';
import { useGame } from '../../store/game.ts';
import s from './Hunter.module.css';

const P = CONTEUDO.progressao.stats;

const INFO: Record<AtributoId, { nome: string; efeito: string }> = {
  forca: {
    nome: 'Força',
    efeito: `+${P.ataquePorForca} ataque e +${P.danoPctPorForca * 100}% de dano por ponto`,
  },
  agilidade: {
    nome: 'Agilidade',
    efeito: `+${P.velocidadePctPorAgilidade * 100}% de velocidade por ponto`,
  },
  vigor: {
    nome: 'Vigor',
    efeito: `+${P.vidaPorVigor} vida e +${P.reducaoPorVigor * 100}% de redução de dano por ponto`,
  },
  percepcao: {
    nome: 'Percepção',
    efeito: `+${P.criticoPorPercepcao * 100}% de crítico e de dano crítico por ponto`,
  },
  vontade: {
    nome: 'Vontade',
    efeito: `+${P.poderPorVontade * 100}% de poder e −${P.recargaPorVontade * 100}% de recarga das habilidades`,
  },
};

export function Hunter() {
  const estado = useGame((g) => g.estado);
  const gastarPonto = useGame((g) => g.gastarPonto);
  const redistribuir = useGame((g) => g.redistribuir);
  const apagar = useGame((g) => g.apagarProgresso);
  const [confirmar, setConfirmar] = useState(false);
  const c = estado.cacador;
  const st = deriveStats(c, CONTEUDO);
  const inicial = CONTEUDO.progressao.atributoInicial;
  const gastos = ATRIBUTOS.some((a) => c.atributos[a] > inicial);

  const derivados: Array<[string, string]> = [
    ['Vida', String(st.vidaMax)],
    ['Ataque', st.ataque.toFixed(1)],
    [
      'Ações por segundo',
      ((st.velocidade / CONTEUDO.progressao.combate.cargaParaAgir) * 10).toFixed(2),
    ],
    ['Redução de dano', pct(st.reducao)],
    ['Crítico', `${pct(st.critico)} (×${st.danoCritico.toFixed(2)})`],
    ['Poder de habilidade', `×${st.poder.toFixed(2)}`],
    ['Recarga', `×${st.recargaMult.toFixed(2)}`],
  ];

  return (
    <div className={s.grid}>
      <section className={ui.panel}>
        <div className={ui.row}>
          <h2 className={ui.title}>Atributos</h2>
          <span className={ui.spacer} />
          <span className={c.pontosLivres > 0 ? s.pontos : ui.muted}>
            {c.pontosLivres} ponto{c.pontosLivres === 1 ? '' : 's'} livre
            {c.pontosLivres === 1 ? '' : 's'}
          </span>
        </div>
        <ul className={s.atributos}>
          {ATRIBUTOS.map((a) => (
            <li key={a} className={s.atributo}>
              <div>
                <strong>{INFO[a].nome}</strong>
                <div className={ui.muted}>{INFO[a].efeito}</div>
              </div>
              <div className={ui.row}>
                <button
                  className={ui.small}
                  onClick={() => gastarPonto(a, -1)}
                  disabled={c.atributos[a] <= inicial}
                  aria-label={`Tirar um ponto de ${INFO[a].nome}`}
                >
                  −
                </button>
                <span className={s.valor}>{c.atributos[a]}</span>
                <button
                  className={ui.small}
                  onClick={() => gastarPonto(a, 1)}
                  disabled={c.pontosLivres <= 0}
                  aria-label={`Pôr um ponto em ${INFO[a].nome}`}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className={ui.row}>
          <button className={ui.button} onClick={redistribuir} disabled={!gastos}>
            Redistribuir (grátis)
          </button>
          <span className={ui.muted}>
            Cada level dá {CONTEUDO.progressao.pontosPorLevel} pontos.
          </span>
        </div>
      </section>

      <section className={ui.panel}>
        <h2 className={ui.title}>Em combate</h2>
        <dl className={s.derivados}>
          {derivados.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className={ui.muted}>
          Lutas vencidas: {estado.registro.vitorias} de {estado.registro.lutas}
        </p>
      </section>

      <section className={ui.panel}>
        <div className={ui.row}>
          <h2 className={ui.title}>Rank e Selos</h2>
          <span className={ui.spacer} />
          <span className={ui.tag}>Rank {CONTEUDO.ranks[estado.rank].nome}</span>
        </div>
        <p className={ui.muted}>{CONTEUDO.ranks[estado.rank].descricao}</p>
        <p className={ui.muted}>
          Cada chefe deixa um Selo ao ser vencido. Os Selos vão desbloquear unidades na Arena.
        </p>
        <ul className={s.selos}>
          {Object.values(CONTEUDO.selos).map((selo) => {
            const qtd = estado.selos[selo.id] ?? 0;
            return (
              <li key={selo.id} className={qtd > 0 ? s.selo : `${s.selo} ${s.seloVazio}`}>
                <span aria-hidden>{qtd > 0 ? '◈' : '◇'}</span>
                <span>
                  <strong>{qtd > 0 ? selo.nome : '???'}</strong>
                  <span className={ui.muted}> {selo.descricao}</span>
                </span>
                {qtd > 0 && <span className={s.valor}>×{qtd}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={ui.panel}>
        <h2 className={ui.title}>Progresso</h2>
        <p className={ui.muted}>O jogo salva sozinho neste navegador.</p>
        {confirmar ? (
          <div className={ui.row}>
            <span>Apagar tudo e recomeçar?</span>
            <button
              className={ui.danger}
              onClick={() => {
                apagar();
                setConfirmar(false);
              }}
            >
              Sim, apagar
            </button>
            <button className={ui.button} onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className={ui.danger} onClick={() => setConfirmar(true)}>
            Apagar progresso
          </button>
        )}
      </section>
    </div>
  );
}
