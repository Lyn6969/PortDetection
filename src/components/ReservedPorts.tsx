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
      <div className="glass-card rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
          <svg className="w-6 h-6 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-slate-500">加载保留端口信息...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6 border-l-4 border-red-500">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-800">加载失败</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={loadReservedPorts}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm text-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 端口检查卡片 */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">端口保留检查</h3>
            <p className="text-xs text-slate-500">检查端口是否被系统保留</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              value={checkPort}
              onChange={(e) => setCheckPort(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckPort()}
              placeholder="输入端口号 (1-65535)"
              className="w-full px-4 py-2.5 input-glass rounded-xl text-sm"
              min="1"
              max="65535"
            />
          </div>
          <button
            onClick={handleCheckPort}
            disabled={checking}
            className="px-5 py-2.5 btn-primary rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {checking ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                检查中
              </>
            ) : (
              '检查'
            )}
          </button>
        </div>

        {checkResult && (
          <div className={`mt-4 p-4 rounded-xl animate-in ${
            checkResult.is_reserved
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                checkResult.is_reserved ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                {checkResult.is_reserved ? (
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold ${checkResult.is_reserved ? 'text-amber-800' : 'text-emerald-800'}`}>
                  端口 {checkResult.port} {checkResult.is_reserved ? '被系统保留' : '可以使用'}
                </p>
                {checkResult.is_reserved && checkResult.range && (
                  <p className="text-sm text-amber-700 mt-1">
                    保留范围: {checkResult.range.start_port} - {checkResult.range.end_port}
                    {checkResult.range.is_admin && ' (管理端口)'}
                  </p>
                )}
                {checkResult.reason && (
                  <p className="text-sm text-amber-600 mt-1">
                    原因: {checkResult.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 保留端口列表 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">系统保留端口范围</h3>
              <p className="text-xs text-slate-500">Hyper-V / Windows NAT 保留</p>
            </div>
          </div>
          <button
            onClick={loadReservedPorts}
            className="px-4 py-2 glass-button rounded-lg text-sm text-slate-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          {/* TCP 保留端口 */}
          <div className="bg-slate-50/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></span>
              TCP 保留端口
              <span className="text-xs font-normal text-slate-400">({reservedPorts?.tcp.length || 0} 个范围)</span>
            </h4>
            <div className="max-h-64 overflow-y-auto rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-white/80 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 text-xs uppercase">起始</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 text-xs uppercase">结束</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 text-xs uppercase">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservedPorts?.tcp.map((range, idx) => (
                    <tr key={idx} className="hover:bg-white/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-700">{range.start_port}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{range.end_port}</td>
                      <td className="py-2.5 px-3">
                        {range.is_admin ? (
                          <span className="badge bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            管理
                          </span>
                        ) : (
                          <span className="badge badge-default">
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
          <div className="bg-slate-50/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></span>
              UDP 保留端口
              <span className="text-xs font-normal text-slate-400">({reservedPorts?.udp.length || 0} 个范围)</span>
            </h4>
            <div className="max-h-64 overflow-y-auto rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-white/80 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 text-xs uppercase">起始</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 text-xs uppercase">结束</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 text-xs uppercase">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservedPorts?.udp.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        无 UDP 保留端口
                      </td>
                    </tr>
                  ) : (
                    reservedPorts?.udp.map((range, idx) => (
                      <tr key={idx} className="hover:bg-white/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-700">{range.start_port}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{range.end_port}</td>
                        <td className="py-2.5 px-3">
                          {range.is_admin ? (
                            <span className="badge bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                              管理
                            </span>
                          ) : (
                            <span className="badge badge-default">
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

        {/* 提示信息 */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-slate-200/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-slate-600">
              <p>
                <strong className="text-slate-700">提示:</strong> 这些端口被 Windows Hyper-V 和 NAT 服务保留，
                即使 <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs font-mono">netstat</code> 显示未占用，应用程序也无法绑定。
              </p>
              <p className="mt-1.5">
                <strong className="text-slate-700">解决方法:</strong> 使用其他端口，或以管理员身份运行
                <code className="bg-white/60 px-1.5 py-0.5 rounded text-xs font-mono ml-1">net stop winnat</code> 后重新分配。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
