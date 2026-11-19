# Vigília

Jogo idle de fantasia dark para navegador. Você é um Portador da Vigília recém-desperto, o mais fraco de todos, e fica mais forte a cada portal fechado. A Caçada (PvE idle) vem primeiro; a Arena (PvP auto-battler com cartas) vem em etapas futuras.

> **Status:** Etapa 3 (Caçada jogável). Mapa em tempo real visto de cima, em tiles: o caçador anda pelo Posto e pelos 5 mapas da Cinza, enfrenta monstros e chefes, junta itens, e pode caçar sozinho ou ir em Expedição enquanto você está fora.

## Requisitos

- [Node.js](https://nodejs.org) 22.18 ou mais novo (inclui o `npm`). Para conferir: `node -v`.

## Como rodar

```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
npm test         # testes das regras
npm run sim      # relatório de ritmo e equilíbrio
```

## Como jogar

**Controles**

| Ação                         | Teclado / mouse                  | Celular                   |
| ---------------------------- | -------------------------------- | ------------------------- |
| Andar                        | WASD ou setas, ou clique no chão | joystick ou toque no chão |
| Escolher alvo                | clique no monstro, ou Tab        | toque no monstro          |
| Habilidades                  | 1, 2, 3, 4                       | botões abaixo do mapa     |
| Poção                        | Q                                | botão da poção            |
| Falar com um NPC, abrir baú  | E perto dele, ou clique          | toque                     |
| Auto-caçar                   | R                                | botão Auto                |
| Mochila                      | I                                | botão Mochila             |
| Fechar janela, largar o alvo | Esc                              |                           |

1. **Posto:** a cidade. A **Mercadora** compra itens e vende poções, o **Baú** guarda até 60 itens, o **Altar** cuida de atributos e habilidades, e a **Mesa de Expedição** manda o caçador farmar sozinho. Voltar ao Posto cura a vida.
2. **Cinza I a V:** saia pelo portão do Posto. Cada mapa tem um chefe no fundo e baús de tesouro escondidos. O caçador ataca sozinho o alvo escolhido e usa as habilidades quando você aperta 1 a 4.
3. **Golpes fortes:** alguns monstros preparam um golpe e pintam no chão a área atingida (⚠). Saia dela.
4. **Itens:** os monstros deixam itens no chão (comum, incomum, raro). Equipe 6 peças (arma, elmo, peitoral, luvas, botas, amuleto); a janela mostra a comparação com o que você usa.
5. **Morte:** você volta ao Posto e perde o que estava na mochila (o equipado e o baú ficam).
6. **Auto-caçar (R):** o caçador escolhe alvos, usa habilidades e poções e pega itens sozinho, seguindo o comportamento do Altar.
7. **Expedição:** em mapas já com chefe derrotado, o caçador farma sozinho até 8 h, mesmo com o jogo fechado. Itens achados vão para o baú.

O jogo salva sozinho no navegador. Fora do site de produção aparece um **painel de teste** (🛠) para avançar o tempo da expedição e apagar o progresso.

## Regras principais

**Tempo real com passos fixos.** O mapa avança em passos de 50 ms. O caçador anda um tile a cada 300 ms (mais rápido com Agilidade). Monstros têm visão de 5 tiles, chamam os vizinhos do grupo e desistem se você se afastar demais da origem deles. Morto, um monstro volta depois de 90 s.

**Golpes fortes** levam 1 s de preparo e atingem a área mostrada. Inimigos mostram a intenção da próxima ação.

**Itens** são { base, raridade, afixos }: os números vêm do conteúdo (`src/content/items.ts`), então ajustar uma base muda também os itens que você já tem. O chefe sempre deixa ao menos um incomum.

**Expedição.** O motor simula lutas reais e calcula uma taxa por hora (vitórias, XP, ouro e itens). O ganho é taxa × tempo, com teto de 8 h. Se o relógio do aparelho voltar no tempo, nada é acumulado. Mapas fáceis demais para o seu level rendem menos XP.

**Determinismo.** Mesma semente e mesmos comandos geram exatamente o mesmo resultado. A interface só desenha o que o motor devolve.

## Simulador

`npm run sim` mostra a chance de vitória por level em cada portal, a progressão de um jogador-robô, o rendimento de 8 h offline e 10 minutos de auto-caçar em cada mapa (abates, mortes, XP e ouro por hora).

As faixas são **indicadores**, não regras. Nunca distorcemos mecânicas para encaixar números: o teste de quem joga vale mais.

## Scripts

| Comando              | O que faz                                      |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Modo desenvolvimento (recarrega ao salvar)     |
| `npm test`           | Roda os testes uma vez                         |
| `npm run test:watch` | Roda os testes sempre que algo muda            |
| `npm run sim`        | Relatório de ritmo e equilíbrio                |
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
│  ├─ definitions.ts    formato do conteúdo que o motor recebe
│  ├─ effects/          sistema de efeitos, independente do modo de jogo
│  ├─ statuses/         os 5 status, definidos por ganchos por segundo
│  ├─ hunter/           level, XP, atributos, números derivados, habilidades
│  ├─ autobattle/       lutas simuladas (usadas pela Expedição), dano, IA dos inimigos
│  ├─ world/            mapas em tiles, caminhos (A*), visão
│  ├─ realtime/         o mundo em tempo real: passos, monstros, golpes, saque, auto-caçar
│  ├─ items/            sorteio de itens, afixos, stats e valores
│  ├─ expedition/       taxa da expedição, ganho por tempo, queda por level
│  ├─ game/             estado completo do jogo e os comandos que o alteram
│  └─ save/             serializar, validar e migrar o save
├─ content/             CONTEÚDO: só dados (progressão, habilidades, inimigos, portais, itens, mapas)
└─ ui/                  INTERFACE: React
   ├─ app/              topo, abas e navegação
   ├─ store/            Zustand: guarda o estado e chama o motor; save no localStorage
   ├─ screens/          Caçador, Habilidades, Portais, Expedição, Combate (reprodução)
   ├─ components/       barra de progresso, relatório de retorno, painel de teste
   └─ theme/            tokens de cor e espaçamento (provisórios)
tests/                  testes do motor e integridade do conteúdo
tools/sim/              simulador de ritmo
```

## Regras do projeto

- **O motor não conhece a interface nem o conteúdo.** Ele recebe as definições como parâmetro. O lint falha se isso for violado.
- **Comandos são puros:** recebem o estado e devolvem um estado novo (ou um erro). O estado antigo nunca é alterado.
- **Nada de `Math.random()` no motor.** Use sempre o `Rng` com semente de `src/engine/core`.
- **Conteúdo novo = dados novos.** Uma habilidade nova combina efeitos existentes em `src/content/abilities.ts`; um inimigo novo entra em `enemies.ts`; um portal novo em `portals.ts`; um mapa novo em `src/content/maps/` (desenhado em texto, com legenda).
- **Estado do jogo em objetos simples**, sem classes, e o save tem versão e migrações.
- Imports do motor e do conteúdo usam a extensão `.ts`, para que o simulador rode direto no Node.
