import { useSyncExternalStore } from "react";
import { RestTimerState } from "../types";
import { getRestTimerState, subscribeRestTimer } from "../services/restTimerService";

/** Live state of the global rest timer; re-renders only when it changes. */
export function useRestTimer(): RestTimerState {
  return useSyncExternalStore(subscribeRestTimer, getRestTimerState, getRestTimerState);
}
