# Vigília

Jogo idle de fantasia dark para navegador, com combate estratégico em turnos, deck-building e invocações.

> **Status:** Etapa 1 (Protótipo de Combate). Três encontros de teste, 13 cartas, 1 aliado.

## Requisitos

- [Node.js](https://nodejs.org) 22.18 ou mais novo (inclui o `npm`). Para conferir: `node -v`.

## Como rodar

```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
npm test         # testes das regras
npm run sim      # relatório de balanceamento
```

## Como jogar o protótipo

1. Escolha um encontro (Caçada, Ninho ou Guardião). A semente é opcional; com a mesma semente, a partida se repete.
2. **Cartas com alvo:** clique na carta e depois no inimigo.
3. **Cartas sem alvo:** clique na carta e clique nela de novo.
4. **Avivar:** ao selecionar uma carta com Avivar, aparece o botão de Brasa. Ligue-o antes de jogar para pagar a Brasa e ganhar o efeito extra.
5. Clique em **Encerrar turno** quando terminar.

Passe o mouse sobre intenções, status, cartas, energia e Brasa para ver o que fazem. O registro de combate fica no rodapé.

## Regras do combate (resumo)

**Turno do jogador:** o bloqueio zera → Veneno → rituais disparam → energia volta a 3 → compra 5 cartas → você joga cartas → ao encerrar, a energia que sobrou vira Brasa (até 3) → o aliado age → a mão vai para o descarte → Vulnerável, Fraco e Marca reduzem 1.

**Turno dos inimigos** (da esquerda para a direita): o bloqueio zera → Veneno → executa a intenção visível → status reduzem → mostra a próxima intenção.

- A intenção mostrada é sempre a ação que será executada. O número já inclui todos os modificadores.
- Efeitos especiais (como a fúria do Cavaleiro Oco) são anunciados na tela e no registro.
- Quando a pilha de compra acaba, o descarte é embaralhado e vira a nova pilha.
- O combate termina no instante em que o último inimigo, ou o jogador, chega a 0 de vida.

Detalhes completos no plano da Etapa 1 (seção 16).

## Simulador de balanceamento

`npm run sim` faz um robô "guloso" jogar 500 combates por encontro (`npm run sim -- 2000` para mais) e mostra vitórias, turnos médios, vida restante e dano por fonte.

As faixas mostradas são **indicadores**, não regras. Um "⚠" pede atenção, nunca um ajuste automático. O robô não planeja turnos à frente, mas enxerga as intenções, então costuma vencer mais que um iniciante.

## Scripts

| Comando              | O que faz                                      |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Modo desenvolvimento (recarrega ao salvar)     |
| `npm test`           | Roda os testes uma vez                         |
| `npm run test:watch` | Roda os testes sempre que algo muda            |
| `npm run sim`        | Relatório de balanceamento                     |
| `npm run lint`       | Qualidade do código e fronteiras entre camadas |
| `npm run typecheck`  | Verifica os tipos do TypeScript                |
| `npm run format`     | Formata o código com Prettier                  |
| `npm run build`      | Gera a versão final em `dist/`                 |
| `npm run preview`    | Serve localmente a versão gerada pelo build    |

## Estrutura

```
src/
├─ engine/              MOTOR: TypeScript puro. Não importa React, src/ui nem src/content.
│  ├─ core/             RNG com semente, barramento de eventos, tipos base
│  ├─ combat/           definições, estado, turnos, comandos, dano, IA, fim de combate
│  ├─ effects/          sistema de efeitos (toda carta e ação é uma lista de efeitos)
│  └─ statuses/         os 5 status, definidos por ganchos
├─ content/             CONTEÚDO: só dados (cartas, inimigos, aliado, encontros)
└─ ui/                  INTERFACE: React
   ├─ app/              navegação entre telas
   ├─ screens/          seleção de encontro e batalha
   ├─ components/       Card, Unit, Hud, ResultModal
   └─ theme/            tokens de cor e espaçamento (provisórios)
tests/                  testes do motor e integridade do conteúdo
tools/sim/              simulador de balanceamento
```

## Regras do projeto

- **O motor não conhece a interface nem o conteúdo.** Ele recebe as definições como parâmetro. O lint falha se isso for violado.
- **Comandos são puros:** recebem o estado e devolvem um estado novo e a lista de eventos. O estado antigo nunca é alterado.
- **Nada de `Math.random()` no motor.** Use sempre o `Rng` com semente de `src/engine/core`.
- **Conteúdo novo = dados novos.** Uma carta nova combina efeitos existentes em `src/content/cards.ts`.
- **Estado do jogo em objetos simples**, sem classes, para facilitar o save no futuro.
- Imports do motor e do conteúdo usam a extensão `.ts`, para que o simulador rode direto no Node.
