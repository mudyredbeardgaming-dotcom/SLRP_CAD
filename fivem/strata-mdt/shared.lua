-- Helpers shared by client and server.

Strata = Strata or {}

--- Every enabled name (main name + aliases) for a command key in Config.Commands.
function Strata.CommandNames(key)
  local c = Config.Commands[key]
  if not c or c.enabled == false or not c.name or c.name == '' then return {} end
  local names = { c.name }
  for _, alias in ipairs(c.aliases or {}) do
    if alias and alias ~= '' then names[#names + 1] = alias end
  end
  return names
end

--- Register `handler` under every name of a command key. Returns the main name (or nil if disabled).
function Strata.RegisterCommand(key, handler)
  local names = Strata.CommandNames(key)
  for _, name in ipairs(names) do
    RegisterCommand(name, handler, false)
  end
  return names[1]
end

--- Resolve a status word ("10-8", "enroute") to a CAD status, or nil.
function Strata.ResolveStatus(word)
  if not word then return nil end
  return Config.StatusAliases[tostring(word):lower()]
end
