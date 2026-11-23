-- StrataMDT bridge: server side (live units, 911, panic, AOP, lookups, account linking).
-- Character/license/vehicle sync lives in server_sync.lua.
-- Talks to the CAD over HTTPS. The game server always initiates requests,
-- so no inbound port needs to be opened. Protocol: fivem/README.md

local CAD_URL = (GetConvar('strata_cad_url', '')):gsub('/+$', '')
local API_KEY = GetConvar('strata_api_key', '')
local RESOURCE_VERSION = GetResourceMetadata(GetCurrentResourceName(), 'version', 0) or 'dev'

local callsigns = {}       -- [source] = 'A-101'
local telemetry = {}       -- [source] = { location = {...}, vehicle = {...} }
local last911 = {}         -- [source] = os.time()
local outboxCursor = nil   -- nil until the first poll returns the CAD's cursor

Strata.Enabled = CAD_URL ~= '' and API_KEY ~= ''

-- ---------------------------------------------------------------------------
-- Helpers (also used by server_sync.lua)
-- ---------------------------------------------------------------------------

function Strata.Log(msg)
  print(('[strata-mdt] %s'):format(msg))
end

function Strata.Request(method, path, body, cb)
  if not Strata.Enabled then
    if cb then cb(0, nil) end
    return
  end
  PerformHttpRequest(CAD_URL .. path, function(status, text)
    local data = nil
    if text and text ~= '' then
      local ok, decoded = pcall(json.decode, text)
      if ok then data = decoded end
    end
    if status == 401 then
      Strata.Log('CAD rejected the API key (401). Check strata_api_key matches FIVEM_API_KEY.')
    elseif status == 503 then
      Strata.Log('CAD bridge is disabled (503). Set FIVEM_API_KEY on the CAD host.')
    elseif status == 0 then
      Strata.Log(('Could not reach the CAD at %s'):format(CAD_URL))
    end
    if Config.Debug and data and data.errors and #data.errors > 0 then
      Strata.Log(('CAD errors: %s'):format(json.encode(data.errors)))
    end
    if cb then cb(status, data) end
  end, method, body and json.encode(body) or '', {
    ['Content-Type'] = 'application/json',
    ['Authorization'] = 'Bearer ' .. API_KEY,
  })
end

--- POST events to /api/fivem/ingest. cb(status, response) is optional.
function Strata.SendEvents(events, cb)
  Strata.Request('POST', '/api/fivem/ingest', { events = events }, cb)
end

--- Is this player allowed to use a command key from Config.Commands?
function Strata.Allowed(src, key)
  local c = Config.Commands[key]
  if not c or c.enabled == false then return false end
  if src == 0 then return true end
  if c.ace then return IsPlayerAceAllowed(src, c.ace) end
  if c.leo and Config.LeoAce then return IsPlayerAceAllowed(src, Config.LeoAce) end
  return true
end

function Strata.Chat(src, msg, color)
  if src == 0 then return Strata.Log(msg) end
  TriggerClientEvent('chat:addMessage', src, { color = color or { 56, 195, 248 }, args = { Config.ChatPrefix, msg } })
end

--- The player's identity for the CAD: primary identifier + other non-IP identifiers.
function Strata.GetOwner(src)
  local wanted = (Config.CharacterSync.identifier or 'license') .. ':'
  local primary, all = nil, {}
  for _, id in ipairs(GetPlayerIdentifiers(src)) do
    if not id:find('^ip:') then
      all[#all + 1] = id
      if not primary and id:sub(1, #wanted) == wanted then primary = id end
    end
  end
  return { identifier = primary or all[1], identifiers = all, name = GetPlayerName(src) }
end

--- Main command name for a key (for help messages), e.g. "/callsign".
local function cmd(key)
  local c = Config.Commands[key]
  return '/' .. ((c and c.name) or key)
end
Strata.Cmd = cmd

local function normalize(callsign)
  return (tostring(callsign or ''):gsub('^%s+', ''):gsub('%s+$', '')):upper()
end

--- The callsign a player set with /callsign, or nil.
function Strata.GetCallsign(src)
  return callsigns[tonumber(src)]
end

--- Last location a player reported (only while they have a callsign), or nil.
function Strata.GetLocation(src)
  local t = telemetry[tonumber(src)]
  return t and t.location or nil
end

-- Every player currently using a callsign (several players may share one).
local function sourcesForCallsign(callsign)
  local wanted, found = normalize(callsign), {}
  for src, cs in pairs(callsigns) do
    if cs == wanted then found[#found + 1] = src end
  end
  return found
end

local function sendToCallsigns(list, eventName, payload)
  for _, cs in ipairs(list or {}) do
    for _, src in ipairs(sourcesForCallsign(cs)) do
      TriggerClientEvent(eventName, src, payload)
    end
  end
end

-- ---------------------------------------------------------------------------
-- Player -> server events (client-side commands land here)
-- ---------------------------------------------------------------------------

RegisterNetEvent('strata:setCallsign', function(callsign)
  local src = source
  if not Strata.Allowed(src, 'callsign') then return Strata.Chat(src, 'You do not have permission to set a callsign.') end
  local cs = normalize(callsign)
  if cs == '' or #cs > 16 then return Strata.Chat(src, ('Usage: %s A-101'):format(cmd('callsign'))) end

  local previous = callsigns[src]
  callsigns[src] = cs
  if previous and previous ~= cs then Strata.SendEvents({ { type = 'unit_left', callsign = previous } }) end
  Strata.Chat(src, ('Callsign set to %s. The CAD now tracks your position.'):format(cs))
end)

RegisterNetEvent('strata:clearCallsign', function()
  local src = source
  if callsigns[src] then Strata.SendEvents({ { type = 'unit_left', callsign = callsigns[src] } }) end
  callsigns[src], telemetry[src] = nil, nil
end)

RegisterNetEvent('strata:telemetry', function(location, vehicle)
  local src = source
  if not callsigns[src] or type(location) ~= 'table' then return end
  telemetry[src] = { location = location, vehicle = type(vehicle) == 'table' and vehicle or nil }
end)

RegisterNetEvent('strata:911', function(message, location)
  local src = source
  if not Strata.Allowed(src, 'call911') then return end
  message = tostring(message or ''):sub(1, 500)
  if message == '' then return Strata.Chat(src, ('Usage: %s <what is happening>'):format(cmd('call911'))) end

  local now = os.time()
  if last911[src] and now - last911[src] < Config.Call911Cooldown then
    return Strata.Chat(src, ('Please wait %ds before calling 911 again.'):format(Config.Call911Cooldown - (now - last911[src])))
  end
  last911[src] = now

  Strata.SendEvents({ {
    type = 'call_911',
    caller = GetPlayerName(src),
    description = message,
    location = type(location) == 'table' and location or nil,
    serverId = src,
  } })
  Strata.Chat(src, 'Your 911 call has been sent to dispatch.')
end)

RegisterNetEvent('strata:panic', function(location)
  local src = source
  local cs = callsigns[src]
  if not Strata.Allowed(src, 'panic') then return end
  if not cs then return Strata.Chat(src, ('Set your callsign first: %s A-101'):format(cmd('callsign'))) end

  Strata.SendEvents({ {
    type = 'panic',
    callsign = cs,
    officer = GetPlayerName(src),
    location = type(location) == 'table' and location or nil,
  } })
  Strata.Chat(src, 'PANIC sent to dispatch.', { 239, 68, 68 })
end)

RegisterNetEvent('strata:status', function(word)
  local src = source
  local cs = callsigns[src]
  if not Strata.Allowed(src, 'status') then return end
  if not cs then return Strata.Chat(src, ('Set your callsign first: %s A-101'):format(cmd('callsign'))) end
  local status = Strata.ResolveStatus(word)
  if not status or status == 'panic' then
    return Strata.Chat(src, ('Usage: %s available|busy|unavailable|enroute|onscene (or 10-codes)'):format(cmd('status')))
  end
  Strata.SendEvents({ { type = 'unit_status', callsign = cs, status = status } })
  Strata.Chat(src, ('Status set to %s.'):format(status))
end)

AddEventHandler('playerDropped', function()
  local src = source
  if callsigns[src] then Strata.SendEvents({ { type = 'unit_left', callsign = callsigns[src] } }) end
  callsigns[src], telemetry[src], last911[src] = nil, nil, nil
end)

-- ---------------------------------------------------------------------------
-- Server commands
-- ---------------------------------------------------------------------------

Strata.RegisterCommand('aop', function(src, args)
  if not Strata.Allowed(src, 'aop') then return Strata.Chat(src, 'You do not have permission to change the AOP.') end
  local aop = table.concat(args, ' ')
  if aop == '' then return Strata.Chat(src, ('Usage: %s <area>'):format(cmd('aop'))) end
  local by = src == 0 and 'console' or GetPlayerName(src)
  Strata.SendEvents({ { type = 'aop_update', aop = aop, setBy = by } })
  TriggerClientEvent('strata:aop', -1, aop)
end)

Strata.RegisterCommand('runplate', function(src, args)
  if src == 0 or not Strata.Allowed(src, 'runplate') then return end
  local plate = (args[1] or ''):upper()
  if plate == '' then return Strata.Chat(src, ('Usage: %s <plate>'):format(cmd('runplate'))) end

  Strata.Request('GET', '/api/fivem/lookup?plate=' .. plate:gsub('[^%w]', ''), nil, function(status, data)
    if status ~= 200 or not data then return Strata.Chat(src, 'Lookup failed.') end
    if #data.results == 0 then return Strata.Chat(src, ('%s: no registration on file.'):format(plate)) end
    for _, v in ipairs(data.results) do
      local flags = (#(v.flags or {}) > 0) and (' | FLAGS: %d'):format(#v.flags) or ''
      local expired = v.registrationStatus == 'EXPIRED' or v.insuranceStatus == 'EXPIRED'
      Strata.Chat(src, ('%s: %s %s %s (%s) | Owner: %s | REG %s | INS %s%s'):format(
        v.plate, v.year or '', v.make or '', v.model or '', v.color or '?', v.owner or '?',
        v.registrationStatus or v.status or '?', v.insuranceStatus or '?', flags),
        (expired or flags ~= '') and { 245, 158, 11 } or nil)
    end
  end)
end)

Strata.RegisterCommand('runname', function(src, args)
  if src == 0 or not Strata.Allowed(src, 'runname') then return end
  local name = table.concat(args, ' ')
  if name == '' then return Strata.Chat(src, ('Usage: %s <first last>'):format(cmd('runname'))) end

  local encoded = name:gsub('[^%w ]', ''):gsub(' ', '%%20')
  Strata.Request('GET', '/api/fivem/lookup?name=' .. encoded, nil, function(status, data)
    if status ~= 200 or not data then return Strata.Chat(src, 'Lookup failed.') end
    if #data.results == 0 then return Strata.Chat(src, ('%s: no record on file.'):format(name)) end
    for _, p in ipairs(data.results) do
      local license = (p.licenses and p.licenses[1]) and (p.licenses[1].status or '?') or 'NONE'
      local flags = (#(p.flags or {}) > 0) and (' | FLAGS: %d'):format(#p.flags) or ''
      local cites = (p.citations or 0) > 0 and (' | Citations: %d'):format(p.citations) or ''
      Strata.Chat(src, ('%s | DOB %s | License: %s%s%s'):format(p.name, p.dob or '?', license, cites, flags))
    end
  end)
end)

-- /linkcad CODE: ties this player to the CAD account that generated the code.
Strata.RegisterCommand('linkcad', function(src, args)
  if src == 0 or not Strata.Allowed(src, 'linkcad') then return end
  local code = (args[1] or ''):upper()
  if code == '' then
    return Strata.Chat(src, ('Usage: %s CODE  (get a code in the CAD civilian portal)'):format(cmd('linkcad')))
  end
  Strata.SendEvents({ { type = 'account_link', code = code, owner = Strata.GetOwner(src), playerName = GetPlayerName(src) } },
    function(status, data)
      if status ~= 200 or not data then return Strata.Chat(src, 'Could not reach the CAD. Try again shortly.') end
      local result = data.results and data.results[1] and data.results[1].result
      if result then
        Strata.Chat(src, ('Linked to CAD account "%s". Your characters will sync automatically.'):format(result.username))
        if Strata.ResyncPlayer then Strata.ResyncPlayer(src, true) end
      else
        local err = data.errors and data.errors[1] and data.errors[1].error or 'Link failed.'
        Strata.Chat(src, err, { 239, 68, 68 })
      end
    end)
end)

-- ---------------------------------------------------------------------------
-- Loops
-- ---------------------------------------------------------------------------

--- Enabled command names, so the CAD can show the right ones to players.
local function commandNames()
  local out = {}
  for key, c in pairs(Config.Commands) do
    if c.enabled ~= false and c.name then out[key] = c.name end
  end
  return out
end

-- Heartbeat: lets the CAD show the server as connected.
CreateThread(function()
  if not Strata.Enabled then
    Strata.Log('Disabled: set strata_cad_url and strata_api_key in server.cfg.')
    return
  end
  Strata.Log(('Bridging to %s'):format(CAD_URL))
  while true do
    Strata.SendEvents({ {
      type = 'heartbeat',
      serverName = GetConvar('sv_projectName', GetConvar('sv_hostname', 'FiveM')),
      playerCount = #GetPlayers(),
      maxPlayers = GetConvarInt('sv_maxclients', 48),
      resourceVersion = RESOURCE_VERSION,
      commands = commandNames(),
    } })
    Wait(Config.HeartbeatInterval)
  end
end)

-- Unit positions: one batched request for everyone with a callsign.
CreateThread(function()
  if not Strata.Enabled then return end
  while true do
    Wait(Config.UnitUpdateInterval)
    local units = {}
    for src, cs in pairs(callsigns) do
      local t = telemetry[src]
      if t then
        units[#units + 1] = {
          callsign = cs,
          playerName = GetPlayerName(src),
          serverId = tonumber(src),
          location = t.location,
          vehicle = t.vehicle,
        }
      end
    end
    if #units > 0 then Strata.SendEvents({ { type = 'unit_update', units = units } }) end
  end
end)

-- CAD -> game commands.
local function handleCommand(c)
  if c.type == 'call_assigned' then
    sendToCallsigns(c.callsigns, 'strata:callAssigned', c.call)
  elseif c.type == 'call_closed' then
    sendToCallsigns(c.callsigns, 'strata:notify', ('Cleared from call #%s.'):format(c.callId))
  elseif c.type == 'unit_status' then
    sendToCallsigns({ c.callsign }, 'strata:notify', ('CAD status: %s'):format(c.status))
  elseif c.type == 'notify' then
    if c.callsigns and #c.callsigns > 0 then
      sendToCallsigns(c.callsigns, 'strata:notify', c.message)
    else
      TriggerClientEvent('strata:notify', -1, c.message)
    end
  elseif c.type == 'aop_update' then
    TriggerClientEvent('strata:aop', -1, c.aop)
  end
end

CreateThread(function()
  if not Strata.Enabled then return end
  local inFlight = false
  while true do
    -- Never overlap polls, or a slow response could deliver a command twice.
    if not inFlight then
      inFlight = true
      local path = '/api/fivem/outbox' .. (outboxCursor and ('?since=' .. outboxCursor) or '')
      Strata.Request('GET', path, nil, function(status, data)
        inFlight = false
        if status ~= 200 or not data then return end
        for _, entry in ipairs(data.commands or {}) do
          local ok, err = pcall(handleCommand, entry.command)
          if not ok then Strata.Log(('Failed to handle command: %s'):format(err)) end
        end
        outboxCursor = data.cursor
      end)
    end
    Wait(Config.OutboxInterval)
  end
end)
