import type { Db, DevUser } from "./db";
import type { Stage } from "./stage";

/** What a scene's `setup` receives: a DB handle, the dev account, the resolved base URL, and the common showcase-résumé helper. */
export interface SceneContext {
  db: Db;
  devUser: DevUser;
  baseUrl: string;
  /** Idempotently seed the fully-populated showcase résumé on the dev account; returns its id. */
  seedShowcaseResume: () => Promise<string>;
}

export interface OutputOptions {
  /** Encode a GIF (default true). */
  gif?: boolean;
  /** Also encode an MP4 (default false) - smaller and crisper for sites and social. */
  mp4?: boolean;
  /** Output width in px; height follows aspect (default 1000). */
  width?: number;
  /** Frames per second (default 15). */
  fps?: number;
  /** Playback speed multiplier (default 1; >1 plays faster). */
  speed?: number;
}

/** The authored shape of a scene; `T` is whatever `setup` returns and `record` consumes. */
export interface SceneDefinition<T> {
  name: string;
  description: string;
  /** Recording viewport. The editor needs >=1280 wide for its two-column layout. */
  viewport?: { width: number; height: number };
  output?: OutputOptions;
  /** Prepare state before recording (e.g. seed a résumé). Runs before the browser opens, so its time is never in the video. */
  setup?: (ctx: SceneContext) => Promise<T>;
  /** Drive the scripted interaction. The load + first settle is auto-trimmed up to just before the first action. */
  record: (stage: Stage, data: T) => Promise<void>;
}

/** The type-erased scene the registry and runner pass around. */
export interface Scene {
  name: string;
  description: string;
  viewport?: { width: number; height: number };
  output?: OutputOptions;
  setup: (ctx: SceneContext) => Promise<unknown>;
  record: (stage: Stage, data: unknown) => Promise<void>;
}

export function defineScene<T>(def: SceneDefinition<T>): Scene {
  // The name becomes a filename and path segment (docs/assets/<name>.gif, the
  // .tmp dirs); keep it kebab-case so it can never escape its directory.
  if (!/^[a-z0-9-]+$/.test(def.name)) {
    throw new Error(`Scene name must be kebab-case [a-z0-9-]; got "${def.name}".`);
  }
  return {
    name: def.name,
    description: def.description,
    viewport: def.viewport,
    output: def.output,
    setup: def.setup ?? (async (): Promise<T> => undefined as T),
    // The value `record` gets is exactly what this scene's `setup` returned; the
    // registry just can't carry the per-scene type, so re-narrow it here. Sound
    // by construction because both come from the same defineScene call.
    record: (stage, data) => def.record(stage, data as T),
  };
}
