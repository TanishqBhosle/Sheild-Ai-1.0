import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { db, storage } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, where } from 'firebase/firestore';
import { useAuth } from '../../app/providers/AuthProvider';
import { formatNumber, getDecisionBadgeClass, formatTimeAgo } from '../../lib/utils';
import { Activity, AlertTriangle, Clock, Eye, Send, Image as ImageIcon, Video, File, X, Loader2, Zap } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DashboardSummary {
  apiCallsToday: number; flaggedToday: number; pendingReview: number; avgLatencyMs: number;
  recentResults: Array<{ resultId: string; contentId: string; decision: string; severity: number; confidence: number; processingMs: number; createdAt: unknown }>;
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickText, setQuickText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quickResult, setQuickResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "moderation_results"),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const results = snap.docs.map(d => ({ ...d.data(), resultId: d.id })) as any[];
      setSummary({
        apiCallsToday: results.length, // Mock today's count for demo
        flaggedToday: results.filter(r => r.decision !== 'approved').length,
        pendingReview: results.filter(r => r.needsHumanReview).length,
        avgLatencyMs: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + (r.processingMs || 0), 0) / results.length) : 0,
        recentResults: results as any
      });
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim() && !file) return;

    setSubmitting(true);
    setQuickResult(null);

    try {
      let mediaUrl = quickText;
      let type = 'text';

      if (file) {
        type = file.type.split('/')[0];
        const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(uploadResult.ref);
      } else if (quickText.startsWith('http')) {
        // Detect type from URL if possible
        if (quickText.match(/\.(jpeg|jpg|gif|png)$/)) type = 'image';
        else if (quickText.match(/\.(mp4|webm|ogg)$/)) type = 'video';
        else if (quickText.match(/\.(mp3|wav|ogg)$/)) type = 'audio';
      }

      const payload = {
        type,
        text: type === 'text' ? quickText : null,
        content: type === 'text' ? quickText : mediaUrl,
        mediaUrl: type === 'text' ? null : mediaUrl,
        async: type === 'video' || type === 'audio',
        callbackUrl: 'https://webhook.site/test'
      };

      const res = await api.post<Record<string, any>>('/v1/moderate', payload);
      
      if (payload.async) {
        // For async, we show a "Processing" state and wait for Firestore
        setQuickResult({ status: 'processing', decision: 'processing', explanation: 'Analysing media... please wait.', severity: 0, confidence: 0 });
        
        // Setup listener for the result
        const q = query(
          collection(db, "moderation_results"),
          where('contentId', '==', res.contentId),
          limit(1)
        );
        
        const unsub = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            setQuickResult(snap.docs[0].data());
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

  const [demoFilters, setDemoFilters] = useState({ mediaType: 'all', category: 'all' });

  // Pre-fill demo data
  useEffect(() => {
    if (demoFilters.mediaType === 'all' && demoFilters.category === 'all') return;
    
    const samples: Record<string, Record<string, string>> = {
      text: {
        'Hate Speech': "I absolutely despise people from that specific ethnic group, they should be removed.",
        'Harassment': "Stop talking you complete idiot. Nobody wants to hear your stupid opinion.",
        'Violence': "I will find you and I will hurt you. You are not safe.",
        'Spam': "CONGRATULATIONS! You won $1,000,000! Click here to claim now: http://scam.me/win",
        'Illegal': "Here is how to manufacture a dangerous prohibited substance at home.",
        'Safe': "Hello there! Hope you have a wonderful day."
      },
      image: { 'Safe': 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606', 'Illegal': 'https://raw.githubusercontent.com/minimaxir/img-moderation-test/master/images/offensive.jpg' },
      audio: { 'Safe': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      video: { 'Safe': 'https://www.w3schools.com/html/mov_bbb.mp4' }
    };

    const type = demoFilters.mediaType === 'all' ? 'text' : demoFilters.mediaType;
    const cat = demoFilters.category === 'all' ? 'Safe' : demoFilters.category;
    
    const sample = samples[type]?.[cat] || samples[type]?.['Safe'] || '';
    if (sample) {
      setQuickText(sample);
      setFile(null); // Clear file if we are setting text/URL
    }
  }, [demoFilters]);

  const runDemo = async () => {
    setSubmitting(true);
    setQuickResult(null);
    try {
      // For user dashboard demo, we use a special endpoint or just run a series of moderations
      const res = await api.post<{ results: any[] }>('/v1/dashboard/run-demo', demoFilters);
      setQuickResult({ 
        decision: 'demo_complete', 
        explanation: `Processed ${res.results.length} items. Check the Moderator Panel to see all results (Approved, Flagged, and Rejected).`,
        severity: 0,
        confidence: 1,
        processingMs: 0
      });
    } catch (err: any) {
      console.error(err);
      setQuickResult({ decision: 'error', explanation: 'Demo failed. ' + err.message, severity: 0, confidence: 0 });
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
            className="glass-card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-aegis-text3 font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-aegis-text">
                {typeof s.value === 'number' ? formatNumber(s.value) : s.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
          <div className="flex flex-col gap-3 mb-6 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-aegis-text flex items-center gap-2"><Send className="w-4 h-4 text-aegis-accent" />AI Demo Engine</h2>
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Custom Test Suite</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] uppercase text-aegis-text3 mb-1 ml-1">Media Type</label>
                <select 
                  value={demoFilters.mediaType} 
                  onChange={(e) => setDemoFilters(prev => ({ ...prev, mediaType: e.target.value }))}
                  className="w-full bg-aegis-bg3 text-aegis-text text-xs rounded-lg px-2 py-2 border border-aegis-border outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="all">All Media</option>
                  <option value="text">Text Only</option>
                  <option value="image">Image Only</option>
                  <option value="audio">Audio Only</option>
                  <option value="video">Video Only</option>
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] uppercase text-aegis-text3 mb-1 ml-1">Test Category</label>
                <select 
                  value={demoFilters.category} 
                  onChange={(e) => setDemoFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-aegis-bg3 text-aegis-text text-xs rounded-lg px-2 py-2 border border-aegis-border outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="all">Mix All</option>
                  <option value="Safe">Safe Content</option>
                  <option value="Hate Speech">Hate Speech</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Violence">Violence</option>
                  <option value="Spam">Spam</option>
                  <option value="Illegal">Illegal/Inappropriate</option>
                </select>
              </div>
              <button 
                onClick={runDemo} 
                disabled={submitting}
                className="btn-primary mt-5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 px-4 py-2 text-xs"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Run Custom Demo
              </button>
            </div>
          </div>
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
                <span>Confidence: <b className="text-aegis-text">{String(Math.round(quickResult.confidence * 100))}%</b></span>
              </div>
              <p className="text-xs text-aegis-text3 mt-2 line-clamp-2">{quickResult.explanation}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-aegis-text flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400" />Recent Activity</h2>
            <button className="text-[10px] uppercase tracking-wider font-bold text-aegis-text3 hover:text-white transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {summary?.recentResults.map((r, i) => (
              <div key={r.resultId} className="flex items-center justify-between p-2 rounded-lg bg-aegis-bg3/50 border border-aegis-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${getDecisionBadgeClass(r.decision)} bg-opacity-20`}>
                    {r.decision === 'rejected' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-aegis-text truncate">Content {r.contentId.substring(0, 8)}</p>
                    <p className="text-[10px] text-aegis-text3">{formatTimeAgo(r.createdAt as any)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-bold uppercase ${getDecisionBadgeClass(r.decision)}`}>{r.decision}</p>
                  <p className="text-[10px] text-aegis-text3">{r.severity}% Sev</p>
                </div>
              </div>
            ))}
            {(!summary || summary.recentResults.length === 0) && (
              <div className="text-center py-12 text-aegis-text3 text-sm">No recent activity. Try running a quick analysis.</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
