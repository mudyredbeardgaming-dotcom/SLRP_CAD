fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'strata-mdt'
description 'StrataMDT CAD bridge: unit locations, 911, panic, AOP, lookups and character/license/vehicle sync'
version '0.2.0'

shared_scripts {
  'config.lua',
  'shared.lua',
}
server_scripts {
  'server.lua',
  'server_sync.lua',
}
client_script 'client.lua'
