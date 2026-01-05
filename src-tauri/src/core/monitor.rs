//! 端口监控服务

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{mpsc, RwLock};
use tokio::time::interval;

use crate::core::PortScanner;
use crate::models::{AppResult, PortChange, PortInfo, Protocol};

/// 监控配置
#[derive(Debug, Clone)]
pub struct MonitorConfig {
    /// 采样间隔（毫秒）
    pub interval_ms: u64,
    /// 最大退避倍数
    pub max_backoff: u32,
    /// 是否只监控监听端口
    pub listen_only: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            interval_ms: 2000,
            max_backoff: 5,
            listen_only: false,
        }
    }
}

/// 端口监控器
pub struct PortMonitor {
    config: MonitorConfig,
    scanner: PortScanner,
    last_snapshot: HashMap<(u16, Protocol), PortInfo>,
    idle_count: u32,
}

impl PortMonitor {
    pub fn new(config: MonitorConfig) -> Self {
        Self {
            config,
            scanner: PortScanner::new(),
            last_snapshot: HashMap::new(),
            idle_count: 0,
        }
    }

    /// 执行一次扫描并返回变化
    pub fn poll(&mut self) -> AppResult<Option<PortChange>> {
        let current = if self.config.listen_only {
            self.scanner.scan_listening()?
        } else {
            self.scanner.scan_all()?
        };

        let current_map: HashMap<(u16, Protocol), PortInfo> = current
            .into_iter()
            .map(|p| ((p.port, p.protocol), p))
            .collect();

        let changes = self.diff(&current_map);

        if changes.is_empty() {
            self.idle_count = (self.idle_count + 1).min(self.config.max_backoff);
            return Ok(None);
        }

        self.idle_count = 0;
        self.last_snapshot = current_map;
        Ok(Some(changes))
    }

    /// 计算差分
    fn diff(&self, current: &HashMap<(u16, Protocol), PortInfo>) -> PortChange {
        let mut added = Vec::new();
        let mut removed = Vec::new();
        let mut changed = Vec::new();

        // 查找新增和变化的端口
        for (key, port) in current {
            match self.last_snapshot.get(key) {
                None => added.push(port.clone()),
                Some(old) => {
                    if old.pid != port.pid || old.state != port.state {
                        changed.push(port.clone());
                    }
                }
            }
        }

        // 查找移除的端口
        for (key, port) in &self.last_snapshot {
            if !current.contains_key(key) {
                removed.push(port.clone());
            }
        }

        PortChange {
            added,
            removed,
            changed,
        }
    }

    /// 动态采样间隔
    pub fn current_interval(&self) -> Duration {
        Duration::from_millis(self.config.interval_ms * (1 + self.idle_count as u64))
    }

    /// 重置状态
    pub fn reset(&mut self) {
        self.last_snapshot.clear();
        self.idle_count = 0;
    }
}

/// 监控服务句柄
pub struct MonitorHandle {
    stop_tx: mpsc::Sender<()>,
}

impl MonitorHandle {
    /// 停止监控
    pub async fn stop(&self) {
        let _ = self.stop_tx.send(()).await;
    }
}

/// 启动监控服务
pub async fn start_monitor_service(
    config: MonitorConfig,
    change_tx: mpsc::Sender<PortChange>,
) -> MonitorHandle {
    let (stop_tx, mut stop_rx) = mpsc::channel(1);
    let monitor = Arc::new(RwLock::new(PortMonitor::new(config.clone())));

    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_millis(config.interval_ms));

        loop {
            tokio::select! {
                _ = stop_rx.recv() => {
                    tracing::info!("Monitor service stopped");
                    break;
                }
                _ = ticker.tick() => {
                    let mut mon = monitor.write().await;
                    match mon.poll() {
                        Ok(Some(changes)) => {
                            if change_tx.send(changes).await.is_err() {
                                tracing::warn!("Change receiver dropped, stopping monitor");
                                break;
                            }
                        }
                        Ok(None) => {
                            // 无变化，调整下次采样间隔
                            ticker = interval(mon.current_interval());
                        }
                        Err(e) => {
                            tracing::error!("Monitor poll error: {}", e);
                        }
                    }
                }
            }
        }
    });

    MonitorHandle { stop_tx }
}
