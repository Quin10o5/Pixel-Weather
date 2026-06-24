import {
  DayPhase,
  WeatherSettings,
  WeatherState,
  WindState,
} from '../shared/types';

export interface WeatherSystem {
  update(dt: number, time: number): void;
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  onWeatherChange(state: WeatherState): void;
  onWindChange(wind: WindState): void;
  onSettingsChange(settings: WeatherSettings): void;
  onDayPhaseChange(phase: DayPhase): void;
  setDimensions(width: number, height: number): void;
  /** 0–1 blend strength for gradual weather transitions (optional). */
  setEffectStrength?(strength: number): void;
}
