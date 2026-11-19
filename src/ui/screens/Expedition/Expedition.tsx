import { CONTEUDO } from '../../../content/index.ts';
import { accruedGains, rewardMultiplier } from '../../../engine/expedition/expedition.ts';
import { Icone } from '../../art/Icone.tsx';
import ui from '../../components/common.module.css';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { duracao, num, pct } from '../../format.ts';
import { useGame } from '../../store/game.ts';
import { useNow } from '../../useNow.ts';
import s from './Expedition.module.css';

const TETO_MS = CONTEUDO.progressao.expedicao.tetoHoras * 3_600_000;

export function Expedition() {
  const estado = useGame((g) => g.estado);
  const enviar = useGame((g) => g.enviarExpedicao);
  const coletar = useGame((g) => g.coletar);
  const agora = useNow(1000);
  const exp = estado.expedicao;

  if (!exp) {
    const fechados = CONTEUDO.ordemPortais.filter((id) => estado.portaisFechados.includes(id));
    return (
      <section className={`${ui.panel} ${s.vazio}`}>
        <Icone id="ampulheta" tamanho={56} className={s.grande} />
        <h2 className={ui.title}>Expedição</h2>
        <p className={`${ui.muted} ${s.texto}`}>
          Envie o caçador a um portal já fechado. Ele luta sozinho, mesmo com o jogo fechado (até{' '}
          {CONTEUDO.progressao.expedicao.tetoHoras} h acumuladas sem coletar). Portais fáceis demais
          para o seu level rendem menos.
        </p>
        {fechados.length === 0 ? (
          <p className={s.aviso}>
            <Icone id="portal" tamanho={18} /> Feche o primeiro portal (
            {CONTEUDO.portais[CONTEUDO.ordemPortais[0] ?? '']?.nome}) para liberar.
          </p>
        ) : (
          <ul className={s.opcoes}>
            {fechados.map((id) => {
              const p = CONTEUDO.portais[id]!;
              const mult = rewardMultiplier(CONTEUDO, p, estado.cacador.level);
              return (
                <li key={id} className={s.opcao}>
                  <Icone id="portal" tamanho={24} />
                  <strong>{p.nome}</strong>
                  <span className={ui.muted}>
                    {mult < 1
                      ? `rende ${pct(mult)} (você passou do level dele)`
                      : 'rendimento cheio'}
                  </span>
                  <span className={ui.spacer} />
                  <button className={ui.primary} onClick={() => enviar(id)}>
                    Enviar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  const p = CONTEUDO.portais[exp.portal]!;
  const g = accruedGains(exp, agora, CONTEUDO, estado.cacador);
  const mult = rewardMultiplier(CONTEUDO, p, estado.cacador.level);
  const t = exp.taxa;

  return (
    <section className={ui.panel}>
      <div className={ui.row}>
        <h2 className={ui.title}>Expedição em {p.nome}</h2>
        <span className={ui.spacer} />
        <span className={ui.muted}>em andamento há {duracao(agora - exp.inicio)}</span>
      </div>

      <dl className={s.taxa}>
        <div>
          <dt>Vitórias</dt>
          <dd>{pct(t.vitoria)}</dd>
        </div>
        <div>
          <dt>Lutas por hora</dt>
          <dd>{num(t.lutasPorHora)}</dd>
        </div>
        <div>
          <dt>XP por hora</dt>
          <dd>{num(t.xpPorHora * mult)}</dd>
        </div>
        <div>
          <dt>Ouro por hora</dt>
          <dd>{num(t.ouroPorHora * mult)}</dd>
        </div>
      </dl>
      {t.vitoria < 0.5 && (
        <p className={s.alerta}>
          O caçador perde muitas lutas aqui. Um portal mais fácil pode render mais.
        </p>
      )}

      <div className={s.acumulado}>
        <div className={ui.row}>
          <span>Acumulado desde a última coleta</span>
          <span className={ui.spacer} />
          <span className={ui.muted}>
            {duracao(g.tempoMs)} / {CONTEUDO.progressao.expedicao.tetoHoras} h
          </span>
        </div>
        <ProgressBar
          valor={g.tempoMs}
          max={TETO_MS}
          cor="var(--color-ember)"
          rotulo="Tempo acumulado"
        />
        <div className={s.ganhos}>
          <span>
            <strong>+{num(g.xp)}</strong> XP
          </span>
          <span>
            <strong>+{num(g.ouro)}</strong> ouro
          </span>
          <span className={ui.muted}>
            {num(g.vitorias)} vitórias em {num(g.lutas)} lutas
          </span>
        </div>
        {g.noTeto && <p className={s.alerta}>No teto: colete para o tempo voltar a render.</p>}
        {g.relogioVoltou && (
          <p className={s.alerta}>O relógio do aparelho voltou no tempo. Nada foi acumulado.</p>
        )}
      </div>

      <p className={ui.muted}>
        A taxa foi calculada com o caçador de quando você enviou ou coletou. Coletar recalcula com o
        caçador atual.
      </p>
      <div className={ui.row}>
        <button className={ui.primary} onClick={() => coletar(false)}>
          Coletar
        </button>
        <button className={ui.button} onClick={() => coletar(true)}>
          Coletar e chamar de volta
        </button>
      </div>
    </section>
  );
}
