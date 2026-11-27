//! StrataMDT desktop shell.
//!
//! The window opens the launcher (desktop/src), which:
//!   1. checks GitHub Releases for a newer version of this app and, if there
//!      is one, downloads it, installs it and restarts before going further;
//!   2. opens the CAD server the user picked (saved after the first launch).
//!
//! All the CAD itself runs on the server, so the CAD's own changes show up as
//! soon as the server is updated; this shell only needs updating when the
//! desktop app changes.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running StrataMDT");
}
