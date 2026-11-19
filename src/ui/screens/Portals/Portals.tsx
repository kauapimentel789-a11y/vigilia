import { CONTEUDO } from '../../../content/index.ts';
import { isPortalOpen } from '../../../engine/game/game.ts';
import ui from '../../components/common.module.css';
import { useGame } from '../../store/game.ts';
import s from './Portals.module.css';

export function Portals({ onExpedicao }: { onExpedicao: () => void }) {
  const estado = useGame((g) => g.estado);
  const entrar = useGame((g) => g.entrarNoPortal);
  const enviar = useGame((g) => g.enviarExpedicao);
  const emExpedicao = estado.expedicao !== null;

  return (
    <section className={ui.stack}>
      <div>
        <h2 className={ui.title}>Periferia Apagada · portais Cinza</h2>
        <p className={ui.muted}>
          Feche um portal para abrir o próximo e liberar a Expedição nele. A vida do caçador não
          volta entre as ondas.
        </p>
        {emExpedicao && (
          <p className={s.aviso}>
            O caçador está em expedição. Chame-o de volta para entrar num portal.
          </p>
        )}
      </div>
      <ol className={s.lista}>
        {CONTEUDO.ordemPortais.map((id) => {
          const p = CONTEUDO.portais[id]!;
          const aberto = isPortalOpen(estado, CONTEUDO, id);
          const fechado = estado.portaisFechados.includes(id);
          const inimigos = [...new Set(p.ondas.flat())].map((i) => CONTEUDO.inimigos[i]?.nome ?? i);
          return (
            <li
              key={id}
              className={`${ui.panel} ${s.portal} ${aberto ? '' : s.bloqueado} ${p.chefe ? s.chefe : ''}`}
            >
              <div className={ui.row}>
                <strong className={s.nome}>{p.nome}</strong>
                {p.chefe && <span className={ui.tag}>Mini-chefe</span>}
                <span className={ui.tag}>Level {p.levelRecomendado}+</span>
                <span className={ui.spacer} />
                <span className={fechado ? s.fechado : ui.muted}>
                  {fechado ? 'Fechado' : aberto ? 'Aberto' : 'Bloqueado'}
                </span>
              </div>
              <p className={s.desc}>{p.descricao}</p>
              <p className={ui.muted}>
                {p.ondas.length} ondas · {inimigos.join(', ')}
              </p>
              <div className={ui.row}>
                <span className={ui.muted}>
                  Vitória: {p.recompensa.xp} XP, {p.recompensa.ouro} ouro
                  {!fechado &&
                    ` · primeira vez: +${p.primeiraVitoria.xp} XP, +${p.primeiraVitoria.ouro} ouro`}
                </span>
                <span className={ui.spacer} />
                {fechado && (
                  <button
                    className={ui.button}
                    disabled={emExpedicao}
                    onClick={() => {
                      enviar(id);
                      onExpedicao();
                    }}
                  >
                    Enviar em expedição
                  </button>
                )}
                <button
                  className={ui.primary}
                  disabled={!aberto || emExpedicao}
                  onClick={() => entrar(id)}
                >
                  Entrar
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
