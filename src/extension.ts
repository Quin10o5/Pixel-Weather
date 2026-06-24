import * as vscode from 'vscode';

import { WeatherManager } from './WeatherManager';
import { WeatherWebviewProvider } from './WeatherWebviewProvider';
import { openExtensionSettings, readSettings, setUiMode } from './settings';
import { WeatherState } from './shared/types';

let weatherManager: WeatherManager | undefined;
let webviewProvider: WeatherWebviewProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
  weatherManager = new WeatherManager();
  webviewProvider = new WeatherWebviewProvider(context.extensionUri, weatherManager);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WeatherWebviewProvider.viewType, webviewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    weatherManager,
    vscode.commands.registerCommand('weather.show', async () => {
      await vscode.commands.executeCommand('workbench.action.positionPanelTop');
      await vscode.commands.executeCommand('workbench.view.extension.weather');
    }),
    vscode.commands.registerCommand('weather.openSettings', () => {
      void openExtensionSettings();
    }),
    vscode.commands.registerCommand('weather.cycleNow', () => {
      weatherManager?.cycleNow();
    }),
    vscode.commands.registerCommand('weather.settings.toggle', () => {
      webviewProvider?.postMessage({ type: 'toggleSettingsMenu' });
    }),
    vscode.commands.registerCommand('weather.mode.normal', async () => {
      await setUiMode('normal');
    }),
    vscode.commands.registerCommand('weather.mode.dev', async () => {
      await setUiMode('dev');
    }),
    vscode.commands.registerCommand('weather.dev.flash', () => {
      webviewProvider?.postMessage({ type: 'triggerLightning' });
    }),
    vscode.commands.registerCommand('weather.dev.birds', () => {
      webviewProvider?.postMessage({ type: 'triggerBirds' });
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('weather')) {
        weatherManager?.onSettingsChanged(readSettings());
      }
    })
  );

  const weatherCommands: [string, WeatherState][] = [
    ['weather.dev.sunny', 'sunny'],
    ['weather.dev.cloudy', 'cloudy'],
    ['weather.dev.rain', 'rain'],
    ['weather.dev.thunder', 'thunderstorm'],
  ];

  for (const [command, state] of weatherCommands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, () => {
        weatherManager?.setWeather(state);
      })
    );
  }

  const settings = readSettings();
  if (settings.enabled && settings.showOnStartup) {
    setTimeout(async () => {
      await vscode.commands.executeCommand('workbench.action.positionPanelTop');
      await vscode.commands.executeCommand('workbench.view.extension.weather');
    }, 1500);
  }
}

export function deactivate(): void {
  weatherManager?.dispose();
  weatherManager = undefined;
  webviewProvider = undefined;
}
