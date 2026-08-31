import { FogExp2, Raycaster, Scene, Timer, Vector2, type WebGLRenderer } from 'three';
import { assets } from '../assets.config.ts';
import { AudioEngine } from '../audio/AudioEngine.ts';
import { fillDuration } from '../audio/fills.ts';
import { LookInput } from '../input/LookInput.ts';
import { KIT, KIT_BY_KEY } from '../kit.config.ts';
import { site } from '../site.config.ts';
import type { KitKey } from '../kit.types.ts';
import { createRenderer } from '../scene/createRenderer.ts';
import { Crowd } from '../scene/Crowd.ts';
import { DrumKit } from '../scene/DrumKit.ts';
import { createStageEnvironment } from '../scene/Environment.ts';
import { createPostProcessing, type PostProcessing } from '../scene/PostProcessing.ts';
import { PovCamera } from '../scene/PovCamera.ts';
import { Props } from '../scene/Props.ts';
import { createStage } from '../scene/Stage.ts';
import { StageLights } from '../scene/StageLights.ts';
import { Sticks, type Strike } from '../scene/Sticks.ts';
import { Venue } from '../scene/Venue.ts';
import { withBase } from '../util/base.ts';
import type { Hud } from '../ui/Hud.ts';
import type { RedirectOverlay } from '../ui/RedirectOverlay.ts';
import { readMotionPrefs } from '../util/motion.ts';
import { StateMachine, type State } from './StateMachine.ts';

const BACKGROUND = 0x05040a;
const MAX_FRAME_DT = 0.05;
const CENTER = new Vector2(0, 0);
/** Events that count as a user activation for audio playback. */
const GESTURES = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'] as const;

interface ScheduledHit {
  at: number;
  key: KitKey;
  velocity: number;
}

export interface AppOptions {
  container: HTMLElement;
  hud: Hud;
  overlay: RedirectOverlay;
  /** Show a way back instead of navigating (development, `?stay`). */
  stayOnRedirect: boolean;
}

/** Wires scene, input, audio and HUD around the state machine and runs the loop. */
export class App {
  private readonly fsm = new StateMachine();
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly pov: PovCamera;
  private readonly kit: DrumKit;
  private readonly crowd: Crowd;
  private readonly lights: StageLights;
  private readonly sticks = new Sticks();
  private readonly props = new Props();
  private readonly venue = new Venue();
  private readonly post: PostProcessing;
  private readonly audio = new AudioEngine();
  private readonly look: LookInput;
  private readonly raycaster = new Raycaster();
  private readonly timer = new Timer();
  private readonly hud: Hud;
  private readonly overlay: RedirectOverlay;
  private readonly stayOnRedirect: boolean;

  private pendingHits: ScheduledHit[] = [];
  private fillEndsAt = 0;
  private frameHandle = 0;

  constructor({ container, hud, overlay, stayOnRedirect }: AppOptions) {
    this.hud = hud;
    this.overlay = overlay;
    this.stayOnRedirect = stayOnRedirect;

    const motion = readMotionPrefs();
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

    this.renderer = createRenderer();
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new FogExp2(BACKGROUND, 0.045);
    this.scene.environment = createStageEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.45;
    this.pov = new PovCamera(motion);
    this.kit = new DrumKit(KIT);
    this.crowd = new Crowd(coarsePointer ? 140 : 260, motion);
    this.lights = new StageLights(motion);
    this.scene.add(
      createStage(),
      this.kit.root,
      this.crowd.root,
      this.lights.root,
      this.sticks.root,
      this.props.root,
      this.venue.root,
    );
    this.loadGeneratedAssets();
    this.renderer.setClearColor(BACKGROUND, 1);
    this.post = createPostProcessing(this.renderer, this.scene, this.pov.camera);

    this.look = new LookInput(
      (nx, ny) => {
        this.pov.look(nx, ny);
      },
      () => {
        setTimeout(() => {
          this.hud.hideHint();
        }, 2500);
      },
    );

    this.fsm.subscribe(this.onStateChange);
  }

  /** Generated models arrive after the first frame; the procedural scene stands in until then. */
  private loadGeneratedAssets(): void {
    const report = (what: string) => (error: unknown) => {
      console.warn(`${what} unavailable`, error);
    };
    void this.crowd
      .loadPeople(assets.crowd, assets.crowdDetailDistance, withBase(''))
      .catch(report('Crowd models'));
    void this.props
      .load(assets.props.wedges.map(withBase), withBase(assets.props.truss))
      .catch(report('Stage props'));
    void this.venue.load(withBase(assets.venue.stand)).catch(report('Venue'));
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', this.resize);
    for (const type of GESTURES) window.addEventListener(type, this.onFirstGesture);
    window.addEventListener('click', this.onClick);
    this.frame(performance.now());
  }

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('resize', this.resize);
    for (const type of GESTURES) window.removeEventListener(type, this.onFirstGesture);
    window.removeEventListener('click', this.onClick);
    this.look.dispose();
    this.renderer.dispose();
  }

  private readonly onStateChange = (next: State): void => {
    switch (next.name) {
      case 'idle':
        this.hud.setTarget(null);
        this.overlay.hide();
        this.sticks.hide();
        break;
      case 'hover':
        this.hud.setTarget(KIT_BY_KEY[next.target].destination.label);
        break;
      case 'fill':
        // the tooltip stays while the fill plays
        break;
      case 'redirect':
        this.hud.setTarget(null);
        this.sticks.hide();
        this.overlay.show(KIT_BY_KEY[next.target], { stay: this.stayOnRedirect });
        break;
    }
  };

  /** Back on stage after a redirect that did not leave the page. */
  returnToStage(): void {
    this.fsm.reset();
  }

  /** Browsers only let audio start from a gesture: the first one wakes the crowd. */
  private readonly onFirstGesture = (): void => {
    this.audio.unlock();
    void this.audio
      .startAmbience(withBase(site.ambience.file), site.ambience.level)
      .catch((error: unknown) => {
        console.warn('Crowd ambience unavailable', error);
      });
  };

  private readonly onClick = (): void => {
    const { state } = this.fsm;
    if (state.name !== 'hover') return;
    const element = KIT_BY_KEY[state.target];

    // lock input right away; the fill itself waits for a live audio clock
    this.audio.unlock();
    this.fillEndsAt = Infinity;
    this.fsm.trigger();
    this.sticks.show();

    void this.audio.whenRunning().then(() => {
      if (this.fsm.state.name !== 'fill') return;
      const start = this.audio.playFill(element.fill, (key) => KIT_BY_KEY[key].voice);
      this.pendingHits = element.fill.hits
        .map((hit) => ({ at: start + hit.t, key: hit.key, velocity: hit.velocity }))
        .sort((a, b) => a.at - b.at);
      this.fillEndsAt = start + fillDuration(element.fill);
      this.audio.cheer(start + 0.75);

      const strikes: Strike[] = [];
      for (const hit of element.fill.hits) {
        const point = this.kit.strikePoint(hit.key);
        if (point) strikes.push({ at: start + hit.t, key: hit.key, point });
      }
      this.sticks.play(strikes);
    });
  };

  private readonly resize = (): void => {
    const { innerWidth, innerHeight } = window;
    this.renderer.setSize(innerWidth, innerHeight);
    this.post.setSize(innerWidth, innerHeight);
    this.pov.resize(innerWidth / innerHeight);
  };

  private readonly frame = (timestamp: number): void => {
    this.frameHandle = requestAnimationFrame(this.frame);
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), MAX_FRAME_DT);
    const elapsed = this.timer.getElapsed();

    this.applyDueHits();
    if (this.fsm.state.name === 'fill' && this.audio.currentTime >= this.fillEndsAt) {
      this.fsm.fillDone();
    }

    this.pov.update(dt, elapsed);
    if (this.fsm.acceptsInput) this.fsm.aim(this.aimedKey());

    const hovered = this.fsm.state.name === 'hover' ? this.fsm.state.target : null;
    this.kit.update(dt, elapsed, hovered);
    this.crowd.update(dt, elapsed);
    this.lights.update(elapsed);
    this.sticks.update(this.audio.currentTime, dt);

    this.post.render(dt);
  };

  /** Strokes whose time has come on the audio clock drive the visuals. */
  private applyDueHits(): void {
    const now = this.audio.currentTime;
    let next = this.pendingHits[0];
    while (next && next.at <= now) {
      this.pendingHits.shift();
      this.kit.hit(next.key, next.velocity);
      this.pov.shake(next.velocity * 0.4);
      this.crowd.boost(0.12);
      next = this.pendingHits[0];
    }
  }

  /** Raycast from the centre of the screen, not from the cursor. */
  private aimedKey(): KitKey | null {
    this.raycaster.setFromCamera(CENTER, this.pov.camera);
    const hit = this.raycaster.intersectObjects(this.kit.proxies, false)[0];
    return hit ? this.kit.keyOf(hit.object) : null;
  }
}
