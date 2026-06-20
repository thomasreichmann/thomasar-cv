"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import type { ResumeContent } from "@thomasar-cv/db/schema";

import type { AppRouter } from "@/server/trpc/routers/_app";
import { useTRPC } from "@/trpc/react";
import { isDirty, validateDraft, type ResumeDraft } from "./editor-state";

/** The loaded résumé, taken from the router so it tracks the API, not a copy. */
type Resume = inferRouterOutputs<AppRouter>["resume"]["get"];

interface EditorContextValue {
  /** The résumé's label (the row's `name`), editable in the toolbar. */
  name: string;
  setName: (name: string) => void;
  /** The whole content document; per-section editors (#37) write into this. */
  content: ResumeContent;
  updateContent: (updater: (prev: ResumeContent) => ResumeContent) => void;
  /** Unsaved edits exist. Drives the save control and the navigation guard. */
  isDirty: boolean;
  isSaving: boolean;
  /** When the document was last persisted; shown as a relative "saved" time. */
  lastSavedAt: Date;
  /** A validation/save problem to surface; cleared on the next edit or save. */
  error: string | null;
  save: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

/**
 * Holds one résumé as editable in-memory state and owns the whole save loop: it
 * is the single seam the section editors (#37), reorder/hide (#38) and preview
 * (#39) plug into, so they never talk to the API directly. State is seeded once
 * from the loaded row; only an explicit save persists it (v0.3 has no autosave).
 */
export function EditorProvider({
  resume,
  children,
}: {
  resume: Resume;
  children: ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Seeded once from the first load. A background refetch must not clobber edits
  // in progress, so these are initialized from `resume` and never reset by it -
  // the saved baseline only moves forward on a successful write.
  const [name, setNameState] = useState(resume.name);
  const [content, setContent] = useState<ResumeContent>(resume.content);
  const [saved, setSaved] = useState<ResumeDraft>(() => ({
    name: resume.name,
    content: resume.content,
  }));
  const [lastSavedAt, setLastSavedAt] = useState(resume.updatedAt);
  const [error, setError] = useState<string | null>(null);

  const dirty = isDirty({ name, content }, saved);

  const setName = useCallback((next: string) => {
    setNameState(next);
    setError(null);
  }, []);

  const updateContent = useCallback(
    (updater: (prev: ResumeContent) => ResumeContent) => {
      setContent(updater);
      setError(null);
    },
    [],
  );

  const update = useMutation(trpc.resume.update.mutationOptions());
  const isSaving = update.isPending;

  const save = useCallback(() => {
    // No-op when clean or mid-save: nothing to persist, and a double-submit would
    // race two writes for the same row.
    if (!dirty || isSaving) return;
    const result = validateDraft({ name, content });
    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    setError(null);
    // `sent` is captured here, not read off the live fields in onSuccess: the save
    // re-baselines to exactly what it persisted, so a keystroke landing mid-save
    // stays dirty instead of being silently dropped.
    const sent = result.value;
    update.mutate(
      { id: resume.id, name: sent.name, content: sent.content },
      {
        onSuccess: (row) => {
          setSaved(sent);
          setLastSavedAt(row.updatedAt);
          // Keep the dashboard list's "Updated …" in step with this write.
          void queryClient.invalidateQueries(trpc.resume.list.queryFilter());
          queryClient.setQueryData(
            trpc.resume.get.queryKey({ id: resume.id }),
            row,
          );
          toast.success("Résumé saved.");
        },
        onError: () => {
          setError("Could not save. Try again.");
          toast.error("Could not save the résumé.");
        },
      },
    );
  }, [dirty, isSaving, name, content, update, queryClient, trpc, resume.id]);

  // Cmd/Ctrl+S saves and suppresses the browser's own save dialog, the reflex an
  // editor trains. Bound on the window so it works wherever focus sits.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  // Last line of defense for unsaved edits: refresh, tab close, or typing a URL
  // bypass any in-app guard, so fall back to the browser's native prompt. In-app
  // navigation away from the editor is guarded at its own exits (the back link).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const value = useMemo<EditorContextValue>(
    () => ({
      name,
      setName,
      content,
      updateContent,
      isDirty: dirty,
      isSaving,
      lastSavedAt,
      error,
      save,
    }),
    [
      name,
      setName,
      content,
      updateContent,
      dirty,
      isSaving,
      lastSavedAt,
      error,
      save,
    ],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

/** Read the editor state. Throws if used outside an `EditorProvider`. */
export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an EditorProvider.");
  }
  return ctx;
}
