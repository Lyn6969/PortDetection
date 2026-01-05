//! 平台抽象层

pub mod traits;

#[cfg(windows)]
pub mod windows;

#[cfg(windows)]
pub use windows::WindowsPlatform;
