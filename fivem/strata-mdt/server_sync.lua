-- StrataMDT bridge: character / license / vehicle sync -> CAD civilians.
--
-- How it finds things:
--   * Characters: the framework's "player loaded" event (and every `interval` seconds).
--   * Licenses: QBCore/Qbox metadata.licences, or the esx_license table.
--   * Vehicles: the framework's owned-vehicles table (needs oxmysql).
--   * Anything else (custom DMV/phone apps, dealerships, other frameworks): call
--     the exports at the bottom of this file. See fivem/README.md.
-- Only changes are sent; the CAD treats every update as an upsert.

if not Config.CharacterSync or not Config.CharacterSync.enabled then return end

local CS = Config.CharacterSync
local framework = 'standalone'
local QBCore, ESX = nil, nil

local active = {}       -- [src] = { id = characterId, data = character }
local synced = {}       -- [characterId] = { charSig, licenses = { [cadType] = sig }, vehicles = { [plate] = true } }
local syncing = {}      -- [src] = true while a sync runs
local lastResync = {}   -- [src] = GetGameTimer() of the last event-triggered resync

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

local function dbQuery(sql, params)
  if not sql or GetResourceState('oxmysql') ~= 'started' then return nil end
  local p = promise.new()
  exports.oxmysql:query(sql, params or {}, function(rows) p:resolve(rows or {}) end)
  return Citizen.Await(p)
end

-- Vehicle model -> display name / make / class, resolved by the player's client
-- (those natives only exist client side).
local pendingResolve, resolveSeq = {}, 0

local function resolveModels(src, models)
  if #models == 0 then return {} end
  resolveSeq = resolveSeq + 1
  local id = resolveSeq
  local p = promise.new()
  pendingResolve[id] = { src = src, p = p }
  TriggerClientEvent('strata:resolveModels', src, id, models)
  SetTimeout(5000, function()
    if pendingResolve[id] then
      pendingResolve[id] = nil
      p:resolve({})
    end
  end)
  return Citizen.Await(p)
end

RegisterNetEvent('strata:resolvedModels', function(id, results)
  local entry = pendingResolve[id]
  if not entry or entry.src ~= source then return end
  pendingResolve[id] = nil
  entry.p:resolve(type(results) == 'table' and results or {})
end)

local function mapLicense(name)
  local m = Config.LicenseMap[name]
  if m == nil then m = Config.LicenseMap[tostring(name):lower()] end
  if m == false then return nil end
  if m == nil then return { type = tostring(name):upper() } end
  if type(m) == 'string' then return { type = m } end
  return { type = m.type, class = m.class, motorcycle = m.motorcycle }
end

-- ---------------------------------------------------------------------------
-- Framework adapters: getCharacter(src), getLicenses(src, charId), getVehicles(src, charId)
-- ---------------------------------------------------------------------------

local Adapter = {}

local function qbPlayer(src)
  if framework == 'qbox' then return exports.qbx_core:GetPlayer(src) end
  return QBCore and QBCore.Functions.GetPlayer(src)
end

Adapter.qb = {
  getCharacter = function(src)
    local P = qbPlayer(src)
    if not P or not P.PlayerData then return nil end
    local pd, ci = P.PlayerData, P.PlayerData.charinfo or {}
    return { id = pd.citizenid, firstName = ci.firstname, lastName = ci.lastname, dob = ci.birthdate, gender = ci.gender, phone = ci.phone }
  end,
  getLicenses = function(src)
    local P = qbPlayer(src)
    local held = {}
    local licences = P and P.PlayerData and P.PlayerData.metadata and P.PlayerData.metadata.licences or {}
    for name, has in pairs(licences) do held[#held + 1] = { name = name, has = has and true or false } end
    return held
  end,
  getVehicles = function(_, charId)
    local rows = dbQuery(Config.Queries.qb.vehicles, { charId })
    if not rows then return nil end
    local out = {}
    for _, r in ipairs(rows) do out[#out + 1] = { plate = r.plate, model = r.model } end
    return out
  end,
}

Adapter.esx = {
  getCharacter = function(src)
    local x = ESX and ESX.GetPlayerFromId(src)
    if not x then return nil end
    local first = x.get and x.get('firstName')
    local last = x.get and x.get('lastName')
    if (not first or first == '') and x.getName then first, last = x.getName():match('^(%S+)%s*(.*)$') end
    return { id = x.identifier, firstName = first, lastName = last, dob = x.get and x.get('dateofbirth'), gender = x.get and x.get('sex') }
  end,
  getLicenses = function(_, charId)
    local rows = dbQuery(Config.Queries.esx.licenses, { charId })
    if not rows then return nil end
    local held = {}
    for _, r in ipairs(rows) do held[#held + 1] = { name = r.type, has = true } end
    return held
  end,
  getVehicles = function(_, charId)
    local rows = dbQuery(Config.Queries.esx.vehicles, { charId })
    if not rows then return nil end
    local out = {}
    for _, r in ipairs(rows) do
      local ok, props = pcall(json.decode, r.props or '{}')
      out[#out + 1] = { plate = r.plate, model = ok and props and props.model or nil }
    end
    return out
  end,
}

-- Standalone: characters come only from exports.SetCharacter.
Adapter.standalone = {
  getCharacter = function(src) return active[src] and active[src].data or nil end,
  getLicenses = function() return nil end,
  getVehicles = function() return nil end,
}

local function adapter()
  if framework == 'qbcore' or framework == 'qbox' then return Adapter.qb end
  return Adapter[framework] or Adapter.standalone
end

-- ---------------------------------------------------------------------------
-- Expiration dates players choose (Config.ExpiryChoice)
-- ---------------------------------------------------------------------------

local EC = Config.ExpiryChoice or {}
local lastExpiry = {} -- [src] = GetGameTimer()

local function stateFor(id)
  synced[id] = synced[id] or { licenses = {}, vehicles = {} }
  return synced[id]
end

local function isChoiceLicense(t)
  t = tostring(t or ''):upper()
  for _, l in ipairs(EC.licenses or {}) do
    if tostring(l):upper() == t then return true end
  end
  return false
end

--- "auto", "2027-06-30", "06/30/2027" or a date-picker timestamp (ms) -> "auto" / "YYYY-MM-DD", or nil.
local function parseExpiry(value)
  if type(value) == 'number' then
    -- ox_lib returns local midnight in ms; noon UTC of that instant lands on the picked day for UTC-12..+12
    return os.date('!%Y-%m-%d', math.floor(value / 1000) + 43200)
  end
  local s = tostring(value or ''):gsub('^%s+', ''):gsub('%s+$', ''):lower()
  if s == 'auto' then return 'auto' end
  local y, m, d = s:match('^(%d%d%d%d)[-/.](%d%d?)[-/.](%d%d?)$')
  if not y then m, d, y = s:match('^(%d%d?)[-/.](%d%d?)[-/.](%d%d%d%d)$') end
  y, m, d = tonumber(y), tonumber(m), tonumber(d)
  if not y or y < 1900 or y > 2200 or m < 1 or m > 12 or d < 1 or d > 31 then return nil end
  return ('%04d-%02d-%02d'):format(y, m, d)
end

--- After the CAD answers a sync: ask the player to pick dates for new licenses / registrations.
local function promptExpiry(src, response)
  if not EC.enabled or not src or src == 0 or type(response) ~= 'table' or type(response.results) ~= 'table' then return end
  for _, r in ipairs(response.results) do
    local res = r.result
    if type(res) == 'table' and res.created then
      local choice = nil
      if res.licenseType and isChoiceLicense(res.licenseType) then
        choice = { kind = 'license', key = res.licenseType, title = res.licenseType, current = res.expirationDate,
                   command = ('%s YYYY-MM-DD | auto'):format(Strata.Cmd('dlexpiry')) }
      elseif res.plate and EC.vehicles then
        choice = { kind = 'vehicle', key = res.plate, title = ('Vehicle registration %s'):format(res.plate), current = res.registrationExpiration,
                   command = ('%s %s YYYY-MM-DD | auto'):format(Strata.Cmd('regexpiry'), res.plate) }
      end
      if choice then
        choice.useOxLib = EC.useOxLib ~= false
        TriggerClientEvent('strata:chooseExpiry', src, choice)
      end
    end
  end
end

--- Set a license or registration expiration for the player's own character.
--- kind 'license' (key = CAD license type) or 'vehicle' (key = plate); value = date or 'auto'.
local function setExpiry(src, kind, key, value)
  src = tonumber(src)
  local a = src and active[src]
  if not a then return Strata.Chat(src, 'No active character. Try again once your character has loaded.') end
  local now = GetGameTimer()
  if lastExpiry[src] and now - lastExpiry[src] < 2000 then return end
  lastExpiry[src] = now

  local date = parseExpiry(value)
  if not date then return Strata.Chat(src, 'Use a date like 2027-06-30, or "auto" for one year from today.') end
  local st = stateFor(a.id)
  local event, what
  if kind == 'license' then
    local t = tostring(key or ''):upper()
    if not isChoiceLicense(t) then return end
    if not st.licenses[t] or st.licenses[t] == 'REVOKED' then
      return Strata.Chat(src, ('You do not hold a %s.'):format(t:lower()))
    end
    event = { type = 'license_set', characterId = a.id, license = { type = t, expires = date } }
    what = t:lower()
  elseif kind == 'vehicle' then
    if not EC.vehicles then return end
    local plate = tostring(key or ''):gsub('%s+', ''):upper()
    if plate == '' or not st.vehicles[plate] then
      return Strata.Chat(src, ('%s is not registered to your character.'):format(plate ~= '' and plate or 'That vehicle'))
    end
    event = { type = 'vehicle_register', characterId = a.id, vehicle = { plate = plate, registrationExpires = date } }
    what = ('registration for %s'):format(plate)
  else
    return
  end

  Strata.SendEvents({ event }, function(status, data)
    local res = status == 200 and data and data.results and data.results[1] and data.results[1].result
    if res then
      Strata.Chat(src, ('Your %s now expires %s.'):format(what, res.expirationDate or res.registrationExpiration or date))
    else
      local err = data and data.errors and data.errors[1] and data.errors[1].error or 'Could not reach the CAD.'
      Strata.Chat(src, err, { 239, 68, 68 })
    end
  end)
end

-- From the date picker on the player's screen. Only their own character is affected.
RegisterNetEvent('strata:setExpiry', function(kind, key, value)
  if not EC.enabled then return end
  setExpiry(source, kind, key, value)
end)

Strata.RegisterCommand('dlexpiry', function(src, args)
  if src == 0 or not Strata.Allowed(src, 'dlexpiry') or not EC.enabled then return end
  local t = (EC.licenses or {})[1]
  if not t then return end
  if not args[1] then
    return Strata.Chat(src, ('Usage: %s YYYY-MM-DD  (or "auto" for one year from today)'):format(Strata.Cmd('dlexpiry')))
  end
  setExpiry(src, 'license', t, args[1])
end)

Strata.RegisterCommand('regexpiry', function(src, args)
  if src == 0 or not Strata.Allowed(src, 'regexpiry') or not EC.enabled then return end
  if not args[1] or not args[2] then
    return Strata.Chat(src, ('Usage: %s <plate> YYYY-MM-DD  (or "auto" for one year from today)'):format(Strata.Cmd('regexpiry')))
  end
  setExpiry(src, 'vehicle', args[1], args[2])
end)

-- ---------------------------------------------------------------------------
-- Sync
-- ---------------------------------------------------------------------------

--- Build license events: merge framework licenses that map to the same CAD type,
--- and revoke CAD licenses the player no longer holds.
local function licenseEvents(id, held, st)
  local wanted = {}
  for _, l in ipairs(held) do
    local m = l.has and mapLicense(l.name) or nil
    if m and m.type then
      local cur = wanted[m.type] or { type = m.type }
      if m.class and (not cur.class or m.class < cur.class) then cur.class = m.class end -- A beats B beats C
      if m.motorcycle then cur.motorcycle = m.motorcycle end
      wanted[m.type] = cur
    end
  end

  local events = {}
  for cadType, lic in pairs(wanted) do
    lic.status = 'VALID'
    lic.validYears = CS.licenseValidYears
    local sig = json.encode({ lic.class or '', lic.motorcycle or '', 'VALID' })
    if st.licenses[cadType] ~= sig then
      events[#events + 1] = { type = 'license_set', characterId = id, license = lic }
      st.licenses[cadType] = sig
    end
  end
  for cadType, sig in pairs(st.licenses) do
    if not wanted[cadType] and sig ~= 'REVOKED' then
      events[#events + 1] = { type = 'license_set', characterId = id, license = { type = cadType, status = CS.revokedLicenseStatus } }
      st.licenses[cadType] = 'REVOKED'
    end
  end
  return events
end

local function vehicleEvents(src, id, owned, st)
  local fresh = {}
  for _, v in ipairs(owned) do
    local plate = tostring(v.plate or ''):gsub('%s+', ''):upper()
    if plate ~= '' and not st.vehicles[plate] then fresh[#fresh + 1] = { plate = plate, model = v.model } end
  end
  if #fresh == 0 then return {} end

  local models = {}
  for i, v in ipairs(fresh) do models[i] = v.model or 0 end
  local info = resolveModels(src, models)

  local events = {}
  for i, v in ipairs(fresh) do
    local r = info[i] or {}
    events[#events + 1] = {
      type = 'vehicle_register',
      characterId = id,
      vehicle = {
        plate = v.plate,
        model = r.model or (type(v.model) == 'string' and v.model:upper()) or nil,
        make = r.make,
        vehicleType = r.class and Config.VehicleClassTypes[r.class] or nil,
        insuranceStatus = CS.vehicleInsuranceStatus,
        validYears = CS.vehicleValidYears,
      },
    }
    st.vehicles[v.plate] = true
  end
  return events
end

local function doSync(src, force)
  local a = adapter()
  local ch = a.getCharacter(src)
  if not ch or not ch.id or not ch.firstName or ch.firstName == '' then return end
  local id = tostring(ch.id)
  ch.id = id
  active[src] = { id = id, data = ch }

  if force then synced[id] = nil end
  local st = stateFor(id)
  local events = {}

  local sig = json.encode({ ch.firstName, ch.lastName or '', ch.dob or '', ch.gender or '', ch.phone or '' })
  if st.charSig ~= sig then
    events[#events + 1] = { type = 'character_upsert', owner = Strata.GetOwner(src), character = ch }
    st.charSig = sig
  end

  if CS.syncLicenses then
    local held = a.getLicenses(src, id)
    if held then
      for _, e in ipairs(licenseEvents(id, held, st)) do events[#events + 1] = e end
    end
  end

  if CS.syncVehicles then
    local owned = a.getVehicles(src, id)
    if owned then
      for _, e in ipairs(vehicleEvents(src, id, owned, st)) do events[#events + 1] = e end
    end
  end

  if #events == 0 then return end
  Strata.SendEvents(events, function(status, data)
    -- Anything rejected (or a failed request) is retried on the next sync
    if status ~= 200 or not data or (data.errors and #data.errors > 0) then synced[id] = nil end
    if Config.Debug then Strata.Log(('Synced %s (%d events): %s'):format(id, #events, status)) end
    if status == 200 then promptExpiry(src, data) end
  end)
end

--- Re-check a player's character, licenses and vehicles. force = resend everything.
function Strata.ResyncPlayer(src, force)
  src = tonumber(src)
  if not src or syncing[src] then return end
  syncing[src] = true
  CreateThread(function()
    local ok, err = pcall(doSync, src, force)
    syncing[src] = nil
    if not ok then Strata.Log(('Character sync failed for %s: %s'):format(src, tostring(err))) end
  end)
end

local function resyncSoon(src)
  src = tonumber(src)
  if not src then return end
  local now = GetGameTimer()
  if lastResync[src] and now - lastResync[src] < 2000 then return end
  lastResync[src] = now
  SetTimeout(CS.resyncDelay or 3000, function() Strata.ResyncPlayer(src, false) end)
end

local function clearPlayer(src)
  src = tonumber(src)
  if not src then return end
  active[src], syncing[src], lastResync[src] = nil, nil, nil
end

-- ---------------------------------------------------------------------------
-- Startup + framework events
-- ---------------------------------------------------------------------------

AddEventHandler('QBCore:Server:PlayerLoaded', function(Player)
  local src = Player and Player.PlayerData and Player.PlayerData.source
  if src and (framework == 'qbcore' or framework == 'qbox') then Strata.ResyncPlayer(src, true) end
end)
AddEventHandler('QBCore:Server:OnPlayerUnload', function(src) clearPlayer(src) end)

AddEventHandler('esx:playerLoaded', function(playerId)
  if framework == 'esx' then Strata.ResyncPlayer(playerId, true) end
end)
AddEventHandler('esx:playerDropped', function(playerId) clearPlayer(playerId) end)

AddEventHandler('playerDropped', function() clearPlayer(source) end)

for _, e in ipairs(CS.resyncEvents or {}) do
  if e.net then
    RegisterNetEvent(e.name, function() resyncSoon(source) end)
  else
    AddEventHandler(e.name, function(...)
      local args = { ... }
      resyncSoon(args[e.player or 1])
    end)
  end
end

CreateThread(function()
  Wait(1000) -- let the framework finish starting
  local f = Config.Framework
  if f == 'auto' then
    if GetResourceState('qbx_core') == 'started' then f = 'qbox'
    elseif GetResourceState('qb-core') == 'started' then f = 'qbcore'
    elseif GetResourceState('es_extended') == 'started' then f = 'esx'
    else f = 'standalone' end
  end
  if f == 'qbcore' then QBCore = exports['qb-core']:GetCoreObject() end
  if f == 'esx' then ESX = exports['es_extended']:getSharedObject() end
  framework = f

  if (CS.syncVehicles or (CS.syncLicenses and f == 'esx')) and f ~= 'standalone' and GetResourceState('oxmysql') ~= 'started' then
    Strata.Log('oxmysql is not running: vehicle (and ESX license) sync is off.')
  end
  Strata.Log(('Character sync: %s'):format(framework))
  if not Strata.Enabled or framework == 'standalone' then return end

  -- Players already online (resource restart)
  for _, src in ipairs(GetPlayers()) do
    Strata.ResyncPlayer(src, true)
    Wait(200)
  end

  while true do
    Wait((CS.interval or 60) * 1000)
    for _, src in ipairs(GetPlayers()) do
      Strata.ResyncPlayer(src, false)
      Wait(100)
    end
  end
end)

Strata.RegisterCommand('cadsync', function(src)
  if src == 0 or not Strata.Allowed(src, 'cadsync') then return end
  if not adapter().getCharacter(src) then
    return Strata.Chat(src, 'No active character to sync.')
  end
  Strata.ResyncPlayer(src, true)
  Strata.Chat(src, 'Sending your character, licenses and vehicles to the CAD.')
end)

-- ---------------------------------------------------------------------------
-- Exports / server events for other resources (phone apps, DMV, dealerships,
-- custom frameworks). Server-side only; players cannot trigger these.
-- ---------------------------------------------------------------------------

--- Set the character a player is using (standalone frameworks, or to override).
--- character = { id, firstName, lastName, dob?, gender?, phone?, address? }
local function SetCharacter(src, character)
  src = tonumber(src)
  if not src or type(character) ~= 'table' or not character.id then return false end
  character.id = tostring(character.id)
  active[src] = { id = character.id, data = character }
  synced[character.id] = nil
  Strata.SendEvents({ { type = 'character_upsert', owner = Strata.GetOwner(src), character = character } })
  stateFor(character.id).charSig = json.encode({ character.firstName, character.lastName or '', character.dob or '', character.gender or '', character.phone or '' })
  return true
end

local function ClearCharacter(src)
  clearPlayer(src)
  return true
end

--- Add/update a license on the player's current character.
--- name: a Config.LicenseMap key (e.g. 'driver') or a CAD type (e.g. 'DRIVER LICENSE').
--- opts: { status?, class?, motorcycle?, number?, expires? ('YYYY-MM-DD' or 'auto'), restrictions? }
--- Without `expires` the player is asked to pick a date (Config.ExpiryChoice).
local function SetLicense(src, name, opts)
  src = tonumber(src)
  local a = active[src]
  if not a then return false end
  local m = mapLicense(name)
  if not m then return false end
  local lic = { type = m.type, class = m.class, motorcycle = m.motorcycle, validYears = CS.licenseValidYears }
  for k, v in pairs(opts or {}) do lic[k] = v end
  Strata.SendEvents({ { type = 'license_set', characterId = a.id, license = lic } }, function(status, data)
    -- Ask for a date only when the caller didn't pass one
    if status == 200 and not lic.expires then promptExpiry(src, data) end
  end)
  stateFor(a.id).licenses[lic.type] = json.encode({ lic.class or '', lic.motorcycle or '', (lic.status or 'VALID'):upper() })
  return true
end

--- Register a vehicle to the player's current character.
--- vehicle: { plate, model?, make?, color?, year?, vehicleType?, registrationExpires?, insuranceExpires? }
--- Dates are 'YYYY-MM-DD' or 'auto'. Without registrationExpires the player is asked to pick one.
local function RegisterVehicle(src, vehicle)
  src = tonumber(src)
  local a = active[src]
  if not a or type(vehicle) ~= 'table' or not vehicle.plate then return false end
  local plate = tostring(vehicle.plate):gsub('%s+', ''):upper()
  stateFor(a.id).vehicles[plate] = true
  CreateThread(function()
    local v = {}
    for k, val in pairs(vehicle) do v[k] = val end
    v.plate = plate
    if not v.make or not v.vehicleType then
      local r = (resolveModels(src, { v.model or 0 }) or {})[1] or {}
      v.model = r.model or v.model
      v.make = v.make or r.make
      v.vehicleType = v.vehicleType or (r.class and Config.VehicleClassTypes[r.class]) or nil
    end
    if type(v.model) == 'number' then v.model = nil end
    v.insuranceStatus = v.insuranceStatus or CS.vehicleInsuranceStatus
    v.validYears = v.validYears or CS.vehicleValidYears
    Strata.SendEvents({ { type = 'vehicle_register', characterId = a.id, vehicle = v } }, function(status, data)
      if status == 200 and not v.registrationExpires then promptExpiry(src, data) end
    end)
  end)
  return true
end

local function GetActiveCharacter(src)
  local a = active[tonumber(src)]
  return a and a.data or nil
end
Strata.GetActiveCharacter = GetActiveCharacter

exports('SetCharacter', SetCharacter)
exports('ClearCharacter', ClearCharacter)
exports('SetLicense', SetLicense)
exports('RegisterVehicle', RegisterVehicle)
exports('GetActiveCharacter', GetActiveCharacter)
exports('ResyncPlayer', function(src, force) Strata.ResyncPlayer(src, force) return true end)

AddEventHandler('strata-mdt:setCharacter', SetCharacter)
AddEventHandler('strata-mdt:clearCharacter', ClearCharacter)
AddEventHandler('strata-mdt:setLicense', SetLicense)
AddEventHandler('strata-mdt:registerVehicle', RegisterVehicle)
AddEventHandler('strata-mdt:resync', function(src) Strata.ResyncPlayer(src, true) end)
