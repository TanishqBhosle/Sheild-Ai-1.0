import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../../app/providers/AuthProvider';
import { getDecisionBadgeClass, formatTimeAgo } from '../../lib/utils';
import { FileText, Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContentList() {
  const { orgId } = useAuth();
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!orgId) return;

    const constraints: Parameters<typeof query>[1][] = [];
    if (filter) {
      constraints.push(where('decision', '==', filter));
    }
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(50));

    const q = query(
      collection(db, `organizations/${orgId}/moderation_results`),
      ...constraints
    );

    const unsub = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ resultId: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore listener error:', err);
      setLoading(false);
    });

    return unsub;
  }, [orgId, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><FileText className="w-5 h-5 text-aegis-accent" />Content</h2>
        <div className="flex items-center gap-2">
          {['', 'approved', 'rejected', 'flagged', 'needs_human_review'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-lg transition-all ${filter === f ? 'bg-aegis-accent/15 text-aegis-accent' : 'text-aegis-text3 hover:bg-aegis-bg3'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="glass-card p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-aegis-border">
            {['Content ID', 'Decision', 'Severity', 'Confidence', 'Time'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-aegis-text3 uppercase tracking-wider">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? [1,2,3,4,5].map(i => <tr key={i}><td colSpan={5}><div className="h-10 m-2 bg-aegis-bg3 rounded animate-pulse" /></td></tr>) :
              results.map((r, i) => (
                <motion.tr key={String(r.resultId) || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-aegis-border/50 hover:bg-aegis-bg3/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3"><Link to={`/dashboard/content/${r.contentId}`} className="text-sm font-mono text-aegis-accent hover:underline">{String(r.contentId)}</Link></td>
                  <td className="px-4 py-3"><span className={`badge ${getDecisionBadgeClass(r.decision as string)}`}>{String(r.decision)}</span></td>
                  <td className="px-4 py-3 text-sm text-aegis-text">{String(r.severity)}/100</td>
                  <td className="px-4 py-3 text-sm text-aegis-text2">{Number(r.confidence).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-aegis-text3">{formatTimeAgo(r.createdAt)}</td>
                </motion.tr>
              ))}
            {!loading && results.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-aegis-text3">No content found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
