import { DayPhase, DEFAULT_SETTINGS, DevOverrides, WeatherSettings, WeatherState, WindState } from '../shared/types';
import { fillBlock, PIXEL, snap } from '../renderer/pixelArt';
import { CloudSnapshot, pickRandomCloud } from './cloudTypes';
import { CloudSystem } from './CloudSystem';
import { WeatherSystem } from './WeatherSystem';

const FLASH_SEQUENCE = [0.35, 0, 0.75, 0];
const FLASH_FRAME_DURATION = 0.045;

export class LightningSystem implements WeatherSystem {
  private weather: WeatherState = 'sunny';
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private width = 0;
  private height = 0;
  private flashAlpha = 0;
  private flashFrame = -1;
  private flashFrameTimer = 0;
  private nextFlashTime = 0;
  private elapsed = 0;
  private manualFlash = false;
  private boltOriginX = 0;
  private boltOriginY = 0;
  private boltSegments: [number, number, number, number][] = [];
  private cloudProvider: CloudSystem | null = null;
  private effectStrength = 0;

  setCloudProvider(clouds: CloudSystem): void {
    this.cloudProvider = clouds;
  }

  setDevOverrides(_overrides: DevOverrides): void {}

  setEffectStrength(strength: number): void {
    this.effectStrength = Math.max(0, Math.min(1, strength));
    if (this.effectStrength <= 0.001 && !this.manualFlash) {
      this.flashAlpha = 0;
      this.flashFrame = -1;
    }
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scheduleNextFlash();
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
    if (this.isActive()) {
      this.scheduleNextFlash();
      this.elapsed = this.nextFlashTime;
    } else if (!this.manualFlash) {
      this.flashAlpha = 0;
      this.flashFrame = -1;
    }
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  triggerLightning(): void {
    if (!this.settings.lightning) {
      return;
    }
    this.manualFlash = true;
    this.pickBoltFromCloud();
    this.startFlash();
  }

  update(dt: number, _time: number): void {
    if (!this.settings.enabled || !this.settings.lightning) {
      this.flashAlpha = 0;
      return;
    }

    const active = (this.isActive() && this.effectStrength > 0.001) || this.manualFlash;
    if (!active) {
      this.flashAlpha = 0;
      return;
    }

    if (this.flashFrame >= 0) {
      this.flashFrameTimer += dt;
      while (this.flashFrameTimer >= FLASH_FRAME_DURATION && this.flashFrame >= 0) {
        this.flashFrameTimer -= FLASH_FRAME_DURATION;
        this.flashAlpha = FLASH_SEQUENCE[this.flashFrame] ?? 0;
        this.flashFrame++;
        if (this.flashFrame >= FLASH_SEQUENCE.length) {
          this.endFlash();
        }
      }
      return;
    }

    this.elapsed += dt;
    if (this.isActive() && this.effectStrength > 0.001 && this.elapsed >= this.nextFlashTime) {
      this.pickBoltFromCloud();
      this.startFlash();
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const w = width || this.width;
    const h = height || this.height;
    if (this.flashAlpha <= 0) {
      return;
    }

    const intensity = this.flashAlpha * Math.min(1, this.settings.intensity) * (this.manualFlash ? 1 : this.effectStrength);
    const flashH = snap(h);
    const flashW = snap(w);

    for (let y = 0; y < flashH; y += PIXEL) {
      for (let x = 0; x < flashW; x += PIXEL) {
        const checker = ((x / PIXEL) + (y / PIXEL)) % 2 === 0;
        if (checker) {
          fillBlock(ctx, x, y, 1, 1, '#ffffff', intensity * 0.35);
        }
      }
    }

    const boltAlpha = Math.min(1, intensity * 1.4);
    const originX = snap(this.boltOriginX);
    const originY = snap(this.boltOriginY);
    for (const [dx, dy, bw, bh] of this.boltSegments) {
      fillBlock(ctx, originX + dx * PIXEL, originY + dy * PIXEL, bw, bh, '#ffffa8', boltAlpha);
      fillBlock(ctx, originX + dx * PIXEL + PIXEL, originY + dy * PIXEL, 1, bh, '#fff8d0', boltAlpha * 0.6);
    }
  }

  private pickBoltFromCloud(): void {
    const clouds = this.cloudProvider?.getSnapshots() ?? [];
    const cloud = pickRandomCloud(clouds);
    if (cloud) {
      this.boltOriginX = cloud.centerX + (Math.random() - 0.5) * PIXEL * 2;
      this.boltOriginY = cloud.bottom - PIXEL;
      this.boltSegments = this.buildBoltSegments(cloud);
      return;
    }
    this.boltOriginX = this.width * 0.4;
    this.boltOriginY = PIXEL * 4;
    this.boltSegments = this.buildBoltSegments();
  }

  private buildBoltSegments(cloud?: CloudSnapshot): [number, number, number, number][] {
    const targetY = snap(Math.max(this.height - PIXEL * 2, (cloud?.bottom ?? PIXEL * 4) + PIXEL * 10));
    const startY = 0;
    const totalBlocks = Math.max(4, Math.floor((targetY - (cloud?.bottom ?? 0)) / PIXEL));
    const segments: [number, number, number, number][] = [];
    let dx = 0;
    let dy = startY;
    const steps = Math.min(totalBlocks, 14);
    for (let i = 0; i < steps; i++) {
      const zig = i % 3 === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      dx += zig;
      segments.push([dx, dy, 1, 2]);
      dy += 2;
    }
    return segments;
  }

  private startFlash(): void {
    this.flashFrame = 0;
    this.flashFrameTimer = 0;
    this.flashAlpha = FLASH_SEQUENCE[0];
    this.elapsed = 0;
  }

  private endFlash(): void {
    this.flashFrame = -1;
    this.flashAlpha = 0;
    this.manualFlash = false;
    if (this.isActive()) {
      this.scheduleNextFlash();
    }
  }

  private isActive(): boolean {
    return this.weather === 'thunderstorm';
  }

  private scheduleNextFlash(): void {
    this.nextFlashTime = 6 + Math.random() * 12;
    this.elapsed = 0;
  }
}
