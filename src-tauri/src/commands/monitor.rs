//! 监控命令

use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tauri::{AppHandle, Emitter};

use crate::core::monitor::{MonitorConfig, MonitorHandle, start_monitor_service};

/// 监控状态
pub struct MonitorState {
    handle: Arc<Mutex<Option<MonitorHandle>>>,
}

impl MonitorState {
    pub fn new() -> Self {
        Self {
            handle: Arc::new(Mutex::new(None)),
        }
    }
}

impl Default for MonitorState {
    fn default() -> Self {
        Self::new()
    }
}

/// 启动端口监控
#[tauri::command]
pub async fn start_monitor(
    app: AppHandle,
    interval_ms: Option<u64>,
    listen_only: Option<bool>,
    state: tauri::State<'_, MonitorState>,
) -> Result<(), String> {
    let config = MonitorConfig {
        interval_ms: interval_ms.unwrap_or(2000),
        listen_only: listen_only.unwrap_or(false),
        ..Default::default()
    };

    let mut guard = state.handle.lock().await;
    if guard.is_some() {
        return Err("监控已在运行".to_string());
    }

    let (tx, mut rx) = mpsc::channel(32);

    let handle = start_monitor_service(config, tx).await;
    *guard = Some(handle);
    drop(guard);

    // 启动事件转发任务
    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some(changes) = rx.recv().await {
            if let Err(e) = app_clone.emit("port-change", &changes) {
                tracing::error!("Failed to emit port-change event: {}", e);
            }
        }
    });

    tracing::info!("Monitor started");

    Ok(())
}

/// 停止端口监控
#[tauri::command]
pub async fn stop_monitor(state: tauri::State<'_, MonitorState>) -> Result<(), String> {
    let mut guard = state.handle.lock().await;
    if let Some(handle) = guard.take() {
        handle.stop().await;
        tracing::info!("Monitor stopped");
        return Ok(());
    }
    Err("监控未运行".to_string())
}
