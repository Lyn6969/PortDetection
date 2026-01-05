import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ReservedPortRange {
  start_port: number;
  end_port: number;
  is_admin: boolean;
}

interface ReservedPortsResult {
  tcp: ReservedPortRange[];
  udp: ReservedPortRange[];
}

interface PortReservedInfo {
  port: number;
  is_reserved: boolean;
  range: ReservedPortRange | null;
  reason: string | null;
}

export function ReservedPorts() {
  const [reservedPorts, setReservedPorts] = useState<ReservedPortsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkPort, setCheckPort] = useState('');
  const [checkResult, setCheckResult] = useState<PortReservedInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const loadReservedPorts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ReservedPortsResult>('get_reserved_ports');
      setReservedPorts(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservedPorts();
  }, []);

  const handleCheckPort = async () => {
    const port = parseInt(checkPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      setCheckResult(null);
      return;
    }

    setChecking(true);
    try {
      const result = await invoke<PortReservedInfo>('check_port_reserved', { port });
      setCheckResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">加载保留端口信息...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p className="font-medium">加载失败</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadReservedPorts}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 端口检查 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-900 mb-3">🔍 端口保留检查</h3>
        <div className="flex gap-2">
          <input
            type="number"
            value={checkPort}
            onChange={(e) => setCheckPort(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckPort()}
            placeholder="输入端口号检查..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="65535"
          />
          <button
            onClick={handleCheckPort}
            disabled={checking}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {checking ? '检查中...' : '检查'}
          </button>
        </div>

        {checkResult && (
          <div className={`mt-3 p-3 rounded-lg ${checkResult.is_reserved ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{checkResult.is_reserved ? '⚠️' : '✅'}</span>
              <div>
                <p className={`font-medium ${checkResult.is_reserved ? 'text-yellow-800' : 'text-green-800'}`}>
                  端口 {checkResult.port} {checkResult.is_reserved ? '被系统保留' : '可以使用'}
                </p>
                {checkResult.is_reserved && checkResult.range && (
                  <p className="text-sm text-yellow-700 mt-1">
                    保留范围: {checkResult.range.start_port} - {checkResult.range.end_port}
                    {checkResult.range.is_admin && ' (管理端口)'}
                  </p>
                )}
                {checkResult.reason && (
                  <p className="text-sm text-yellow-600 mt-1">
                    原因: {checkResult.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 保留端口列表 */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            🔒 系统保留端口范围 (Hyper-V / Windows NAT)
          </h3>
          <button
            onClick={loadReservedPorts}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            刷新
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {/* TCP 保留端口 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              TCP 保留端口 ({reservedPorts?.tcp.length || 0} 个范围)
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">起始端口</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">结束端口</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservedPorts?.tcp.map((range, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono">{range.start_port}</td>
                      <td className="py-2 px-3 font-mono">{range.end_port}</td>
                      <td className="py-2 px-3">
                        {range.is_admin ? (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            管理
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            动态
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* UDP 保留端口 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              UDP 保留端口 ({reservedPorts?.udp.length || 0} 个范围)
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">起始端口</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">结束端口</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservedPorts?.udp.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500">
                        无 UDP 保留端口
                      </td>
                    </tr>
                  ) : (
                    reservedPorts?.udp.map((range, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono">{range.start_port}</td>
                        <td className="py-2 px-3 font-mono">{range.end_port}</td>
                        <td className="py-2 px-3">
                          {range.is_admin ? (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              管理
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              动态
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
          <p>
            💡 <strong>提示:</strong> 这些端口被 Windows Hyper-V 和 NAT 服务保留，
            即使 <code className="bg-gray-200 px-1 rounded">netstat</code> 显示未占用，应用程序也无法绑定。
          </p>
          <p className="mt-1">
            解决方法: 使用其他端口，或以管理员身份运行 <code className="bg-gray-200 px-1 rounded">net stop winnat</code> 后重新分配。
          </p>
        </div>
      </div>
    </div>
  );
}
