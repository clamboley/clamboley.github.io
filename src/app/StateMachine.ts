import type { KitKey } from '../kit.types.ts';

/**
 * The four moments of the experience, as an explicit, side-effect free
 * state machine. Whoever owns the scene subscribes to transitions.
 */
export type State =
  | { name: 'idle' }
  | { name: 'hover'; target: KitKey }
  | { name: 'fill'; target: KitKey }
  | { name: 'redirect'; target: KitKey };

export type StateName = State['name'];

export type Listener = (next: State, previous: State) => void;

export class StateMachine {
  private current: State = { name: 'idle' };
  private readonly listeners = new Set<Listener>();

  get state(): State {
    return this.current;
  }

  /** Element currently targeted (aimed, played or redirected to), if any. */
  get target(): KitKey | null {
    return this.current.name === 'idle' ? null : this.current.target;
  }

  /** True while the user can still look around and aim. */
  get acceptsInput(): boolean {
    return this.current.name === 'idle' || this.current.name === 'hover';
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The raycast reports what sits under the crosshair (null = nothing). */
  aim(key: KitKey | null): boolean {
    if (!this.acceptsInput) return false;
    if (key === null) return this.current.name === 'hover' && this.set({ name: 'idle' });
    if (this.current.name === 'hover' && this.current.target === key) return false;
    return this.set({ name: 'hover', target: key });
  }

  /** Click / Enter on the aimed element. */
  trigger(): boolean {
    if (this.current.name !== 'hover') return false;
    return this.set({ name: 'fill', target: this.current.target });
  }

  /** The fill has finished playing. */
  fillDone(): boolean {
    if (this.current.name !== 'fill') return false;
    return this.set({ name: 'redirect', target: this.current.target });
  }

  /** Back on stage (development mode, or destinations that don't leave the page). */
  reset(): boolean {
    if (this.current.name !== 'redirect') return false;
    return this.set({ name: 'idle' });
  }

  private set(next: State): true {
    const previous = this.current;
    this.current = next;
    for (const listener of this.listeners) listener(next, previous);
    return true;
  }
}
