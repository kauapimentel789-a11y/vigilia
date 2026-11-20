/**
 * Ecos: as criaturas vinculadas. Escolhe quem acompanha o caçador, dá nome e liberta.
 * As regras (força, níveis, dons) ficam no motor (engine/game/ecos.ts).
 */
import { useState } from 'react';
import { CONTEUDO } from '../../../content/index.ts';
import type { RankId } from '../../../engine/definitions.ts';
import type { Eco } from '../../../engine/game/ecos.ts';
import {
  BONUS_AFINIDADE,
  DOM,
  ECOS,
  NOME_AFINIDADE,
  NOME_DESPERTAR,
  awakening,
  ecoName,
  ecoPower,
  ecosOf,
  xpToNext,
} from '../../../engine/game/ecos.ts';
import { Icone } from '../../art/Icone.tsx';
import { Sprite } from '../../art/Sprite.tsx';
import { APARENCIA } from '../../art/sprites.ts';
import ui from '../../components/common.module.css';
import { useGame } from '../../store/game.ts';
import { COR_AFINIDADE } from '../../art/afinidade.ts';
import s from './Ecos.module.css';

const VENCE: Record<RankId, RankId> = { veu: 'brasa', brasa: 'cinza', cinza: 'veu' };

function Afinidade({ id }: { id: RankId }) {
  return (
    <span className={s.afinidade} style={{ '--cor': COR_AFINIDADE[id] } as React.CSSProperties}>
      {NOME_AFINIDADE[id]}
    </span>
  );
}

function Detalhe({ eco }: { eco: Eco }) {
  const renomear = useGame((g) => g.renomearEco);
  const [nome, setNome] = useState(eco.apelido ?? '');
  const def = CONTEUDO.inimigos[eco.defId];
  const d = awakening(eco.nivel);
  const dom = DOM[eco.afinidade];
  const noMax = eco.nivel >= ECOS.nivelMax;
  const proximo = xpToNext(eco.nivel);
  return (
    <section
      className={`${ui.panel} ${s.detalhe}`}
      style={{ '--cor': COR_AFINIDADE[eco.afinidade] } as React.CSSProperties}
    >
      <div className={s.retrato}>
        <Sprite ap={APARENCIA[eco.defId]} tamanho={96} />
      </div>
      <div className={s.info}>
        <div className={ui.row}>
          <h2 className={ui.title}>{ecoName(eco, CONTEUDO)}</h2>
          <Afinidade id={eco.afinidade} />
          <span className={ui.tag}>{NOME_DESPERTAR[d]}</span>
        </div>
        {eco.apelido && <p className={ui.muted}>{def?.nome}</p>}
        <div className={s.nivel}>
          <strong>Nível {eco.nivel}</strong>
          <div className={ui.bar} style={{ flex: 1 }}>
            <div
              className={ui.barFill}
              style={{
                width: noMax ? '100%' : `${(eco.xp / proximo) * 100}%`,
                background: COR_AFINIDADE[eco.afinidade],
              }}
            />
          </div>
          <span className={ui.muted}>{noMax ? 'máximo' : `${eco.xp} / ${proximo}`}</span>
        </div>
        <dl className={s.numeros}>
          <dt>Força do golpe</dt>
          <dd>{Math.round(ecoPower(eco) * 100)}% do seu ataque</dd>
          <dt>Alcance</dt>
          <dd>{Math.min(3, def?.alcance ?? 1) > 1 ? 'à distância' : 'corpo a corpo'}</dd>
          <dt>Vantagem</dt>
          <dd>
            +{Math.round(BONUS_AFINIDADE * 100)}% de dano nos portais de{' '}
            {NOME_AFINIDADE[VENCE[eco.afinidade]]}
          </dd>
        </dl>
        <div className={`${s.dom} ${d > 0 ? s.domAtivo : ''}`}>
          <strong>
            Dom: {dom.nome}
            {d === 2 && ' (dobrado)'}
          </strong>
          <span>{dom.texto}</span>
          {d === 0 && <em>Desperta no nível 10.</em>}
          {d === 1 && <em>No nível 20 vira Ancestral e o dom dobra.</em>}
        </div>
        <form
          className={ui.row}
          onSubmit={(e) => {
            e.preventDefault();
            renomear(eco.uid, nome);
          }}
        >
          <input
            className={s.campo}
            value={nome}
            maxLength={16}
            placeholder={def?.nome ?? 'Nome'}
            onChange={(e) => setNome(e.target.value)}
            aria-label="Nome do Eco"
          />
          <button className={`${ui.button} ${ui.small}`} type="submit">
            Dar nome
          </button>
        </form>
      </div>
    </section>
  );
}

export function Ecos() {
  const estado = useGame((g) => g.estado);
  const ativar = useGame((g) => g.ativarEco);
  const libertar = useGame((g) => g.libertarEco);
  const [ver, setVer] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const e = ecosOf(estado);
  const selecionado = e.lista.find((x) => x.uid === (ver ?? e.ativo)) ?? e.lista[0];

  return (
    <div className={s.tela}>
      <section className={`${ui.panel} ${s.resumo}`}>
        <div>
          <h2 className={ui.title}>Ecos</h2>
          <p className={ui.muted}>
            Enfraqueça um monstro comum abaixo de {Math.round(ECOS.limiteVida * 100)}% de vida, mire
            nele e aperte <kbd>C</kbd> para lançar um Cristal de Vínculo. Quanto mais fraco, mais
            fácil pegar. O Eco ativo segue você nos mapas, luta ao seu lado e cresce com os abates.
          </p>
        </div>
        <div className={s.contadores}>
          <span className={s.contador}>
            <Icone id="cristal" tamanho={20} /> {e.cristais} cristais
          </span>
          <span className={s.contador}>
            <Icone id="eco" tamanho={20} /> {e.lista.length} / {ECOS.maximo} Ecos
          </span>
          <span className={ui.muted}>Cristais na Mercadora do Posto.</span>
        </div>
      </section>

      {selecionado ? (
        <Detalhe key={selecionado.uid} eco={selecionado} />
      ) : (
        <section className={`${ui.panel} ${s.vazio}`}>
          <Icone id="eco" tamanho={48} />
          <p>
            Você ainda não tem Ecos. Leve cristais para um portal e vincule a primeira criatura.
          </p>
        </section>
      )}

      {e.lista.length > 0 && (
        <ul className={s.lista}>
          {e.lista.map((eco) => {
            const ativo = eco.uid === e.ativo;
            return (
              <li
                key={eco.uid}
                className={`${s.carta} ${selecionado?.uid === eco.uid ? s.vendo : ''} ${ativo ? s.ativo : ''}`}
                style={{ '--cor': COR_AFINIDADE[eco.afinidade] } as React.CSSProperties}
              >
                <button className={s.cartaCorpo} onClick={() => setVer(eco.uid)}>
                  <Sprite ap={APARENCIA[eco.defId]} tamanho={48} />
                  <span className={s.cartaNome}>{ecoName(eco, CONTEUDO)}</span>
                  <span className={s.cartaNivel}>
                    Nv {eco.nivel} · {NOME_AFINIDADE[eco.afinidade]}
                  </span>
                </button>
                <div className={s.cartaAcoes}>
                  {ativo ? (
                    <button className={`${ui.button} ${ui.small}`} onClick={() => ativar(null)}>
                      Guardar
                    </button>
                  ) : (
                    <button
                      className={`${ui.button} ${ui.primary} ${ui.small}`}
                      onClick={() => ativar(eco.uid)}
                    >
                      Levar
                    </button>
                  )}
                  {confirmar === eco.uid ? (
                    <button
                      className={`${ui.button} ${ui.danger} ${ui.small}`}
                      onClick={() => {
                        libertar(eco.uid);
                        setConfirmar(null);
                      }}
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      className={`${ui.button} ${ui.small}`}
                      onClick={() => setConfirmar(eco.uid)}
                      title="Libertar este Eco (não volta)"
                    >
                      Libertar
                    </button>
                  )}
                </div>
                {ativo && <span className={s.selo}>Com você</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
