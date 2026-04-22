import { BarChart3 } from 'lucide-react';

export default function PlatformAnalytics() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-400" />Platform Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total API Calls', value: '—', color: 'text-purple-400' },
          { label: 'Avg Latency (p50)', value: '—', color: 'text-cyan-400' },
          { label: 'AI Accuracy', value: '—', color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-aegis-text3">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="glass-card"><p className="text-sm text-aegis-text3 text-center py-12">Platform-wide analytics will populate as orgs submit content.</p></div>
    </div>
  );
}
