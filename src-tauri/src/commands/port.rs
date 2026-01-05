//! 端口查询命令

use crate::core::PortScanner;
use crate::models::{PortInfo, Protocol};

#[cfg(target_os = "windows")]
use crate::platform::windows::{ReservedPortRange, get_reserved_tcp_ports, get_reserved_udp_ports, is_tcp_port_reserved};

/// 扫描所有端口
#[tauri::command]
pub async fn scan_all_ports(listen_only: Option<bool>) -> Result<Vec<PortInfo>, String> {
    let scanner = PortScanner::new();

    let result = if listen_only.unwrap_or(false) {
        scanner.scan_listening()
    } else {
        scanner.scan_all()
    };

    result.map_err(|e| e.to_string())
}

/// 查询指定端口
#[tauri::command]
pub async fn query_port(
    port: u16,
    protocol: Option<String>,
) -> Result<Vec<PortInfo>, String> {
    let scanner = PortScanner::new();

    let proto = protocol.and_then(|p| match p.to_uppercase().as_str() {
        "TCP" => Some(Protocol::TCP),
        "UDP" => Some(Protocol::UDP),
        _ => None,
    });

    scanner.query_port(port, proto).map_err(|e| e.to_string())
}

/// 获取系统保留端口范围（Hyper-V 等）
#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn get_reserved_ports() -> Result<ReservedPortsResult, String> {
    let tcp = get_reserved_tcp_ports().map_err(|e| e.to_string())?;
    let udp = get_reserved_udp_ports().map_err(|e| e.to_string())?;

    Ok(ReservedPortsResult { tcp, udp })
}

/// 检查端口是否被系统保留
#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn check_port_reserved(port: u16) -> Result<PortReservedInfo, String> {
    let tcp_reserved = is_tcp_port_reserved(port).map_err(|e| e.to_string())?;

    // 如果被保留，找出在哪个范围内
    let range = if tcp_reserved {
        get_reserved_tcp_ports()
            .ok()
            .and_then(|ranges| {
                ranges.into_iter().find(|r| r.contains(port))
            })
    } else {
        None
    };

    Ok(PortReservedInfo {
        port,
        is_reserved: tcp_reserved,
        range,
        reason: if tcp_reserved {
            Some("Hyper-V / Windows NAT 保留端口".to_string())
        } else {
            None
        },
    })
}

#[cfg(target_os = "windows")]
use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReservedPortsResult {
    pub tcp: Vec<ReservedPortRange>,
    pub udp: Vec<ReservedPortRange>,
}

#[cfg(target_os = "windows")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortReservedInfo {
    pub port: u16,
    pub is_reserved: bool,
    pub range: Option<ReservedPortRange>,
    pub reason: Option<String>,
}
