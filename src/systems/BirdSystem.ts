import { DayPhase, DEFAULT_SETTINGS, WeatherSettings, WeatherState, WindState, randomInt, randomRange } from '../shared/types';
import { fillBlock, PIXEL, snap } from '../renderer/pixelArt';
import { WeatherSystem } from './WeatherSystem';

interface Bird {
  x: number;
  y: number;
  speed: number;
  bobPhase: number;
  wingPhase: number;
}

interface Flock {
  birds: Bird[];
  direction: number;
}

const BIRD_WEATHER: WeatherState[] = ['sunny', 'cloudy', 'rain'];

export class BirdSystem implements WeatherSystem {
  private flock: Flock | null = null;
  private width = 0;
  private height = 0;
  private weather: WeatherState = 'sunny';
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private wind: WindState = { strength: 0.5, direction: 1 };
  private spawnTimer = 0;
  private nextSpawn = 0;

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scheduleSpawn();
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
    if (!this.canAutoSpawn() && this.flock) {
      this.flock = null;
    }
  }

  onWindChange(wind: WindState): void {
    this.wind = wind;
  }

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  triggerFlock(direction?: number): void {
    if (!this.settings.enabled || !this.settings.birds || this.width <= 0) {
      return;
    }
    this.spawnFlock(direction);
    this.spawnTimer = 0;
    this.scheduleSpawn();
  }

  update(dt: number, time: number): void {
    if (!this.settings.enabled || !this.settings.birds) {
      return;
    }

    if (!this.flock) {
      if (!this.canAutoSpawn()) {
        return;
      }
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawn) {
        this.spawnFlock();
        this.spawnTimer = 0;
        this.scheduleSpawn();
      }
      return;
    }

    const windMul = 1 + this.wind.strength * 0.3;
    let allOffscreen = true;
    for (const bird of this.flock.birds) {
      bird.x += bird.speed * this.flock.direction * windMul * dt;
      bird.y += Math.sin(time * 0.003 + bird.bobPhase) * 12 * dt;
      bird.wingPhase += dt * 8;
      if (bird.x > -40 && bird.x < this.width + 40) {
        allOffscreen = false;
      }
    }
    if (allOffscreen) {
      this.flock = null;
    }
  }

  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    if (!this.settings.enabled || !this.settings.birds || !this.flock) {
      return;
    }

    const intensity = Math.min(1, this.settings.intensity);
    const color = '#6a7588';

    for (const bird of this.flock.birds) {
      this.drawBird(ctx, bird, this.flock.direction, color, intensity);
    }
  }

  private drawBird(
    ctx: CanvasRenderingContext2D,
    bird: Bird,
    direction: number,
    color: string,
    intensity: number
  ): void {
    const flap = Math.sin(bird.wingPhase);
    const cx = snap(bird.x);
    const cy = snap(bird.y);
    const wingLift = flap > 0 ? 0 : 1;
    const alpha = 0.85 * intensity;
    const dir = direction >= 0 ? 1 : -1;

    fillBlock(ctx, cx, cy, 1, 1, color, alpha);
    fillBlock(ctx, cx - dir * PIXEL, cy + wingLift * PIXEL, 1, 1, color, alpha);
    fillBlock(ctx, cx - dir * PIXEL * 2, cy + (wingLift + 1) * PIXEL, 1, 1, color, alpha);
    fillBlock(ctx, cx + dir * PIXEL, cy + wingLift * PIXEL, 1, 1, color, alpha);
    fillBlock(ctx, cx + dir * PIXEL * 2, cy + (wingLift + 1) * PIXEL, 1, 1, color, alpha);
  }

  private canAutoSpawn(): boolean {
    return BIRD_WEATHER.includes(this.weather);
  }

  private scheduleSpawn(): void {
    this.nextSpawn = randomRange(45, 120);
  }

  private spawnFlock(forcedDirection?: number): void {
    const count = randomInt(3, 6);
    const direction = forcedDirection ?? (Math.random() < 0.5 ? 1 : -1);
    const startX = direction > 0 ? -36 : this.width + 36;
    const baseY = randomRange(this.height * 0.12, this.height * 0.42);
    const birds: Bird[] = [];

    for (let i = 0; i < count; i++) {
      birds.push({
        x: startX + i * randomRange(14, 22) * -direction,
        y: baseY + randomRange(-12, 12),
        speed: randomRange(45, 75),
        bobPhase: randomRange(0, Math.PI * 2),
        wingPhase: randomRange(0, Math.PI * 2),
      });
    }

    this.flock = { birds, direction };
  }
}
