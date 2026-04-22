import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { db, storage } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, where } from 'firebase/firestore';
import { useAuth } from '../../app/providers/AuthProvider';
import { formatNumber, getDecisionBadgeClass, formatTimeAgo } from '../../lib/utils';
import { Activity, AlertTriangle, Clock, Eye, Send, Image as ImageIcon, Video, File, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DashboardSummary {
  apiCallsToday: number; flaggedToday: number; pendingReview: number; avgLatencyMs: number;
  recentResults: Array<{ resultId: string; contentId: string; decision: string; severity: number; confidence: number; processingMs: number; createdAt: unknown }>;
}

export default function DashboardHome() {
  const { orgId } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickText, setQuickText] = useState('');
  const [quickResult, setQuickResult] = useState<Record<string, unknown> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!orgId) return;

    // Listen for recent results
    const resultsQuery = query(
      collection(db, `organizations/${orgId}/moderation_results`),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubResults = onSnapshot(resultsQuery, (snap) => {
      const results = snap.docs.map(doc => ({
        resultId: doc.id,
        ...doc.data()
      })) as DashboardSummary['recentResults'];
      
      setSummary(prev => {
        const base = prev || { apiCallsToday: 0, flaggedToday: 0, pendingReview: 0, avgLatencyMs: 0, recentResults: [] };
        return {
          ...base,
          recentResults: results
        };
      });
      setLoading(false);
    });

    // Listen for today's stats from usage_logs
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    
    const statsUnsub = onSnapshot(doc(db, `organizations/${orgId}/usage_logs/${monthKey}/daily/${todayKey}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSummary(prev => {
          const base = prev || { apiCallsToday: 0, flaggedToday: 0, pendingReview: 0, avgLatencyMs: 0, recentResults: [] };
          return {
            ...base,
            apiCallsToday: data.apiCalls || 0,
          };
        });
      }
    });

    // Listen for pending reviews — only check needsHumanReview flag
    // (reviewedBy might not exist as a field, so we filter client-side)
    const pendingQuery = query(
      collection(db, `organizations/${orgId}/moderation_results`),
      where('needsHumanReview', '==', true)
    );
    const unsubPending = onSnapshot(pendingQuery, (snap) => {
      // Client-side filter: only count items where reviewedBy is not set
      const pending = snap.docs.filter(d => !d.data().reviewedBy);
      setSummary(prev => {
        const base = prev || { apiCallsToday: 0, flaggedToday: 0, pendingReview: 0, avgLatencyMs: 0, recentResults: [] };
        return {
          ...base,
          pendingReview: pending.length
        };
      });
    });

    return () => {
      unsubResults();
      statsUnsub();
      unsubPending();
    };
  }, [orgId]);

  const handleQuickSubmit = async () => {
    if (!quickText.trim() && !file) return;
    setSubmitting(true); setQuickResult(null);
    try {
      let payload: any = { type: 'text', text: quickText };
      
      if (file) {
        const fileType = file.type.split('/')[0] as 'image' | 'video' | 'audio';
        const storagePath = `orgs/${orgId}/uploads/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        payload = {
          type: fileType,
          mediaUrl: url,
          text: quickText || undefined,
          async: fileType === 'video' || fileType === 'audio'
        };
      } else if (quickText.startsWith('http')) {
        // Detect type from extension if possible, or default to image
        const ext = quickText.split('.').pop()?.toLowerCase();
        let type: any = 'image';
        if (['mp4', 'webm', 'mov'].includes(ext || '')) type = 'video';
        if (['mp3', 'wav', 'ogg'].includes(ext || '')) type = 'audio';
        
        payload = {
          type,
          mediaUrl: quickText,
          async: type === 'video' || type === 'audio'
        };
      }

      const res = await api.post<Record<string, any>>('/v1/moderate', payload);
      
      if (payload.async) {
        // For async, we show a "Processing" state and wait for Firestore
        setQuickResult({ status: 'processing', decision: 'processing', explanation: 'Analysing media... please wait.', severity: 0, confidence: 0 });
        
        // Listen for the result in moderation_results collection
        const q = query(
          collection(db, `organizations/${orgId}/moderation_results`),
          where('contentId', '==', res.contentId)
        );
        
        const unsub = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const result = snap.docs[0].data();
            setQuickResult({ ...result, status: result.decision });
            unsub();
          }
        });
      } else {
        setQuickResult(res);
      }
      
      setQuickText('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      // Show error in the result box
      setQuickResult({ 
        decision: 'error', 
        explanation: err.message || 'Moderation service unavailable. Please check backend connection.',
        severity: 0,
        confidence: 0,
        processingMs: 0
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: 'API Calls Today', value: summary?.apiCallsToday || 0, icon: Activity, color: 'text-aegis-accent', bg: 'bg-aegis-accent/10' },
    { label: 'Flagged Today', value: (summary?.recentResults || []).filter(r => r.decision === 'rejected' || r.decision === 'flagged').length, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Pending Review', value: summary?.pendingReview || 0, icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Avg Latency', value: `${summary?.recentResults && summary.recentResults.length > 0 ? Math.round(summary.recentResults.reduce((acc, r) => acc + (r.processingMs || 0), 0) / summary.recentResults.length) : 0}ms`, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
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
          <textarea value={quickText} onChange={e => setQuickText(e.target.value)} className="input-field h-24 resize-none mb-3" placeholder="Paste text here or enter a media URL..." />
          
          {file && (
            <div className="mb-3 p-2 rounded-lg bg-aegis-bg3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-400" /> : <Video className="w-4 h-4 text-purple-400" />}
                <span className="text-xs text-aegis-text2 truncate max-w-[200px]">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-1 hover:bg-aegis-bg rounded"><X className="w-4 h-4 text-aegis-text3" /></button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,video/*,audio/*" />
            <button onClick={() => fileInputRef.current?.click()} className="btn-ghost px-3 py-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Media
            </button>
            <button onClick={handleQuickSubmit} disabled={submitting || (!quickText.trim() && !file)} className="btn-primary flex-1">
              {submitting ? 'Analyzing...' : 'Moderate Content'}
            </button>
          </div>
          {quickResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`mt-4 p-3 rounded-lg border ${quickResult.decision === 'error' ? 'bg-red-500/10 border-red-500/50' : 'bg-aegis-bg border-aegis-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`badge ${quickResult.decision === 'error' ? 'bg-red-500 text-white' : getDecisionBadgeClass(quickResult.decision as string)}`}>
                  {String(quickResult.decision).toUpperCase()}
                </span>
                {quickResult.processingMs !== 0 && <span className="text-xs text-aegis-text3">{String(quickResult.processingMs)}ms</span>}
              </div>
              <div className="flex items-center gap-4 text-xs text-aegis-text2">
                <span>Severity: <b className="text-aegis-text">{String(quickResult.severity)}</b></span>
                <span>Confidence: <b className="text-aegis-text">{typeof quickResult.confidence === 'number' ? (quickResult.confidence * 100).toFixed(0) : '0'}%</b></span>
              </div>
              {Boolean(quickResult.explanation) && <p className={`text-xs mt-2 ${quickResult.decision === 'error' ? 'text-red-400' : 'text-aegis-text3'}`}>{String(quickResult.explanation)}</p>}
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
