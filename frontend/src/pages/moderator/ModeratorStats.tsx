import { BarChart3 } from 'lucide-react';

export default function ModeratorStats() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-400" />My Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Reviews Today', value: '0', color: 'text-emerald-400' },
          { label: 'Avg Review Time', value: '0s', color: 'text-cyan-400' },
          { label: 'Override Rate', value: '0%', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-aegis-text3">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
