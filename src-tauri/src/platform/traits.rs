//! 平台抽象 Traits

use crate::models::{AppResult, PortInfo, ProcessInfo, Protocol};

/// 端口信息提供者
pub trait PortProvider: Send + Sync {
    /// 获取所有 TCP 连接
    fn get_tcp_connections(&self) -> AppResult<Vec<PortInfo>>;

    /// 获取所有 UDP 端点
    fn get_udp_endpoints(&self) -> AppResult<Vec<PortInfo>>;

    /// 获取所有端口（TCP + UDP）
    fn get_all_ports(&self) -> AppResult<Vec<PortInfo>> {
        let mut ports = self.get_tcp_connections()?;
        ports.extend(self.get_udp_endpoints()?);
        Ok(ports)
    }

    /// 获取指定端口信息
    fn get_port_info(&self, port: u16, protocol: Protocol) -> AppResult<Option<PortInfo>>;
}

/// 进程操作提供者
pub trait ProcessProvider: Send + Sync {
    /// 获取进程详情
    fn get_process_info(&self, pid: u32) -> AppResult<Option<ProcessInfo>>;

    /// 终止进程
    fn kill_process(&self, pid: u32, expected_create_time: Option<u64>) -> AppResult<()>;

    /// 检查是否为受保护进程
    fn is_protected(&self, name: &str) -> bool;
}
