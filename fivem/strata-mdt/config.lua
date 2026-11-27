-- StrataMDT bridge settings (shared with clients, so NO secrets in here).
--
-- The CAD address and API key are server-only convars. Put these in server.cfg
-- (use `set`, not `setr`, so the key is never sent to players):
--
--   set strata_cad_url "https://your-cad.up.railway.app"
--   set strata_api_key "same value as FIVEM_API_KEY on the CAD host"
--   ensure strata-mdt

Config = {}

-- Prefix shown on chat messages from the resource.
Config.ChatPrefix = 'StrataMDT'

-- Print CAD responses/errors to the server console.
Config.Debug = false

-- ---------------------------------------------------------------------------
-- Commands
-- ---------------------------------------------------------------------------
-- Rename any command, add aliases, or switch it off to fit your server.
--   name     the command players type (without the slash)
--   aliases  extra names for the same command
--   enabled  false = not registered at all (e.g. if another resource owns /911)
--   leo      true  = requires Config.LeoAce (when that is set)
--   ace      a specific ACE permission for this command (overrides `leo`)
Config.Commands = {
  callsign = { name = 'callsign', aliases = {},         enabled = true, leo = true },
  status   = { name = 'status',   aliases = {},         enabled = true, leo = true },
  panic    = { name = 'panic',    aliases = {},         enabled = true, leo = true },
  call911  = { name = '911',      aliases = {},         enabled = true },
  runplate = { name = 'runplate', aliases = { 'rp' },   enabled = true, leo = true },
  runname  = { name = 'runname',  aliases = { 'rn' },   enabled = true, leo = true },
  aop      = { name = 'aop',      aliases = {},         enabled = true, ace = 'strata.aop' },
  linkcad  = { name = 'linkcad',  aliases = {},         enabled = true },  -- link a CAD account: /linkcad CODE
  cadsync  = { name = 'cadsync',  aliases = {},         enabled = true },  -- push my current character to the CAD now
  cite     = { name = 'cite',     aliases = {},         enabled = true, leo = true },  -- /cite <player id> <fine> <offense>
  dlexpiry  = { name = 'dlexpiry',  aliases = {},       enabled = true },  -- /dlexpiry 2027-06-30 | auto
  regexpiry = { name = 'regexpiry', aliases = {},       enabled = true },  -- /regexpiry <plate> 2027-06-30 | auto
  callgps   = { name = 'callgps',   aliases = {},       enabled = true },  -- set the GPS to my assigned call again
}

-- ACE permission for commands marked `leo = true`. nil = anyone can use them.
-- Grant it in server.cfg:  add_ace group.leo strata.leo allow
Config.LeoAce = nil

-- Words accepted by the status command, mapped to CAD statuses
-- (available, busy, unavailable, enroute, onscene).
Config.StatusAliases = {
  available = 'available', ['10-8'] = 'available', ['108'] = 'available',
  busy = 'busy', ['10-6'] = 'busy',
  unavailable = 'unavailable', ['10-7'] = 'unavailable',
  enroute = 'enroute', ['10-76'] = 'enroute',
  onscene = 'onscene', ['10-23'] = 'onscene',
}

-- Also register each StatusAliases key that starts with "10-" as its own command
-- (e.g. /10-8, /10-23). Set false if those clash with another resource.
Config.StatusShortcutCommands = true

-- ---------------------------------------------------------------------------
-- Live units
-- ---------------------------------------------------------------------------

-- GPS to calls: when the CAD assigns a unit to a call (dispatch, self-dispatch,
-- auto-assign, or riding with a grouped unit), a waypoint is set on that
-- player's map. Calls from an in-game 911 route to the caller's position;
-- other calls route to their postal code.
Config.Waypoints = {
  enabled = true,
  -- Remove the waypoint when the unit is cleared from that call / the call closes.
  clearOnClose = true,
}

-- Traffic stops: the CAD's "Traffic Stop" button fills the plate from the
-- officer's radar plate reader (Wraith ARS 2X, wk_wars2x) and, as a fallback,
-- from the vehicle directly in front of the officer's car.
Config.PlateReader = {
  enabled = true,
  -- Listen for wk_wars2x's wk:onPlateScanned / wk:onPlateLocked events.
  wars2x = true,
  -- Forget plate reads older than this (seconds).
  maxAgeSeconds = 300,
  -- Also look for the vehicle directly ahead of the officer's car (meters; 0 = off).
  aheadDistance = 25.0,
}

-- How often each player reports their position to the game server (ms).
-- Together with UnitUpdateInterval this sets how smoothly units move on the CAD live map.
Config.TelemetryInterval = 2500

-- How often the game server pushes all unit positions to the CAD (ms).
Config.UnitUpdateInterval = 2500

-- How often the game server asks the CAD for new commands (ms).
Config.OutboxInterval = 3000

-- Heartbeat to the CAD (ms). The CAD shows "FiveM offline" after ~45s without one.
Config.HeartbeatInterval = 15000

-- Seconds a player must wait between 911 calls.
Config.Call911Cooldown = 30

-- Optional postal resource. Set to nil if you don't run one.
-- Expected export: exports[Config.PostalResource]:getPostal()
Config.PostalResource = 'nearest-postal'

-- ---------------------------------------------------------------------------
-- Character sync: in-game characters, licenses and vehicles -> CAD civilians
-- ---------------------------------------------------------------------------
-- 'auto' detects qbx_core, qb-core or es_extended. Use 'standalone' when you
-- run something else and call the exports yourself (see fivem/README.md).
Config.Framework = 'auto'

Config.CharacterSync = {
  enabled = true,

  -- Player identifier used to tie characters to a CAD account ('license', 'discord', 'fivem', 'steam').
  identifier = 'license',

  -- Seconds between license/vehicle checks for online players. Catches licenses and
  -- vehicles from any source (DMV, phone apps, dealerships, admin commands...).
  interval = 60,

  syncLicenses = true,
  syncVehicles = true,

  -- Status sent to the CAD when a license the player had is taken away in game.
  revokedLicenseStatus = 'SUSPENDED',

  -- Defaults for newly created CAD records (from the CAD's date, which runs on Pacific time).
  -- Players can pick their own date afterwards (Config.ExpiryChoice).
  licenseValidYears = 1,
  vehicleValidYears = 1,
  vehicleInsuranceStatus = 'VALID',

  -- Re-check a player right away when one of these server events fires
  -- (a few seconds later, so the other resource has finished saving).
  --   name    event name
  --   net     true if it's a client -> server event (the player is the event source)
  --   player  for server events: which argument holds the player's server id
  resyncDelay = 3000,
  resyncEvents = {
    { name = 'esx_identity:completedRegistration', player = 1 },
    { name = 'esx_license:addLicense', player = 1 },
    { name = 'qb-vehicleshop:server:buyShowroomVehicle', net = true },
    { name = 'qb-vehicleshop:server:financeVehicle', net = true },
    { name = 'qb-cityhall:server:requestId', net = true },
  },
}

-- ---------------------------------------------------------------------------
-- Expiration dates players choose
-- ---------------------------------------------------------------------------
-- When a player gets a new license or vehicle registration in the CAD, it starts
-- with the automatic date (one year from the CAD date). The player is then asked
-- to keep it or pick their own date: a date picker (ox_lib) or, without ox_lib,
-- a chat message with the commands. They can change it later with the commands too:
--   /dlexpiry 2027-06-30     /dlexpiry auto
--   /regexpiry ABC123 2027-06-30     /regexpiry ABC123 auto
Config.ExpiryChoice = {
  enabled = true,
  -- CAD license types that ask for a date. /dlexpiry sets the first one.
  licenses = { 'DRIVER LICENSE' },
  -- Ask for new vehicle registrations too.
  vehicles = true,
  -- Use ox_lib's input dialog (date picker) when ox_lib is running.
  useOxLib = true,
}

-- ---------------------------------------------------------------------------
-- Citations written in game -> CAD records
-- ---------------------------------------------------------------------------
-- A citation becomes a CITATION record in the CAD: listed under the officer's
-- records (matched by linked CAD account, then by callsign) and on the cited
-- civilian's record. Use /cite, or call exports['strata-mdt']:IssueCitation from
-- your ticket script (see fivem/README.md).
Config.Citations = {
  enabled = true,
  -- Highest fine /cite accepts for one offense.
  maxFine = 10000,
  -- Charge type for /cite: INFRACTION, MISDEMEANOR, FELONY, WARNING or CORRECTABLE.
  defaultChargeType = 'INFRACTION',
  -- Tell the cited player in chat.
  notifySubject = true,
}

-- Framework license name -> CAD license. A string is the CAD license type; a table
-- can also set class / motorcycle endorsement. false = don't send it to the CAD.
-- CAD license types: DRIVER LICENSE, PILOT LICENSE, BOAT LICENSE, FISHING LICENSE,
-- HUNTING LICENSE, MEDICAL MARIJUANA (others are stored as-is).
Config.LicenseMap = {
  -- QBCore / Qbox (PlayerData.metadata.licences)
  driver = { type = 'DRIVER LICENSE', class = 'C' },
  weapon = false,
  business = false,
  -- ESX (esx_license / esx_dmvschool)
  dmv = false,                                         -- theory test only
  drive = { type = 'DRIVER LICENSE', class = 'C' },
  drive_bike = { type = 'DRIVER LICENSE', motorcycle = 'M1' },
  drive_truck = { type = 'DRIVER LICENSE', class = 'A' },
  weapon_license = false,
  -- Common extras
  pilot = 'PILOT LICENSE',
  boat = 'BOAT LICENSE',
  fishing = 'FISHING LICENSE',
  hunting = 'HUNTING LICENSE',
}

-- SQL used to read owned vehicles / licenses (requires oxmysql). Adjust if your
-- tables differ. Each query gets the character id as its only parameter.
Config.Queries = {
  qb = {
    vehicles = 'SELECT plate, vehicle AS model FROM player_vehicles WHERE citizenid = ?',
  },
  esx = {
    licenses = 'SELECT type FROM user_licenses WHERE owner = ?',
    vehicles = 'SELECT plate, vehicle AS props FROM owned_vehicles WHERE owner = ?',
  },
}

-- GTA vehicle class -> CAD vehicle type.
Config.VehicleClassTypes = {
  [0] = 'COMPACT', [1] = 'SEDAN', [2] = 'SUV', [3] = 'COUPE', [4] = 'COUPE', [5] = 'COUPE',
  [6] = 'COUPE', [7] = 'COUPE', [8] = 'MOTORCYCLE', [9] = 'OFFROAD', [10] = 'COMMERCIAL',
  [11] = 'TRUCK', [12] = 'VAN', [13] = 'OTHER', [14] = 'MARINE', [15] = 'AIRCRAFT',
  [16] = 'AIRCRAFT', [17] = 'COMMERCIAL', [18] = 'OTHER', [19] = 'OTHER', [20] = 'COMMERCIAL', [21] = 'OTHER',
}
