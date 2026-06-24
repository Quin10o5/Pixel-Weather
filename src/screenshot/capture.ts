import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { DEFAULT_SETTINGS } from '../shared/types';

/** Deterministic layout for marketplace / README captures. */
function seedRandom(seed: number): void {
  let state = seed >>> 0;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Staged frame for README / marketplace (uses the same renderer as the panel). */
function main(): void {
  seedRandom(0x57ea7e42);
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) {
    return;
  }

  const width = 1280;
  const height = 160;

  const renderer = new CanvasRenderer(canvas);
  renderer.resize(width, height);
  renderer.handleMessage({
    type: 'init',
    weather: 'sunny',
    dayPhase: 'day',
    wind: { strength: 0.35, direction: 1 },
    settings: { ...DEFAULT_SETTINGS },
  });
  renderer.setDevOverrides({
    timeOverride: 11.5,
    useTimeOverride: true,
    cloudCount: 4,
    cloudOpacity: 1,
    intensity: 1,
    windDirection: 1,
    windStrength: 0.25,
  });

  renderer.getBirdSystem().triggerFlock(1);

  for (let i = 0; i < 168; i++) {
    renderer.update(1 / 60);
  }

  renderer.draw();
  document.body.dataset.ready = 'true';
}

main();
