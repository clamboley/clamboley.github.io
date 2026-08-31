import { describe, expect, it, vi } from 'vitest';
import { StateMachine } from './StateMachine.ts';

describe('StateMachine', () => {
  it('starts idle with no target and accepts input', () => {
    const fsm = new StateMachine();
    expect(fsm.state).toEqual({ name: 'idle' });
    expect(fsm.target).toBeNull();
    expect(fsm.acceptsInput).toBe(true);
  });

  it('aims: idle → hover → other hover → idle', () => {
    const fsm = new StateMachine();
    expect(fsm.aim('snare')).toBe(true);
    expect(fsm.state).toEqual({ name: 'hover', target: 'snare' });
    expect(fsm.aim('snare')).toBe(false); // no-op when already aimed
    expect(fsm.aim('ride')).toBe(true);
    expect(fsm.target).toBe('ride');
    expect(fsm.aim(null)).toBe(true);
    expect(fsm.state).toEqual({ name: 'idle' });
    expect(fsm.aim(null)).toBe(false); // already idle
  });

  it('only triggers from hover', () => {
    const fsm = new StateMachine();
    expect(fsm.trigger()).toBe(false);
    fsm.aim('kick');
    expect(fsm.trigger()).toBe(true);
    expect(fsm.state).toEqual({ name: 'fill', target: 'kick' });
  });

  it('locks input during fill and redirect', () => {
    const fsm = new StateMachine();
    fsm.aim('tom1');
    fsm.trigger();
    expect(fsm.acceptsInput).toBe(false);
    expect(fsm.aim('tom2')).toBe(false);
    expect(fsm.aim(null)).toBe(false);
    expect(fsm.target).toBe('tom1');
    fsm.fillDone();
    expect(fsm.state).toEqual({ name: 'redirect', target: 'tom1' });
    expect(fsm.acceptsInput).toBe(false);
    expect(fsm.trigger()).toBe(false);
  });

  it('fillDone and reset only apply to their own state', () => {
    const fsm = new StateMachine();
    expect(fsm.fillDone()).toBe(false);
    expect(fsm.reset()).toBe(false);
    fsm.aim('crash');
    fsm.trigger();
    expect(fsm.reset()).toBe(false);
    fsm.fillDone();
    expect(fsm.reset()).toBe(true);
    expect(fsm.state).toEqual({ name: 'idle' });
  });

  it('notifies subscribers with next and previous state, until unsubscribed', () => {
    const fsm = new StateMachine();
    const listener = vi.fn();
    const unsubscribe = fsm.subscribe(listener);
    fsm.aim('hihat');
    expect(listener).toHaveBeenCalledWith({ name: 'hover', target: 'hihat' }, { name: 'idle' });
    unsubscribe();
    fsm.trigger();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
