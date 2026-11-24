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
   - Put `ensure strata-mdt` **after** your framework (`qb-core`, `qbx_core` or `es_extended`) and `oxmysql`.
   - Use `set`, not `setr`, so the key is never sent to players.
3. **Optional:**
   - Set your postal resource in `config.lua`. It defaults to `nearest-postal`.
   - Rename or turn off any command in `Config.Commands` (see [Customizing commands](#customizing-commands)).
   - Set `Config.LeoAce` to lock the LEO commands to a group, then grant it:
     ```cfg
     add_ace group.leo strata.leo allow
     add_ace group.admin strata.aop allow
     ```

Once it's running, the CAD top bar shows a green **FiveM** chip with the player count and AOP.

## In-game commands

These are the default names. Every one can be renamed, given aliases or turned off; see [Customizing commands](#customizing-commands).

| Command | Who | What it does |
|---|---|---|
| `/callsign A-101` | LEO | Links you to the CAD unit with that callsign and starts position tracking. `/callsign off` stops it. |
| `/status enroute` | LEO | Sets your CAD unit status. Accepts `available`, `busy`, `unavailable`, `enroute`, `onscene` or a 10-code such as `10-8`. |
| `/10-8`, `/10-23`, ... | LEO | Shortcuts for `/status`. Turn them off with `Config.StatusShortcutCommands = false`. |
| `/panic` | LEO | Sets your unit to PANIC and alerts dispatch with your location. |
| `/911 <message>` | Anyone | Sends a 911 call to the dispatch board, with your location. Limited to one per 30s. |
| `/runplate <plate>` (`/rp`) | LEO | Looks up a vehicle registration in the CAD. |
| `/runname <first last>` (`/rn`) | LEO | Looks up a person in the CAD. |
| `/aop <area>` | `strata.aop` | Sets the server AOP, which is shown in the CAD top bar and announced to players. |
| `/linkcad CODE` | Anyone | Links your FiveM identity to your CAD account (get the code in the CAD civilian portal). |
| `/cadsync` | Anyone | Sends your current character, licenses and vehicles to the CAD right now. |
| `/callgps` | Anyone | Sets your GPS to your assigned call again (after you cleared the waypoint). |
| `/cite <id> <fine> <offense>` | LEO | Writes a citation to player `<id>` and files it in the CAD. Example: `/cite 12 250 Speeding 45 in a 35`. See [Citations](#citations-written-in-game). |
| `/dlexpiry <date\|auto>` | Anyone | Sets your driver license expiration, e.g. `/dlexpiry 2027-06-30`. `auto` means one year from the CAD date. |
| `/regexpiry <plate> <date\|auto>` | Anyone | Sets a vehicle registration expiration on your own vehicle. |

### Customizing commands

All command settings are in `config.lua` → `Config.Commands`:

```lua
Config.Commands = {
  call911  = { name = '911',     aliases = { 'emergency' }, enabled = true },
  runplate = { name = 'plate',   aliases = { 'rp' },        enabled = true, leo = true },
  aop      = { name = 'aop',     aliases = {},              enabled = false },          -- another resource owns /aop
  linkcad  = { name = 'cadlink', aliases = {},              enabled = true },
  ...
}
```

- `name` is what players type. `aliases` adds more names for the same command.
- `enabled = false` doesn't register the command at all, so it can't clash with another resource.
- `leo = true` requires `Config.LeoAce` (when that's set). `ace = 'some.permission'` requires that specific ACE instead.
- The words `/status` accepts, including your own 10-codes, are in `Config.StatusAliases`.
- The chat prefix is `Config.ChatPrefix`.
- The CAD learns the configured names from the heartbeat. For example, the civilian portal tells players to type `/cadlink CODE` if that's what you named it.

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

## Character sync (characters, driver licenses, vehicles)

Players can build their CAD civilian just by playing. The bridge sends three things to the CAD:

- **Characters:** each character a player creates or loads in game becomes a CAD civilian with the same name, date of birth, sex and phone number. It's marked **In-game** in the portal.
- **Driver licenses (and other licenses):** when the character gets a license in game, for example from a DMV test or a phone app, it's added to that character's DMV records as a valid license with a generated license number. If the license is taken away in game, it's marked `SUSPENDED` in the CAD.
- **Vehicles:** when the character gets a vehicle in game, it's registered to that character with plate, make, model, vehicle type, a generated VIN, and valid registration and insurance. If the vehicle changes hands in game, the registration moves to the new owner.

### Linking a player to their CAD account

1. In the CAD, the player signs in, opens **Civilian** and clicks **Get link code**.
2. In game they type `/linkcad CODE` (or whatever you've named the command). The code is valid for 10 minutes.
3. The portal shows **FiveM account linked**. Every character this player has made in game, and any new one, now appears under their account.

Characters created before linking are still added to the CAD, so officers can look them up straight away. They're attached to the player's account once they link. The player is identified by `Config.CharacterSync.identifier`, which defaults to their Rockstar `license`.

The civilian portal now shows each account only its own characters; admins see everyone's. Characters made before this change, which have no owner, stay visible to everyone.

### Where the data comes from

`Config.Framework = 'auto'` detects the framework:

| Framework | Characters | Licenses | Vehicles |
|---|---|---|---|
| **QBCore / Qbox** | `QBCore:Server:PlayerLoaded` → `charinfo` | `metadata.licences` (`driver` → DRIVER LICENSE) | `player_vehicles` table |
| **ESX** | `esx:playerLoaded` → `firstName`, `lastName`, `dateofbirth`, `sex` | `user_licenses` table (`drive`, `drive_bike`, `drive_truck` → DRIVER LICENSE) | `owned_vehicles` table |
| **Standalone / other** | `exports['strata-mdt']:SetCharacter(...)` | exports | exports |

- **Timing:** online players are re-checked every `Config.CharacterSync.interval` seconds (default 60). That catches licenses and vehicles from any source: DMV, phone apps, dealerships or admin commands. Only changes are sent to the CAD.
- **Immediate checks:** for an immediate update, list the events your resources fire in `Config.CharacterSync.resyncEvents`. Defaults are included for `esx_license`, `esx_identity`, `qb-vehicleshop` and `qb-cityhall`.
- **Mapping:** `Config.LicenseMap` decides which framework licenses go to the CAD and as what. For example, `driver = { type = 'DRIVER LICENSE', class = 'C' }`, or `weapon = false` to skip one.
- **Custom tables:** if your vehicle or license tables differ, edit the SQL in `Config.Queries`. Vehicle and ESX license sync need `oxmysql`.
- **Vehicle names:** make, model and type are looked up on the player's game client, so they match the game's own names. Add-on vehicles show whatever name the vehicle's creator gave them.

### Hooking in a phone app, DMV or dealership (any framework)

Call these from your own server scripts. They always use the character the player is **currently** on.

```lua
-- Character selected (standalone/custom frameworks; QBCore/Qbox/ESX do this automatically)
exports['strata-mdt']:SetCharacter(source, {
  id = 'CHAR123', firstName = 'Jamie', lastName = 'Rivera', dob = '1994-03-14', gender = 'f', phone = '555-0199',
})

-- Phone DMV app passed the driving test
exports['strata-mdt']:SetLicense(source, 'driver')                         -- a Config.LicenseMap key...
exports['strata-mdt']:SetLicense(source, 'PILOT LICENSE', { class = 'A' }) -- ...or a CAD license type
exports['strata-mdt']:SetLicense(source, 'driver', { status = 'SUSPENDED' })

-- Dealership / phone garage app
exports['strata-mdt']:RegisterVehicle(source, { plate = 'ABC123', model = 'sultan', color = 'Black' })

-- Force a full re-check (e.g. right after your own app saves)
exports['strata-mdt']:ResyncPlayer(source, true)
```

The same calls exist as server events: `strata-mdt:setCharacter`, `strata-mdt:setLicense`, `strata-mdt:registerVehicle`, `strata-mdt:clearCharacter` and `strata-mdt:resync`. Trigger them with `TriggerEvent('strata-mdt:setLicense', source, 'driver')`. They're server-only, so players can't trigger them.

### Expiration dates (licenses and registrations)

- **Automatic date:** new licenses and vehicle registrations, and their insurance, expire **one year after the CAD date**. The CAD date follows the CAD clock, which runs on Pacific time. Change the default with `licenseValidYears` and `vehicleValidYears` in `Config.CharacterSync`.
- **Players pick their own date:** when a player gets a new driver license or registration, they are asked whether to keep the automatic date or choose one (`Config.ExpiryChoice`).
  - With **ox_lib** running, a dialog opens with a date picker and a "Use automatic date" box. Closing it keeps the automatic date.
  - Without ox_lib, the player gets a chat message with the command to use.
- **Changing it later:** `/dlexpiry 2027-06-30` or `/regexpiry ABC123 2027-06-30`. Use `auto` instead of a date for one year from today. Players can only change their own character's records.
- **From your scripts:** `SetLicense(source, 'driver', { expires = '2027-06-30' })` or `RegisterVehicle(source, { plate = 'ABC123', registrationExpires = 'auto' })`. Passing a date skips the question.
- **Expired status:** once a date is before the CAD date, the CAD shows that registration, insurance or license as **EXPIRED** everywhere: Lookup, the civilian portal, reports, `/runplate` and `/runname`. Statuses such as SUSPENDED or TAGS STOLEN are left as they are. Setting a new future date makes it VALID again.

### What happens to CAD edits

- **What the game controls:** name, date of birth, sex and phone come from the game, so a later sync overwrites CAD edits to those fields.
- **What the CAD keeps:** everything else is never touched by the sync, such as photo, address, height, scars, notes and restrictions on a license.
- **Deleting characters:** a synced character deleted in the CAD less than 15 minutes after a game update may come back.
  - Why: during that window the server re-adds recent game changes whenever a browser saves, so a browser holding older data can't erase them.
  - The fix: wait 15 minutes before deleting.

## GPS to calls

When a unit is put on a call in the CAD, that player's map gets a waypoint to the call automatically. This covers LE, Fire/EMS and Tow, and every way a unit gets put on a call:
- dispatch assigns it;
- the unit self-dispatches;
- a new call auto-assigns it;
- it rides in a group with an assigned unit.

**Where the waypoint goes:**
- A call made from an in-game `/911` routes to the caller's position.
- Other calls route to their postal code, and the notification says "(postal)".
- A call with neither gets no waypoint.

**After the call:**
- When the unit is cleared from the call, or the call closes, the waypoint is removed. Turn that off with `Config.Waypoints.clearOnClose = false`.
- `/callgps` sets the waypoint again. Turn the whole feature off with `Config.Waypoints.enabled = false`.

Units are matched by callsign, so Fire and Tow players also need to run `/callsign` (e.g. `/callsign ENGINE-1`, `/callsign TOW-1`). If you set `Config.LeoAce`, give those players the ACE too, or set `leo = false` on the `callsign` command.

## Citations written in game

A citation written in game becomes a **CITATION** record in the CAD, filled in like one written in the CAD's Citation form.

- **The officer's records:** the officer is found by their linked CAD account (`/linkcad`). If they aren't linked, the CAD uses the unit with their `/callsign`. The citation then shows under **My Records** for that officer, marked "Issued in game".
- **Supervisor review:** it arrives as submitted (pending review), so it shows up in the **Supervisor Panel** like a citation written in the CAD.
- **The civilian's record:** the cited person is found by their synced character. If there is none, the CAD looks for an exact name match. The citation then shows in Lookup and under **Citations** on the character in the civilian portal.
  - With no match, it is filed under the name only and doesn't appear on any character's record.

**Built-in command:** `/cite <player id> <fine> <offense>`. It writes one offense and tells the officer the CAD record number. The cited player gets a chat message unless `Config.Citations.notifySubject = false`.

**From a ticket or billing script** (server side):

```lua
exports['strata-mdt']:IssueCitation(officerSource, targetSource, {
  charges = {
    { charge = 'Speeding', code = 'VC 22350', fine = 250, counts = 1, type = 'INFRACTION' },
    { charge = 'No seatbelt', fine = 100 },
  },
  vehicle = { plate = 'ABC123', make = 'Karin', model = 'Sultan', color = 'Black' },  -- optional
  notes = 'Clocked at 85 in a 45',                                                       -- optional
  externalId = ticketId,  -- optional: your own id, so sending the same ticket twice files it once
}, function(ok, result)
  -- result.recordNumber, result.total, result.linkedCivilian (nil if the person wasn't found)
end)
```

- **Who is cited:** `targetSource` is the cited player's server id, and their active character is used. To cite someone not in game, pass a table instead: `{ characterId = 'ABC123', name = 'Jamie Rivera', dob = '1994-03-14' }`.
- **Location:** taken from the officer's last reported position when they have a callsign. Pass `location` to override it.
- **Server events:** the same call is available as `TriggerEvent('strata-mdt:issueCitation', officerSource, targetSource, citation)`. After the CAD files a citation, `strata-mdt:citationFiled` fires with `(officerSource, targetSource, result)`, so a billing script can charge the fine.

## Live map (Law Enforcement → Live Map)

The Law Enforcement view has a **Live Map** tab that shows every unit the bridge is tracking, meaning everyone who has run `/callsign`:

- Blips are colored by the unit's CAD status, with a white ring on your own unit. A wedge shows the direction the unit is facing, and PANIC pulses.
- Blips glide between position updates and fade once a unit hasn't reported for 15 seconds.
- **Navigation:** drag to pan; use the mouse wheel or the +/− buttons to zoom. The crosshair button resets the view, and the locate button follows your own unit.
- **Unit list:** click a unit in the side list to center on it and see its location, vehicle and speed.
- **Calls:** active calls show as diamonds labelled with the call number.
  - Who sees which calls: LE sees LE calls, Fire/EMS sees fire calls, and Dispatch sees all of them.
  - Placement: a call made from an in-game `/911` sits at the caller's position. Other calls are placed at their postal code, using nearest-postal's `new-postals.json` (MIT), and drawn with a dashed outline. Calls with no postal are listed beside the map but not drawn on it.
  - If your server uses a different postal map, replace `lib/fivem/postals.ts`.
- **Units shown:** LE and Fire/EMS see their own service's units. Dispatch sees every unit, with LE / Fire / Tow toggles.
- **Update rate:** the map polls every 1.5s while it's open. Game positions arrive every 2.5s, set by `Config.TelemetryInterval` and `Config.UnitUpdateInterval`.

**Map image:**
- The map uses the GTA V **Atlas** map from [Flamm64/GTA-V-World-Map](https://github.com/Flamm64/GTA-V-World-Map), which may be modified and reused. Map art © Rockstar Games.
- It was stitched from the original tiles and cropped to the island, in two sizes:
  - `public/map/gta5-atlas.jpg` (overview);
  - `public/map/gta5-atlas-hd.jpg` (loaded when zoomed in).
- The **layers** button switches between a dark "night" look and the original atlas colors. The browser remembers the choice.
- The calibration from game coordinates to the image lives in [`lib/fivem/mapConfig.ts`](../lib/fivem/mapConfig.ts). Positions are accurate to about ±100 units, roughly a city block.
- To use a different image, replace the files and update `imageBounds`.
- The map shows even before the bridge is configured; it just has no units on it.

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

Character sync events. These are saved to `data/cad-data.json` and return a result:

```jsonc
{ "type": "account_link", "code": "7AMWLB", "owner": { "identifier": "license:abc", "identifiers": ["license:abc", "discord:42"] }, "playerName": "Jamie" }
{ "type": "character_upsert", "owner": { "identifier": "license:abc" },
  "character": { "id": "ABC12345", "firstName": "Jamie", "lastName": "Rivera", "dob": "1994-03-14", "gender": 1, "phone": "555-0199" } }
{ "type": "license_set", "characterId": "ABC12345", "license": { "type": "DRIVER LICENSE", "class": "C", "status": "VALID" } }
{ "type": "vehicle_register", "characterId": "ABC12345", "vehicle": { "plate": "8JR123", "model": "Sultan", "make": "Karin", "vehicleType": "SEDAN" } }
// Expiration dates: "YYYY-MM-DD" or "auto" (one year from the CAD date)
{ "type": "license_set", "characterId": "ABC12345", "license": { "type": "DRIVER LICENSE", "expires": "2027-06-30" } }
{ "type": "vehicle_register", "characterId": "ABC12345", "vehicle": { "plate": "8JR123", "registrationExpires": "auto", "insuranceExpires": "2027-01-01" } }
```

Officer records (saved to `data/cad-data.json`):

```jsonc
{ "type": "citation_issued", "citation": {
    "officer": { "callsign": "A-101", "name": "John", "identifier": "license:abc" },
    "subject": { "characterId": "ABC12345", "name": "Jamie Rivera", "dob": "1994-03-14" },
    "charges": [ { "charge": "Speeding", "code": "VC 22350", "fine": 250, "counts": 1, "type": "INFRACTION" } ],
    "vehicle": { "plate": "8JR123" }, "location": { "street": "Route 68", "postal": "2034" },
    "notes": "...", "externalId": "ticket-991" } }
```

The citation result is `{ recordId, recordNumber, officer, officerLinked, linkedCivilian, subjectName, total }`, or `{ duplicate: true, ... }` when the same `externalId` was already filed. A new license or vehicle result includes `created`, plus its `expirationDate` or `registrationExpiration`.

The response is `{ ok, accepted, errors: [{ index, error }], results: [{ index, result }] }`. Events in a batch are applied in order, so send a character before its licenses and vehicles.

### `POST /api/fivem/link` (CAD portal)

- `{ "action": "code", "username": "civilian1" }` returns `{ code, expiresAt }`.
- `{ "action": "unlink", "username": "civilian1" }` removes the link.

### `GET /api/fivem/outbox?since=<cursor>`

The first call takes no `since` and returns only the current `cursor`, so a restarted game server doesn't replay old commands. After that, pass back the `cursor` from the previous response.

```jsonc
{ "ok": true, "cursor": 7, "commands": [
  { "seq": 6, "at": 1732380000000, "command": { "type": "call_assigned", "callsigns": ["A-101"], "call": { "id": "000012", "code": "ASSAULT", "priority": "1", "address": "Route 68", "postal": "1234", "x": 1043.2, "y": 2671.4, "gpsApprox": true } } },
  { "seq": 7, "at": 1732380005000, "command": { "type": "notify", "message": "All units 10-3", "callsigns": [] } }
] }
```

These are the command types:

- `call_assigned`: a unit was put on a call. The resource sets a GPS waypoint to `x`/`y` (see [GPS to calls](#gps-to-calls)). `gpsApprox` is true when the position came from the postal code.
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
- **Open browser endpoints.** `/api/fivem/state`, `/api/fivem/command` and `/api/fivem/link` are unauthenticated, like the rest of the CAD API today. Add them to your auth when JWT login lands.
- **Possible next steps:**
  - waypoints for assigned calls, which needs postal → coordinates;
  - framework job sync (ESX/QBCore) so players don't have to run `/callsign` by hand;
  - vehicle colors from the framework's saved vehicle mods.
