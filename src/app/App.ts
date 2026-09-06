import { FogExp2, Raycaster, Scene, Timer, Vector2, Vector3, type WebGLRenderer } from 'three';
import { assets } from '../assets.config.ts';
import { AudioEngine } from '../audio/AudioEngine.ts';
import { fillDuration } from '../audio/fills.ts';
import { KeyboardInput } from '../input/KeyboardInput.ts';
import { LookInput, TAP_SLOP } from '../input/LookInput.ts';
import { COMPACT_KIT } from '../kit.compact.ts';
import { FULL_KIT, KIT, KIT_BY_KEY } from '../kit.config.ts';
import { COMPACT_RANGES, FULL_RANGES } from '../scene/gaze.ts';
import { site } from '../site.config.ts';
import type { Fill, KitKey } from '../kit.types.ts';
import { createRenderer } from '../scene/createRenderer.ts';
import { Crowd } from '../scene/Crowd.ts';
import { DrumKit } from '../scene/DrumKit.ts';
import { createStageEnvironment } from '../scene/Environment.ts';
import { createPostProcessing, type PostProcessing } from '../scene/PostProcessing.ts';
import { PovCamera } from '../scene/PovCamera.ts';
import { Props } from '../scene/Props.ts';
import { createStage } from '../scene/Stage.ts';
import { StageLights } from '../scene/StageLights.ts';
import { type CountFrame, Sticks, type Strike } from '../scene/Sticks.ts';
import { LightRig } from '../scene/Rig.ts';
import { Sky } from '../scene/Sky.ts';
import { withBase } from '../util/base.ts';
import { mustQuery } from '../util/dom.ts';
import type { Hud } from '../ui/Hud.ts';
import { Menu } from '../ui/Menu.ts';
import { EntryGate } from '../ui/EntryGate.ts';
import type { RedirectOverlay } from '../ui/RedirectOverlay.ts';
import { readMotionPrefs } from '../util/motion.ts';
import type { QualityProfile } from '../util/quality.ts';
import { Governor, type GovernorLevels } from './Governor.ts';
import { StateMachine, type State } from './StateMachine.ts';

const BACKGROUND = 0x05040a;

/** The full kit for a wide screen, the compact one for a phone held upright. */
type KitLayout = 'full' | 'compact';

function layoutFor(width: number, height: number): KitLayout {
  const forced = new URLSearchParams(location.search).get('layout');
  if (forced === 'full' || forced === 'compact') return forced;
  return height > width ? 'compact' : 'full';
}
/** Bumped when the rendering tiers change, so parked devices re-measure. */
const BUDGET_KEY = 'vitrine:budget:2';

/** Where the adaptive budget ended up last time on this device. */
function readStoredRung(): number {
  try {
    const value = Number(localStorage.getItem(BUDGET_KEY));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function storeRung(rung: number): void {
  try {
    localStorage.setItem(BUDGET_KEY, String(rung));
  } catch {
    // private mode or storage blocked: nothing to remember
  }
}

/** `?stats`: a small read-out of the adaptive budget, for tuning. */
function createStats(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'stats';
  document.body.appendChild(el);
  return el;
}
const MAX_FRAME_DT = 0.05;
const CENTER = new Vector2(0, 0);
/** Events that count as a user activation for audio playback. */
// browsers only let audio start after a real activation (click, key, tap); the
// softer events are retried in case the site is already trusted with sound
const GESTURES = [
  'pointerdown',
  'mousedown',
  'touchstart',
  'keydown',
  'click',
  'pointermove',
  'wheel',
  'touchmove',
] as const;

interface ScheduledHit {
  at: number;
  key: KitKey;
  velocity: number;
}

export interface AppOptions {
  container: HTMLElement;
  hud: Hud;
  overlay: RedirectOverlay;
  quality: QualityProfile;
}

/** Wires scene, input, audio and HUD around the state machine and runs the loop. */
export class App {
  private readonly fsm = new StateMachine();
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly pov: PovCamera;
  private kit: DrumKit;
  private layout: KitLayout;
  private readonly crowd: Crowd;
  private readonly lights: StageLights;
  private readonly sticks = new Sticks();
  private readonly props = new Props();
  private readonly rig = new LightRig();
  private readonly sky: Sky;
  private readonly post: PostProcessing;
  private readonly audio = new AudioEngine();
  private readonly look: LookInput;
  private readonly keyboard: KeyboardInput;
  private readonly menu: Menu;
  private readonly entry: EntryGate;
  private readonly governor: Governor;
  private readonly stats: HTMLElement | null;
  private statsTimer = 0;
  private statsFrames = 0;
  /** Element aimed through the keyboard focus, overriding the crosshair. */
  private keyboardAim: KitKey | null = null;
  private readonly raycaster = new Raycaster();
  private readonly timer = new Timer();
  private readonly hud: Hud;
  private readonly overlay: RedirectOverlay;
  readonly quality: QualityProfile;

  private pendingHits: ScheduledHit[] = [];
  private fillEndsAt = 0;
  /** Audio time when the current count-in (sticks clicked in the air) ends. */
  private countEndsAt = 0;
  private fillSamplesRequested = false;
  private frameHandle = 0;
  private tap: { x: number; y: number; at: number } | null = null;

  constructor({ container, hud, overlay, quality }: AppOptions) {
    this.hud = hud;
    this.quality = quality;
    this.overlay = overlay;

    const motion = readMotionPrefs();
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

    this.renderer = createRenderer(quality.pixelRatioMax);
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new FogExp2(0x070812, 0.014);
    this.scene.environment = createStageEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.45;
    this.pov = new PovCamera(motion);
    this.layout = layoutFor(window.innerWidth, window.innerHeight);
    this.pov.setRanges(this.layout === 'compact' ? COMPACT_RANGES : FULL_RANGES);
    this.crowd = new Crowd(quality.people, assets.crowdIndividualDepth, motion, {
      pitLights: quality.pitLights,
      pitDepth: quality.pitDepth,
    });
    const rich = quality.tier === 'high';
    // low tier skips the anisotropic BRDF: its unguarded a2/v2 division goes
    // inf on some drivers, poisoning the bloom chain into black flashes
    this.kit = new DrumKit(
      this.layout === 'compact' ? COMPACT_KIT : FULL_KIT,
      KIT_BY_KEY,
      rich ? 0.35 : 0,
    );
    this.lights = new StageLights(motion, this.rig.rig, quality.shadowMapSize, rich ? 1 : 2);
    this.sky = new Sky(this.renderer.getPixelRatio(), quality.stars, 0.28 * motion.scale, rich);
    this.scene.add(
      createStage(),
      this.kit.root,
      this.crowd.root,
      this.lights.root,
      this.sticks.root,
      this.props.root,
      this.rig.root,
      this.sky.root,
    );
    this.loadGeneratedAssets();
    this.renderer.setClearColor(BACKGROUND, 1);
    this.post = createPostProcessing(this.renderer, this.scene, this.pov.camera, {
      antialias: quality.antialias,
    });

    this.look = new LookInput(
      (nx, ny) => {
        // the camera holds still under the list and on the redirect card; it may
        // still look around while a fill plays
        if (this.entry.isOpen || this.menu.isOpen || this.fsm.state.name === 'redirect') return;
        this.keyboard.release();
        this.pov.look(nx, ny);
      },
      () => {
        setTimeout(() => {
          this.hud.hideHint();
        }, 2500);
      },
    );

    const pointerCta = coarsePointer ? 'touche pour jouer un fill' : 'clique pour jouer un fill';
    this.keyboard = new KeyboardInput(document, {
      onFocus: (key) => {
        this.keyboardAim = key;
        this.hud.setCta('Entrée pour jouer un fill');
        const point = this.kit.aimPoint(key);
        this.pov.lookAt(point.x, point.y, point.z);
      },
      onBlur: () => {
        this.keyboardAim = null;
        this.hud.setCta(pointerCta);
      },
      onActivate: (key) => {
        this.keyboardAim = key;
        this.fsm.aim(key); // the click that follows plays it
      },
      onEscape: () => {
        this.toggleMenu();
      },
    });
    this.menu = new Menu(mustQuery(document.body, '.site-nav'), () => {
      this.toggleMenu();
    });
    hud.setCta(pointerCta);
    hud.setHint(
      coarsePointer
        ? 'Glisse le doigt pour regarder autour de toi, touche pour jouer'
        : 'Déplace la souris pour regarder autour de toi · Tab parcourt les fûts, Entrée joue, Échap liste les liens',
    );

    // adaptive budget: start where the last visit ended up on this device
    this.governor = new Governor((levels, rung) => {
      this.applyLevels(levels);
      storeRung(rung);
    }, readStoredRung());
    this.applyLevels(this.governor.levels);
    const wantStats =
      new URLSearchParams(location.search).has('stats') || location.hash.includes('stats');
    this.stats = wantStats ? createStats() : null;

    this.fsm.subscribe(this.onStateChange);

    // the door: decoding starts right away, the button only has to resume
    this.entry = new EntryGate(mustQuery(document.body, '.entry'), () => {
      this.onFirstGesture();
    });
    this.audio.prepare();
    this.preloadFillSamples();
  }

  /** The governor's verdict: render scale and crowd reach. */
  private applyLevels(levels: GovernorLevels): void {
    const base = Math.min(window.devicePixelRatio, this.quality.pixelRatioMax);
    this.renderer.setPixelRatio(base * levels.renderScale);
    this.post.setSize(window.innerWidth, window.innerHeight);
    this.crowd.setDetail(levels.detail);
    this.crowd.setReach(levels.crowdReach);
  }

  /** Generated models arrive after the first frame; the procedural scene stands in until then. */
  private loadGeneratedAssets(): void {
    const report = (what: string) => (error: unknown) => {
      console.warn(`${what} unavailable`, error);
    };
    const { props } = assets;
    void this.crowd
      .loadPeople(assets.crowd, this.quality.detailDistance, withBase(''))
      .catch(report('Crowd models'));
    void this.crowd.loadBlocks(assets.crowdBlocks, withBase('')).catch(report('Crowd blocks'));
    void this.props
      .loadStage(props.wedges.map(withBase), withBase(props.truss))
      .catch(report('Stage props'));
    void this.props.loadBarrier(withBase(props.barrier)).catch(report('Barrier'));
    void this.props.loadPa(withBase(props.lineArray), withBase(props.subs)).catch(report('PA'));
    void this.rig
      .load(withBase(props.truss), assets.tower && withBase(assets.tower))
      .catch(report('Rig'));
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', this.resize);
    for (const type of GESTURES) window.addEventListener(type, this.onFirstGesture);
    window.addEventListener('click', this.onClick);
    // iOS Safari does not deliver a canvas tap as a click on window: read it ourselves
    const canvas = this.renderer.domElement;
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    // the sound and the stage both wait behind the entry veil
    this.entry.show();
    this.frame(performance.now());
  }

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('resize', this.resize);
    for (const type of GESTURES) window.removeEventListener(type, this.onFirstGesture);
    window.removeEventListener('click', this.onClick);
    this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.renderer.domElement.removeEventListener('touchend', this.onTouchEnd);
    this.look.dispose();
    this.keyboard.dispose();
    this.menu.dispose();
    this.entry.dispose();
    this.renderer.dispose();
  }

  private readonly onStateChange = (next: State): void => {
    switch (next.name) {
      case 'idle':
        this.hud.setTarget(null);
        this.overlay.hide();
        this.sticks.hide();
        break;
      case 'hover': {
        // an unadvertised destination lights up but stays nameless
        const { destination } = KIT_BY_KEY[next.target];
        this.hud.setTarget(destination.pending === true ? null : destination.label);
        break;
      }
      case 'fill':
        // the tooltip stays while the fill plays
        break;
      case 'redirect':
        this.hud.setTarget(null);
        this.sticks.hide();
        // no destination card for a page that does not exist yet
        if (KIT_BY_KEY[next.target].destination.pending !== true) {
          this.overlay.show(KIT_BY_KEY[next.target]);
        }
        break;
    }
  };

  /** Escape: the plain list of destinations over the scene, and back. */
  private toggleMenu(): void {
    if (this.entry.isOpen) return;
    if (this.fsm.state.name === 'redirect') {
      this.returnToStage(); // Escape on the destination card: back to the drums
      return;
    }
    if (this.menu.isOpen) {
      this.menu.hide();
      this.keyboard.setMenu(false);
      this.keyboard.release();
      return;
    }
    if (!this.fsm.acceptsInput) return;
    this.keyboard.release();
    this.keyboardAim = null;
    this.fsm.aim(null); // nothing is aimed while the list is up
    this.keyboard.setMenu(true);
    this.menu.show();
    this.keyboard.focusFirst();
  }

  /** Back on stage after a redirect that did not leave the page. */
  returnToStage(): void {
    this.fsm.reset();
  }

  /** Browsers only let audio start from a gesture: the first one wakes the crowd. */
  private readonly onFirstGesture = (): void => {
    this.audio.unlock(); // must come first: preloading needs the audio graph
    this.preloadFillSamples();
    void this.audio
      .startAmbience(withBase(site.ambience.file), site.ambience.level)
      .catch((error: unknown) => {
        console.warn('Crowd ambience unavailable', error);
      });
  };

  private readonly onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    this.tap =
      event.touches.length === 1 && touch
        ? { x: touch.clientX, y: touch.clientY, at: performance.now() }
        : null;
  };

  /** A short touch that did not travel is a tap: play what the crosshair aims at. */
  private readonly onTouchEnd = (event: TouchEvent): void => {
    const tap = this.tap;
    const touch = event.changedTouches[0];
    this.tap = null;
    if (!tap || !touch) return;
    const moved = Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y);
    if (moved > TAP_SLOP || performance.now() - tap.at > 400) return;
    event.preventDefault(); // no synthetic click behind it
    this.onClick();
  };

  private readonly onClick = (): void => {
    if (this.entry.isOpen || this.menu.isOpen) return;
    const { state } = this.fsm;
    if (state.name === 'idle') {
      this.countIn();
      return;
    }
    if (state.name !== 'hover') return;
    const fill = this.kit.fillFor(state.target);

    // lock input right away; the fill itself waits for a live audio clock
    this.audio.unlock();
    this.preloadFillSamples();
    this.fillEndsAt = Infinity;
    this.fsm.trigger();
    this.sticks.show();

    void this.audio.whenRunning().then(() => {
      if (this.fsm.state.name !== 'fill') return;
      this.startFill(fill);
    });
  };

  /** Schedules a fill's audio, hits, kicks and stick strokes right now. */
  private startFill(fill: Fill): void {
    const start = this.audio.playFill(fill, (key) => KIT_BY_KEY[key].voice);
    this.pendingHits = fill.hits
      .map((hit) => ({ at: start + hit.t, key: hit.key, velocity: hit.velocity }))
      .sort((a, b) => a.at - b.at);
    this.fillEndsAt = start + fillDuration(fill);
    this.kit.scheduleKicks(
      fill.hits.filter((hit) => hit.key === 'kick').map((hit) => start + hit.t),
    );
    this.audio.cheer(start + 0.75);

    const strikes: Strike[] = [];
    for (const hit of fill.hits) {
      if (hit.foot === true) continue; // pedal hi-hat: the foot plays it
      const point = this.kit.strikePoint(hit.key, hit.bell === true ? 'bell' : 'head');
      if (point)
        strikes.push({
          at: start + hit.t,
          key: hit.key,
          point,
          ...(hit.hand === undefined ? {} : { hand: hit.hand }),
          ...(hit.bell === true ? { bell: true } : {}),
        });
    }
    this.sticks.play(strikes);
  }

  /** Fetch and decode every recording once, feeding the door's progress ring. */
  private preloadFillSamples(): void {
    if (this.fillSamplesRequested) return;
    this.fillSamplesRequested = true;
    const phoneFills = COMPACT_KIT.flatMap((spec) =>
      typeof spec.fill === 'object' ? [spec.fill] : [],
    );
    const urls = new Set<string>([withBase(site.countIn.sample)]);
    for (const fill of [...KIT.map((element) => element.fill), ...phoneFills]) {
      if (fill.sample !== null) urls.add(fill.sample);
    }
    let settled = 0;
    for (const url of urls) {
      void this.audio
        .preload(url)
        .catch((error: unknown) => {
          console.warn(`Sample ${url} unavailable, will synthesize`, error);
        })
        .finally(() => {
          settled += 1;
          this.entry.setProgress(settled / urls.size);
        });
    }
  }

  private countIn(): void {
    this.audio.unlock();
    this.preloadFillSamples();
    if (this.audio.currentTime < this.countEndsAt) return;
    this.countEndsAt = Infinity; // ignore further empty clicks while we schedule
    const sample = withBase(site.countIn.sample);
    void Promise.all([
      this.audio.whenRunning(),
      this.audio.preload(sample).catch((error: unknown) => {
        console.warn('Count-in sample unavailable, synthesizing', error);
      }),
    ]).then(() => {
      if (this.fsm.state.name === 'fill' || this.fsm.state.name === 'redirect') return;
      const start = this.audio.currentTime + 0.12;
      const beat = 60 / 130;
      const times = [0, 1, 2, 3].map((i) => start + i * beat);
      this.audio.countIn(times, sample);
      this.sticks.countIn(times, this.countFrame());
      this.countEndsAt = start + 3 * beat + 0.15;
    });
  }

  /**
   * The camera basis and a meeting point straight ahead of the eyes, so the
   * count-in reads the same wherever the visitor is looking.
   */
  private countFrame(): CountFrame {
    const camera = this.pov.camera;
    const forward = camera.getWorldDirection(new Vector3());
    return {
      meet: camera.position.clone().addScaledVector(forward, 0.6),
      right: new Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
      up: new Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
      forward,
    };
  }

  /** Turning a phone swaps the kit in place: nothing to load, the rest of the stage stays. */
  private installKit(layout: KitLayout): void {
    this.scene.remove(this.kit.root);
    this.kit.dispose();
    this.layout = layout;
    this.kit = new DrumKit(
      layout === 'compact' ? COMPACT_KIT : FULL_KIT,
      KIT_BY_KEY,
      this.quality.tier === 'high' ? 0.35 : 0,
    );
    this.scene.add(this.kit.root);
    this.pov.setRanges(layout === 'compact' ? COMPACT_RANGES : FULL_RANGES);
    if (this.fsm.acceptsInput) this.fsm.aim(null);
  }

  /** Last size the buffers were built for: mobile chrome toggles (url bar) fire
   * resize storms, and every rebuild reallocates all HDR buffers. */
  private lastSize: { w: number; h: number; ratio: number } | null = null;

  private readonly resize = (): void => {
    const { innerWidth, innerHeight } = window;
    const layout = layoutFor(innerWidth, innerHeight);
    if (layout !== this.layout) this.installKit(layout);
    const ratio = this.renderer.getPixelRatio();
    const last = this.lastSize;
    if (last !== null && last.w === innerWidth && last.h === innerHeight && last.ratio === ratio) {
      return; // same drawing size: spare the buffers a pointless rebuild
    }
    this.lastSize = { w: innerWidth, h: innerHeight, ratio };
    this.renderer.setSize(innerWidth, innerHeight);
    this.post.setSize(innerWidth, innerHeight);
    this.pov.resize(innerWidth / innerHeight);
  };

  private readonly frame = (timestamp: number): void => {
    this.frameHandle = requestAnimationFrame(this.frame);
    this.timer.update(timestamp);
    const rawDt = this.timer.getDelta(); // wall clock, for the frame-rate budget
    const dt = Math.min(rawDt, MAX_FRAME_DT);
    const elapsed = this.timer.getElapsed();

    this.applyDueHits();
    if (this.fsm.state.name === 'fill' && this.audio.currentTime >= this.fillEndsAt) {
      const { target } = this.fsm.state;
      this.fsm.fillDone();
      // a pending destination goes straight back on stage, no card
      if (KIT_BY_KEY[target].destination.pending === true) this.fsm.reset();
    }
    if (
      this.fsm.state.name !== 'fill' &&
      this.countEndsAt !== Infinity &&
      this.countEndsAt > 0 &&
      this.audio.currentTime > this.countEndsAt + 0.55
    ) {
      this.sticks.hide();
      this.countEndsAt = 0;
    }

    this.governor.tick(rawDt);
    if (this.stats) this.updateStats(rawDt);
    this.pov.update(dt, elapsed);
    if (this.fsm.acceptsInput && !this.menu.isOpen) this.fsm.aim(this.aimedKey());

    const hovered = this.fsm.state.name === 'hover' ? this.fsm.state.target : null;
    this.kit.update(dt, elapsed, hovered);
    this.crowd.update(dt, elapsed);
    this.lights.update(elapsed);
    this.sky.update(elapsed);
    this.kit.updateBeater(this.audio.currentTime);
    this.sticks.update(this.audio.currentTime, dt);

    this.post.render(dt);
  };

  private updateStats(dt: number): void {
    this.statsTimer += dt;
    this.statsFrames++;
    if (this.statsTimer < 0.5 || !this.stats) return;
    const { renderScale, detail, crowdReach } = this.governor.levels;
    const fps = Math.round(this.statsFrames / this.statsTimer);
    this.stats.textContent = `${String(fps)} fps · ${this.quality.tier} · rendu ×${renderScale.toFixed(2)} (dpr ${this.renderer.getPixelRatio().toFixed(2)}) · détail ${detail ? 'on' : 'off'} · foule ${String(Math.round(crowdReach * 100))} %`;
    this.statsTimer = 0;
    this.statsFrames = 0;
  }

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
    if (this.keyboardAim !== null) return this.keyboardAim;
    this.raycaster.setFromCamera(CENTER, this.pov.camera);
    const hit = this.raycaster.intersectObjects(this.kit.proxies, false)[0];
    return hit ? this.kit.keyOf(hit.object) : null;
  }
}
