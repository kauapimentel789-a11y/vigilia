/**
 * Tipos base compartilhados por todo o motor.
 *
 * O estado do jogo é sempre composto por objetos simples (sem classes),
 * para que possa ser serializado facilmente no futuro.
 */

/** Identificador tipado: impede trocar, por exemplo, o id de uma carta pelo de um inimigo. */
export type Id<Kind extends string> = string & { readonly __kind: Kind };

/** Semente usada para inicializar o gerador de números aleatórios. */
export type Seed = number;

/** Cria um identificador tipado a partir de uma string. */
export function makeId<Kind extends string>(value: string): Id<Kind> {
  return value as Id<Kind>;
}
