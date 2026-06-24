import { DayPhase, DEFAULT_SETTINGS, DevOverrides, WeatherSettings, WeatherState, WindState, randomRange } from '../shared/types';
import { fillBlock, PIXEL } from '../renderer/pixelArt';
import { CloudSnapshot, pickRandomCloud } from './cloudTypes';
import { WeatherSystem } from './WeatherSystem';

interface Snowflake {
  x: number;
  y: number;
  speed: number;
  drift: number;
  /** Size in pixel blocks (1–2) */
  size: number;
  phase: number;
}



const MAX_FLAKES = 160;
const CLOUD_SPAWN_CHANCE = 0.28;



export class SnowSystem implements WeatherSystem {

  private flakes: Snowflake[] = [];

  private clouds: CloudSnapshot[] = [];

  private width = 0;

  private height = 0;

  private weather: WeatherState = 'sunny';

  private wind: WindState = { strength: 0.5, direction: 1 };

  private devOverrides: DevOverrides = {};

  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };

  private effectStrength = 0;
  private flakeAdjustTimer = 0;
  private fullFlakeCount = 0;



  setCloudSources(clouds: CloudSnapshot[]): void {

    this.clouds = clouds;

  }



  setDevOverrides(overrides: DevOverrides): void {

    this.devOverrides = { ...this.devOverrides, ...overrides };

    this.refreshFullFlakeCount();
    this.syncFlakeCount();

  }

  setEffectStrength(strength: number): void {
    this.effectStrength = Math.max(0, Math.min(1, strength));
    if (this.effectStrength <= 0.001) {
      this.flakes = [];
    }
  }



  setDimensions(width: number, height: number): void {

    this.width = width;

    this.height = height;

    this.refreshFullFlakeCount();
    this.syncFlakeCount();

  }



  onWeatherChange(state: WeatherState): void {

    this.weather = state;
    this.refreshFullFlakeCount();

  }



  onWindChange(wind: WindState): void {

    this.wind = wind;

  }



  onSettingsChange(settings: WeatherSettings): void {

    this.settings = settings;
    this.refreshFullFlakeCount();
    this.syncFlakeCount();

  }



  onDayPhaseChange(_phase: DayPhase): void {}



  update(dt: number, time: number): void {

    if (!this.settings.enabled || this.effectStrength <= 0.001) {

      return;

    }

    this.flakeAdjustTimer += dt;
    if (this.flakeAdjustTimer >= 0.4) {
      this.flakeAdjustTimer = 0;
      this.syncFlakeCount();
    }

    for (const flake of this.flakes) {

      flake.y += flake.speed * dt;

      flake.x +=

        (Math.sin(time * 0.001 + flake.phase) * flake.drift +

          this.wind.direction * this.wind.strength * 20) *

        dt;

      if (flake.y > this.height + 10) {

        this.resetFlake(flake);

      }

      if (flake.x < -10) {

        flake.x = this.width + 10;

      }

      if (flake.x > this.width + 10) {

        flake.x = -10;

      }

    }

  }



  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {

    if (!this.settings.enabled || this.effectStrength <= 0.001) {

      return;

    }



    const intensity = Math.min(1, this.settings.intensity);
    for (const flake of this.flakes) {
      if (!this.isFlakeVisible(flake)) {
        continue;
      }
      const alpha = (0.45 + flake.size * 0.15) * intensity * this.effectStrength;
      fillBlock(ctx, flake.x, flake.y, flake.size, flake.size, '#eef8ff', alpha);
    }
  }

  /** Hide flakes still passing through a cloud's horizontal span */
  private isFlakeVisible(flake: Snowflake): boolean {
    const top = flake.y - flake.size * PIXEL;
    if (this.clouds.length === 0) {
      return true;
    }
    for (const cloud of this.clouds) {
      if (top >= cloud.bottom) {
        continue;
      }
      if (flake.x >= cloud.x && flake.x <= cloud.x + cloud.width && top < cloud.bottom) {
        return false;
      }
    }
    return true;
  }



  private isActive(): boolean {

    return this.weather === 'snow' && this.effectStrength > 0.001;

  }

  private refreshFullFlakeCount(): void {
    const density = this.devOverrides.rainDensity ?? 1;
    this.fullFlakeCount = Math.min(
      MAX_FLAKES,
      Math.floor(randomRange(45, 95) * this.settings.intensity * density * 0.85)
    );
  }

  private syncFlakeCount(): void {
    if (this.effectStrength <= 0.001 || this.width <= 0) {
      this.flakes = [];
      return;
    }

    const target = Math.floor(this.fullFlakeCount * this.effectStrength);
    while (this.flakes.length < target) {
      const flake: Snowflake = { x: 0, y: 0, speed: 0, drift: 0, size: 0, phase: 0 };
      this.resetFlake(flake);
      flake.y = randomRange(-this.height * 0.45, this.height * 0.25);
      this.flakes.push(flake);
    }
    while (this.flakes.length > target) {
      this.flakes.pop();
    }
  }



  private initFlakes(): void {
    this.syncFlakeCount();
  }

  private resetFlake(flake: Snowflake): void {
    flake.speed = randomRange(38, 68);
    flake.drift = randomRange(12, 32);
    flake.size = Math.random() < 0.75 ? 1 : 2;
    flake.phase = randomRange(0, Math.PI * 2);

    const cloud = pickRandomCloud(this.clouds);
    if (cloud && Math.random() < CLOUD_SPAWN_CHANCE) {
      flake.x = randomRange(cloud.x + 4, cloud.x + cloud.width - 4);
      flake.y = cloud.bottom + randomRange(0, 6);
      return;
    }

    flake.x = randomRange(0, this.width);
    flake.y = -randomRange(8, 36);
  }
}


