import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState<{ dailyUsage: Array<Record<string, unknown>>; monthlyUsage: Record<string, unknown> } | null>(null);
  useEffect(() => { api.get<typeof data>('/v1/dashboard/analytics').then(setData).catch(console.error); }, []);

  const daily = data?.dailyUsage || [];
  const monthly = data?.monthlyUsage || {};
  const maxCalls = Math.max(...daily.map(d => (d.apiCalls as number) || 0), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><BarChart3 className="w-5 h-5 text-aegis-accent" />Analytics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', value: monthly.apiCalls || 0 },
          { label: 'Text', value: monthly.textRequests || 0 },
          { label: 'Image', value: monthly.imageRequests || 0 },
          { label: 'Audio/Video', value: ((monthly.audioRequests as number) || 0) + ((monthly.videoRequests as number) || 0) },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <p className="text-xs text-aegis-text3">{s.label}</p>
            <p className="text-xl font-bold text-aegis-text mt-1">{String(s.value)}</p>
          </motion.div>
        ))}
      </div>
      <div className="glass-card">
        <p className="text-xs text-aegis-text3 mb-4">API Calls — Last 7 Days</p>
        <div className="flex items-end gap-2 h-40">
          {daily.map((d, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${((d.apiCalls as number) || 0) / maxCalls * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.1 }} className="flex-1 bg-gradient-to-t from-aegis-accent to-purple-500 rounded-t min-h-[4px] relative group">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-aegis-bg3 rounded text-[10px] text-aegis-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {String(d.apiCalls || 0)} calls
              </div>
            </motion.div>
          ))}
          {daily.length === 0 && <p className="text-sm text-aegis-text3 text-center w-full py-12">No data yet</p>}
        </div>
        {daily.length > 0 && (
          <div className="flex gap-2 mt-2">{daily.map((d, i) => <span key={i} className="flex-1 text-[10px] text-aegis-text3 text-center">{String(d.date || '').slice(-5)}</span>)}</div>
        )}
      </div>
    </div>
  );
}
