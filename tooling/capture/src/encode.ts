import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export interface EncodeOptions {
  /** Seconds of head to drop (passed as ffmpeg -ss before the input). */
  trimStart: number;
  /** Output width in px; height keeps aspect (rounded to even for codec safety). */
  width: number;
  fps: number;
  /** Playback speed multiplier (1 = unchanged). */
  speed: number;
}

function ensureFfmpeg(): void {
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (probe.error || probe.status !== 0) {
    throw new Error(
      "ffmpeg not found. Install it (macOS: brew install ffmpeg), then re-run.",
    );
  }
}

function run(args: string[]): void {
  // Quiet ffmpeg's banner and per-frame progress; surface only real errors.
  const quiet = ["-hide_banner", "-loglevel", "error", "-nostats"];
  const res = spawnSync("ffmpeg", [...quiet, ...args], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (res.status !== 0)
    throw new Error(`ffmpeg failed (exit ${res.status ?? "unknown"}).`);
}

/** The filter shared by both GIF passes and the MP4: optional speedup, frame rate, lanczos downscale. */
function videoFilter(o: EncodeOptions): string {
  const speedup =
    o.speed !== 1 ? `setpts=${(1 / o.speed).toFixed(4)}*PTS,` : "";
  return `${speedup}fps=${o.fps},scale=${o.width}:-2:flags=lanczos`;
}

/**
 * Two-pass palette GIF: generate a palette tuned to this clip, then map frames
 * onto it with dithering. Far smaller and cleaner than a single naive pass. The
 * palette is a throwaway written beside the source video, not into the asset dir.
 */
export function encodeGif(
  input: string,
  output: string,
  o: EncodeOptions,
): void {
  ensureFfmpeg();
  mkdirSync(dirname(output), { recursive: true });
  const palette = join(dirname(input), "palette.png");
  const filter = videoFilter(o);

  run([
    "-y",
    "-ss",
    String(o.trimStart),
    "-i",
    input,
    "-vf",
    `${filter},palettegen=stats_mode=diff`,
    palette,
  ]);
  run([
    "-y",
    "-ss",
    String(o.trimStart),
    "-i",
    input,
    "-i",
    palette,
    "-lavfi",
    `${filter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`,
    output,
  ]);
}

/** H.264 MP4 (yuv420p, faststart): smaller and crisper than a GIF for sites and social embeds. */
export function encodeMp4(
  input: string,
  output: string,
  o: EncodeOptions,
): void {
  ensureFfmpeg();
  mkdirSync(dirname(output), { recursive: true });
  run([
    "-y",
    "-ss",
    String(o.trimStart),
    "-i",
    input,
    "-vf",
    `${videoFilter(o)},format=yuv420p`,
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    "-an",
    output,
  ]);
}
