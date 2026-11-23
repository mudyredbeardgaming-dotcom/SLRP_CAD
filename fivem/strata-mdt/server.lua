-- StrataMDT bridge: server side.
-- Talks to the CAD over HTTPS. The game server always initiates requests,
-- so no inbound port needs to be opened. Protocol: fivem/README.md

local CAD_URL = (GetConvar('strata_cad_url', '')):gsub('/+$', '')
local API_KEY = GetConvar('strata_api_key', '')
local RESOURCE_VERSION = GetResourceMetadata(GetCurrentResourceName(), 'version', 0) or 'dev'

local callsigns = {}       -- [source] = 'A-101'
local telemetry = {}       -- [source] = { location = {...}, vehicle = {...} }
local last911 = {}         -- [source] = os.time()
local outboxCursor = nil   -- nil until the first poll returns the CAD's cursor
local enabled = CAD_URL ~= '' and API_KEY ~= ''

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

local function log(msg)
  print(('[strata-mdt] %s'):format(msg))
end

local function cadRequest(method, path, body, cb)
  if not enabled then return end
  PerformHttpRequest(CAD_URL .. path, function(status, text)
    local data = nil
    if text and text ~= '' then
      local ok, decoded = pcall(json.decode, text)
      if ok then data = decoded end
    end
    if status == 401 then
      log('CAD rejected the API key (401). Check strata_api_key matches FIVEM_API_KEY.')
    elseif status == 503 then
      log('CAD bridge is disabled (503). Set FIVEM_API_KEY on the CAD host.')
    elseif status == 0 then
      log(('Could not reach the CAD at %s'):format(CAD_URL))
    end
    if cb then cb(status, data) end
  end, method, body and json.encode(body) or '', {
    ['Content-Type'] = 'application/json',
    ['Authorization'] = 'Bearer ' .. API_KEY,
  })
end

local function sendEvents(events)
  cadRequest('POST', '/api/fivem/ingest', { events = events })
end

local function hasLeoAccess(src)
  return Config.LeoAce == nil or IsPlayerAceAllowed(src, Config.LeoAce)
end

local function chat(src, msg, color)
  TriggerClientEvent('chat:addMessage', src, { color = color or { 56, 195, 248 }, args = { 'StrataMDT', msg } })
end

local function normalize(callsign)
  return (tostring(callsign or '')):gsub('^%s+', ''):gsub('%s+$', ''):upper()
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
-- Player -> server events
-- ---------------------------------------------------------------------------

RegisterNetEvent('strata:setCallsign', function(callsign)
  local src = source
  if not hasLeoAccess(src) then return chat(src, 'You do not have permission to set a callsign.') end
  local cs = normalize(callsign)
  if cs == '' or #cs > 16 then return chat(src, 'Usage: /callsign A-101') end

  local previous = callsigns[src]
  callsigns[src] = cs
  if previous and previous ~= cs then sendEvents({ { type = 'unit_left', callsign = previous } }) end
  chat(src, ('Callsign set to %s. The CAD now tracks your position.'):format(cs))
end)

RegisterNetEvent('strata:telemetry', function(location, vehicle)
  local src = source
  if not callsigns[src] or type(location) ~= 'table' then return end
  telemetry[src] = { location = location, vehicle = type(vehicle) == 'table' and vehicle or nil }
end)

RegisterNetEvent('strata:911', function(message, location)
  local src = source
  message = tostring(message or ''):sub(1, 500)
  if message == '' then return chat(src, 'Usage: /911 <what is happening>') end

  local now = os.time()
  if last911[src] and now - last911[src] < Config.Call911Cooldown then
    return chat(src, ('Please wait %ds before calling 911 again.'):format(Config.Call911Cooldown - (now - last911[src])))
  end
  last911[src] = now

  sendEvents({ {
    type = 'call_911',
    caller = GetPlayerName(src),
    description = message,
    location = type(location) == 'table' and location or nil,
    serverId = src,
  } })
  chat(src, 'Your 911 call has been sent to dispatch.')
end)

RegisterNetEvent('strata:panic', function(location)
  local src = source
  local cs = callsigns[src]
  if not hasLeoAccess(src) then return end
  if not cs then return chat(src, 'Set your callsign first: /callsign A-101') end

  sendEvents({ {
    type = 'panic',
    callsign = cs,
    officer = GetPlayerName(src),
    location = type(location) == 'table' and location or nil,
  } })
  chat(src, 'PANIC sent to dispatch.', { 239, 68, 68 })
end)

local VALID_STATUS = { available = true, busy = true, unavailable = true, enroute = true, onscene = true }

RegisterNetEvent('strata:status', function(status)
  local src = source
  local cs = callsigns[src]
  status = tostring(status or ''):lower()
  if not hasLeoAccess(src) then return end
  if not cs then return chat(src, 'Set your callsign first: /callsign A-101') end
  if not VALID_STATUS[status] then
    return chat(src, 'Usage: /status available|busy|unavailable|enroute|onscene')
  end
  sendEvents({ { type = 'unit_status', callsign = cs, status = status } })
  chat(src, ('Status set to %s.'):format(status))
end)

AddEventHandler('playerDropped', function()
  local src = source
  if callsigns[src] then sendEvents({ { type = 'unit_left', callsign = callsigns[src] } }) end
  callsigns[src], telemetry[src], last911[src] = nil, nil, nil
end)

-- ---------------------------------------------------------------------------
-- Server commands
-- ---------------------------------------------------------------------------

RegisterCommand('aop', function(src, args)
  if src ~= 0 and not IsPlayerAceAllowed(src, Config.AopAce) then
    return chat(src, 'You do not have permission to change the AOP.')
  end
  local aop = table.concat(args, ' ')
  if aop == '' then return chat(src, 'Usage: /aop <area>') end
  local by = src == 0 and 'console' or GetPlayerName(src)
  sendEvents({ { type = 'aop_update', aop = aop, setBy = by } })
  TriggerClientEvent('strata:aop', -1, aop)
end, false)

RegisterCommand('runplate', function(src, args)
  if src == 0 or not hasLeoAccess(src) then return end
  local plate = (args[1] or ''):upper()
  if plate == '' then return chat(src, 'Usage: /runplate <plate>') end

  cadRequest('GET', '/api/fivem/lookup?plate=' .. plate:gsub('[^%w]', ''), nil, function(status, data)
    if status ~= 200 or not data then return chat(src, 'Lookup failed.') end
    if #data.results == 0 then return chat(src, ('%s: no registration on file.'):format(plate)) end
    for _, v in ipairs(data.results) do
      local flags = (#(v.flags or {}) > 0) and (' | FLAGS: %d'):format(#v.flags) or ''
      chat(src, ('%s: %s %s %s (%s) | Owner: %s | %s%s'):format(
        v.plate, v.year or '', v.make or '', v.model or '', v.color or '?', v.owner or '?', v.status or '?', flags))
    end
  end)
end, false)

RegisterCommand('runname', function(src, args)
  if src == 0 or not hasLeoAccess(src) then return end
  local name = table.concat(args, ' ')
  if name == '' then return chat(src, 'Usage: /runname <first last>') end

  local encoded = name:gsub('[^%w ]', ''):gsub(' ', '%%20')
  cadRequest('GET', '/api/fivem/lookup?name=' .. encoded, nil, function(status, data)
    if status ~= 200 or not data then return chat(src, 'Lookup failed.') end
    if #data.results == 0 then return chat(src, ('%s: no record on file.'):format(name)) end
    for _, p in ipairs(data.results) do
      local license = (p.licenses and p.licenses[1]) and (p.licenses[1].status or '?') or 'NONE'
      local flags = (#(p.flags or {}) > 0) and (' | FLAGS: %d'):format(#p.flags) or ''
      chat(src, ('%s | DOB %s | License: %s%s'):format(p.name, p.dob or '?', license, flags))
    end
  end)
end, false)

-- ---------------------------------------------------------------------------
-- Loops
-- ---------------------------------------------------------------------------

-- Heartbeat: lets the CAD show the server as connected.
CreateThread(function()
  if not enabled then
    log('Disabled: set strata_cad_url and strata_api_key in server.cfg.')
    return
  end
  log(('Bridging to %s'):format(CAD_URL))
  while true do
    sendEvents({ {
      type = 'heartbeat',
      serverName = GetConvar('sv_projectName', GetConvar('sv_hostname', 'FiveM')),
      playerCount = #GetPlayers(),
      maxPlayers = GetConvarInt('sv_maxclients', 48),
      resourceVersion = RESOURCE_VERSION,
    } })
    Wait(Config.HeartbeatInterval)
  end
end)

-- Unit positions: one batched request for everyone with a callsign.
CreateThread(function()
  if not enabled then return end
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
    if #units > 0 then sendEvents({ { type = 'unit_update', units = units } }) end
  end
end)

-- CAD -> game commands.
local function handleCommand(cmd)
  if cmd.type == 'call_assigned' then
    sendToCallsigns(cmd.callsigns, 'strata:callAssigned', cmd.call)
  elseif cmd.type == 'call_closed' then
    sendToCallsigns(cmd.callsigns, 'strata:notify', ('Cleared from call #%s.'):format(cmd.callId))
  elseif cmd.type == 'unit_status' then
    sendToCallsigns({ cmd.callsign }, 'strata:notify', ('CAD status: %s'):format(cmd.status))
  elseif cmd.type == 'notify' then
    if cmd.callsigns and #cmd.callsigns > 0 then
      sendToCallsigns(cmd.callsigns, 'strata:notify', cmd.message)
    else
      TriggerClientEvent('strata:notify', -1, cmd.message)
    end
  elseif cmd.type == 'aop_update' then
    TriggerClientEvent('strata:aop', -1, cmd.aop)
  end
end

CreateThread(function()
  if not enabled then return end
  local inFlight = false
  while true do
    -- Never overlap polls, or a slow response could deliver a command twice.
    if not inFlight then
      inFlight = true
      local path = '/api/fivem/outbox' .. (outboxCursor and ('?since=' .. outboxCursor) or '')
      cadRequest('GET', path, nil, function(status, data)
        inFlight = false
        if status ~= 200 or not data then return end
        for _, entry in ipairs(data.commands or {}) do
          local ok, err = pcall(handleCommand, entry.command)
          if not ok then log(('Failed to handle command: %s'):format(err)) end
        end
        outboxCursor = data.cursor
      end)
    end
    Wait(Config.OutboxInterval)
  end
end)
