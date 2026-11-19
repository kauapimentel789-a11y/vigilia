# Vigília

Jogo idle de fantasia dark para navegador. Você é um Portador da Vigília recém-desperto, o mais fraco de todos, e fica mais forte a cada portal fechado. A Caçada (PvE idle) vem primeiro; a Arena (PvP auto-battler com cartas) vem em etapas futuras.

> **Status:** Etapa 2 (Caçada: núcleo idle). Caçador com level e atributos, combate automático com 4 habilidades, 5 portais Cinza com mini-chefe, Expedição com progresso offline e save local.

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

1. **Portais:** entre no Cinza I. A luta é automática: assista em 1×, 2× ou 4×, ou pule para o resultado.
2. **Caçador:** cada level dá 3 pontos de atributo. Redistribuir é grátis neste protótipo.
3. **Habilidades:** equipe até 4, na ordem de prioridade (a de cima é usada primeiro), melhore com ouro e ajuste o comportamento (alvo, quando curar, quando defender).
4. **Expedição:** envie o caçador a um portal já fechado. Ele farma sozinho, mesmo com o jogo fechado, até 8 h acumuladas. Ao voltar, um relatório mostra o que ele ganhou.
5. Feche o **Cinza V**, onde o Cavaleiro Oco anuncia a Execução antes de usá-la.

O jogo salva sozinho no navegador (a cada mudança, a cada 30 s e ao fechar a aba). Fora do site de produção aparece um **painel de teste** (🛠) para avançar o tempo da expedição e apagar o progresso.

## Regras principais

**Combate automático.** O tempo avança em tiques de 100 ms. Cada unidade soma a velocidade a uma barra de ação e age quando ela enche. A cada segundo, os status contam (Veneno tira vida; Fraco, Vulnerável e Marca diminuem) e o bloqueio perde 20%. A vida do caçador não volta entre ondas, e o portal tem limite de 90 s.

**O caçador** percorre as habilidades equipadas na ordem de prioridade e usa a primeira que está pronta e que o comportamento permite (cura só abaixo do percentual escolhido; defesa assim que pronta ou só contra golpe forte anunciado). Sem nenhuma, usa o ataque básico.

**Inimigos** mostram a intenção da próxima ação, que é sempre a ação executada. Golpes fortes aparecem com ⚠.

**Expedição.** Ao enviar e a cada coleta, o motor simula 20 lutas reais e calcula uma taxa por hora (vitórias, lutas, XP e ouro). O ganho é taxa × tempo, com teto de 8 h. Se o relógio do aparelho voltar no tempo, nada é acumulado. Portais fáceis demais para o seu level rendem menos (ver `xpAcimaDoRecomendado` em `src/content/progression.ts`).

**Determinismo.** Mesma semente e mesmo caçador geram exatamente a mesma luta. A interface só reproduz os eventos e quadros que o motor devolve.

## Simulador

`npm run sim` mostra a chance de vitória por level em cada portal, a progressão de um jogador-robô até fechar o Cinza V, um build ruim contra o mini-chefe e o rendimento de 8 h offline.

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
│  ├─ autobattle/       simulação por tiques, dano, IA dos inimigos, comportamento
│  ├─ expedition/       taxa da expedição, ganho por tempo, queda por level
│  ├─ game/             estado completo do jogo e os comandos que o alteram
│  └─ save/             serializar, validar e migrar o save
├─ content/             CONTEÚDO: só dados (progressão, habilidades, inimigos, portais)
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
- **Conteúdo novo = dados novos.** Uma habilidade nova combina efeitos existentes em `src/content/abilities.ts`; um inimigo novo entra em `enemies.ts`; um portal novo em `portals.ts`.
- **Estado do jogo em objetos simples**, sem classes, e o save tem versão e migrações.
- Imports do motor e do conteúdo usam a extensão `.ts`, para que o simulador rode direto no Node.
