import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { getDecisionBadgeClass, formatTimeAgo } from '../../lib/utils';
import { FileText, ShieldAlert, Clock, CheckCircle2, XCircle, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContentList() {
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const tabs = [
    { id: 'all', label: 'All', icon: <ListFilter className="w-3 h-3" /> },
    { id: 'approved', label: 'Approved', icon: <CheckCircle2 className="w-3 h-3" /> },
    { id: 'rejected', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> },
    { id: 'flagged', label: 'Flagged', icon: <ShieldAlert className="w-3 h-3" /> },
    { id: 'needs_human_review', label: 'Review', icon: <Clock className="w-3 h-3" /> },
  ];

  useEffect(() => {
    let q;
    const resultsRef = collection(db, "moderation_results");
    
    if (filter === 'all') {
      q = query(resultsRef, orderBy('createdAt', 'desc'), limit(50));
    } else if (filter === 'needs_human_review') {
      q = query(resultsRef, where('needsHumanReview', '==', true), orderBy('createdAt', 'desc'), limit(50));
    } else {
      q = query(resultsRef, where('decision', '==', filter), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsub = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ resultId: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore listener error:', err);
      setLoading(false);
    });

    return unsub;
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><FileText className="w-5 h-5 text-aegis-accent" />Content</h2>
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`flex-none flex items-center gap-1.5 py-1.5 px-3 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${filter === tab.id ? 'bg-aegis-bg3 text-white shadow-lg' : 'text-aegis-text3 hover:text-white'}`}>
              {tab.icon} {tab.label}
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
