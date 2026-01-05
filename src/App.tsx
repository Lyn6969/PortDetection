import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PortTable } from "./components/PortTable";
import { PortSearch } from "./components/PortSearch";
import { ProcessDetail } from "./components/ProcessDetail";
import { ReservedPorts } from "./components/ReservedPorts";

// 类型定义
export interface ProcessInfo {
  pid: number;
  name: string;
  exe_path: string | null;
  cmd_line: string | null;
  create_time: number;
  memory_usage: number;
}

export interface PortInfo {
  port: number;
  protocol: "TCP" | "UDP";
  local_addr: string;
  remote_addr: string | null;
  remote_port: number | null;
  state: string;
  pid: number;
  process: ProcessInfo | null;
}

type TabType = "ports" | "reserved";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("ports");
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<PortInfo | null>(null);
  const [listenOnly, setListenOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 扫描端口
  const scanPorts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<PortInfo[]>("scan_all_ports", {
        listenOnly,
      });
      setPorts(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [listenOnly]);

  // 初始加载
  useEffect(() => {
    scanPorts();
  }, [scanPorts]);

  // 过滤端口
  const filteredPorts = ports.filter((port) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      port.port.toString().includes(query) ||
      port.protocol.toLowerCase().includes(query) ||
      port.local_addr.toLowerCase().includes(query) ||
      port.process?.name.toLowerCase().includes(query) ||
      port.pid.toString().includes(query)
    );
  });

  // 终止进程
  const handleKillProcess = async (pid: number, createTime?: number) => {
    if (!confirm(`确定要终止进程 ${pid} 吗？`)) return;

    try {
      await invoke("kill_process", { pid, createTime });
      // 刷新列表
      await scanPorts();
      setSelectedPort(null);
    } catch (e) {
      alert(`终止进程失败: ${e}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">
            端口检测工具
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            检测 Windows 系统端口占用情况
          </p>
        </div>

        {/* 标签页 */}
        <div className="px-6 flex gap-1 border-t">
          <button
            onClick={() => setActiveTab("ports")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "ports"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🔌 端口列表
            {activeTab === "ports" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reserved")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "reserved"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🔒 系统保留端口
            {activeTab === "reserved" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
            )}
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="p-6">
        {activeTab === "ports" ? (
          <>
            {/* 工具栏 */}
            <div className="flex items-center gap-4 mb-6">
              <PortSearch value={searchQuery} onChange={setSearchQuery} />

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={listenOnly}
                  onChange={(e) => setListenOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                仅显示监听端口
              </label>

              <button
                onClick={scanPorts}
                disabled={loading}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "扫描中..." : "刷新"}
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* 端口列表和详情 */}
            <div className="flex gap-6">
              <div className="flex-1">
                <PortTable
                  ports={filteredPorts}
                  loading={loading}
                  selectedPort={selectedPort}
                  onSelect={setSelectedPort}
                />
              </div>

              {selectedPort && (
                <div className="w-80">
                  <ProcessDetail
                    port={selectedPort}
                    onKill={handleKillProcess}
                    onClose={() => setSelectedPort(null)}
                  />
                </div>
              )}
            </div>

            {/* 状态栏 */}
            <div className="mt-4 text-sm text-gray-500">
              共 {filteredPorts.length} 个端口
              {searchQuery && ` (搜索: "${searchQuery}")`}
            </div>
          </>
        ) : (
          <ReservedPorts />
        )}
      </main>
    </div>
  );
}

export default App;
