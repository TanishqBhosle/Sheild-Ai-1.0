import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { LayoutDashboard, Building2, Activity, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, any> | null>(null);

  useEffect(() => { 
    api.get<Record<string, any>>('/v1/admin/platform-stats')
      .then(setStats)
      .catch(console.error); 
  }, []);

  const cards = [
    { label: 'Total Organisations', value: stats?.totalOrgs || 0, icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Active Orgs', value: stats?.activeOrgs || 0, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Suspended Orgs', value: stats?.suspendedOrgs || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-purple-400" />Platform Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-aegis-text3">{c.label}</span>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{formatNumber(c.value as number)}</p>
          </motion.div>
        ))}
      </div>

      {Boolean(stats?.planBreakdown) && (
        <div className="glass-card">
          <p className="text-xs text-aegis-text3 mb-4 font-bold uppercase tracking-widest">Plan Distribution</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {Object.entries((stats?.planBreakdown || {}) as Record<string, number>).map(([plan, count]) => (
              <div key={plan} className="flex flex-col gap-1">
                <span className="text-[10px] text-aegis-text3 uppercase font-bold">{plan}</span>
                <span className="text-xl font-bold text-aegis-text">{count} <span className="text-xs text-aegis-text3 font-normal">Orgs</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
