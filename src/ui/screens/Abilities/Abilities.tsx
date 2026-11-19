import { CONTEUDO } from '../../../content/index.ts';
import type { AbilityDef } from '../../../engine/definitions.ts';
import { abilityLevel, isUnlocked, upgradeCost } from '../../../engine/hunter/abilities.ts';
import type { AlvoPreferido, RegraDefesa } from '../../../engine/hunter/hunter.ts';
import { buildProfile } from '../../../engine/hunter/stats.ts';
import { Icone } from '../../art/Icone.tsx';
import ui from '../../components/common.module.css';
import { num } from '../../format.ts';
import { useGame } from '../../store/game.ts';
import s from './Abilities.module.css';

const P = CONTEUDO.progressao;
const CATEGORIA = { ataque: 'Ataque', defesa: 'Defesa', cura: 'Cura' } as const;
const ICONE = { ataque: 'ataque', defesa: 'defesa', cura: 'cura' } as const;

export function Abilities() {
  const estado = useGame((g) => g.estado);
  const equipar = useGame((g) => g.equipar);
  const melhorar = useGame((g) => g.melhorar);
  const definir = useGame((g) => g.definirComportamento);
  const c = estado.cacador;
  const eq = c.equipadas;
  const perfil = buildProfile(c, CONTEUDO);
  const todas = Object.values(CONTEUDO.habilidades).sort((a, b) => a.desbloqueio - b.desbloqueio);

  const mover = (i: number, d: number) => {
    const novo = [...eq];
    const j = i + d;
    if (j < 0 || j >= novo.length) return;
    [novo[i], novo[j]] = [novo[j] as string, novo[i] as string];
    equipar(novo);
  };

  const card = (h: AbilityDef) => {
    const liberada = isUnlocked(c, h);
    const nivel = abilityLevel(c, h.id);
    const custo = upgradeCost(CONTEUDO, nivel);
    const max = nivel >= P.habilidadeNivelMax;
    const equipada = eq.includes(h.id);
    if (!liberada)
      return (
        <li key={h.id} className={`${s.hab} ${s.bloqueada}`}>
          <div className={s.cabeca}>
            <span className={s.iconeHab}>
              <Icone id={ICONE[h.categoria]} tamanho={24} />
            </span>
            <div className={s.cabecaTexto}>
              <strong>{h.nome}</strong>
              <span className={ui.muted}>{h.descricao}</span>
            </div>
            <span className={ui.tag}>🔒 Level {h.desbloqueio}</span>
          </div>
        </li>
      );
    return (
      <li key={h.id} className={`${s.hab} ${equipada ? s.equipada : ''}`}>
        <div className={s.cabeca}>
          <span className={s.iconeHab}>
            <Icone id={ICONE[h.categoria]} tamanho={28} />
          </span>
          <strong>{h.nome}</strong>
          <span className={ui.tag}>{CATEGORIA[h.categoria]}</span>
          <span className={ui.spacer} />
          <span className={s.nivel} title={`Nível ${nivel} de ${P.habilidadeNivelMax}`}>
            {Array.from({ length: P.habilidadeNivelMax }, (_, k) => (
              <span key={k} className={k < nivel ? s.nivelCheio : undefined} />
            ))}
          </span>
        </div>
        <p className={s.desc}>{h.descricao}</p>
        <div className={ui.row}>
          <span className={ui.muted}>Recarga {h.recarga} s</span>
          <span className={ui.spacer} />
          <button
            className={ui.button}
            disabled={max || estado.ouro < custo}
            onClick={() => melhorar(h.id)}
            title={
              max ? 'Nível máximo' : `Cada nível: +${P.escalaPorNivelDeHabilidade * 100}% de força`
            }
          >
            {max ? 'Máximo' : `Melhorar · ${num(custo)} ouro`}
          </button>
          {equipada ? (
            <button className={ui.button} onClick={() => equipar(eq.filter((x) => x !== h.id))}>
              Tirar
            </button>
          ) : (
            <button
              className={ui.primary}
              disabled={eq.length >= P.espacosDeHabilidade}
              onClick={() => equipar([...eq, h.id])}
            >
              Equipar
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={s.grid}>
      <section className={ui.panel}>
        <h2 className={ui.title}>
          Equipadas ({eq.length}/{P.espacosDeHabilidade})
        </h2>
        <p className={ui.muted}>
          Quando várias estão prontas, o caçador usa a de cima primeiro. Sem nenhuma pronta, usa o
          ataque básico.
        </p>
        <ol className={s.slots}>
          {Array.from({ length: P.espacosDeHabilidade }, (_, i) => {
            const id = eq[i];
            const h = id ? CONTEUDO.habilidades[id] : undefined;
            const info = perfil.habilidades.find((x) => x.def.id === id);
            return (
              <li key={i} className={s.slot}>
                <span className={s.ordem}>{i + 1}</span>
                {h ? (
                  <>
                    <Icone id={ICONE[h.categoria]} tamanho={26} />
                    <div className={s.slotNome}>
                      <strong>{h.nome}</strong>
                      <span className={ui.muted}>
                        {info
                          ? `${(info.recargaMs / 1000).toFixed(1)} s · força ×${info.escala.toFixed(2)}`
                          : ''}
                      </span>
                    </div>
                    <button
                      className={ui.small}
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      aria-label="Subir"
                    >
                      ↑
                    </button>
                    <button
                      className={ui.small}
                      onClick={() => mover(i, 1)}
                      disabled={i === eq.length - 1}
                      aria-label="Descer"
                    >
                      ↓
                    </button>
                  </>
                ) : (
                  <span className={ui.muted}>Vazio</span>
                )}
              </li>
            );
          })}
        </ol>

        <h2 className={ui.title}>Comportamento</h2>
        <div className={s.regras}>
          <label>
            <span>Alvo</span>
            <select
              value={c.comportamento.alvo}
              onChange={(e) =>
                definir({ ...c.comportamento, alvo: e.target.value as AlvoPreferido })
              }
            >
              <option value="menorVida">O de menor vida</option>
              <option value="maiorAtaque">O que bate mais forte</option>
              <option value="primeiro">O primeiro da fila</option>
            </select>
          </label>
          <label>
            <span>Curar só abaixo de {c.comportamento.curaAbaixoPct}% de vida</span>
            <input
              type="range"
              min={20}
              max={80}
              step={5}
              value={c.comportamento.curaAbaixoPct}
              onChange={(e) =>
                definir({ ...c.comportamento, curaAbaixoPct: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <span>Usar defesa</span>
            <select
              value={c.comportamento.defesa}
              onChange={(e) =>
                definir({ ...c.comportamento, defesa: e.target.value as RegraDefesa })
              }
            >
              <option value="contraGolpeForte">Só contra golpe forte anunciado</option>
              <option value="pronta">Assim que estiver pronta</option>
            </select>
          </label>
        </div>
      </section>

      <section className={ui.panel}>
        <h2 className={ui.title}>Todas as habilidades</h2>
        <ul className={s.lista}>{todas.map(card)}</ul>
      </section>
    </div>
  );
}
