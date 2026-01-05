//! 错误类型定义

use thiserror::Error;

/// 应用错误类型
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Windows API 错误: {0} (code: {1})")]
    WindowsApi(String, u32),

    #[error("进程不存在: PID {0}")]
    ProcessNotFound(u32),

    #[error("PID 已复用，目标进程已变更")]
    PidReused,

    #[error("受保护的系统进程，无法终止: {0}")]
    ProtectedProcess(String),

    #[error("权限不足，需要管理员权限")]
    AccessDenied,

    #[error("端口未找到: {0}")]
    PortNotFound(u16),

    #[error("监控已在运行")]
    MonitorAlreadyRunning,

    #[error("监控未运行")]
    MonitorNotRunning,

    #[error("内部错误: {0}")]
    Internal(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Result 类型别名
pub type AppResult<T> = Result<T, AppError>;
