import { COR_RARIDADE, nomeItem } from '../items.ts';
import { duracao, num } from '../format.ts';
import { useGame } from '../store/game.ts';
import ui from './common.module.css';

/** Relatório ao voltar ao jogo (prévia) ou depois de coletar a Expedição. */
export function ReturnReport() {
  const relatorio = useGame((g) => g.relatorio);
  const coletar = useGame((g) => g.coletar);
  const fechar = useGame((g) => g.fecharRelatorio);
  if (!relatorio) return null;
  const g = relatorio.ganhos;

  return (
    <div className={ui.overlay}>
      <div className={ui.modal} role="dialog" aria-label="Relatório da expedição">
        <h2 className={ui.title}>
          {relatorio.coletado ? 'Expedição coletada' : 'Enquanto você estava fora...'}
        </h2>
        {g.relogioVoltou ? (
          <p>O relógio do aparelho voltou no tempo, então nada foi acumulado desta vez.</p>
        ) : (
          <>
            <p>
              O caçador lutou por <strong>{duracao(g.tempoMs)}</strong>
              {g.noTeto && ` (o teto; você ficou fora ${duracao(g.decorridoMs)})`}.
            </p>
            <p>
              {num(g.vitorias)} vitórias em {num(g.lutas)} lutas: <strong>+{num(g.xp)} XP</strong> e{' '}
              <strong>+{num(g.ouro)} ouro</strong>.
            </p>
            {relatorio.itens && relatorio.itens.length > 0 ? (
              <div>
                <p>
                  Achou {relatorio.itens.length} {relatorio.itens.length === 1 ? 'item' : 'itens'},
                  guardados no baú do Posto:
                </p>
                <ul>
                  {relatorio.itens.map((i) => (
                    <li key={i.uid} style={{ color: COR_RARIDADE[i.raridade] }}>
                      {nomeItem(i)}
                    </li>
                  ))}
                </ul>
                {relatorio.semEspaco > 0 && (
                  <p style={{ color: 'var(--color-danger)' }}>
                    {relatorio.semEspaco} não couberam: o baú está cheio.
                  </p>
                )}
              </div>
            ) : (
              !relatorio.coletado &&
              g.itens > 0 && <p>E cerca de {g.itens} itens esperando para coletar.</p>
            )}
            {relatorio.levelsGanhos > 0 && (
              <p style={{ color: 'var(--color-ember)' }}>
                Subiu {relatorio.levelsGanhos} level{relatorio.levelsGanhos > 1 ? 's' : ''}!
                Distribua os pontos na aba Caçador.
              </p>
            )}
          </>
        )}
        <div className={ui.row}>
          <span className={ui.spacer} />
          {relatorio.coletado ? (
            <button className={ui.primary} onClick={fechar}>
              Continuar
            </button>
          ) : (
            <>
              <button className={ui.button} onClick={fechar}>
                Depois
              </button>
              <button className={ui.primary} onClick={() => coletar(false)}>
                Coletar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
