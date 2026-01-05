//! 错误处理工具

use crate::models::AppError;

/// 从 Windows 错误码创建 AppError
pub fn from_win32_error(function: &str, code: u32) -> AppError {
    match code {
        5 => AppError::AccessDenied,
        87 => AppError::Internal(format!("{}: Invalid parameter", function)),
        _ => AppError::WindowsApi(function.to_string(), code),
    }
}
