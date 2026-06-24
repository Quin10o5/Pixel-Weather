import { WeatherSettings } from '../shared/types';

export interface NormalSettingsBridge {
  updateSetting<K extends keyof WeatherSettings>(key: K, value: WeatherSettings[K]): void;
  openExtensionSettings(): void;
}

function intensityLabel(value: number): string {
  if (value < 0.75) {
    return 'Subtle';
  }
  if (value <= 1.25) {
    return 'Balanced';
  }
  return 'Vivid';
}

export class NormalControls {
  constructor(private bridge: NormalSettingsBridge) {
    this.bindControls();
  }

  sync(settings: WeatherSettings): void {
    this.setChecked('chk-enabled', settings.enabled);
    this.setChecked('chk-birds', settings.birds);
    this.setChecked('chk-day-night', settings.dayNight);
    this.setChecked('chk-lightning', settings.lightning);

    const slider = document.getElementById('slider-strength') as HTMLInputElement | null;
    const label = document.getElementById('val-strength');
    if (slider) {
      slider.value = String(settings.intensity);
    }
    if (label) {
      label.textContent = intensityLabel(settings.intensity);
    }
  }

  private bindControls(): void {
    this.bindCheckbox('chk-enabled', 'enabled');
    this.bindCheckbox('chk-birds', 'birds');
    this.bindCheckbox('chk-day-night', 'dayNight');
    this.bindCheckbox('chk-lightning', 'lightning');

    const slider = document.getElementById('slider-strength') as HTMLInputElement | null;
    const label = document.getElementById('val-strength');
    slider?.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      if (label) {
        label.textContent = intensityLabel(value);
      }
      this.bridge.updateSetting('intensity', value);
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.bridge.openExtensionSettings();
    });
  }

  private bindCheckbox(id: string, key: keyof WeatherSettings): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.addEventListener('change', () => {
      this.bridge.updateSetting(key, input.checked as WeatherSettings[typeof key]);
    });
  }

  private setChecked(id: string, checked: boolean): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.checked = checked;
    }
  }
}
