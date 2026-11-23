'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BridgeEvent, FiveMBridgeState, FiveMCommand, UnitTelemetry } from './types';

const FAST_POLL_MS = 3000; // bridge enabled
const SLOW_POLL_MS = 30000; // bridge disabled (FIVEM_API_KEY not set): just check now and then

const EMPTY: FiveMBridgeState = {
  enabled: false,
  connected: false,
  protocolVersion: 1,
  server: {},
  aop: null,
  telemetry: {},
  pending: [],
  events: [],
  cursor: 0,
};

/**
 * Polls /api/fivem/state and hands new game events to `onEvent`.
 *
 * - The first poll only picks up the cursor, so a CAD that opens mid-shift
 *   doesn't replay old panics or status changes.
 * - `onEvent` is read through a ref, so callers can pass an inline function.
 */
export function useFiveMBridge({
  active,
  paused = false,
  onEvent,
}: {
  /** Poll at all (e.g. only once a CAD role is open). */
  active: boolean;
  /** Skip polls without losing events; they are delivered once unpaused. */
  paused?: boolean;
  onEvent?: (e: BridgeEvent['event']) => void;
}) {
  const [state, setState] = useState<FiveMBridgeState>(EMPTY);
  const cursorRef = useRef<number | null>(null);
  const lastJsonRef = useRef('');
  const enabledRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (pausedRef.current) {
        timer = setTimeout(poll, 1000);
        return;
      }
      let enabled = enabledRef.current;
      try {
        const qs = cursorRef.current === null ? '' : `?since=${cursorRef.current}`;
        const res = await fetch(`/api/fivem/state${qs}`, { cache: 'no-store' });
        if (res.ok) {
          const next: FiveMBridgeState = await res.json();
          enabled = enabledRef.current = next.enabled;
          if (!cancelled) {
            // Server restarted and its sequence reset: resync without replaying.
            if (cursorRef.current !== null && next.cursor < cursorRef.current) {
              cursorRef.current = next.cursor;
            } else {
              if (cursorRef.current !== null) next.events.forEach(e => onEventRef.current?.(e.event));
              cursorRef.current = next.cursor;
            }
            // Only re-render the CAD when something actually changed
            const { events: _events, ...visible } = next;
            const json = JSON.stringify(visible);
            if (json !== lastJsonRef.current) {
              lastJsonRef.current = json;
              setState(next);
            }
          }
        }
      } catch {
        // Network blip; try again next tick.
      }
      if (!cancelled) timer = setTimeout(poll, enabled ? FAST_POLL_MS : SLOW_POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active]);

  /** Queue a command for the game server. Silently does nothing when the bridge is off. */
  const send = useCallback(
    (command: FiveMCommand) => {
      if (!state.enabled) return;
      fetch('/api/fivem/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', command }),
      }).catch(() => {});
    },
    [state.enabled]
  );

  /** Dismiss a pending 911/panic alert for every dispatcher. */
  const acknowledge = useCallback((id: string) => {
    setState(s => ({ ...s, pending: s.pending.filter(p => p.id !== id) }));
    fetch('/api/fivem/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ack', id }),
    }).catch(() => {});
  }, []);

  /** Live telemetry for a CAD unit, matched by callsign. */
  const telemetryFor = useCallback(
    (callsign?: string): UnitTelemetry | undefined =>
      callsign ? state.telemetry[String(callsign).trim().toUpperCase()] : undefined,
    [state.telemetry]
  );

  return { ...state, send, acknowledge, telemetryFor };
}

/** "Route 68 / Senora Rd · 1234" style label for a game location. */
export const formatGameLocation = (loc?: UnitTelemetry['location']) => {
  if (!loc) return '';
  const street = [loc.street, loc.crossStreet].filter(Boolean).join(' / ');
  return [street || loc.zone, loc.postal].filter(Boolean).join(' · ');
};
