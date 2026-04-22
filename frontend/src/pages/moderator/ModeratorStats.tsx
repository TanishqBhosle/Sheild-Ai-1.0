import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../../app/providers/AuthProvider';
import { formatNumber, getDecisionBadgeClass } from '../../lib/utils';

export default function ModeratorStats() {
  const [stats, setStats] = useState({
    totalReviewed: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    pendingReview: 0,
    avgProcessingMs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "moderation_results"),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const results = snap.docs.map(d => d.data());
      const approved = results.filter(r => r.status === 'Approved').length;
      const rejected = results.filter(r => r.status === 'Rejected').length;
      const flagged = results.filter(r => r.status === 'Flagged').length;
      const pending = results.filter(r => r.needsHumanReview && !r.reviewedBy).length;
      const avgMs = results.length > 0
        ? Math.round(results.reduce((s, r) => s + (r.processingMs || 0), 0) / results.length)
        : 0;

      setStats({
        totalReviewed: results.length,
        approved,
        rejected,
        flagged,
        pendingReview: pending,
        avgProcessingMs: avgMs,
      });
      setLoading(false);
    });
    return unsub;
  }, []);

  const cards = [
    { label: 'Total Processed', value: stats.totalReviewed, icon: Eye, color: 'text-aegis-accent', bg: 'bg-aegis-accent/10' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Flagged', value: stats.flagged, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Pending Review', value: stats.pendingReview, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Avg Latency', value: `${stats.avgProcessingMs}ms`, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  if (loading) return <div className="p-12 text-center text-aegis-text3 animate-pulse">Loading stats...</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-emerald-400" /> Moderation Statistics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass-card flex items-center gap-4">
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

      {/* Decision Distribution */}
      <div className="glass-card">
        <h3 className="text-xs font-bold text-aegis-text3 uppercase mb-4 tracking-widest">Decision Distribution</h3>
        <div className="flex items-center gap-2 h-8 rounded-lg overflow-hidden bg-aegis-bg">
          {stats.totalReviewed > 0 ? (
            <>
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(stats.approved / stats.totalReviewed) * 100}%` }} />
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(stats.flagged / stats.totalReviewed) * 100}%` }} />
              <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(stats.rejected / stats.totalReviewed) * 100}%` }} />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-aegis-text3 italic">No data yet</div>
          )}
        </div>
        {stats.totalReviewed > 0 && (
          <div className="flex items-center gap-6 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-aegis-text2"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Approved ({Math.round((stats.approved / stats.totalReviewed) * 100)}%)</span>
            <span className="flex items-center gap-1.5 text-xs text-aegis-text2"><span className="w-3 h-3 rounded bg-amber-500 inline-block" />Flagged ({Math.round((stats.flagged / stats.totalReviewed) * 100)}%)</span>
            <span className="flex items-center gap-1.5 text-xs text-aegis-text2"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Rejected ({Math.round((stats.rejected / stats.totalReviewed) * 100)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
}
