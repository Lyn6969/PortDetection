//! 端口扫描器

use crate::models::{AppResult, PortInfo, Protocol};
use crate::platform::{WindowsPlatform, traits::PortProvider};

/// 端口扫描器
pub struct PortScanner {
    platform: WindowsPlatform,
}

impl PortScanner {
    pub fn new() -> Self {
        Self {
            platform: WindowsPlatform::new(),
        }
    }

    /// 扫描所有端口
    pub fn scan_all(&self) -> AppResult<Vec<PortInfo>> {
        let mut ports = self.platform.get_all_ports()?;

        // 为每个端口附加进程信息
        for port in &mut ports {
            if let Ok(Some(process)) = crate::platform::windows::win_get_process_info(port.pid) {
                port.process = Some(process);
            }
        }

        // 按端口号排序
        ports.sort_by_key(|p| (p.port, matches!(p.protocol, Protocol::UDP)));

        Ok(ports)
    }

    /// 扫描监听端口
    pub fn scan_listening(&self) -> AppResult<Vec<PortInfo>> {
        let ports = self.scan_all()?;
        Ok(ports.into_iter().filter(|p| p.state.is_listening()).collect())
    }

    /// 查询指定端口
    pub fn query_port(&self, port: u16, protocol: Option<Protocol>) -> AppResult<Vec<PortInfo>> {
        let all_ports = self.scan_all()?;

        Ok(all_ports
            .into_iter()
            .filter(|p| {
                p.port == port && protocol.map_or(true, |proto| p.protocol == proto)
            })
            .collect())
    }

    /// 按进程 ID 查询端口
    pub fn query_by_pid(&self, pid: u32) -> AppResult<Vec<PortInfo>> {
        let all_ports = self.scan_all()?;
        Ok(all_ports.into_iter().filter(|p| p.pid == pid).collect())
    }

    /// 按进程名查询端口
    pub fn query_by_process_name(&self, name: &str) -> AppResult<Vec<PortInfo>> {
        let all_ports = self.scan_all()?;
        let name_lower = name.to_lowercase();

        Ok(all_ports
            .into_iter()
            .filter(|p| {
                p.process
                    .as_ref()
                    .map_or(false, |proc| proc.name.to_lowercase().contains(&name_lower))
            })
            .collect())
    }
}

impl Default for PortScanner {
    fn default() -> Self {
        Self::new()
    }
}
