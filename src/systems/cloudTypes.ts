import { PIXEL } from '../renderer/pixelArt';

export interface CloudSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  bottom: number;
  centerX: number;
}

export function pickRandomCloud(clouds: CloudSnapshot[]): CloudSnapshot | undefined {
  if (clouds.length === 0) {
    return undefined;
  }
  return clouds[Math.floor(Math.random() * clouds.length)];
}

export { PIXEL };
