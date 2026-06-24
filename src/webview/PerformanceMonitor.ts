export interface BenchmarkResult {
  durationSec: number;
  avgFps: number;
  minFps: number;
  avgFrameMs: number;
  maxFrameMs: number;
  avgUpdateMs: number;
  avgDrawMs: number;
}

export class PerformanceMonitor {
  private frames = 0;
  private fps = 0;
  private lastFpsTime = performance.now();
  private avgFrameMs = 0;
  private lastUpdateMs = 0;
  private lastDrawMs = 0;
  private readonly smooth = 0.88;
  visible = false;

  private benchmarking = false;
  private benchFrames = 0;
  private benchFpsSum = 0;
  private benchFpsSamples = 0;
  private benchMinFps = Infinity;
  private benchFrameMsSum = 0;
  private benchMaxFrameMs = 0;
  private benchUpdateMsSum = 0;
  private benchDrawMsSum = 0;
  private benchStart = 0;

  recordFrame(updateMs: number, drawMs: number, now = performance.now()): void {
    const frameMs = updateMs + drawMs;
    this.lastUpdateMs = updateMs;
    this.lastDrawMs = drawMs;
    this.avgFrameMs = this.avgFrameMs * this.smooth + frameMs * (1 - this.smooth);

    this.frames++;
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frames;
      if (this.benchmarking) {
        this.benchFpsSum += this.frames;
        this.benchFpsSamples++;
        this.benchMinFps = Math.min(this.benchMinFps, this.frames);
      }
      this.frames = 0;
      this.lastFpsTime = now;
    }

    if (this.benchmarking) {
      this.benchFrames++;
      this.benchFrameMsSum += frameMs;
      this.benchMaxFrameMs = Math.max(this.benchMaxFrameMs, frameMs);
      this.benchUpdateMsSum += updateMs;
      this.benchDrawMsSum += drawMs;
    }
  }

  startBenchmark(): void {
    this.benchmarking = true;
    this.benchFrames = 0;
    this.benchFpsSum = 0;
    this.benchFpsSamples = 0;
    this.benchMinFps = Infinity;
    this.benchFrameMsSum = 0;
    this.benchMaxFrameMs = 0;
    this.benchUpdateMsSum = 0;
    this.benchDrawMsSum = 0;
    this.benchStart = performance.now();
    this.frames = 0;
    this.lastFpsTime = performance.now();
  }

  stopBenchmark(): BenchmarkResult {
    this.benchmarking = false;
    const durationSec = (performance.now() - this.benchStart) / 1000;
    const avgFps =
      this.benchFpsSamples > 0 ? this.benchFpsSum / this.benchFpsSamples : this.fps;
    return {
      durationSec,
      avgFps,
      minFps: this.benchMinFps === Infinity ? avgFps : this.benchMinFps,
      avgFrameMs: this.benchFrames > 0 ? this.benchFrameMsSum / this.benchFrames : 0,
      maxFrameMs: this.benchMaxFrameMs,
      avgUpdateMs: this.benchFrames > 0 ? this.benchUpdateMsSum / this.benchFrames : 0,
      avgDrawMs: this.benchFrames > 0 ? this.benchDrawMsSum / this.benchFrames : 0,
    };
  }

  getOverlayText(): string {
    const line1 = `FPS ${this.fps} · ${this.avgFrameMs.toFixed(1)}ms/frame`;
    const line2 = `update ${this.lastUpdateMs.toFixed(1)}ms · draw ${this.lastDrawMs.toFixed(1)}ms`;
    return `${line1}\n${line2}`;
  }

  formatBenchmark(result: BenchmarkResult): string {
    return [
      `Benchmark (${result.durationSec.toFixed(1)}s)`,
      `avg ${result.avgFps.toFixed(0)} fps · min ${result.minFps.toFixed(0)} fps`,
      `${result.avgFrameMs.toFixed(1)}ms avg · ${result.maxFrameMs.toFixed(1)}ms max`,
      `update ${result.avgUpdateMs.toFixed(1)}ms · draw ${result.avgDrawMs.toFixed(1)}ms`,
    ].join('\n');
  }
}
