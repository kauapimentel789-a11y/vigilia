/**
 * Barramento de eventos tipado.
 *
 * O motor emite eventos (ex.: "danoCausado") e a interface escuta para animar.
 * O mapa de eventos define o nome de cada evento e o formato dos seus dados.
 */
export type EventMap = Record<string, unknown>;

export type Listener<Payload> = (payload: Payload) => void;

export interface EventBus<Events extends EventMap> {
  /** Inscreve um ouvinte. Retorna uma função que cancela a inscrição. */
  on<Name extends keyof Events>(name: Name, listener: Listener<Events[Name]>): () => void;
  /** Remove um ouvinte. */
  off<Name extends keyof Events>(name: Name, listener: Listener<Events[Name]>): void;
  /** Entrega o evento a todos os ouvintes inscritos, na ordem de inscrição. */
  emit<Name extends keyof Events>(name: Name, payload: Events[Name]): void;
  /** Remove todos os ouvintes. */
  clear(): void;
}

export function createEventBus<Events extends EventMap>(): EventBus<Events> {
  const listeners = new Map<keyof Events, Set<Listener<never>>>();

  const off = <Name extends keyof Events>(name: Name, listener: Listener<Events[Name]>): void => {
    listeners.get(name)?.delete(listener as Listener<never>);
  };

  return {
    on(name, listener) {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(listener as Listener<never>);
      return () => off(name, listener);
    },
    off,
    emit(name, payload) {
      const set = listeners.get(name);
      if (!set) return;
      // Copia antes de iterar: um ouvinte pode cancelar a própria inscrição durante o evento.
      for (const listener of [...set]) {
        (listener as Listener<typeof payload>)(payload);
      }
    },
    clear() {
      listeners.clear();
    },
  };
}
