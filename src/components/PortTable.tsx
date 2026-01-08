import { PortInfo } from "../App";

interface PortTableProps {
  ports: PortInfo[];
  loading: boolean;
  selectedPort: PortInfo | null;
  onSelect: (port: PortInfo) => void;
}

export function PortTable({
  ports,
  loading,
  selectedPort,
  onSelect,
}: PortTableProps) {
  // 状态显示映射
  const getStateBadge = (state: string) => {
    const styles: Record<string, string> = {
      Listen: "badge-listen",
      Established: "badge-established",
      TimeWait: "badge-waiting",
      CloseWait: "badge-waiting",
      Bound: "badge-default",
    };
    const labels: Record<string, string> = {
      Listen: "监听中",
      Established: "已连接",
      TimeWait: "等待中",
      CloseWait: "关闭等待",
      Bound: "已绑定",
    };
    return {
      className: styles[state] || "badge-default",
      label: labels[state] || state,
    };
  };

  if (loading && ports.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
          <svg className="w-6 h-6 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-slate-500">正在扫描端口...</p>
      </div>
    );
  }

  if (ports.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-slate-500">未找到端口</p>
        <p className="text-sm text-slate-400 mt-1">尝试调整筛选条件</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/50">
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                端口
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                协议
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                本地地址
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                PID
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                进程名
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ports.map((port, index) => {
              const isSelected =
                selectedPort?.port === port.port &&
                selectedPort?.protocol === port.protocol &&
                selectedPort?.pid === port.pid;
              const stateBadge = getStateBadge(port.state);

              return (
                <tr
                  key={`${port.protocol}-${port.port}-${port.pid}-${index}`}
                  onClick={() => onSelect(port)}
                  className={`cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-primary-50/80 shadow-sm"
                      : "hover:bg-white/50"
                  }`}
                >
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-slate-800">
                      {port.port}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge ${port.protocol === "TCP" ? "badge-tcp" : "badge-udp"}`}>
                      {port.protocol}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge ${stateBadge.className}`}>
                      {stateBadge.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {port.local_addr}
                    </code>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-600 font-medium">
                      {port.pid}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {port.process?.name ? (
                        <>
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          </div>
                          <span className="text-sm text-slate-800 truncate max-w-[150px]" title={port.process.name}>
                            {port.process.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400 italic">未知</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
