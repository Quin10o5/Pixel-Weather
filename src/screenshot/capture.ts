import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { DEFAULT_SETTINGS } from '../shared/types';
import { getScenarioFromLocation } from './scenarios';

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
  document.body.dataset.ready = 'false';
  delete document.body.dataset.scenario;

  const scenario = getScenarioFromLocation();
  seedRandom(scenario.seed);

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
    weather: scenario.weather,
    dayPhase: scenario.dayPhase ?? 'day',
    wind: { strength: 0.35, direction: scenario.birdDirection },
    settings: {
      ...DEFAULT_SETTINGS,
      ...scenario.settings,
      birds: scenario.birds === false ? false : (scenario.settings?.birds ?? DEFAULT_SETTINGS.birds),
    },
    devOverrides: scenario.devOverrides,
  });

  renderer.setTransparentBackground(scenario.transparentBackground !== false);

  if (scenario.birds !== false) {
    renderer.getBirdSystem().triggerFlock(scenario.birdDirection);
  }

  const simFrames = scenario.lightningFrame ?? scenario.frames;
  for (let i = 0; i < simFrames; i++) {
    renderer.update(1 / 60);
  }

  if (scenario.lightningFrame !== undefined) {
    renderer.getLightningSystem().triggerLightning();
    for (let i = 0; i < 8; i++) {
      renderer.update(1 / 60);
    }
  } else {
    for (let i = simFrames; i < scenario.frames; i++) {
      renderer.update(1 / 60);
    }
  }

  renderer.draw();
  document.body.dataset.scenario = scenario.id;
  document.body.dataset.ready = 'true';
}

main();
