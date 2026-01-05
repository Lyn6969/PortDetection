//! 端口信息模型

use serde::{Deserialize, Serialize};
use super::ProcessInfo;

/// 协议类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
}

/// 连接状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConnectionState {
    // TCP 状态
    Closed,
    Listen,
    SynSent,
    SynReceived,
    Established,
    FinWait1,
    FinWait2,
    CloseWait,
    Closing,
    LastAck,
    TimeWait,
    DeleteTcb,
    // UDP 状态
    Bound,
    // 兜底
    Unknown(u32),
}

impl ConnectionState {
    /// 从 MIB_TCP_STATE 转换
    pub fn from_tcp_state(state: u32) -> Self {
        match state {
            1 => Self::Closed,
            2 => Self::Listen,
            3 => Self::SynSent,
            4 => Self::SynReceived,
            5 => Self::Established,
            6 => Self::FinWait1,
            7 => Self::FinWait2,
            8 => Self::CloseWait,
            9 => Self::Closing,
            10 => Self::LastAck,
            11 => Self::TimeWait,
            12 => Self::DeleteTcb,
            _ => Self::Unknown(state),
        }
    }

    /// 是否为监听状态
    pub fn is_listening(&self) -> bool {
        matches!(self, Self::Listen | Self::Bound)
    }
}

/// 端口信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    /// 端口号
    pub port: u16,
    /// 协议类型
    pub protocol: Protocol,
    /// 本地地址
    pub local_addr: String,
    /// 远程地址（TCP 连接时有效）
    pub remote_addr: Option<String>,
    /// 远程端口（TCP 连接时有效）
    pub remote_port: Option<u16>,
    /// 连接状态
    pub state: ConnectionState,
    /// 进程 ID
    pub pid: u32,
    /// 进程信息
    pub process: Option<ProcessInfo>,
}

impl PortInfo {
    /// 创建新的端口信息
    pub fn new(port: u16, protocol: Protocol, local_addr: String, pid: u32) -> Self {
        Self {
            port,
            protocol,
            local_addr,
            remote_addr: None,
            remote_port: None,
            state: ConnectionState::Unknown(0),
            pid,
            process: None,
        }
    }
}

/// 端口变化事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortChange {
    /// 新增的端口
    pub added: Vec<PortInfo>,
    /// 移除的端口
    pub removed: Vec<PortInfo>,
    /// 状态变化的端口
    pub changed: Vec<PortInfo>,
}

impl PortChange {
    pub fn is_empty(&self) -> bool {
        self.added.is_empty() && self.removed.is_empty() && self.changed.is_empty()
    }
}
