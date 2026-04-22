import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { formatNumber, getDecisionBadgeClass, formatTimeAgo } from '../../lib/utils';
import { Activity, AlertTriangle, Clock, Eye, Send } from 'lucide-react';

interface DashboardSummary {
  apiCallsToday: number; flaggedToday: number; pendingReview: number; avgLatencyMs: number;
  recentResults: Array<{ resultId: string; contentId: string; decision: string; severity: number; confidence: number; processingMs: number; createdAt: unknown }>;
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickText, setQuickText] = useState('');
  const [quickResult, setQuickResult] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<DashboardSummary>('/v1/dashboard/summary').then(setSummary).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleQuickSubmit = async () => {
    if (!quickText.trim()) return;
    setSubmitting(true); setQuickResult(null);
    try { const res = await api.post<Record<string, unknown>>('/v1/moderate', { type: 'text', text: quickText }); setQuickResult(res); }
    catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const stats = [
    { label: 'API Calls Today', value: summary?.apiCallsToday || 0, icon: Activity, color: 'text-aegis-accent', bg: 'bg-aegis-accent/10' },
    { label: 'Flagged Today', value: summary?.flaggedToday || 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Pending Review', value: summary?.pendingReview || 0, icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Avg Latency', value: `${summary?.avgLatencyMs || 0}ms`, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-aegis-text3">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{typeof s.value === 'number' ? formatNumber(s.value) : s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
          <h2 className="text-sm font-semibold text-aegis-text mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-aegis-accent" />Quick Analysis</h2>
          <textarea value={quickText} onChange={e => setQuickText(e.target.value)} className="input-field h-24 resize-none mb-3" placeholder="Paste text content to moderate..." />
          <button onClick={handleQuickSubmit} disabled={submitting || !quickText.trim()} className="btn-primary w-full disabled:opacity-50">
            {submitting ? 'Analyzing...' : 'Moderate Content'}
          </button>
          {quickResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-3 rounded-lg bg-aegis-bg border border-aegis-border">
              <div className="flex items-center justify-between mb-2">
                <span className={`badge ${getDecisionBadgeClass(quickResult.decision as string)}`}>{String(quickResult.decision)}</span>
                <span className="text-xs text-aegis-text3">{String(quickResult.processingMs)}ms</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-aegis-text2">
                <span>Severity: <b className="text-aegis-text">{String(quickResult.severity)}</b></span>
                <span>Confidence: <b className="text-aegis-text">{String((quickResult.confidence as number)?.toFixed(2))}</b></span>
              </div>
              {Boolean(quickResult.explanation) && <p className="text-xs text-aegis-text3 mt-2">{String(quickResult.explanation)}</p>}
            </motion.div>
          )}
        </motion.div>

        {/* Recent Results */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card">
          <h2 className="text-sm font-semibold text-aegis-text mb-4">Recent Results</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-aegis-bg3 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {(summary?.recentResults || []).map((r, i) => (
                <motion.div key={r.resultId || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-aegis-bg hover:bg-aegis-bg3 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${getDecisionBadgeClass(r.decision)}`}>{r.decision}</span>
                    <span className="text-xs text-aegis-text3 font-mono">{r.contentId}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-aegis-text3">{r.severity}/100</span>
                    <span className="text-aegis-text3">{r.processingMs}ms</span>
                  </div>
                </motion.div>
              ))}
              {(!summary?.recentResults || summary.recentResults.length === 0) && (
                <p className="text-sm text-aegis-text3 text-center py-8">No results yet. Try the Quick Analysis!</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
