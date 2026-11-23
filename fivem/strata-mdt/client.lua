-- StrataMDT bridge: client side.
-- Collects the player's location and handles notifications from the CAD.

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
  if callsign and callsign ~= '' then TriggerServerEvent('strata:setCallsign', callsign) end
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
-- Commands
-- ---------------------------------------------------------------------------

RegisterCommand('callsign', function(_, args)
  local cs = (args[1] or ''):upper()
  if cs == '' then return notify('Usage: /callsign A-101  (or /callsign off)') end
  if cs == 'OFF' then
    callsign = nil
    DeleteResourceKvp('strata_callsign')
    return notify('Callsign cleared. The CAD no longer tracks you.')
  end
  callsign = cs
  SetResourceKvp('strata_callsign', cs)
  TriggerServerEvent('strata:setCallsign', cs)
end, false)

RegisterCommand('911', function(_, args)
  TriggerServerEvent('strata:911', table.concat(args, ' '), getLocation())
end, false)

RegisterCommand('panic', function()
  TriggerServerEvent('strata:panic', getLocation())
end, false)

RegisterCommand('status', function(_, args)
  TriggerServerEvent('strata:status', args[1])
end, false)

TriggerEvent('chat:addSuggestion', '/callsign', 'Set your CAD callsign', { { name = 'callsign', help = 'e.g. A-101, or "off"' } })
TriggerEvent('chat:addSuggestion', '/911', 'Call 911', { { name = 'message', help = 'What is happening?' } })
TriggerEvent('chat:addSuggestion', '/panic', 'Send a PANIC alert to dispatch')
TriggerEvent('chat:addSuggestion', '/status', 'Set your CAD status', { { name = 'status', help = 'available | busy | unavailable | enroute | onscene' } })
TriggerEvent('chat:addSuggestion', '/runplate', 'Run a plate through the CAD', { { name = 'plate', help = 'Plate number' } })
TriggerEvent('chat:addSuggestion', '/runname', 'Run a name through the CAD', { { name = 'name', help = 'First Last' } })
TriggerEvent('chat:addSuggestion', '/aop', 'Set the area of play', { { name = 'area', help = 'e.g. Blaine County' } })

-- ---------------------------------------------------------------------------
-- CAD -> player
-- ---------------------------------------------------------------------------

RegisterNetEvent('strata:notify', function(msg)
  notify(tostring(msg))
end)

RegisterNetEvent('strata:callAssigned', function(call)
  if type(call) ~= 'table' then return end
  local where = call.address or ''
  if call.postal and call.postal ~= '' then where = ('%s (Postal %s)'):format(where, call.postal) end
  notify(('~b~CAD~s~ Assigned to #%s: ~y~%s~s~ %s'):format(call.id or '?', call.code or 'CALL', where))
  PlaySoundFrontend(-1, 'Event_Start_Text', 'GTAO_FM_Events_Soundset', false)
end)

RegisterNetEvent('strata:aop', function(aop)
  notify(('~b~AOP~s~ is now ~y~%s'):format(tostring(aop)))
end)
