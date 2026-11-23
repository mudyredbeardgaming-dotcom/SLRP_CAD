fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'strata-mdt'
description 'StrataMDT CAD bridge: unit locations, 911, panic, AOP, lookups, character/license/vehicle sync and citations'
version '0.3.0'

shared_scripts {
  'config.lua',
  'shared.lua',
}
server_scripts {
  'server.lua',
  'server_sync.lua',
  'server_citations.lua',
}
client_script 'client.lua'
