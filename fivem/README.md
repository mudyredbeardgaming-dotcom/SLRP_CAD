# StrataMDT ⇄ FiveM bridge

This folder holds the in-game half of the StrataMDT ⇄ FiveM connection. The CAD half lives in `app/api/fivem/*` and `lib/fivem/*`.

```
FiveM server (strata-mdt resource)                StrataMDT (Next.js on Railway)
──────────────────────────────────                ────────────────────────────────
heartbeat / positions / 911 / panic ──POST──▶  /api/fivem/ingest
poll for CAD commands ───────────────GET───▶   /api/fivem/outbox
/runplate, /runname ─────────────────GET───▶   /api/fivem/lookup
                                               /api/fivem/state   ◀── CAD browsers poll
                                               /api/fivem/command ◀── CAD browsers send
```

The game server starts every request, so you don't need to open an inbound port on it. All game-server requests carry `Authorization: Bearer <FIVEM_API_KEY>`.

## Setup

1. **CAD host (Railway):** add a variable named `FIVEM_API_KEY` with a long random value. One way to generate one: `openssl rand -hex 32`. Then redeploy. Until the key is set, the bridge stays off: the game endpoints return `503` and the CAD shows no FiveM indicator.
2. **Game server:**
   - Copy `fivem/strata-mdt` into your server's `resources/` folder.
   - Add these lines to `server.cfg`:
     ```cfg
     set strata_cad_url "https://your-cad.up.railway.app"
     set strata_api_key "same value as FIVEM_API_KEY"
     ensure strata-mdt
     ```
   - Use `set`, not `setr`, so the key is never sent to players.
3. **Optional:**
   - Set your postal resource in `config.lua`. It defaults to `nearest-postal`.
   - Set `Config.LeoAce` to lock the LEO commands to a group, then grant it:
     ```cfg
     add_ace group.leo strata.leo allow
     add_ace group.admin strata.aop allow
     ```

Once it's running, the CAD top bar shows a green **FiveM** chip with the player count and AOP.

## In-game commands

| Command | Who | What it does |
|---|---|---|
| `/callsign A-101` | LEO | Links you to the CAD unit with that callsign and starts position tracking. `/callsign off` stops it. |
| `/status enroute` | LEO | Sets your CAD unit status: `available`, `busy`, `unavailable`, `enroute` or `onscene`. |
| `/panic` | LEO | Sets your unit to PANIC and alerts dispatch with your location. |
| `/911 <message>` | Anyone | Sends a 911 call to the dispatch board, with your location. Limited to one per 30s. |
| `/runplate <plate>` | LEO | Looks up a vehicle registration in the CAD. |
| `/runname <first last>` | LEO | Looks up a person in the CAD. |
| `/aop <area>` | `strata.aop` | Sets the server AOP, which is shown in the CAD top bar and announced to players. |

## How it maps to the CAD

- **Callsign is the join key.** A player's `/callsign` must match a unit's callsign in the CAD. You can edit it in the Unit Information modal. Matching ignores case.
- **Live positions** show on the Dispatch → Units cards in green. They are held in memory only, never written to `data/cad-data.json`, and drop off after 60s without an update.
- **Status and panic from the game** update the unit in every open CAD and are saved right away.
- **911 calls and panics** wait in an *Incoming from FiveM* queue at the top of the Dispatch board:
  - **Create Call** opens the New Call form, already filled in.
  - **Dismiss** or **Acknowledge** removes the item for all dispatchers.
- **CAD → game:** players get an in-game notification when:
  - a dispatcher assigns them to a call or removes them from one;
  - their call is closed;
  - their status is changed from the CAD.

## Protocol reference

All types live in [`lib/fivem/types.ts`](../lib/fivem/types.ts).

### `POST /api/fivem/ingest`

The body is a single event, or a batch in the form `{ "events": [ ... ] }` (up to 100 per request).

```jsonc
{ "type": "heartbeat", "serverName": "My RP", "playerCount": 12, "maxPlayers": 64, "resourceVersion": "0.1.0" }
{ "type": "unit_update", "units": [ { "callsign": "A-101", "playerName": "John", "serverId": 3,
    "location": { "street": "Route 68", "crossStreet": "Senora Rd", "zone": "Harmony", "postal": "1234", "x": 1, "y": 2, "z": 3, "heading": 90 },
    "vehicle": { "model": "SHERIFF2", "plate": "BCSO101", "speed": 54 } } ] }
{ "type": "unit_left", "callsign": "A-101" }
{ "type": "unit_status", "callsign": "A-101", "status": "enroute" }
{ "type": "panic", "callsign": "A-101", "officer": "John", "location": { ... } }
{ "type": "call_911", "caller": "Jane", "phone": "555-0101", "description": "Shots fired", "location": { ... } }
{ "type": "aop_update", "aop": "Blaine County", "setBy": "admin" }
```

The response is `{ ok, accepted, errors: [{ index, error }] }`.

### `GET /api/fivem/outbox?since=<cursor>`

The first call takes no `since` and returns only the current `cursor`, so a restarted game server doesn't replay old commands. After that, pass back the `cursor` from the previous response.

```jsonc
{ "ok": true, "cursor": 7, "commands": [
  { "seq": 6, "at": 1732380000000, "command": { "type": "call_assigned", "callsigns": ["A-101"], "call": { "id": "000012", "code": "ASSAULT", "priority": "1", "address": "Route 68", "postal": "1234" } } },
  { "seq": 7, "at": 1732380005000, "command": { "type": "notify", "message": "All units 10-3", "callsigns": [] } }
] }
```

These are the command types:

- `call_assigned`: a unit was put on a call.
- `call_closed`: the call was closed, or the unit was removed from it.
- `unit_status`
- `notify`: an empty or missing `callsigns` list means everyone.
- `aop_update`

### `GET /api/fivem/lookup?plate=ABC123` or `?name=John%20Smith`

This returns matching registrations or people from `data/cad-data.json`. `flags` lists open records (warrants, BOLOs and so on) whose suspect name matches.

### Testing without a game server

```bash
KEY=your-key; CAD=http://localhost:3000
curl -X POST $CAD/api/fivem/ingest -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"events":[{"type":"heartbeat","serverName":"Test","playerCount":3,"maxPlayers":64},
                 {"type":"call_911","caller":"Jane Doe","description":"Car fire","location":{"street":"Route 68","postal":"1234"}}]}'
curl "$CAD/api/fivem/outbox?since=0" -H "Authorization: Bearer $KEY"
```

## Limits and next steps

- **Single instance only.** Bridge state is held in memory in one Next.js process. That fits the current Railway setup, but running more than one instance would need a shared store such as Redis.
- **Open browser endpoints.** `/api/fivem/state` and `/api/fivem/command` are unauthenticated, like the rest of the CAD API today. Add them to your auth when JWT login lands.
- **Possible next steps:**
  - waypoints for assigned calls, which needs postal → coordinates;
  - a live map from the `x`/`y` telemetry;
  - framework job sync (ESX/QBCore) so players don't have to run `/callsign` by hand.
