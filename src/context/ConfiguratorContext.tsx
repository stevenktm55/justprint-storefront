"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  configuratorReducer,
  createInitialState,
  type ConfiguratorAction,
} from "@/context/configuratorReducer";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import type { ConfiguratorState } from "@/types/configurator";

interface ConfiguratorContextValue {
  state: ConfiguratorState;
  dispatch: Dispatch<ConfiguratorAction>;
  goNext: () => void;
  goPrev: () => void;
  resetConfiguration: () => void;
  dismissRestoreNotice: () => void;
  dismissIncompatibleDraftNotice: () => void;
  isHydrated: boolean;
}

const ConfiguratorContext = createContext<ConfiguratorContextValue | null>(
  null,
);

function subscribeToNothing(): () => void {
  return () => undefined;
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function ConfiguratorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    configuratorReducer,
    undefined,
    createInitialState,
  );
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );
  const didRestoreRef = useRef(false);
  const skipNextPersistRef = useRef(true);

  useEffect(() => {
    if (!isHydrated || didRestoreRef.current) return;
    didRestoreRef.current = true;

    const result = loadDraft();
    if (result.status === "restored") {
      skipNextPersistRef.current = true;
      dispatch({ type: "HYDRATE_DRAFT", payload: result.state });
    } else if (result.status === "incompatible_reset") {
      skipNextPersistRef.current = true;
      dispatch({ type: "INCOMPATIBLE_DRAFT_RESET" });
    } else {
      skipNextPersistRef.current = false;
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !didRestoreRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    saveDraft(state);
  }, [isHydrated, state]);

  const goNext = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const goPrev = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const resetConfiguration = useCallback(() => {
    // Local draft only — never deletes the remote JustPrint configuration.
    clearDraft();
    skipNextPersistRef.current = true;
    dispatch({ type: "RESET" });
  }, []);

  const dismissRestoreNotice = useCallback(() => {
    dispatch({ type: "DISMISS_RESTORE_NOTICE" });
  }, []);

  const dismissIncompatibleDraftNotice = useCallback(() => {
    dispatch({ type: "DISMISS_INCOMPATIBLE_DRAFT_NOTICE" });
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      goNext,
      goPrev,
      resetConfiguration,
      dismissRestoreNotice,
      dismissIncompatibleDraftNotice,
      isHydrated,
    }),
    [
      state,
      goNext,
      goPrev,
      resetConfiguration,
      dismissRestoreNotice,
      dismissIncompatibleDraftNotice,
      isHydrated,
    ],
  );

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

export function useConfigurator(): ConfiguratorContextValue {
  const context = useContext(ConfiguratorContext);
  if (!context) {
    throw new Error(
      "useConfigurator must be used within a ConfiguratorProvider",
    );
  }
  return context;
}
