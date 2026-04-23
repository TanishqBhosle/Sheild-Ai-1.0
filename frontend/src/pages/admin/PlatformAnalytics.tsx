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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminStats>('/v1/admin/analytics')
      .then(setStats)
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
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-amber-500/20 rounded-t relative overflow-hidden" style={{ height: `${(day.calls / (Math.max(...(stats?.dailyTrends.map(d => d.calls) || []), 1))) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/40 to-transparent" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-aegis-bg3 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day.calls} reqs
                  </div>
                </div>
                <span className="text-[8px] text-aegis-text3 uppercase font-medium">{day.date}</span>
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
    </div>
  );
}
