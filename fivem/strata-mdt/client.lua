-- StrataMDT bridge: client side.
-- Collects the player's location, handles notifications from the CAD, and
-- resolves vehicle model names for the character sync.

local callsign = GetResourceKvpString('strata_callsign')

local function notify(msg)
  BeginTextCommandThefeedPost('STRING')
  AddTextComponentSubstringPlayerName(msg)
  EndTextCommandThefeedPostTicker(false, true)
end

local function getPostal()
  local res = Config.PostalResource
  if not res or GetResourceState(res) ~= 'started' then return nil end
  local ok, postal = pcall(function() return exports[res]:getPostal() end)
  if not ok or postal == nil then return nil end
  if type(postal) == 'table' then postal = postal.code or postal[1] end
  return postal and tostring(postal) or nil
end

local function getLocation()
  local ped = PlayerPedId()
  local c = GetEntityCoords(ped)
  local streetHash, crossHash = GetStreetNameAtCoord(c.x, c.y, c.z)
  local cross = crossHash ~= 0 and GetStreetNameFromHashKey(crossHash) or nil
  return {
    street = GetStreetNameFromHashKey(streetHash),
    crossStreet = (cross ~= '' and cross) or nil,
    zone = GetLabelText(GetNameOfZone(c.x, c.y, c.z)),
    postal = getPostal(),
    x = math.floor(c.x * 10) / 10,
    y = math.floor(c.y * 10) / 10,
    z = math.floor(c.z * 10) / 10,
    heading = math.floor(GetEntityHeading(ped)),
  }
end

local function getVehicle()
  local ped = PlayerPedId()
  if not IsPedInAnyVehicle(ped, false) then return nil end
  local veh = GetVehiclePedIsIn(ped, false)
  return {
    model = GetDisplayNameFromVehicleModel(GetEntityModel(veh)),
    plate = (GetVehicleNumberPlateText(veh) or ''):gsub('^%s+', ''):gsub('%s+$', ''),
    speed = math.floor(GetEntitySpeed(veh) * 2.236936), -- mph
  }
end

-- Restore the saved callsign when the player joins.
CreateThread(function()
  while not NetworkIsPlayerActive(PlayerId()) do Wait(500) end
  if callsign and callsign ~= '' and #Strata.CommandNames('callsign') > 0 then
    TriggerServerEvent('strata:setCallsign', callsign)
  end
end)

-- Position reports (only while on duty with a callsign).
CreateThread(function()
  while true do
    Wait(Config.TelemetryInterval)
    if callsign and callsign ~= '' then
      TriggerServerEvent('strata:telemetry', getLocation(), getVehicle())
    end
  end
end)

-- ---------------------------------------------------------------------------
-- Commands (names, aliases and on/off come from Config.Commands)
-- ---------------------------------------------------------------------------

local function suggest(key, help, params)
  for _, name in ipairs(Strata.CommandNames(key)) do
    TriggerEvent('chat:addSuggestion', '/' .. name, help, params)
  end
end

Strata.RegisterCommand('callsign', function(_, args)
  local cs = (args[1] or ''):upper()
  if cs == '' then return notify(('Usage: /%s A-101  (or /%s off)'):format(Config.Commands.callsign.name, Config.Commands.callsign.name)) end
  if cs == 'OFF' then
    callsign = nil
    DeleteResourceKvp('strata_callsign')
    TriggerServerEvent('strata:clearCallsign')
    return notify('Callsign cleared. The CAD no longer tracks you.')
  end
  callsign = cs
  SetResourceKvp('strata_callsign', cs)
  TriggerServerEvent('strata:setCallsign', cs)
end)

Strata.RegisterCommand('call911', function(_, args)
  TriggerServerEvent('strata:911', table.concat(args, ' '), getLocation())
end)

Strata.RegisterCommand('panic', function()
  TriggerServerEvent('strata:panic', getLocation())
end)

Strata.RegisterCommand('status', function(_, args)
  TriggerServerEvent('strata:status', args[1])
end)

-- /10-8, /10-23 ... shortcuts
if Config.StatusShortcutCommands and Config.Commands.status and Config.Commands.status.enabled ~= false then
  for word in pairs(Config.StatusAliases) do
    if word:sub(1, 3) == '10-' then
      RegisterCommand(word, function() TriggerServerEvent('strata:status', word) end, false)
      TriggerEvent('chat:addSuggestion', '/' .. word, ('Set CAD status: %s'):format(Config.StatusAliases[word]))
    end
  end
end

suggest('callsign', 'Set your CAD callsign', { { name = 'callsign', help = 'e.g. A-101, or "off"' } })
suggest('call911', 'Call 911', { { name = 'message', help = 'What is happening?' } })
suggest('panic', 'Send a PANIC alert to dispatch')
suggest('status', 'Set your CAD status', { { name = 'status', help = 'available | busy | unavailable | enroute | onscene, or a 10-code' } })
suggest('runplate', 'Run a plate through the CAD', { { name = 'plate', help = 'Plate number' } })
suggest('runname', 'Run a name through the CAD', { { name = 'name', help = 'First Last' } })
suggest('aop', 'Set the area of play', { { name = 'area', help = 'e.g. Blaine County' } })
suggest('linkcad', 'Link your CAD account', { { name = 'code', help = 'Code from the CAD civilian portal' } })
suggest('cadsync', 'Send your current character, licenses and vehicles to the CAD')
suggest('callgps', 'Set your GPS to your assigned call again')
suggest('cite', 'Write a citation (filed in the CAD)', { { name = 'player id', help = 'Server id of the person' }, { name = 'fine', help = 'Amount' }, { name = 'offense', help = 'e.g. Speeding 45 in a 35' } })
suggest('dlexpiry', 'Set your driver license expiration date', { { name = 'date', help = 'YYYY-MM-DD, or "auto" for one year from today' } })
suggest('regexpiry', 'Set a vehicle registration expiration date', { { name = 'plate', help = 'Plate number' }, { name = 'date', help = 'YYYY-MM-DD, or "auto" for one year from today' } })

-- ---------------------------------------------------------------------------
-- CAD -> player
-- ---------------------------------------------------------------------------

RegisterNetEvent('strata:notify', function(msg)
  notify(tostring(msg))
end)

-- GPS to the assigned call (Config.Waypoints)
local currentCall = nil

local function setCallWaypoint(call, manual)
  if type(call) ~= 'table' or type(call.x) ~= 'number' or type(call.y) ~= 'number' then
    if manual then notify('~y~GPS~s~ This call has no map location (no postal).') end
    return false
  end
  SetNewWaypoint(call.x + 0.0, call.y + 0.0)
  if manual then
    notify(('~b~GPS~s~ Route set to call #%s%s'):format(call.id or '?', call.gpsApprox and ' (postal)' or ''))
  end
  return true
end

RegisterNetEvent('strata:callCleared', function(callId)
  if not currentCall or tostring(currentCall.id) ~= tostring(callId) then return end
  currentCall = nil
  if Config.Waypoints and Config.Waypoints.clearOnClose ~= false and IsWaypointActive() then
    SetWaypointOff()
  end
end)

Strata.RegisterCommand('callgps', function()
  if not currentCall then return notify('You are not assigned to a call.') end
  setCallWaypoint(currentCall, true)
end)

RegisterNetEvent('strata:callAssigned', function(call)
  if type(call) ~= 'table' then return end
  currentCall = call
  local gps = Config.Waypoints and Config.Waypoints.enabled ~= false and setCallWaypoint(call, false)
  local where = call.address or ''
  if call.postal and call.postal ~= '' then where = ('%s (Postal %s)'):format(where, call.postal) end
  notify(('~b~CAD~s~ Assigned to #%s: ~y~%s~s~ %s%s'):format(call.id or '?', call.code or 'CALL', where,
    gps and (call.gpsApprox and ' ~g~GPS set (postal)~s~' or ' ~g~GPS set~s~') or ''))
  PlaySoundFrontend(-1, 'Event_Start_Text', 'GTAO_FM_Events_Soundset', false)
end)

-- New license / registration: let the player keep the automatic date or pick one.
-- Uses ox_lib's date picker when available, otherwise explains the chat command.
local expiryQueue, expiryBusy = {}, false

local function askExpiry(c)
  if c.useOxLib and GetResourceState('ox_lib') == 'started' then
    local ok, input = pcall(function()
      return exports.ox_lib:inputDialog(('%s expiration'):format(c.title or 'Record'), {
        { type = 'checkbox', label = ('Use automatic date (%s, one year from today)'):format(c.current or 'one year'), checked = true },
        { type = 'date', label = 'Or pick your own date', icon = 'calendar', format = 'YYYY-MM-DD', returnString = true, default = c.current },
      })
    end)
    if ok then
      -- Closed / cancelled: keep the automatic date
      if input and input[1] == false and input[2] then
        TriggerServerEvent('strata:setExpiry', c.kind, c.key, input[2])
      end
      return
    end
  end
  TriggerEvent('chat:addMessage', { color = { 56, 195, 248 }, args = { Config.ChatPrefix,
    ('%s added to the CAD, expiring %s (one year from today). To pick your own date: %s'):format(c.title or 'Record', c.current or '?', c.command or '') } })
end

RegisterNetEvent('strata:chooseExpiry', function(c)
  if type(c) ~= 'table' then return end
  expiryQueue[#expiryQueue + 1] = c
  if expiryBusy then return end
  expiryBusy = true
  CreateThread(function()
    while #expiryQueue > 0 do
      askExpiry(table.remove(expiryQueue, 1))
      Wait(250)
    end
    expiryBusy = false
  end)
end)

RegisterNetEvent('strata:aop', function(aop)
  notify(('~b~AOP~s~ is now ~y~%s'):format(tostring(aop)))
end)

-- ---------------------------------------------------------------------------
-- Character sync helper: model -> { model = "Sultan", make = "Karin", class = 1 }
-- ---------------------------------------------------------------------------

local function label(key)
  if not key or key == '' then return nil end
  local text = GetLabelText(key)
  if text == 'NULL' then return key end
  return text
end

RegisterNetEvent('strata:resolveModels', function(id, models)
  local out = {}
  for i, m in ipairs(models or {}) do
    local hash = type(m) == 'number' and m or GetHashKey(tostring(m))
    local entry = {}
    if hash ~= 0 and IsModelInCdimage(hash) then
      local display = GetDisplayNameFromVehicleModel(hash)
      if display and display ~= 'CARNOTFOUND' then entry.model = label(display) end
      entry.make = label(GetMakeNameFromVehicleModel(hash))
      entry.class = GetVehicleClassFromName(hash)
    end
    out[i] = entry
  end
  TriggerServerEvent('strata:resolvedModels', id, out)
end)
