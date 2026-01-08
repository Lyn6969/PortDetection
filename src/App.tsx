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
    <div className="min-h-screen p-4 md:p-6">
      {/* 主容器 */}
      <div className="max-w-7xl mx-auto">
        {/* 头部卡片 */}
        <header className="glass-card rounded-2xl mb-6 overflow-hidden animate-in">
          <div className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  端口检测工具
                </h1>
                <p className="text-sm text-slate-500">
                  检测 Windows 系统端口占用情况
                </p>
              </div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="px-6 pb-0 flex gap-1 border-t border-white/20">
            <button
              onClick={() => setActiveTab("ports")}
              className={`px-5 py-3 text-sm font-medium transition-all relative group ${
                activeTab === "ports"
                  ? "text-primary-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                端口列表
              </span>
              {activeTab === "ports" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("reserved")}
              className={`px-5 py-3 text-sm font-medium transition-all relative group ${
                activeTab === "reserved"
                  ? "text-primary-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                系统保留端口
              </span>
              {activeTab === "reserved" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* 主内容 */}
        <main>
          {activeTab === "ports" ? (
            <div className="animate-in">
              {/* 工具栏 */}
              <div className="glass-card rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
                <PortSearch value={searchQuery} onChange={setSearchQuery} />

                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={listenOnly}
                      onChange={(e) => setListenOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-purple-500 transition-all"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-4"></div>
                  </div>
                  <span className="group-hover:text-slate-800 transition-colors">仅显示监听端口</span>
                </label>

                <button
                  onClick={scanPorts}
                  disabled={loading}
                  className="ml-auto px-5 py-2.5 rounded-xl btn-primary font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      扫描中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      刷新
                    </>
                  )}
                </button>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-4 glass-card rounded-xl border-l-4 border-red-500 animate-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* 端口列表和详情 */}
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <PortTable
                    ports={filteredPorts}
                    loading={loading}
                    selectedPort={selectedPort}
                    onSelect={setSelectedPort}
                  />
                </div>

                {selectedPort && (
                  <div className="w-80 flex-shrink-0 animate-slide-in-right">
                    <ProcessDetail
                      port={selectedPort}
                      onKill={handleKillProcess}
                      onClose={() => setSelectedPort(null)}
                    />
                  </div>
                )}
              </div>

              {/* 状态栏 */}
              <div className="mt-4 glass-card rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>
                    共 <span className="font-semibold text-slate-800">{filteredPorts.length}</span> 个端口
                    {searchQuery && (
                      <span className="text-slate-400"> · 搜索: "{searchQuery}"</span>
                    )}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  按 Ctrl+R 刷新
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in">
              <ReservedPorts />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
