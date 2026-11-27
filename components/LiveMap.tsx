'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Layers, LocateFixed, MapPin, Minus, Plus, Radio, Car, List, Users } from 'lucide-react';
import { MAP_CONFIG, MAP_LABELS } from '@/lib/fivem/mapConfig';
import type { UnitTelemetry } from '@/lib/fivem/types';
import { formatGameLocation } from '@/lib/fivem/useFiveMBridge';

/**
 * Live map of every unit the FiveM bridge is tracking (players who set a
 * /callsign in game). Top-level component on purpose: it keeps its own
 * pan/zoom state, which a component nested inside CADSystem would lose on
 * every CADSystem re-render.
 *
 * Fills its parent (give the parent a height). The unit list is an overlay
 * drawer, open by default when the map is wide enough.
 *
 * Grouped units (unit.groupId, two officers in one vehicle) are drawn as one
 * blip labelled with every callsign when they are close together.
 *
 * Coordinates: the SVG works in "map space" = (worldX, -worldY), so north is up.
 */

type View = { cx: number; cy: number; zoom: number };

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  busy: '#eab308',
  unavailable: '#ef4444',
  enroute: '#3b82f6',
  onscene: '#a855f7',
  panic: '#dc2626',
};

const dv = MAP_CONFIG.defaultView;
const BASE_W = dv.maxX - dv.minX;
const BASE_H = dv.maxY - dv.minY;
const HOME: View = { cx: (dv.minX + dv.maxX) / 2, cy: -(dv.minY + dv.maxY) / 2, zoom: 1 };
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 40;

// Night look for the (light) atlas image: invert lightness, keep hues.
const DARK_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.7)';
type MapStyle = 'dark' | 'atlas';
const STYLE_KEY = 'strataMapStyle';

/** A CAD call to draw on the map. x/y missing = no known location (listed only). */
export interface MapCall {
  id: string;
  /** Shown instead of the id, e.g. the viewer's service number "F0004" or "L0012 / F0004". */
  label?: string;
  code?: string;
  priority?: string;
  address?: string;
  postal?: string;
  x?: number | null;
  y?: number | null;
  /** True when placed from the postal code (approximate), false for an exact game position. */
  approx?: boolean;
  units?: string[];
  status?: string;
}

const PRIORITY_COLORS: Record<string, string> = { '1': '#ef4444', '2': '#f59e0b', '3': '#3b82f6' };
const ROLE_META: Record<string, { label: string; color: string }> = {
  police: { label: 'LE', color: '#60a5fa' },
  fire: { label: 'Fire', color: '#f87171' },
  tow: { label: 'Tow', color: '#fb923c' },
  other: { label: 'Other', color: '#94a3b8' },
};

const ageLabel = (ms: number) => (ms < 5000 ? 'live' : ms < 60000 ? `${Math.round(ms / 1000)}s ago` : `${Math.round(ms / 60000)}m ago`);

export default function LiveMap({
  enabled,
  connected,
  telemetry,
  units,
  myCallsign,
  getStatusLabel,
  listTitle = 'Active LEO units',
  listAccent = 'text-blue-400',
  calls = [],
  onOpenCall,
  unitFilter,
  roleOf,
  roleToggles = false,
}: {
  enabled: boolean;
  connected: boolean;
  telemetry: Record<string, UnitTelemetry>;
  /** CAD units, used to colour blips by status (matched on callsign). */
  units: any[];
  myCallsign?: string;
  getStatusLabel?: (status: string) => string;
  /** Heading of the unit list under the map (differs per role). */
  listTitle?: string;
  /** Tailwind text colour for the list heading bar (role accent). */
  listAccent?: string;
  /** Active calls to mark on the map (labelled with the call #). */
  calls?: MapCall[];
  /** "Open call" in a call's popup. */
  onOpenCall?: (id: string) => void;
  /** Which units to show (your own unit always shows). Receives the CAD unit (if any) and callsign. */
  unitFilter?: (unit: any | undefined, callsign: string) => boolean;
  /** Service of a unit ('police' | 'fire' | 'tow' | 'other'), for the role toggles and list tags. */
  roleOf?: (unit: any | undefined) => string;
  /** Show LE / Fire / Tow toggle chips (Dispatch). */
  roleToggles?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>(HOME);
  const [follow, setFollow] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [listOpen, setListOpen] = useState<boolean | null>(null); // null = automatic (by width)
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [rolesOff, setRolesOff] = useState<string[]>([]);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);

  const me = myCallsign ? String(myCallsign).trim().toUpperCase() : undefined;

  // Remember the chosen map style per browser (best effort)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_KEY);
      if (saved === 'atlas' || saved === 'dark') setMapStyle(saved);
    } catch {}
  }, []);
  const toggleStyle = () => {
    setMapStyle(prev => {
      const next = prev === 'dark' ? 'atlas' : 'dark';
      try { localStorage.setItem(STYLE_KEY, next); } catch {}
      return next;
    });
  };

  // Track the container size so the viewBox keeps the right aspect ratio
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tick for "x seconds ago" labels / stale fading
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Map-space units per screen pixel at the current zoom (fit whole default view)
  const fitScale = Math.max(BASE_W / size.w, BASE_H / size.h);
  const unitsPerPx = fitScale / view.zoom;
  const vbW = size.w * unitsPerPx;
  const vbH = size.h * unitsPerPx;
  const viewBox = `${view.cx - vbW / 2} ${view.cy - vbH / 2} ${vbW} ${vbH}`;

  // Every reporting unit (before the role toggles), then the ones shown
  const allBlips = useMemo(() => {
    const byCallsign = new Map(units.map(u => [String(u.callsign || '').trim().toUpperCase(), u]));
    return Object.values(telemetry)
      .filter(t => typeof t.location?.x === 'number' && typeof t.location?.y === 'number')
      .map(t => {
        const unit = byCallsign.get(t.callsign);
        return {
          t,
          unit,
          role: roleOf ? roleOf(unit) || 'other' : 'other',
          status: unit?.status as string | undefined,
          color: (unit && STATUS_COLORS[unit.status]) || '#94a3b8',
          age: now - (t.updatedAt ?? 0),
        };
      })
      .filter(b => b.t.callsign === me || !unitFilter || unitFilter(b.unit, b.t.callsign))
      .sort((a, b) => a.t.callsign.localeCompare(b.t.callsign));
  }, [telemetry, units, now, unitFilter, roleOf, me]);
  const blips = useMemo(() => allBlips.filter(b => !rolesOff.includes(b.role)), [allBlips, rolesOff]);
  const mappedCalls = calls.filter(c => typeof c.x === 'number' && typeof c.y === 'number');
  const centerOnCall = (c: MapCall) => {
    if (typeof c.x !== 'number' || typeof c.y !== 'number') return;
    setFollow(false);
    setView(v => ({ cx: c.x as number, cy: -(c.y as number), zoom: Math.max(v.zoom, 5) }));
  };

  // Groups: callsign -> { name, members (callsigns) }
  const groupInfo = useMemo(() => {
    const byId = new Map<string, { name: string; members: string[] }>();
    units.forEach(u => {
      if (!u.groupId) return;
      const g = byId.get(u.groupId) || { name: u.groupName || '', members: [] as string[] };
      g.members.push(String(u.callsign || '').trim().toUpperCase());
      if (!g.name && u.groupName) g.name = u.groupName;
      byId.set(u.groupId, g);
    });
    const out = new Map<string, { name: string; members: string[] }>();
    byId.forEach(g => { if (g.members.length > 1) g.members.forEach(cs => out.set(cs, g)); });
    return out;
  }, [units]);

  // Merge blips of a group that are within ~30 m of each other into the first one
  const { hidden, mergedLabel } = useMemo(() => {
    const hidden = new Set<string>();
    const mergedLabel = new Map<string, string>();
    const byCs = new Map(blips.map(b => [b.t.callsign, b]));
    const seen = new Set<string>();
    groupInfo.forEach(g => {
      const key = g.members.join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const present = g.members.filter(cs => byCs.has(cs)).sort();
      if (present.length < 2) return;
      const lead = byCs.get(present[0])!;
      const merged = [present[0]];
      present.slice(1).forEach(cs => {
        const b = byCs.get(cs)!;
        const d = Math.hypot(b.t.location!.x! - lead.t.location!.x!, b.t.location!.y! - lead.t.location!.y!);
        if (d <= 30) { hidden.add(cs); merged.push(cs); }
      });
      if (merged.length > 1) mergedLabel.set(present[0], merged.join(' / '));
    });
    return { hidden, mergedLabel };
  }, [blips, groupInfo]);
  const partnersOf = (cs: string) => (groupInfo.get(cs)?.members || []).filter(m => m !== cs);

  const centerOn = (callsign: string, zoom?: number) => {
    const b = blips.find(x => x.t.callsign === callsign);
    if (!b) return;
    setView(v => ({ cx: b.t.location!.x!, cy: -b.t.location!.y!, zoom: zoom ?? Math.max(v.zoom, 6) }));
  };

  // Follow mode: keep my unit centred as it moves
  const myBlip = me ? blips.find(b => b.t.callsign === me) : undefined;
  useEffect(() => {
    if (follow && myBlip?.t.location) {
      setView(v => ({ ...v, cx: myBlip.t.location!.x!, cy: -myBlip.t.location!.y! }));
    }
  }, [follow, myBlip?.t.location?.x, myBlip?.t.location?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel zoom toward the cursor (native listener: React's wheel handler is passive)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-map-overlay]')) return; // scrolling the unit list
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      setView(v => {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
        const before = fitScale / v.zoom;
        const after = fitScale / zoom;
        // Keep the world point under the cursor fixed
        return { zoom, cx: v.cx + px * (before - after), cy: v.cy + py * (before - after) };
      });
      setFollow(false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fitScale]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.moved) {
      setFollow(false);
      setView(v => ({ ...v, cx: d.cx - dx * unitsPerPx, cy: d.cy - dy * unitsPerPx }));
    }
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const zoomBy = (f: number) => setView(v => ({ ...v, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * f)) }));

  // Screen-constant sizes, expressed in map units
  const px = (n: number) => n * unitsPerPx;
  const ib = MAP_CONFIG.imageBounds;
  const gridStep = unitsPerPx * 120 > 1000 ? 2000 : unitsPerPx * 120 > 500 ? 1000 : unitsPerPx * 120 > 250 ? 500 : 250;
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    for (let x = Math.ceil(ib.minX / gridStep) * gridStep; x <= ib.maxX; x += gridStep) {
      lines.push({ x1: x, y1: -ib.maxY, x2: x, y2: -ib.minY, major: x % 2000 === 0 });
    }
    for (let y = Math.ceil(ib.minY / gridStep) * gridStep; y <= ib.maxY; y += gridStep) {
      lines.push({ x1: ib.minX, y1: -y, x2: ib.maxX, y2: -y, major: y % 2000 === 0 });
    }
    return lines;
  }, [gridStep, ib.minX, ib.maxX, ib.minY, ib.maxY]);

  const selectedBlip = selected ? blips.find(b => b.t.callsign === selected) : undefined;
  const selectedCallInfo = selectedCall ? calls.find(c => c.id === selectedCall) : undefined;
  const showList = listOpen ?? size.w >= 760;

  return (
    <div className="relative h-full min-h-[240px] w-full overflow-hidden bg-gray-950">
      {/* Map */}
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className="relative h-full w-full cursor-grab touch-none select-none bg-gray-950 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
            {MAP_CONFIG.image ? (
              <g style={{ filter: mapStyle === 'dark' ? DARK_FILTER : undefined }}>
                {/* open ocean around the image so its edges blend in */}
                <rect x={-60000} y={-60000} width={120000} height={120000} fill={MAP_CONFIG.oceanColor} />
                <image
                  href={MAP_CONFIG.image}
                  x={ib.minX}
                  y={-ib.maxY}
                  width={ib.maxX - ib.minX}
                  height={ib.maxY - ib.minY}
                  preserveAspectRatio="none"
                />
                {MAP_CONFIG.imageHd && unitsPerPx < MAP_CONFIG.hdBelowUnitsPerPx && (
                  <image
                    href={MAP_CONFIG.imageHd}
                    x={ib.minX}
                    y={-ib.maxY}
                    width={ib.maxX - ib.minX}
                    height={ib.maxY - ib.minY}
                    preserveAspectRatio="none"
                  />
                )}
              </g>
            ) : (
              <>
                <rect x={ib.minX} y={-ib.maxY} width={ib.maxX - ib.minX} height={ib.maxY - ib.minY} fill="#0b1220" />
                {gridLines.map((l, i) => (
                  <line
                    key={i}
                    {...l}
                    stroke={l.major ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.07)'}
                    strokeWidth={px(1)}
                  />
                ))}
                {MAP_LABELS.map(l => (
                  <text
                    key={l.name}
                    x={l.x}
                    y={-l.y}
                    textAnchor="middle"
                    fill={l.size === 'lg' ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.45)'}
                    fontSize={px(l.size === 'lg' ? 18 : 11)}
                    fontWeight={l.size === 'lg' ? 700 : 500}
                    letterSpacing={px(l.size === 'lg' ? 3 : 0.5)}
                    style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
                  >
                    {l.name}
                  </text>
                ))}
              </>
            )}

            {mappedCalls.map(c => {
              const color = PRIORITY_COLORS[String(c.priority)] || '#94a3b8';
              const r = px(9);
              return (
                <g
                  key={'call-' + c.id}
                  data-map-call={c.id}
                  transform={`translate(${c.x}, ${-(c.y as number)})`}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { setSelectedCall(c.id); setSelected(null); }}
                >
                  <title>{`Call #${c.label || c.id}${c.code ? ` · ${c.code}` : ''}`}</title>
                  {c.priority === '1' && <circle r={r * 2.2} fill="none" stroke={color} strokeWidth={px(2)} opacity={0.6} className="animate-pulse" />}
                  {/* diamond marker; dashed outline = placed from the postal (approximate) */}
                  <rect
                    x={-r} y={-r} width={r * 2} height={r * 2}
                    transform="rotate(45)"
                    fill={color}
                    fillOpacity={0.9}
                    stroke="#ffffff"
                    strokeWidth={px(1.5)}
                    strokeDasharray={c.approx ? `${px(3)} ${px(2)}` : undefined}
                  />
                  {/* call # below the marker (unit callsigns sit above theirs, so they don't collide) */}
                  <text
                    y={r * 2.6}
                    textAnchor="middle"
                    fontSize={px(11)}
                    fontWeight={700}
                    fill="#fde68a"
                    stroke="#0b1220"
                    strokeWidth={px(3)}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none', fontFamily: 'var(--font-mono)' }}
                  >
                    #{c.label || c.id}
                  </text>
                </g>
              );
            })}

            {blips.filter(b => !hidden.has(b.t.callsign)).map(({ t, color, age, status }) => {
              const isMe = t.callsign === me || (!!me && !!mergedLabel.get(t.callsign)?.split(' / ').includes(me));
              const stale = age > MAP_CONFIG.staleAfterMs;
              const r = px(isMe ? 8 : 6.5);
              const heading = t.location?.heading ?? 0;
              return (
                <g
                  key={t.callsign}
                  style={{
                    transform: `translate(${t.location!.x}px, ${-t.location!.y!}px)`,
                    transition: 'transform 2.5s linear',
                    opacity: stale ? 0.45 : 1,
                    cursor: 'pointer',
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { setSelected(t.callsign); setSelectedCall(null); }}
                >
                  <title>{`${mergedLabel.get(t.callsign) || t.callsign} (${Math.round(t.location!.x!)}, ${Math.round(t.location!.y!)})`}</title>
                  {status === 'panic' && (
                    <circle r={r * 2.6} fill="none" stroke="#ef4444" strokeWidth={px(2)} className="animate-pulse" />
                  )}
                  {/* heading wedge; GTA heading is counter-clockwise from north */}
                  <path
                    d={`M0 ${-r * 2.1} L${r * 0.7} ${-r * 0.9} L${-r * 0.7} ${-r * 0.9} Z`}
                    fill={color}
                    opacity={0.85}
                    transform={`rotate(${-heading})`}
                  />
                  <circle r={r} fill={color} stroke={isMe ? '#ffffff' : '#0b1220'} strokeWidth={px(isMe ? 2.5 : 1.5)} />
                  <text
                    y={-r * 2.4}
                    textAnchor="middle"
                    fontSize={px(11)}
                    fontWeight={700}
                    fill="#e2e8f0"
                    stroke="#0b1220"
                    strokeWidth={px(3)}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none', fontFamily: 'var(--font-mono)' }}
                  >
                    {mergedLabel.get(t.callsign) || t.callsign}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Overlay: connection + controls */}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-gray-900/85 px-2.5 py-1 text-xs font-medium shadow-panel backdrop-blur ${
                connected ? 'border-emerald-500/30 text-emerald-300' : 'border-white/[0.08] text-gray-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {!enabled
                ? 'FiveM bridge not configured'
                : connected
                  ? `Live · ${blips.length} unit${blips.length === 1 ? '' : 's'}`
                  : 'FiveM offline'}
            </span>
            {calls.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-gray-900/85 px-2.5 py-1 text-xs font-medium text-yellow-200 shadow-panel backdrop-blur">
                <span className="inline-block h-2 w-2 rotate-45 bg-yellow-400" />
                {calls.length} call{calls.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {roleToggles && (
            <div className="absolute left-3 top-12 flex flex-wrap gap-1.5" onPointerDown={e => e.stopPropagation()} data-map-overlay>
              {['police', 'fire', 'tow'].map(role => {
                const on = !rolesOff.includes(role);
                const n = allBlips.filter(b => b.role === role).length;
                return (
                  <button
                    key={role}
                    onClick={() => setRolesOff(r => (on ? [...r, role] : r.filter(x => x !== role)))}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold backdrop-blur ${on ? 'border-white/[0.14] bg-gray-900/85 text-white' : 'border-white/[0.06] bg-gray-900/60 text-gray-500 line-through'}`}
                    title={on ? `Hide ${ROLE_META[role].label} units` : `Show ${ROLE_META[role].label} units`}
                    aria-pressed={on}
                    data-role-toggle={role}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: ROLE_META[role].color }} />
                    {ROLE_META[role].label} <span className="font-mono text-gray-400">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div
            className="absolute top-3 flex flex-col gap-1.5"
            style={{ right: showList ? 'calc(min(18rem, 60%) + 1.25rem)' : '0.75rem' }}
            onPointerDown={e => e.stopPropagation()}
          >
            <button
              className={`icon-btn backdrop-blur ${showList ? '!bg-accent-500/20 !text-accent-300' : 'bg-gray-900/80'}`}
              onClick={() => setListOpen(!showList)}
              title={showList ? 'Hide unit list' : 'Show unit list'}
              aria-label="Toggle unit list"
            >
              <List size={16} />
            </button>
            <button className="icon-btn bg-gray-900/80 backdrop-blur" onClick={() => zoomBy(1.5)} title="Zoom in"><Plus size={16} /></button>
            <button className="icon-btn bg-gray-900/80 backdrop-blur" onClick={() => zoomBy(1 / 1.5)} title="Zoom out"><Minus size={16} /></button>
            <button className="icon-btn bg-gray-900/80 backdrop-blur" onClick={() => { setView(HOME); setFollow(false); }} title="Show whole map"><Crosshair size={16} /></button>
            {MAP_CONFIG.image && (
              <button
                className="icon-btn bg-gray-900/80 backdrop-blur"
                onClick={toggleStyle}
                title={mapStyle === 'dark' ? 'Switch to atlas colours' : 'Switch to night map'}
              >
                <Layers size={16} />
              </button>
            )}
            {me && (
              <button
                className={`icon-btn backdrop-blur ${follow ? '!bg-accent-500/20 !text-accent-300' : 'bg-gray-900/80'}`}
                onClick={() => {
                  if (!myBlip) return;
                  setFollow(f => !f);
                  centerOn(me);
                }}
                disabled={!myBlip}
                title={myBlip ? 'Follow my unit' : `${me} is not reporting a position`}
              >
                <LocateFixed size={16} />
              </button>
            )}
          </div>

          {selectedCallInfo && (
            <div
              className="absolute bottom-3 left-3 max-w-sm rounded-xl border border-yellow-500/25 bg-gray-900/90 p-3 text-sm shadow-panel backdrop-blur"
              onPointerDown={e => e.stopPropagation()}
              data-call-popup
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: PRIORITY_COLORS[String(selectedCallInfo.priority)] || '#94a3b8' }} />
                <span className="font-mono font-semibold text-white">#{selectedCallInfo.label || selectedCallInfo.id}</span>
                {selectedCallInfo.priority && <span className="text-xs text-gray-400">P{selectedCallInfo.priority}</span>}
                <span className="font-semibold text-gray-200">{selectedCallInfo.code}</span>
                <button className="ml-auto text-xs text-gray-500 hover:text-white" onClick={() => setSelectedCall(null)}>Close</button>
              </div>
              <div className="mt-1.5 text-gray-300">
                {selectedCallInfo.address || 'No address'}{selectedCallInfo.postal ? ` · Postal ${selectedCallInfo.postal}` : ''}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-400">
                <span>{selectedCallInfo.units && selectedCallInfo.units.length ? `Units: ${selectedCallInfo.units.join(', ')}` : 'No units assigned'}</span>
                {selectedCallInfo.approx && <span>Location from postal</span>}
              </div>
              {onOpenCall && (
                <button className="btn btn-secondary btn-sm mt-2" onClick={() => onOpenCall(selectedCallInfo.id)}>Open call</button>
              )}
            </div>
          )}

          {selectedBlip && (
            <div
              className="absolute bottom-3 left-3 max-w-sm rounded-xl border border-white/[0.08] bg-gray-900/90 p-3 text-sm shadow-panel backdrop-blur"
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedBlip.color }} />
                <span className="font-mono font-semibold text-white">{selectedBlip.t.callsign}</span>
                <span className="text-gray-400">{selectedBlip.unit?.officer || selectedBlip.t.playerName}</span>
                <button className="ml-auto text-xs text-gray-500 hover:text-white" onClick={() => setSelected(null)}>Close</button>
              </div>
              {partnersOf(selectedBlip.t.callsign).length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-accent-300">
                  <Users size={12} />
                  {groupInfo.get(selectedBlip.t.callsign)?.name ? `${groupInfo.get(selectedBlip.t.callsign)!.name} · ` : ''}
                  Riding with {partnersOf(selectedBlip.t.callsign).join(', ')}
                </div>
              )}
              <div className="mt-1.5 text-gray-300">{formatGameLocation(selectedBlip.t.location) || 'Unknown location'}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-400">
                {selectedBlip.status && <span>{getStatusLabel ? getStatusLabel(selectedBlip.status) : selectedBlip.status}</span>}
                {selectedBlip.t.vehicle && (
                  <span>{selectedBlip.t.vehicle.model} · {selectedBlip.t.vehicle.plate} · {selectedBlip.t.vehicle.speed ?? 0} mph</span>
                )}
                <span>{ageLabel(selectedBlip.age)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unit list (overlay drawer) */}
      {showList && (
      <div
        data-map-overlay
        className="absolute bottom-3 right-3 top-3 flex w-[min(18rem,60%)] flex-col rounded-xl border border-white/[0.08] bg-gray-900/90 p-3 shadow-panel backdrop-blur"
        onPointerDown={e => e.stopPropagation()}
      >
        {calls.length > 0 && (
          <div className="mb-3 flex max-h-[40%] min-h-0 flex-col">
            <h3 className="section-title text-yellow-400">Active calls ({calls.length})</h3>
            <div className="grid min-h-0 content-start gap-1.5 overflow-y-auto pr-1">
              {calls.map(c => {
                const placed = typeof c.x === 'number' && typeof c.y === 'number';
                return (
                  <button
                    key={c.id}
                    onClick={() => { if (placed) { setSelectedCall(c.id); setSelected(null); centerOnCall(c); } else if (onOpenCall) onOpenCall(c.id); }}
                    className={`subcard text-left transition-colors hover:!border-white/[0.14] ${selectedCall === c.id ? '!border-yellow-500/40' : ''}`}
                    title={placed ? 'Show on map' : 'No map location: open the call'}
                    data-map-call-item={c.id}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 flex-shrink-0 rotate-45" style={{ background: PRIORITY_COLORS[String(c.priority)] || '#94a3b8' }} />
                      <span className="font-mono text-xs font-semibold text-white">#{c.label || c.id}</span>
                      <span className="truncate text-xs text-gray-300">{c.code}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-gray-500">
                      {c.address || 'No address'}{c.postal ? ` · ${c.postal}` : ''}{placed ? '' : ' · not on map'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <h3 className={`section-title ${listAccent}`}>{listTitle} ({blips.length})</h3>
        {blips.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            <Radio size={28} className="mx-auto mb-2 text-gray-600" />
            {!enabled ? (
              <>Set <span className="font-mono text-gray-300">FIVEM_API_KEY</span> on the CAD host and install the strata-mdt resource (fivem/README.md) to see units here.</>
            ) : connected ? (
              'No units reporting. Units appear after setting a callsign in game.'
            ) : (
              'Waiting for the FiveM server…'
            )}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
            {blips.map(({ t, unit, color, age, status, role }) => (
              <button
                key={t.callsign}
                onClick={() => { setSelected(t.callsign); setFollow(false); centerOn(t.callsign); }}
                className={`subcard text-left transition-colors hover:!border-white/[0.14] ${selected === t.callsign ? '!border-accent-500/40' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
                  <span className="font-mono text-sm font-semibold text-white">{t.callsign}</span>
                  {t.callsign === me && <span className="chip !py-0 text-[10px]">You</span>}
                  {roleToggles && (
                    <span className="rounded px-1 text-[10px] font-semibold" style={{ color: (ROLE_META[role] || ROLE_META.other).color }}>
                      {(ROLE_META[role] || ROLE_META.other).label}
                    </span>
                  )}
                  <span className={`ml-auto text-[11px] ${age > MAP_CONFIG.staleAfterMs ? 'text-yellow-400' : 'text-gray-500'}`}>{ageLabel(age)}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-400">
                  {unit?.officer || t.playerName || 'Unknown'}
                  {status ? ` · ${getStatusLabel ? getStatusLabel(status) : status}` : ' · not in CAD'}
                </div>
                <div className="mt-1 flex items-center gap-1 truncate text-xs text-gray-300">
                  <MapPin size={11} className="flex-shrink-0" />
                  {formatGameLocation(t.location) || 'Unknown'}
                </div>
                {partnersOf(t.callsign).length > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-accent-300">
                    <Users size={11} className="flex-shrink-0" />
                    Riding with {partnersOf(t.callsign).join(', ')}
                  </div>
                )}
                {t.vehicle && (
                  <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500">
                    <Car size={11} className="flex-shrink-0" />
                    {t.vehicle.model} · {t.vehicle.speed ?? 0} mph
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
