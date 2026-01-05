//! 获取 Windows 系统保留端口范围（Hyper-V 等）

use std::process::Command;
use crate::models::{AppResult, AppError};
use serde::{Deserialize, Serialize};

/// 保留端口范围
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReservedPortRange {
    pub start_port: u16,
    pub end_port: u16,
    pub is_admin: bool,  // 是否为管理的端口排除
}

impl ReservedPortRange {
    /// 检查端口是否在此范围内
    pub fn contains(&self, port: u16) -> bool {
        port >= self.start_port && port <= self.end_port
    }
}

/// 获取 TCP 保留端口范围
pub fn get_reserved_tcp_ports() -> AppResult<Vec<ReservedPortRange>> {
    get_reserved_ports("tcp")
}

/// 获取 UDP 保留端口范围
pub fn get_reserved_udp_ports() -> AppResult<Vec<ReservedPortRange>> {
    get_reserved_ports("udp")
}

/// 获取保留端口范围
fn get_reserved_ports(protocol: &str) -> AppResult<Vec<ReservedPortRange>> {
    let output = Command::new("netsh")
        .args(["interface", "ipv4", "show", "excludedportrange", &format!("protocol={}", protocol)])
        .output()
        .map_err(|e| AppError::Internal(format!("执行 netsh 失败: {}", e)))?;

    if !output.status.success() {
        return Err(AppError::Internal(format!(
            "netsh 命令失败: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_reserved_ports(&stdout)
}

/// 解析 netsh 输出
fn parse_reserved_ports(output: &str) -> AppResult<Vec<ReservedPortRange>> {
    let mut ranges = Vec::new();
    let mut in_data_section = false;

    for line in output.lines() {
        let line = line.trim();

        // 跳过空行和标题
        if line.is_empty() {
            continue;
        }

        // 检测到分隔线后开始解析数据
        if line.starts_with("---") || line.starts_with("----------") {
            in_data_section = true;
            continue;
        }

        if !in_data_section {
            continue;
        }

        // 跳过注释行
        if line.starts_with('*') {
            continue;
        }

        // 解析端口范围行，格式如: "1366        1465" 或 "1366        1465     *"
        let is_admin = line.ends_with('*');
        let line_clean = line.trim_end_matches('*').trim();

        let parts: Vec<&str> = line_clean.split_whitespace().collect();
        if parts.len() >= 2 {
            if let (Ok(start), Ok(end)) = (parts[0].parse::<u16>(), parts[1].parse::<u16>()) {
                ranges.push(ReservedPortRange {
                    start_port: start,
                    end_port: end,
                    is_admin,
                });
            }
        }
    }

    Ok(ranges)
}

/// 检查端口是否被保留
pub fn is_port_reserved(port: u16, protocol: &str) -> AppResult<bool> {
    let ranges = get_reserved_ports(protocol)?;
    Ok(ranges.iter().any(|r| r.contains(port)))
}

/// 检查端口是否被 TCP 保留
pub fn is_tcp_port_reserved(port: u16) -> AppResult<bool> {
    is_port_reserved(port, "tcp")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_reserved_ports() {
        let output = r#"
协议 tcp 端口排除范围

开始端口    结束端口
----------    --------
      1366        1465
      5985        5985
     50000       50059     *

* - 管理的端口排除。
"#;
        let ranges = parse_reserved_ports(output).unwrap();
        assert_eq!(ranges.len(), 3);
        assert_eq!(ranges[0].start_port, 1366);
        assert_eq!(ranges[0].end_port, 1465);
        assert!(!ranges[0].is_admin);
        assert!(ranges[2].is_admin);
    }
}
