// No console window next to the app on Windows (release builds).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    strata_mdt_lib::run()
}
