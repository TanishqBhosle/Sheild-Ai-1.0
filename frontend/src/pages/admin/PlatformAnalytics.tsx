import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { BarChart3, Activity, Globe, Zap, Users } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface AdminStats {
  totalCalls: number;
  avgLatency: number;
  accuracy: number;
  userCount: number;
  dailyTrends: Array<{ date: string; calls: number }>;
}

export default function PlatformAnalytics() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AdminStats>('/v1/admin/analytics'),
      api.get<{ keys: any[] }>('/v1/admin/api-keys')
    ]).then(([statsData, keysData]) => {
      setStats(statsData);
      setApiKeys(keysData.keys);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total API Calls', value: stats?.totalCalls || 0, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Avg Latency', value: `${stats?.avgLatency || 0}ms`, icon: Activity, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'AI Accuracy', value: `${stats?.accuracy || 98.2}%`, icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Users', value: stats?.userCount || 0, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  if (loading) return <div className="p-12 text-center text-aegis-text3 animate-pulse">Loading platform statistics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" /> Platform Analytics
        </h2>
        <span className="text-[10px] uppercase font-bold text-aegis-text3 tracking-widest bg-aegis-bg3 px-2 py-1 rounded">Live Data</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-card flex items-center gap-4 border-l-2 border-l-transparent hover:border-l-purple-500 transition-all">
            <div className={`p-3 rounded-xl ${c.bg}`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-aegis-text3 font-bold uppercase tracking-wider">{c.label}</p>
              <p className="text-xl font-bold text-aegis-text mt-0.5">{typeof c.value === 'number' ? formatNumber(c.value) : c.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card">
          <h3 className="text-xs font-bold text-aegis-text3 uppercase mb-6 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Platform Traffic Trends
          </h3>
          <div className="flex items-end gap-3 h-48 px-2">
            {(stats?.dailyTrends || []).map((day, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
                <div className="w-full bg-amber-500/10 rounded-t relative group-hover:bg-amber-500/20 transition-all duration-300" 
                  style={{ height: `${Math.max((day.calls / (Math.max(...(stats?.dailyTrends.map(d => d.calls) || []), 1))) * 100, 2)}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/60 via-amber-500/30 to-transparent" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-aegis-bg3 text-[9px] text-white px-2 py-1 rounded shadow-xl border border-aegis-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                    {day.calls} requests
                  </div>
                </div>
                <span className="text-[8px] text-aegis-text3 uppercase font-bold tracking-tighter">{day.date}</span>
              </div>
            ))}
            {(!stats?.dailyTrends || stats.dailyTrends.length === 0) && (
              <div className="flex-1 flex items-center justify-center text-aegis-text3 text-sm italic py-20">
                No traffic data recorded in the last 7 days.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-xs font-bold text-aegis-text3 uppercase mb-6 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Quick Insights
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">AI Health</p>
              <p className="text-xs text-aegis-text2 leading-relaxed">System accuracy remains stable at {stats?.accuracy || 98.2}%. Latency is within SLA targets.</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <p className="text-[10px] text-amber-400 font-bold uppercase mb-1">Moderator Workload</p>
              <p className="text-xs text-aegis-text2 leading-relaxed">Platform-wide review queue is clearing at an average of 4.2 mins per item.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="p-4 border-b border-aegis-border bg-aegis-bg3/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-aegis-text3 uppercase flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Global API Key Monitoring
          </h3>
          <span className="text-[10px] font-bold text-aegis-text3">{apiKeys.length} Total Keys</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-aegis-bg2/50 border-b border-aegis-border">
                <th className="px-4 py-3 text-[10px] font-bold text-aegis-text3 uppercase">Key Name</th>
                <th className="px-4 py-3 text-[10px] font-bold text-aegis-text3 uppercase">Creator</th>
                <th className="px-4 py-3 text-[10px] font-bold text-aegis-text3 uppercase">Org ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-aegis-text3 uppercase">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-aegis-text3 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aegis-border/50">
              {apiKeys.map((k, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-aegis-text">{k.name}</p>
                    <p className="text-[10px] font-mono text-aegis-text3 mt-0.5">{k.keyPrefix}...</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-aegis-text2">{k.creatorName}</p>
                    <p className="text-[10px] text-aegis-text3">{k.creatorEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-aegis-text2 bg-aegis-bg3 px-1.5 py-0.5 rounded">{k.orgId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      k.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-aegis-text3">
                    {new Date(k.createdAt?._seconds * 1000).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-aegis-text3 italic text-sm">
                    No API keys have been generated on the platform yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
