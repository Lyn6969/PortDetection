//! Windows 平台实现

mod tcp_table;
mod udp_table;
mod process;
pub mod reserved_ports;

use crate::models::{AppResult, PortInfo, ProcessInfo, Protocol, is_protected_process};
use crate::platform::traits::{PortProvider, ProcessProvider};

pub use tcp_table::get_tcp_table;
pub use udp_table::get_udp_table;
pub use process::{get_process_info as win_get_process_info, kill_process as win_kill_process};
pub use reserved_ports::{ReservedPortRange, get_reserved_tcp_ports, get_reserved_udp_ports, is_tcp_port_reserved};

/// Windows 平台实现
pub struct WindowsPlatform;

impl WindowsPlatform {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WindowsPlatform {
    fn default() -> Self {
        Self::new()
    }
}

impl PortProvider for WindowsPlatform {
    fn get_tcp_connections(&self) -> AppResult<Vec<PortInfo>> {
        get_tcp_table()
    }

    fn get_udp_endpoints(&self) -> AppResult<Vec<PortInfo>> {
        get_udp_table()
    }

    fn get_port_info(&self, port: u16, protocol: Protocol) -> AppResult<Option<PortInfo>> {
        let ports = match protocol {
            Protocol::TCP => self.get_tcp_connections()?,
            Protocol::UDP => self.get_udp_endpoints()?,
        };

        Ok(ports.into_iter().find(|p| p.port == port))
    }
}

impl ProcessProvider for WindowsPlatform {
    fn get_process_info(&self, pid: u32) -> AppResult<Option<ProcessInfo>> {
        win_get_process_info(pid)
    }

    fn kill_process(&self, pid: u32, expected_create_time: Option<u64>) -> AppResult<()> {
        win_kill_process(pid, expected_create_time)
    }

    fn is_protected(&self, name: &str) -> bool {
        is_protected_process(name)
    }
}
