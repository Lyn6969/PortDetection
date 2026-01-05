//! 进程操作命令

use crate::models::ProcessInfo;
use crate::platform::windows::{win_get_process_info, win_kill_process};

/// 获取进程信息
#[tauri::command]
pub async fn get_process_info(pid: u32) -> Result<Option<ProcessInfo>, String> {
    win_get_process_info(pid).map_err(|e| e.to_string())
}

/// 终止进程
#[tauri::command]
pub async fn kill_process(pid: u32, create_time: Option<u64>) -> Result<(), String> {
    win_kill_process(pid, create_time).map_err(|e| e.to_string())
}
