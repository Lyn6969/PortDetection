#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use port_detection_lib::commands;
use tauri::Manager;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn main() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("Starting Port Detection application");

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::port::scan_all_ports,
            commands::port::query_port,
            commands::process::get_process_info,
            commands::process::kill_process,
            commands::monitor::start_monitor,
            commands::monitor::stop_monitor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
