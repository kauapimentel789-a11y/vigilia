# Vigília

Jogo idle de fantasia dark para navegador, com combate estratégico em turnos, deck-building e invocações.

> **Status:** Etapa 0 (Fundação). Ainda não há gameplay.

## Requisitos

- [Node.js](https://nodejs.org) 22.13 ou mais novo (inclui o `npm`). Para conferir: `node -v`.

## Como rodar

```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
npm test         # roda os testes
```

## Scripts

| Comando              | O que faz                                           |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Modo desenvolvimento (recarrega ao salvar)          |
| `npm test`           | Roda os testes uma vez                              |
| `npm run test:watch` | Roda os testes sempre que algo muda                 |
| `npm run lint`       | Verifica qualidade do código e a fronteira motor/UI |
| `npm run typecheck`  | Verifica os tipos do TypeScript                     |
| `npm run format`     | Formata o código com Prettier                       |
| `npm run build`      | Gera a versão final em `dist/`                      |
| `npm run preview`    | Serve localmente a versão gerada pelo build         |

## Estrutura

```
src/
├─ engine/   MOTOR: TypeScript puro. Proibido importar React ou src/ui (o lint falha).
│  └─ core/  RNG com semente, barramento de eventos, tipos base
└─ ui/       INTERFACE: React
   ├─ app/   telas
   └─ theme/ tokens de cor e espaçamento (provisórios)
tests/       testes do motor (Vitest)
```

Novas pastas (combate, cartas, conteúdo...) são criadas somente na etapa que precisar delas.

## Regras do projeto

- **O motor não conhece a interface.** Toda a lógica de jogo fica em `src/engine` e é testável sem navegador.
- **Nada de `Math.random()` no motor.** Use sempre o `Rng` com semente de `src/engine/core`.
- **Estado do jogo em objetos simples**, sem classes, para facilitar o save no futuro.
