//! 进程信息模型

use serde::{Deserialize, Serialize};

/// 进程信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    /// 进程 ID
    pub pid: u32,
    /// 进程名称
    pub name: String,
    /// 可执行文件路径
    pub exe_path: Option<String>,
    /// 命令行参数
    pub cmd_line: Option<String>,
    /// 进程创建时间（Unix 时间戳，毫秒）
    pub create_time: u64,
    /// 内存使用量（字节）
    pub memory_usage: u64,
}

impl ProcessInfo {
    /// 创建新的进程信息
    pub fn new(pid: u32, name: String) -> Self {
        Self {
            pid,
            name,
            exe_path: None,
            cmd_line: None,
            create_time: 0,
            memory_usage: 0,
        }
    }
}

/// 受保护的系统进程列表
pub const PROTECTED_PROCESSES: &[&str] = &[
    "System",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "svchost.exe",
    "winlogon.exe",
];

/// 检查进程是否受保护
pub fn is_protected_process(name: &str) -> bool {
    PROTECTED_PROCESSES.iter().any(|&p| p.eq_ignore_ascii_case(name))
}
