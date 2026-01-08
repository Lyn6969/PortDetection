#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use port_detection_lib::commands;
#[cfg(debug_assertions)]
use tauri::Manager;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// 检查当前进程是否有管理员权限
#[cfg(windows)]
fn is_elevated() -> bool {
    use windows::Win32::Foundation::{CloseHandle, HANDLE};
    use windows::Win32::Security::{
        GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
    };
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token_handle = HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle).is_err() {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION::default();
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;

        let result = GetTokenInformation(
            token_handle,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            size,
            &mut size,
        );

        let _ = CloseHandle(token_handle);

        result.is_ok() && elevation.TokenIsElevated != 0
    }
}

/// 以管理员权限重新启动程序
#[cfg(windows)]
fn restart_as_admin() -> bool {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::core::PCWSTR;

    let exe_path = std::env::current_exe().ok();
    let exe_path = match exe_path {
        Some(p) => p,
        None => return false,
    };

    let path_wide: Vec<u16> = exe_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let verb: Vec<u16> = OsStr::new("runas")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let result = ShellExecuteW(
            None,
            PCWSTR(verb.as_ptr()),
            PCWSTR(path_wide.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
        );

        // 返回值大于 32 表示成功
        result.0 as isize > 32
    }
}

fn main() {
    // Windows: 检查并请求管理员权限
    #[cfg(windows)]
    {
        if !is_elevated() {
            // 尝试以管理员权限重新启动
            if restart_as_admin() {
                // 成功启动新进程，退出当前进程
                std::process::exit(0);
            }
            // 如果用户拒绝 UAC 提示，继续以普通权限运行
            // （功能会受限，但不阻止程序启动）
        }
    }

    // 初始化日志
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("Starting Port Detection application");

    tauri::Builder::default()
        .manage(commands::monitor::MonitorState::default())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::port::scan_all_ports,
            commands::port::query_port,
            commands::port::get_reserved_ports,
            commands::port::check_port_reserved,
            commands::process::get_process_info,
            commands::process::kill_process,
            commands::monitor::start_monitor,
            commands::monitor::stop_monitor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
