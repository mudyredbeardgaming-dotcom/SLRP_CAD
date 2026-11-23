-- StrataMDT bridge: citations written in game -> CAD records.
--
-- A citation becomes a CITATION record in the CAD. It shows under the issuing
-- officer's records (matched by their linked CAD account, then by callsign) and
-- on the cited civilian's record (matched by their synced character, then by
-- exact name).
--
-- Ways in:
--   /cite <player id> <fine> <offense...>      (Config.Commands.cite)
--   exports['strata-mdt']:IssueCitation(officerSrc, target, citation, cb?)
--   TriggerEvent('strata-mdt:issueCitation', officerSrc, target, citation)   -- server side only
-- After the CAD files it, 'strata-mdt:citationFiled' fires (officerSrc, target, result)
-- so a billing/fine script can charge the player.

local CC = Config.Citations or {}
if CC.enabled == false then return end

local CHARGE_TYPES = { INFRACTION = true, MISDEMEANOR = true, FELONY = true, WARNING = true, CORRECTABLE = true }

local function trim(s) return (tostring(s or ''):gsub('^%s+', ''):gsub('%s+$', '')) end

--- Who is being cited: a player's server id (their active character), or a table { characterId?, name, dob? }.
local function subjectFor(target)
  if type(target) == 'table' then
    return { characterId = target.characterId and tostring(target.characterId) or nil, name = target.name, dob = target.dob,
             phone = target.phone, address = target.address }
  end
  local tsrc = tonumber(target)
  if not tsrc or not GetPlayerName(tsrc) then return nil end
  local ch = Strata.GetActiveCharacter and Strata.GetActiveCharacter(tsrc) or nil
  if ch and ch.firstName then
    return { characterId = tostring(ch.id), name = trim(('%s %s'):format(ch.firstName, ch.lastName or '')), dob = ch.dob }
  end
  -- No synced character: the CAD tries an exact name match on the player name
  return { name = GetPlayerName(tsrc) }
end

local function officerFor(officerSrc, given)
  local o = type(given) == 'table' and given or {}
  local src = tonumber(officerSrc)
  if src and src > 0 and GetPlayerName(src) then
    o.callsign = o.callsign or Strata.GetCallsign(src)
    o.name = o.name or GetPlayerName(src)
    o.identifier = o.identifier or Strata.GetOwner(src).identifier
  end
  return o
end

--- File a citation. officerSrc: the officer's server id (0/nil when citation.officer is given).
--- target: cited player's server id, or a subject table. citation: see fivem/README.md.
--- cb(ok, resultOrError) is optional.
local function IssueCitation(officerSrc, target, citation, cb)
  citation = type(citation) == 'table' and citation or {}
  local subject = subjectFor(target or citation.subject)
  if not subject or (not subject.name and not subject.characterId) then
    if cb then cb(false, 'Unknown person to cite') end
    return false
  end
  local charges = {}
  for _, c in ipairs(citation.charges or {}) do
    if type(c) == 'table' and trim(c.charge) ~= '' then
      local t = tostring(c.type or CC.defaultChargeType or 'INFRACTION'):upper()
      charges[#charges + 1] = {
        charge = trim(c.charge), code = c.code, fine = tonumber(c.fine) or 0,
        counts = tonumber(c.counts) or 1, type = CHARGE_TYPES[t] and t or 'INFRACTION',
      }
    end
  end
  if #charges == 0 then
    if cb then cb(false, 'A citation needs at least one charge') end
    return false
  end

  local src = tonumber(officerSrc)
  local payload = {
    officer = officerFor(src, citation.officer),
    subject = subject,
    charges = charges,
    vehicle = citation.vehicle,
    location = citation.location or (src and Strata.GetLocation(src)) or nil,
    notes = citation.notes,
    externalId = citation.externalId and tostring(citation.externalId) or nil,
  }

  Strata.SendEvents({ { type = 'citation_issued', citation = payload } }, function(status, data)
    local result = status == 200 and data and data.results and data.results[1] and data.results[1].result
    if result then
      TriggerEvent('strata-mdt:citationFiled', src, target, result)
      if cb then cb(true, result) end
    else
      local err = (data and data.errors and data.errors[1] and data.errors[1].error) or 'Could not reach the CAD'
      if cb then cb(false, err) end
    end
  end)
  return true
end

exports('IssueCitation', IssueCitation)
AddEventHandler('strata-mdt:issueCitation', function(officerSrc, target, citation)
  IssueCitation(officerSrc, target, citation)
end)

-- /cite <player id> <fine> <offense...>
Strata.RegisterCommand('cite', function(src, args)
  if src == 0 or not Strata.Allowed(src, 'cite') then return end
  local usage = ('Usage: %s <player id> <fine> <offense>   e.g. %s 12 250 Speeding 45 in a 35'):format(Strata.Cmd('cite'), Strata.Cmd('cite'))
  local target, fine = tonumber(args[1]), tonumber(args[2])
  local offense = trim(table.concat(args, ' ', 3))
  if not target or not fine or offense == '' then return Strata.Chat(src, usage) end
  if not GetPlayerName(target) then return Strata.Chat(src, ('No player with id %d.'):format(target)) end
  if fine < 0 or fine > (CC.maxFine or 10000) then
    return Strata.Chat(src, ('Fine must be between 0 and %d.'):format(CC.maxFine or 10000))
  end

  IssueCitation(src, target, { charges = { { charge = offense, fine = fine } } }, function(ok, res)
    if not ok then return Strata.Chat(src, ('Citation not filed: %s'):format(res), { 239, 68, 68 }) end
    Strata.Chat(src, ('Citation #%s filed in the CAD for %s ($%s).'):format(res.recordNumber or '?', res.subjectName or '?', res.total or fine))
    if not res.officerLinked then
      Strata.Chat(src, ('It is not tied to your CAD account. Link it with %s, or set your callsign to your CAD unit.'):format(Strata.Cmd('linkcad')), { 245, 158, 11 })
    end
    if not res.linkedCivilian then
      Strata.Chat(src, 'The person was not found in the CAD, so it is filed under their name only.', { 245, 158, 11 })
    end
    if CC.notifySubject ~= false then
      Strata.Chat(target, ('You received a citation from %s: %s ($%s). Citation #%s.'):format(
        Strata.GetCallsign(src) or GetPlayerName(src), offense, fine, res.recordNumber or '?'), { 245, 158, 11 })
    end
  end)
end)
