-- StrataMDT bridge settings (shared with clients, so NO secrets in here).
--
-- The CAD address and API key are server-only convars. Put these in server.cfg
-- (use `set`, not `setr`, so the key is never sent to players):
--
--   set strata_cad_url "https://your-cad.up.railway.app"
--   set strata_api_key "same value as FIVEM_API_KEY on the CAD host"
--   ensure strata-mdt

Config = {}

-- How often each player reports their position to the game server (ms).
Config.TelemetryInterval = 5000

-- How often the game server pushes all unit positions to the CAD (ms).
Config.UnitUpdateInterval = 5000

-- How often the game server asks the CAD for new commands (ms).
Config.OutboxInterval = 3000

-- Heartbeat to the CAD (ms). The CAD shows "FiveM offline" after ~45s without one.
Config.HeartbeatInterval = 15000

-- Seconds a player must wait between /911 calls.
Config.Call911Cooldown = 30

-- Optional postal resource. Set to nil if you don't run one.
-- Expected export: exports[Config.PostalResource]:getPostal()
Config.PostalResource = 'nearest-postal'

-- Optional ACE permission required to use /callsign, /panic, /status,
-- /runplate and /runname (e.g. 'strata.leo'). nil = anyone can use them.
-- Grant it in server.cfg:  add_ace group.leo strata.leo allow
Config.LeoAce = nil

-- ACE permission required to change the AOP with /aop.
-- Grant it in server.cfg:  add_ace group.admin strata.aop allow
Config.AopAce = 'strata.aop'
