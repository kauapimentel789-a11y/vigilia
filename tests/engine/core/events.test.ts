import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../../src/engine/core';

type TestEvents = {
  danoCausado: { alvo: string; valor: number };
  turnoEncerrado: undefined;
};

describe('EventBus', () => {
  it('entrega o evento com os dados aos ouvintes inscritos', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('danoCausado', listener);

    bus.emit('danoCausado', { alvo: 'lobo', valor: 6 });

    expect(listener).toHaveBeenCalledExactlyOnceWith({ alvo: 'lobo', valor: 6 });
  });

  it('não entrega eventos de outro nome', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('turnoEncerrado', listener);

    bus.emit('danoCausado', { alvo: 'lobo', valor: 6 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('respeita a ordem de inscrição', () => {
    const bus = createEventBus<TestEvents>();
    const order: string[] = [];
    bus.on('turnoEncerrado', () => order.push('primeiro'));
    bus.on('turnoEncerrado', () => order.push('segundo'));

    bus.emit('turnoEncerrado', undefined);

    expect(order).toEqual(['primeiro', 'segundo']);
  });

  it('a função retornada por on cancela a inscrição', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    const unsubscribe = bus.on('turnoEncerrado', listener);

    unsubscribe();
    bus.emit('turnoEncerrado', undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it('off e clear removem ouvintes', () => {
    const bus = createEventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('turnoEncerrado', a);
    bus.on('turnoEncerrado', b);

    bus.off('turnoEncerrado', a);
    bus.emit('turnoEncerrado', undefined);
    bus.clear();
    bus.emit('turnoEncerrado', undefined);

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it('um ouvinte pode cancelar a própria inscrição durante o evento sem afetar os outros', () => {
    const bus = createEventBus<TestEvents>();
    const second = vi.fn();
    const unsubscribe = bus.on('turnoEncerrado', () => unsubscribe());
    bus.on('turnoEncerrado', second);

    bus.emit('turnoEncerrado', undefined);

    expect(second).toHaveBeenCalledOnce();
  });
});
