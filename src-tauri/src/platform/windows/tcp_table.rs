//! TCP 连接表获取

use std::alloc::{alloc, dealloc, Layout};
use std::net::{Ipv4Addr, Ipv6Addr};

use windows::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, NO_ERROR};
use windows::Win32::NetworkManagement::IpHelper::{
    GetExtendedTcpTable, MIB_TCP6ROW_OWNER_PID, MIB_TCP6TABLE_OWNER_PID,
    MIB_TCPROW_OWNER_PID, MIB_TCPTABLE_OWNER_PID, TCP_TABLE_OWNER_PID_ALL,
};
use windows::Win32::Networking::WinSock::{AF_INET, AF_INET6};

use crate::models::{AppError, AppResult, ConnectionState, PortInfo, Protocol};

/// 获取所有 TCP 连接（IPv4 + IPv6）
pub fn get_tcp_table() -> AppResult<Vec<PortInfo>> {
    let mut results = Vec::new();

    // 获取 IPv4 TCP 表
    results.extend(get_tcp_table_v4()?);

    // 获取 IPv6 TCP 表
    results.extend(get_tcp_table_v6()?);

    Ok(results)
}

/// 获取 IPv4 TCP 连接表
fn get_tcp_table_v4() -> AppResult<Vec<PortInfo>> {
    unsafe {
        let mut size: u32 = 0;

        // 第一次调用获取所需缓冲区大小
        let ret = GetExtendedTcpTable(
            None,
            &mut size,
            false,
            AF_INET.0 as u32,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );

        if ret != ERROR_INSUFFICIENT_BUFFER.0 && ret != NO_ERROR.0 {
            return Err(AppError::WindowsApi(
                "GetExtendedTcpTable (size query)".to_string(),
                ret,
            ));
        }

        // 循环重试，防止并发变化导致缓冲区不足
        loop {
            let layout = Layout::from_size_align(size as usize, 8)
                .map_err(|e| AppError::Internal(e.to_string()))?;
            let buffer = alloc(layout);

            if buffer.is_null() {
                return Err(AppError::Internal("Failed to allocate buffer".to_string()));
            }

            let ret = GetExtendedTcpTable(
                Some(buffer as *mut _),
                &mut size,
                false,
                AF_INET.0 as u32,
                TCP_TABLE_OWNER_PID_ALL,
                0,
            );

            if ret == NO_ERROR.0 {
                let result = parse_tcp_table_v4(buffer);
                dealloc(buffer, layout);
                return result;
            } else if ret == ERROR_INSUFFICIENT_BUFFER.0 {
                dealloc(buffer, layout);
                continue; // 重试
            } else {
                dealloc(buffer, layout);
                return Err(AppError::WindowsApi(
                    "GetExtendedTcpTable".to_string(),
                    ret,
                ));
            }
        }
    }
}

/// 解析 IPv4 TCP 表
unsafe fn parse_tcp_table_v4(buffer: *mut u8) -> AppResult<Vec<PortInfo>> {
    let table = &*(buffer as *const MIB_TCPTABLE_OWNER_PID);
    let count = table.dwNumEntries as usize;

    let rows_ptr = table.table.as_ptr();
    let rows = std::slice::from_raw_parts(rows_ptr, count);

    let mut results = Vec::with_capacity(count);

    for row in rows {
        let row: &MIB_TCPROW_OWNER_PID = row;

        // 端口号需要字节序转换（网络字节序 -> 主机字节序）
        let local_port = u16::from_be((row.dwLocalPort & 0xFFFF) as u16);
        let remote_port = u16::from_be((row.dwRemotePort & 0xFFFF) as u16);

        // IP 地址转换
        let local_addr = Ipv4Addr::from(row.dwLocalAddr.to_ne_bytes());
        let remote_addr = Ipv4Addr::from(row.dwRemoteAddr.to_ne_bytes());

        let mut port_info = PortInfo::new(
            local_port,
            Protocol::TCP,
            local_addr.to_string(),
            row.dwOwningPid,
        );

        port_info.state = ConnectionState::from_tcp_state(row.dwState);
        port_info.remote_addr = Some(remote_addr.to_string());
        port_info.remote_port = Some(remote_port);

        results.push(port_info);
    }

    Ok(results)
}

/// 获取 IPv6 TCP 连接表
fn get_tcp_table_v6() -> AppResult<Vec<PortInfo>> {
    unsafe {
        let mut size: u32 = 0;

        let ret = GetExtendedTcpTable(
            None,
            &mut size,
            false,
            AF_INET6.0 as u32,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );

        if ret != ERROR_INSUFFICIENT_BUFFER.0 && ret != NO_ERROR.0 {
            // IPv6 可能不可用，返回空列表
            return Ok(Vec::new());
        }

        loop {
            let layout = Layout::from_size_align(size as usize, 8)
                .map_err(|e| AppError::Internal(e.to_string()))?;
            let buffer = alloc(layout);

            if buffer.is_null() {
                return Err(AppError::Internal("Failed to allocate buffer".to_string()));
            }

            let ret = GetExtendedTcpTable(
                Some(buffer as *mut _),
                &mut size,
                false,
                AF_INET6.0 as u32,
                TCP_TABLE_OWNER_PID_ALL,
                0,
            );

            if ret == NO_ERROR.0 {
                let result = parse_tcp_table_v6(buffer);
                dealloc(buffer, layout);
                return result;
            } else if ret == ERROR_INSUFFICIENT_BUFFER.0 {
                dealloc(buffer, layout);
                continue;
            } else {
                dealloc(buffer, layout);
                return Ok(Vec::new()); // IPv6 失败时返回空列表
            }
        }
    }
}

/// 解析 IPv6 TCP 表
unsafe fn parse_tcp_table_v6(buffer: *mut u8) -> AppResult<Vec<PortInfo>> {
    let table = &*(buffer as *const MIB_TCP6TABLE_OWNER_PID);
    let count = table.dwNumEntries as usize;

    let rows_ptr = table.table.as_ptr();
    let rows = std::slice::from_raw_parts(rows_ptr, count);

    let mut results = Vec::with_capacity(count);

    for row in rows {
        let row: &MIB_TCP6ROW_OWNER_PID = row;

        let local_port = u16::from_be((row.dwLocalPort & 0xFFFF) as u16);
        let remote_port = u16::from_be((row.dwRemotePort & 0xFFFF) as u16);

        let local_addr = Ipv6Addr::from(row.ucLocalAddr);
        let remote_addr = Ipv6Addr::from(row.ucRemoteAddr);

        let mut port_info = PortInfo::new(
            local_port,
            Protocol::TCP,
            format!("[{}]", local_addr),
            row.dwOwningPid,
        );

        port_info.state = ConnectionState::from_tcp_state(row.dwState);
        port_info.remote_addr = Some(format!("[{}]", remote_addr));
        port_info.remote_port = Some(remote_port);

        results.push(port_info);
    }

    Ok(results)
}
