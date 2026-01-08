import { PortInfo } from "../App";

interface ProcessDetailProps {
  port: PortInfo;
  onKill: (pid: number, createTime?: number) => void;
  onClose: () => void;
}

export function ProcessDetail({ port, onKill, onClose }: ProcessDetailProps) {
  const process = port.process;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">进程详情</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="关闭"
          title="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="text-gray-500">端口</label>
          <p className="font-medium">
            {port.port} ({port.protocol})
          </p>
        </div>

        <div>
          <label className="text-gray-500">本地地址</label>
          <p className="font-mono text-xs">{port.local_addr}</p>
        </div>

        {port.remote_addr && (
          <div>
            <label className="text-gray-500">远程地址</label>
            <p className="font-mono text-xs">
              {port.remote_addr}:{port.remote_port}
            </p>
          </div>
        )}

        <div>
          <label className="text-gray-500">状态</label>
          <p>{port.state}</p>
        </div>

        <hr className="my-3" />

        <div>
          <label className="text-gray-500">PID</label>
          <p className="font-medium">{port.pid}</p>
        </div>

        <div>
          <label className="text-gray-500">进程名</label>
          <p className="font-medium">{process?.name || "-"}</p>
        </div>

        {process?.exe_path && (
          <div>
            <label className="text-gray-500">路径</label>
            <p className="font-mono text-xs break-all">{process.exe_path}</p>
          </div>
        )}

        <div>
          <label className="text-gray-500">内存使用</label>
          <p>{process ? formatBytes(process.memory_usage) : "-"}</p>
        </div>

        <div>
          <label className="text-gray-500">创建时间</label>
          <p>{process ? formatTime(process.create_time) : "-"}</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={() => onKill(port.pid, process?.create_time)}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          终止进程
        </button>
        <p className="mt-2 text-xs text-gray-500 text-center">
          终止进程可能需要管理员权限
        </p>
      </div>
    </div>
  );
}
