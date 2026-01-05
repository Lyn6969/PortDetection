//! UDP 端点表获取

use std::alloc::{alloc, dealloc, Layout};
use std::net::{Ipv4Addr, Ipv6Addr};

use windows::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, NO_ERROR};
use windows::Win32::NetworkManagement::IpHelper::{
    GetExtendedUdpTable, MIB_UDP6ROW_OWNER_PID, MIB_UDP6TABLE_OWNER_PID,
    MIB_UDPROW_OWNER_PID, MIB_UDPTABLE_OWNER_PID, UDP_TABLE_OWNER_PID,
};
use windows::Win32::Networking::WinSock::{AF_INET, AF_INET6};

use crate::models::{AppError, AppResult, ConnectionState, PortInfo, Protocol};

/// 获取所有 UDP 端点（IPv4 + IPv6）
pub fn get_udp_table() -> AppResult<Vec<PortInfo>> {
    let mut results = Vec::new();

    results.extend(get_udp_table_v4()?);
    results.extend(get_udp_table_v6()?);

    Ok(results)
}

/// 获取 IPv4 UDP 端点表
fn get_udp_table_v4() -> AppResult<Vec<PortInfo>> {
    unsafe {
        let mut size: u32 = 0;

        let ret = GetExtendedUdpTable(
            None,
            &mut size,
            false,
            AF_INET.0 as u32,
            UDP_TABLE_OWNER_PID,
            0,
        );

        if ret != ERROR_INSUFFICIENT_BUFFER.0 && ret != NO_ERROR.0 {
            return Err(AppError::WindowsApi(
                "GetExtendedUdpTable (size query)".to_string(),
                ret,
            ));
        }

        loop {
            let layout = Layout::from_size_align(size as usize, 8)
                .map_err(|e| AppError::Internal(e.to_string()))?;
            let buffer = alloc(layout);

            if buffer.is_null() {
                return Err(AppError::Internal("Failed to allocate buffer".to_string()));
            }

            let ret = GetExtendedUdpTable(
                Some(buffer as *mut _),
                &mut size,
                false,
                AF_INET.0 as u32,
                UDP_TABLE_OWNER_PID,
                0,
            );

            if ret == NO_ERROR.0 {
                let result = parse_udp_table_v4(buffer);
                dealloc(buffer, layout);
                return result;
            } else if ret == ERROR_INSUFFICIENT_BUFFER.0 {
                dealloc(buffer, layout);
                continue;
            } else {
                dealloc(buffer, layout);
                return Err(AppError::WindowsApi(
                    "GetExtendedUdpTable".to_string(),
                    ret,
                ));
            }
        }
    }
}

/// 解析 IPv4 UDP 表
unsafe fn parse_udp_table_v4(buffer: *mut u8) -> AppResult<Vec<PortInfo>> {
    let table = &*(buffer as *const MIB_UDPTABLE_OWNER_PID);
    let count = table.dwNumEntries as usize;

    let rows_ptr = table.table.as_ptr();
    let rows = std::slice::from_raw_parts(rows_ptr, count);

    let mut results = Vec::with_capacity(count);

    for row in rows {
        let row: &MIB_UDPROW_OWNER_PID = row;

        let local_port = u16::from_be((row.dwLocalPort & 0xFFFF) as u16);
        let local_addr = Ipv4Addr::from(row.dwLocalAddr.to_ne_bytes());

        let mut port_info = PortInfo::new(
            local_port,
            Protocol::UDP,
            local_addr.to_string(),
            row.dwOwningPid,
        );

        port_info.state = ConnectionState::Bound;

        results.push(port_info);
    }

    Ok(results)
}

/// 获取 IPv6 UDP 端点表
fn get_udp_table_v6() -> AppResult<Vec<PortInfo>> {
    unsafe {
        let mut size: u32 = 0;

        let ret = GetExtendedUdpTable(
            None,
            &mut size,
            false,
            AF_INET6.0 as u32,
            UDP_TABLE_OWNER_PID,
            0,
        );

        if ret != ERROR_INSUFFICIENT_BUFFER.0 && ret != NO_ERROR.0 {
            return Ok(Vec::new());
        }

        loop {
            let layout = Layout::from_size_align(size as usize, 8)
                .map_err(|e| AppError::Internal(e.to_string()))?;
            let buffer = alloc(layout);

            if buffer.is_null() {
                return Err(AppError::Internal("Failed to allocate buffer".to_string()));
            }

            let ret = GetExtendedUdpTable(
                Some(buffer as *mut _),
                &mut size,
                false,
                AF_INET6.0 as u32,
                UDP_TABLE_OWNER_PID,
                0,
            );

            if ret == NO_ERROR.0 {
                let result = parse_udp_table_v6(buffer);
                dealloc(buffer, layout);
                return result;
            } else if ret == ERROR_INSUFFICIENT_BUFFER.0 {
                dealloc(buffer, layout);
                continue;
            } else {
                dealloc(buffer, layout);
                return Ok(Vec::new());
            }
        }
    }
}

/// 解析 IPv6 UDP 表
unsafe fn parse_udp_table_v6(buffer: *mut u8) -> AppResult<Vec<PortInfo>> {
    let table = &*(buffer as *const MIB_UDP6TABLE_OWNER_PID);
    let count = table.dwNumEntries as usize;

    let rows_ptr = table.table.as_ptr();
    let rows = std::slice::from_raw_parts(rows_ptr, count);

    let mut results = Vec::with_capacity(count);

    for row in rows {
        let row: &MIB_UDP6ROW_OWNER_PID = row;

        let local_port = u16::from_be((row.dwLocalPort & 0xFFFF) as u16);
        let local_addr = Ipv6Addr::from(row.ucLocalAddr);

        let mut port_info = PortInfo::new(
            local_port,
            Protocol::UDP,
            format!("[{}]", local_addr),
            row.dwOwningPid,
        );

        port_info.state = ConnectionState::Bound;

        results.push(port_info);
    }

    Ok(results)
}
