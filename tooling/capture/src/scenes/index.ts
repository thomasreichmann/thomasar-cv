import type { Scene } from "../scene";
import dashboard from "./dashboard";
import editorLivePreview from "./editor-live-preview";
import previewPdf from "./preview-pdf";

/** Every recordable scene. Add a new scene file and list it here. */
export const scenes: Scene[] = [editorLivePreview, dashboard, previewPdf];

export function findScene(name: string): Scene | undefined {
  return scenes.find((scene) => scene.name === name);
}
