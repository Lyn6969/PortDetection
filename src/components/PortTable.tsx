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
  const stateDisplay: Record<string, { label: string; color: string }> = {
    Listen: { label: "监听", color: "bg-green-100 text-green-800" },
    Established: { label: "已连接", color: "bg-blue-100 text-blue-800" },
    TimeWait: { label: "等待", color: "bg-yellow-100 text-yellow-800" },
    CloseWait: { label: "关闭等待", color: "bg-orange-100 text-orange-800" },
    Bound: { label: "绑定", color: "bg-purple-100 text-purple-800" },
  };

  const getStateStyle = (state: string) => {
    return stateDisplay[state] || { label: state, color: "bg-gray-100 text-gray-800" };
  };

  if (loading && ports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (ports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        未找到端口
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              端口
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              协议
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              状态
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              本地地址
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              PID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              进程名
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ports.map((port, index) => {
            const isSelected =
              selectedPort?.port === port.port &&
              selectedPort?.protocol === port.protocol &&
              selectedPort?.pid === port.pid;
            const stateStyle = getStateStyle(port.state);

            return (
              <tr
                key={`${port.protocol}-${port.port}-${port.pid}-${index}`}
                onClick={() => onSelect(port)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {port.port}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      port.protocol === "TCP"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {port.protocol}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${stateStyle.color}`}
                  >
                    {stateStyle.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {port.local_addr}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {port.pid}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {port.process?.name || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
