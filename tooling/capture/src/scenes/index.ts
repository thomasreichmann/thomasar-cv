import type { Scene } from "../scene";
import editorLivePreview from "./editor-live-preview";

/** Every recordable scene. Add a new scene file and list it here. */
export const scenes: Scene[] = [editorLivePreview];

export function findScene(name: string): Scene | undefined {
  return scenes.find((scene) => scene.name === name);
}
