//! 进程操作

use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::path::Path;

use windows::core::PWSTR;
use windows::Win32::Foundation::{CloseHandle, FILETIME, HANDLE};
use windows::Win32::System::ProcessStatus::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
use windows::Win32::System::Threading::{
    GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, TerminateProcess,
    PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
    PROCESS_VM_READ,
};

use crate::models::{is_protected_process, AppError, AppResult, ProcessInfo};

/// 获取进程信息
pub fn get_process_info(pid: u32) -> AppResult<Option<ProcessInfo>> {
    // PID 0 是系统空闲进程
    if pid == 0 {
        return Ok(Some(ProcessInfo {
            pid: 0,
            name: "System Idle Process".to_string(),
            exe_path: None,
            cmd_line: None,
            create_time: 0,
            memory_usage: 0,
        }));
    }

    // PID 4 是 System 进程
    if pid == 4 {
        return Ok(Some(ProcessInfo {
            pid: 4,
            name: "System".to_string(),
            exe_path: None,
            cmd_line: None,
            create_time: 0,
            memory_usage: 0,
        }));
    }

    unsafe {
        let handle = match OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ,
            false,
            pid,
        ) {
            Ok(h) => h,
            Err(e) => {
                let code = e.code().0 as u32;
                if code == 5 {
                    // ACCESS_DENIED
                    return Ok(Some(ProcessInfo {
                        pid,
                        name: format!("<access denied: {}>", pid),
                        exe_path: None,
                        cmd_line: None,
                        create_time: 0,
                        memory_usage: 0,
                    }));
                }
                if code == 87 {
                    // INVALID_PARAMETER - 进程不存在
                    return Ok(None);
                }
                return Err(AppError::WindowsApi("OpenProcess".to_string(), code));
            }
        };

        let result = get_process_info_from_handle(pid, handle);
        let _ = CloseHandle(handle);
        result.map(Some)
    }
}

/// 从句柄获取进程信息
unsafe fn get_process_info_from_handle(pid: u32, handle: HANDLE) -> AppResult<ProcessInfo> {
    // 获取进程映像路径
    let mut path_buf = [0u16; 260];
    let mut path_len = path_buf.len() as u32;

    let exe_path = if QueryFullProcessImageNameW(
        handle,
        PROCESS_NAME_WIN32,
        PWSTR(path_buf.as_mut_ptr()),
        &mut path_len,
    )
    .is_ok()
    {
        let path = OsString::from_wide(&path_buf[..path_len as usize]);
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    };

    // 提取进程名
    let name = exe_path
        .as_ref()
        .and_then(|p| Path::new(p).file_name())
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| format!("<unknown: {}>", pid));

    // 获取进程创建时间
    let mut create_time = FILETIME::default();
    let mut exit_time = FILETIME::default();
    let mut kernel_time = FILETIME::default();
    let mut user_time = FILETIME::default();

    let create_time_ms = if GetProcessTimes(
        handle,
        &mut create_time,
        &mut exit_time,
        &mut kernel_time,
        &mut user_time,
    )
    .is_ok()
    {
        filetime_to_unix_ms(create_time)
    } else {
        0
    };

    // 获取内存使用量
    let mut mem_info = PROCESS_MEMORY_COUNTERS::default();
    mem_info.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;

    let memory_usage = if GetProcessMemoryInfo(
        handle,
        &mut mem_info,
        std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
    )
    .is_ok()
    {
        mem_info.WorkingSetSize
    } else {
        0
    };

    Ok(ProcessInfo {
        pid,
        name,
        exe_path,
        cmd_line: None, // 需要额外权限，暂不实现
        create_time: create_time_ms,
        memory_usage: memory_usage as u64,
    })
}

/// 终止进程（带 PID 复用保护）
pub fn kill_process(pid: u32, expected_create_time: Option<u64>) -> AppResult<()> {
    // 先获取进程信息进行校验
    let info = get_process_info(pid)?
        .ok_or(AppError::ProcessNotFound(pid))?;

    // 检查是否为受保护进程
    if is_protected_process(&info.name) {
        return Err(AppError::ProtectedProcess(info.name));
    }

    // PID 复用校验
    if let Some(expected) = expected_create_time {
        if info.create_time != 0 && info.create_time != expected {
            return Err(AppError::PidReused);
        }
    }

    unsafe {
        // 请求终止权限
        let handle = OpenProcess(PROCESS_TERMINATE, false, pid).map_err(|e| {
            let code = e.code().0 as u32;
            if code == 5 {
                AppError::AccessDenied
            } else {
                AppError::WindowsApi("OpenProcess (TERMINATE)".to_string(), code)
            }
        })?;

        let result = TerminateProcess(handle, 1);
        let _ = CloseHandle(handle);

        result.map_err(|e| {
            let code = e.code().0 as u32;
            if code == 5 {
                AppError::AccessDenied
            } else {
                AppError::WindowsApi("TerminateProcess".to_string(), code)
            }
        })?;

        Ok(())
    }
}

/// FILETIME 转 Unix 时间戳（毫秒）
fn filetime_to_unix_ms(ft: FILETIME) -> u64 {
    let ticks = ((ft.dwHighDateTime as u64) << 32) | (ft.dwLowDateTime as u64);
    // FILETIME 是从 1601-01-01 开始的 100 纳秒间隔
    // Unix 时间戳是从 1970-01-01 开始
    // 差值: 11644473600 秒
    const EPOCH_DIFF: u64 = 116444736000000000;
    if ticks > EPOCH_DIFF {
        (ticks - EPOCH_DIFF) / 10000 // 转换为毫秒
    } else {
        0
    }
}
