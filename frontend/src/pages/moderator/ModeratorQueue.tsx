import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { useAuth } from '../../app/providers/AuthProvider';
import { getDecisionBadgeClass, getSeverityColor } from '../../lib/utils';
import { CATEGORIES } from '../../constants/categories';
import { CheckCircle, XCircle, ArrowUpRight, Clock, AlertTriangle, Eye } from 'lucide-react';

export default function ModeratorQueue() {
  const { role } = useAuth();
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [selectedContent, setSelectedContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'needs-review' | 'Approved' | 'Flagged' | 'Rejected'>('all');

  useEffect(() => {
    setLoading(true);

    let q;
    const resultsRef = collection(db, 'moderation_results');
    if (activeTab === 'all') {
      q = query(resultsRef, orderBy('createdAt', 'desc'), limit(100));
    } else if (activeTab === 'needs-review') {
      q = query(resultsRef, where('needsHumanReview', '==', true), orderBy('createdAt', 'desc'), limit(50));
    } else {
      q = query(resultsRef, where('status', '==', activeTab), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ resultId: doc.id, ...doc.data() }));
      setQueue(items);
      
      if (!selected && items.length > 0) setSelected(items[0]);
      setLoading(false);
    }, (err) => {
      console.error("Snapshot error:", err);
      setLoading(false);
    });

    return unsub;
  }, [activeTab]);

  // Fetch content for selected result
  useEffect(() => {
    if (!selected) { setSelectedContent(null); return; }
    const fetchContent = async () => {
      const contentId = selected.contentId as string;
      const docSnap = await getDoc(doc(db, `content/${contentId}`));
      if (docSnap.exists()) setSelectedContent(docSnap.data());
    };
    fetchContent();
  }, [selected]);

  const submitReview = async (decision: string) => {
    if (!selected) return;
    setReviewing(true);
    try {
      console.log(`[ModeratorQueue] Submitting ${decision} for:`, selected.contentId);
      await api.patch(`/v1/moderator/${selected.contentId}`, { decision, notes });
      setNotes('');
    } catch (err) { console.error("Review error:", err); }
    finally { setReviewing(false); }
  };

  const tabs = [
    { id: 'all', label: 'All', icon: <ArrowUpRight className="w-3 h-3" /> },
    { id: 'needs-review', label: 'Needs Review', icon: <Clock className="w-3 h-3" /> },
    { id: 'Approved', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> },
    { id: 'Flagged', label: 'Flagged', icon: <AlertTriangle className="w-3 h-3" /> },
    { id: 'Rejected', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> },
  ] as const;

  return (
    <div className="flex h-full bg-aegis-bg">
      {/* List Pane */}
      <div className="w-[45%] border-r border-aegis-border flex flex-col bg-aegis-bg2/30">
        <div className="p-4 border-b border-aegis-border bg-aegis-bg3">
          <h2 className="text-sm font-bold text-aegis-text flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-aegis-accent" /> Content Moderation Panel
          </h2>
          <div className="flex bg-aegis-bg rounded-lg p-1 gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex-none flex items-center gap-1.5 py-1.5 px-3 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-aegis-bg3 text-white shadow-lg' : 'text-aegis-text3 hover:text-white'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center animate-pulse text-aegis-text3">Loading content...</div>
          ) : (
            queue.map((item) => {
              const status = String(item.status || item.decision || 'Unknown');
              return (
                <motion.div key={String(item.resultId)} layout onClick={() => setSelected(item)}
                  className={`p-4 border-b border-aegis-border/50 cursor-pointer transition-all ${selected?.resultId === item.resultId ? 'bg-aegis-bg3 border-l-4 border-l-aegis-accent' : 'hover:bg-aegis-bg3/40'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-aegis-text3 bg-aegis-bg2 px-1.5 py-0.5 rounded">{(item as any).type || 'text'}</span>
                      <span className="text-[10px] font-mono text-aegis-text2">{String(item.contentId).substring(0, 12)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      status === 'Rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>{status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 bg-aegis-bg rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${item.severity as number}%`, backgroundColor: getSeverityColor(item.severity as number) }} />
                    </div>
                    <span className="text-[10px] text-aegis-text3 font-mono">Sev: {String(item.severity)}</span>
                  </div>
                </motion.div>
              );
            })
          )}
          {queue.length === 0 && !loading && <div className="p-12 text-center text-aegis-text3 text-xs italic">No content in this category.</div>}
        </div>
      </div>

      {/* Detail Pane */}
      <div className="flex-1 overflow-y-auto p-10 bg-aegis-bg">
        {selected ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between border-b border-aegis-border pb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Moderation Detail</h1>
                <p className="text-xs text-aegis-text3 font-mono">{String(selected.contentId)} • {String(selected.aiModel)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-aegis-text3 uppercase font-bold mb-1">AI Confidence</p>
                <p className="text-xl font-bold text-aegis-accent">{(Number(selected.confidence) * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="glass-card p-6 border-l-4 border-l-aegis-accent">
                  <h4 className="text-[10px] uppercase font-bold text-aegis-text3 mb-4 tracking-widest">Raw Content</h4>
                  <div className="bg-aegis-bg2/50 p-4 rounded-lg min-h-[150px]">
                    {selectedContent?.type === 'text' && <p className="text-sm text-aegis-text leading-relaxed">{String(selectedContent?.text)}</p>}
                    {selectedContent?.type === 'image' && <img src={String(selectedContent?.mediaUrl)} className="w-full rounded-md shadow-2xl" alt="Content" />}
                    {selectedContent?.type === 'video' && <video src={String(selectedContent?.mediaUrl)} controls className="w-full rounded-md" />}
                    {selectedContent?.type === 'audio' && <audio src={String(selectedContent?.mediaUrl)} controls className="w-full" />}
                    {!selectedContent && <div className="h-20 flex items-center justify-center text-aegis-text3 animate-pulse">Loading media...</div>}
                  </div>
                </div>
                <div className="glass-card p-6">
                  <h4 className="text-[10px] uppercase font-bold text-aegis-text3 mb-4 tracking-widest">AI Reasoning</h4>
                  <p className="text-sm text-aegis-text2 italic">"{String(selected.explanation)}"</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h4 className="text-[10px] uppercase font-bold text-aegis-text3 mb-6 tracking-widest">Category Analysis</h4>
                  <div className="space-y-4">
                    {Object.entries((selected.categories || {}) as Record<string, any>).map(([name, data]) => (
                      <div key={name} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span className={data.triggered ? 'text-red-400' : 'text-aegis-text3'}>{name}</span>
                          <span className="text-aegis-text3">{data.severity}%</span>
                        </div>
                        <div className="h-1.5 bg-aegis-bg rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${data.severity}%` }} className={`h-full ${data.triggered ? 'bg-red-500' : 'bg-aegis-accent'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="glass-card p-6 bg-aegis-bg3/30 border border-aegis-accent/20">
                  <h4 className="text-[10px] uppercase font-bold text-aegis-text3 mb-4 tracking-widest">Manual Decision</h4>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field h-24 mb-4 text-xs" placeholder="Add moderator notes..." />
                  <div className="flex gap-3">
                    <button onClick={() => submitReview('approved')} disabled={reviewing} className="flex-1 btn-success text-[11px] font-bold py-2.5 flex items-center justify-center gap-2 uppercase tracking-wider">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => submitReview('rejected')} disabled={reviewing} className="flex-1 btn-danger text-[11px] font-bold py-2.5 flex items-center justify-center gap-2 uppercase tracking-wider">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-aegis-text3 space-y-4">
            <Eye className="w-12 h-12 opacity-10" />
            <p className="text-sm">Select an item to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
