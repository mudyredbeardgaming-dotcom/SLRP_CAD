/**
 * Who may do what. Edit these lists to change permissions; nothing else needs to change.
 *
 * Self-dispatch: a Law Enforcement or Fire/EMS unit attaching itself to an open call
 * (and clearing itself from one) without dispatch.
 *
 * A unit may self-dispatch when, for its role:
 *   - `enabled` is true, and
 *   - `ranks` and `subdivisions` are both empty (no restriction), or the unit's rank
 *     is in `ranks`, or the unit's subdivision is in `subdivisions`.
 * Matching ignores case. Ranks and subdivisions come from the unit record
 * (`unit.rank`, `unit.subdivision`, set in Unit Information).
 *
 * Per-account override: set `selfDispatch: true` or `selfDispatch: false` on an entry in
 * `officerCredentials` (data/cad-data.json) to allow or block one user regardless of the lists.
 * Admins can always self-dispatch.
 */
export const SELF_DISPATCH: Record<'police' | 'fire', { enabled: boolean; ranks: string[]; subdivisions: string[] }> = {
  police: {
    enabled: true,
    ranks: [], // e.g. ['Sergeant', 'Lieutenant']
    subdivisions: [], // e.g. ['BCSO-SUPV', 'LSPD-SUPV', 'K-9']
  },
  fire: {
    enabled: true,
    ranks: [], // e.g. ['Captain', 'Battalion Chief']
    subdivisions: [],
  },
};

/**
 * Supervisors: Law Enforcement / Fire-EMS units that can
 *   - group units (the "Units" tab; two officers riding in one vehicle), and
 *   - review LE reports and records (Records Management -> Supervisor Panel; police only).
 *
 * A unit is a supervisor when its rank is in `ranks` or its subdivision is in
 * `subdivisions` (ignoring case). Unlike SELF_DISPATCH, empty lists mean nobody.
 * Ranks and subdivisions come from Unit Information.
 *
 * Per-account overrides on an officerCredentials entry:
 *   supervisor: true / false   (both abilities)
 *   groupUnits: true / false   (grouping only)
 * Admins are always supervisors. Dispatchers can always group units.
 */
export const SUPERVISORS: Record<'police' | 'fire', { ranks: string[]; subdivisions: string[] }> = {
  police: {
    ranks: ['Corporal', 'Sergeant', 'Lieutenant', 'Captain', 'Major', 'Commander', 'Undersheriff', 'Sheriff', 'Deputy Chief', 'Chief'],
    subdivisions: ['BCSO-SUPV', 'LSPD-SUPV'],
  },
  fire: {
    ranks: ['Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief', 'EMS Supervisor'],
    subdivisions: [],
  },
};

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();

type PermOpts = {
  /** The role the user is working as (selected role card). */
  view: string | null | undefined;
  /** The account's role from officerCredentials (e.g. 'police', 'admin'). */
  accountRole?: string | null;
  unit?: { rank?: string; subdivision?: string } | null;
  credential?: { supervisor?: boolean; groupUnits?: boolean } | null;
};

export function isSupervisor(opts: PermOpts): boolean {
  const { view, accountRole, unit, credential } = opts;
  if (view !== 'police' && view !== 'fire') return false;
  if (accountRole === 'admin') return true;
  if (credential?.supervisor === true) return true;
  if (credential?.supervisor === false) return false;
  if (!unit) return false;
  const policy = SUPERVISORS[view];
  return (
    policy.ranks.some(r => norm(r) === norm(unit.rank)) ||
    policy.subdivisions.some(s => norm(s) === norm(unit.subdivision))
  );
}

/** Dispatch always; LE / Fire supervisors; `groupUnits` overrides per account. */
export function canGroupUnits(opts: PermOpts): boolean {
  if (opts.view === 'dispatch') return true;
  if (opts.view !== 'police' && opts.view !== 'fire') return false;
  if (opts.credential?.groupUnits === true) return true;
  if (opts.credential?.groupUnits === false) return false;
  return isSupervisor(opts);
}

/** Supervisor Panel in Records Management (Law Enforcement only). */
export function canReviewRecords(opts: PermOpts): boolean {
  return opts.view === 'police' && isSupervisor(opts);
}

export function canSelfDispatch(opts: {
  /** The role the user is working as (selected role card). */
  view: string | null | undefined;
  /** The account's role from officerCredentials (e.g. 'police', 'admin'). */
  accountRole?: string | null;
  unit?: { rank?: string; subdivision?: string } | null;
  credential?: { selfDispatch?: boolean } | null;
}): boolean {
  const { view, accountRole, unit, credential } = opts;
  if (view !== 'police' && view !== 'fire') return false;
  if (!unit) return false;
  if (accountRole === 'admin') return true;
  if (credential?.selfDispatch === true) return true;
  if (credential?.selfDispatch === false) return false;
  const policy = SELF_DISPATCH[view];
  if (!policy?.enabled) return false;
  if (policy.ranks.length === 0 && policy.subdivisions.length === 0) return true;
  return (
    policy.ranks.some(r => norm(r) === norm(unit.rank)) ||
    policy.subdivisions.some(s => norm(s) === norm(unit.subdivision))
  );
}
