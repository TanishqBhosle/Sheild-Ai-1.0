import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { getDecisionBadgeClass, getSeverityColor } from '../../lib/utils';
import { CATEGORIES } from '../../constants/categories';
import { CheckCircle, XCircle, ArrowUpRight, Keyboard } from 'lucide-react';

export default function ModeratorQueue() {
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [notes, setNotes] = useState('');

  const loadQueue = useCallback(() => {
    api.get<{ queue: Array<Record<string, unknown>> }>('/v1/moderator/queue')
      .then(d => { setQueue(d.queue || []); if (!selected && (d.queue || []).length > 0) setSelected(d.queue[0]); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(loadQueue, [loadQueue]);

  const submitReview = async (decision: string) => {
    if (!selected) return;
    setReviewing(true);
    try {
      await api.post(`/v1/moderator/review/${selected.contentId}`, { decision, notes });
      setQueue(q => q.filter(i => i.contentId !== selected.contentId));
      setSelected(queue.find(i => i.contentId !== selected.contentId) || null);
      setNotes('');
    } catch (err) { console.error(err); }
    finally { setReviewing(false); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'a' || e.key === 'A') submitReview('approved');
      if (e.key === 'r' || e.key === 'R') submitReview('rejected');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, queue]);

  const severity = (selected?.severity as number) || 0;
  const categories = (selected?.categories || {}) as Record<string, { triggered: boolean; severity: number; confidence: number }>;
  const content = selected?.content as Record<string, unknown> | null;

  return (
    <div className="flex h-full">
      {/* Queue List — 40% */}
      <div className="w-[40%] border-r border-aegis-border overflow-y-auto">
        <div className="p-4 border-b border-aegis-border flex items-center justify-between sticky top-0 bg-aegis-bg2 z-10">
          <span className="text-xs font-medium text-aegis-text3">{queue.length} items</span>
          <span className="flex items-center gap-1 text-[10px] text-aegis-text3"><Keyboard className="w-3 h-3" />[A]pprove [R]eject</span>
        </div>
        <AnimatePresence>
          {queue.map((item, i) => (
            <motion.div key={String(item.contentId)} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300, transition: { duration: 0.3 } }}
              onClick={() => setSelected(item)}
              className={`p-4 border-b border-aegis-border/50 cursor-pointer transition-colors ${selected?.contentId === item.contentId ? 'bg-aegis-bg3' : 'hover:bg-aegis-bg3/50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-aegis-text2">{String(item.contentId)}</span>
                <span className={`badge ${getDecisionBadgeClass(item.decision as string)}`}>{String(item.decision)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-aegis-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.severity as number}%`, backgroundColor: getSeverityColor(item.severity as number) }} />
                </div>
                <span className="text-[10px] text-aegis-text3 font-mono">{String(item.severity)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!loading && queue.length === 0 && <p className="p-8 text-center text-aegis-text3 text-sm">Queue is empty! 🎉</p>}
      </div>

      {/* Review Detail — 60% */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-aegis-text">Review: {String(selected.contentId)}</h3>
              <span className="text-xs text-aegis-text3">{String(selected.aiModel)}</span>
            </div>

            {/* Severity Gauge */}
            <div className="flex items-center gap-6">
              <svg width="100" height="65" viewBox="0 0 100 65">
                <path d="M8 58 A42 42 0 0 1 92 58" fill="none" stroke="#2d3650" strokeWidth="7" strokeLinecap="round" />
                <motion.path d="M8 58 A42 42 0 0 1 92 58" fill="none" stroke={getSeverityColor(severity)} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray="132" initial={{ strokeDashoffset: 132 }} animate={{ strokeDashoffset: 132 - (severity / 100) * 132 }} transition={{ duration: 0.8 }} />
                <text x="50" y="54" textAnchor="middle" className="text-xl font-bold" fill={getSeverityColor(severity)}>{severity}</text>
              </svg>
              <div className="text-xs text-aegis-text3">
                <p>Confidence: <b className="text-aegis-text">{Number(selected.confidence).toFixed(2)}</b></p>
                <p>Processing: <b className="text-aegis-text">{String(selected.processingMs)}ms</b></p>
              </div>
            </div>

            {/* Categories */}
            <div className="glass-card">
              <p className="text-xs text-aegis-text3 mb-3">Categories</p>
              {CATEGORIES.map((cat, i) => {
                const score = categories[cat.key];
                if (!score) return null;
                return (
                  <motion.div key={cat.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-aegis-text2 w-28">{cat.label}</span>
                    <div className="flex-1 h-1.5 bg-aegis-bg rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${score.severity}%` }} transition={{ duration: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                    </div>
                    <span className="text-[10px] text-aegis-text3 w-8">{score.severity}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Content */}
            <div className="glass-card"><p className="text-xs text-aegis-text3 mb-2">Content</p><p className="text-sm text-aegis-text whitespace-pre-wrap">{String(content?.text || 'N/A')}</p></div>

            {/* AI Explanation */}
            {Boolean(selected.explanation) && <div className="glass-card"><p className="text-xs text-aegis-text3 mb-1">AI Says</p><p className="text-sm text-aegis-text2">{String(selected.explanation)}</p></div>}

            {/* Review Actions */}
            <div className="space-y-3">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field h-16 resize-none" placeholder="Review notes (optional)..." />
              <div className="flex items-center gap-3">
                <button onClick={() => submitReview('approved')} disabled={reviewing} className="btn-success flex-1 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />Approve [A]
                </button>
                <button onClick={() => submitReview('rejected')} disabled={reviewing} className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />Reject [R]
                </button>
                <button onClick={() => submitReview('flagged')} disabled={reviewing} className="btn-ghost flex items-center justify-center gap-2">
                  <ArrowUpRight className="w-4 h-4" />Escalate
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-aegis-text3 text-sm">Select an item from the queue</div>
        )}
      </div>
    </div>
  );
}
