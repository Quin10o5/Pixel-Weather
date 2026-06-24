import {
  DayPhase,
  DevOverrides,
  DEFAULT_SETTINGS,
  HostMessage,
  mapWeatherForSeason,
  resolveDate,
  WeatherSettings,
  WeatherState,
  WindState,
} from '../shared/types';
import { WeatherSystem } from '../systems/WeatherSystem';
import { CloudSystem } from '../systems/CloudSystem';
import { SunSystem } from '../systems/SunSystem';
import { RainSystem } from '../systems/RainSystem';
import { SnowSystem } from '../systems/SnowSystem';
import { LightningSystem } from '../systems/LightningSystem';
import { BirdSystem } from '../systems/BirdSystem';
import { configurePixelCanvas } from './pixelArt';
import {
  WEATHER_TRANSITION_SEC,
  blendCelestialAlpha,
  blendCloudPresence,
  blendLightningPresence,
  blendRainPresence,
  blendSnowPresence,
} from '../shared/weatherTransition';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private readonly sunSystem = new SunSystem();
  private readonly cloudSystem = new CloudSystem();
  private readonly rainSystem = new RainSystem();
  private readonly snowSystem = new SnowSystem();
  private readonly lightningSystem = new LightningSystem();
  private readonly birdSystem = new BirdSystem();
  private systems: WeatherSystem[];
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private devOverrides: DevOverrides = {};
  private rawWeather: WeatherState = 'sunny';
  private displayWeather: WeatherState = 'sunny';
  private transitionFrom: WeatherState = 'sunny';
  private transitionTo: WeatherState = 'sunny';
  private transitionProgress = 1;
  private width = 0;
  private height = 0;
  private time = 0;
  private visible = true;
  private cachedBg = '#1e1e1e';
  private bgCacheAt = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    configurePixelCanvas(this.ctx);

    this.systems = [
      this.sunSystem,
      this.rainSystem,
      this.snowSystem,
      this.cloudSystem,
      this.lightningSystem,
      this.birdSystem,
    ];
    this.lightningSystem.setCloudProvider(this.cloudSystem);
  }

  getBirdSystem(): BirdSystem {
    return this.birdSystem;
  }

  getLightningSystem(): LightningSystem {
    return this.lightningSystem;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    configurePixelCanvas(this.ctx);
    for (const system of this.systems) {
      system.setDimensions(width, height);
    }
  }

  handleMessage(msg: HostMessage): void {
    switch (msg.type) {
      case 'init':
        if (msg.weather) this.setWeather(msg.weather, true);
        if (msg.dayPhase) this.setDayPhase(msg.dayPhase);
        if (msg.wind) this.setWind(msg.wind);
        if (msg.settings) this.setSettings(msg.settings);
        if (msg.devOverrides) this.setDevOverrides(msg.devOverrides);
        break;
      case 'weather':
        if (msg.weather) this.setWeather(msg.weather);
        break;
      case 'wind':
        if (msg.wind) this.setWind(msg.wind);
        break;
      case 'dayPhase':
        if (msg.dayPhase) this.setDayPhase(msg.dayPhase);
        break;
      case 'settings':
        if (msg.settings) this.setSettings(msg.settings);
        break;
      case 'devOverrides':
        if (msg.devOverrides) this.setDevOverrides(msg.devOverrides);
        break;
      case 'visibility':
        this.visible = msg.visible ?? true;
        break;
      case 'triggerLightning':
        this.lightningSystem.triggerLightning();
        break;
      case 'triggerBirds':
        this.birdSystem.triggerFlock();
        break;
    }
  }

  setDevOverrides(overrides: DevOverrides): void {
    this.devOverrides = { ...this.devOverrides, ...overrides };
    this.applyDevOverrides();
    this.applyDisplayWeather();
  }

  update(dt: number): void {
    if (!this.settings.enabled || !this.visible) {
      return;
    }

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(
        1,
        this.transitionProgress + dt / WEATHER_TRANSITION_SEC
      );
      this.applyTransitionStrengths();
      if (this.transitionProgress >= 1) {
        this.displayWeather = this.transitionTo;
      }
    }

    this.time += dt * 1000;
    this.cloudSystem.update(dt, this.time);
    const cloudSnapshots = this.cloudSystem.getSnapshots();
    this.rainSystem.setCloudSources(cloudSnapshots);
    this.snowSystem.setCloudSources(cloudSnapshots);
    this.sunSystem.update(dt, this.time);
    this.rainSystem.update(dt, this.time);
    this.snowSystem.update(dt, this.time);
    this.lightningSystem.update(dt, this.time);
    this.birdSystem.update(dt, this.time);
  }

  draw(): void {
    const bg = this.getEditorBackground();
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (!this.settings.enabled) {
      return;
    }

    for (const system of this.systems) {
      system.draw(this.ctx, this.width, this.height);
    }
  }

  private getEditorBackground(): string {
    const now = performance.now();
    if (now - this.bgCacheAt > 2000) {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--vscode-editor-background')
        .trim();
      this.cachedBg = value || '#1e1e1e';
      this.bgCacheAt = now;
    }
    return this.cachedBg;
  }

  private applyDevOverrides(): void {
    const merged: WeatherSettings = {
      ...this.settings,
      intensity: this.devOverrides.intensity ?? this.settings.intensity,
    };
    const wind: WindState = {
      strength: this.devOverrides.windStrength ?? 0.5,
      direction: this.devOverrides.windDirection ?? 1,
    };
    for (const system of this.systems) {
      system.onSettingsChange(merged);
      system.onWindChange(wind);
    }
    this.cloudSystem.setDevOverrides(this.devOverrides);
    this.rainSystem.setDevOverrides(this.devOverrides);
    this.snowSystem.setDevOverrides(this.devOverrides);
    this.lightningSystem.setDevOverrides(this.devOverrides);
    this.sunSystem.setDevOverrides(this.devOverrides);
  }

  private setWeather(state: WeatherState, immediate = false): void {
    this.rawWeather = state;
    const nextDisplay = this.resolveDisplayWeather(state);
    if (immediate) {
      this.transitionFrom = nextDisplay;
      this.transitionTo = nextDisplay;
      this.displayWeather = nextDisplay;
      this.transitionProgress = 1;
      for (const system of this.systems) {
        system.onWeatherChange(nextDisplay);
      }
      this.applyTransitionStrengths();
      return;
    }
    this.beginDisplayTransition(nextDisplay);
  }

  private beginDisplayTransition(nextDisplay: WeatherState): void {
    if (nextDisplay === this.displayWeather && this.transitionProgress >= 1) {
      return;
    }

    if (this.transitionProgress >= 1) {
      this.transitionFrom = this.displayWeather;
    } else {
      this.transitionFrom = this.transitionTo;
    }

    this.transitionTo = nextDisplay;
    this.displayWeather = nextDisplay;
    this.transitionProgress = 0;

    for (const system of this.systems) {
      system.onWeatherChange(nextDisplay);
    }
    this.applyTransitionStrengths();
  }

  private resolveDisplayWeather(state: WeatherState = this.rawWeather): WeatherState {
    const date = resolveDate(
      new Date(),
      this.devOverrides.dateOverrideDayOfYear,
      this.devOverrides.useDateOverride
    );
    return mapWeatherForSeason(state, date, this.settings.snowSeason);
  }

  private applyTransitionStrengths(): void {
    const t = this.transitionProgress;
    const from = this.transitionFrom;
    const to = this.transitionTo;

    this.cloudSystem.setEffectStrength(blendCloudPresence(from, to, t));
    this.rainSystem.setEffectStrength(blendRainPresence(from, to, t));
    this.snowSystem.setEffectStrength(blendSnowPresence(from, to, t));
    this.lightningSystem.setEffectStrength(blendLightningPresence(from, to, t));
    this.sunSystem.setEffectStrength(blendCelestialAlpha(from, to, t));
  }

  private applyDisplayWeather(): void {
    this.beginDisplayTransition(this.resolveDisplayWeather());
  }

  private setWind(wind: WindState): void {
    const merged: WindState = {
      strength: this.devOverrides.windStrength ?? wind.strength,
      direction: this.devOverrides.windDirection ?? wind.direction,
    };
    for (const system of this.systems) {
      system.onWindChange(merged);
    }
  }

  private setDayPhase(phase: DayPhase): void {
    for (const system of this.systems) {
      system.onDayPhaseChange(phase);
    }
  }

  private setSettings(settings: WeatherSettings): void {
    this.settings = settings;
    for (const system of this.systems) {
      system.onSettingsChange({
        ...settings,
        intensity: this.devOverrides.intensity ?? settings.intensity,
      });
    }
  }
}
