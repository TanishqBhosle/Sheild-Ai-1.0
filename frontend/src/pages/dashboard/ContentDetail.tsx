import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { getDecisionBadgeClass, getSeverityColor } from '../../lib/utils';
import { CATEGORIES } from '../../constants/categories';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const contentUnsub = onSnapshot(doc(db, `content/${id}`), (snap) => {
      if (snap.exists()) setContent(snap.data());
    });

    const resultsQuery = query(
      collection(db, "moderation_results"),
      where('contentId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const resultsUnsub = onSnapshot(resultsQuery, (snap) => {
      setResults(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });

    return () => {
      contentUnsub();
      resultsUnsub();
    };
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-aegis-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!content) return <p className="text-aegis-text3 text-center py-20">Content not found</p>;

  const result = results[0];
  const categories = (result?.categories || {}) as Record<string, { triggered: boolean; severity: number; confidence: number }>;
  const severity = (result?.severity as number) || 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text">Content Detail</h2>
        <span className={`badge ${getDecisionBadgeClass(result?.decision as string)}`}>{String(result?.decision || content?.status)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Gauge */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card flex flex-col items-center">
          <p className="text-xs text-aegis-text3 mb-4">Severity Score</p>
          <svg width="120" height="80" viewBox="0 0 120 80">
            <path d="M10 70 A50 50 0 0 1 110 70" fill="none" stroke="#2d3650" strokeWidth="8" strokeLinecap="round" />
            <motion.path d="M10 70 A50 50 0 0 1 110 70" fill="none" stroke={getSeverityColor(severity)} strokeWidth="8" strokeLinecap="round"
              strokeDasharray="157" initial={{ strokeDashoffset: 157 }} animate={{ strokeDashoffset: 157 - (severity / 100) * 157 }} transition={{ duration: 1, ease: 'easeOut' }} />
            <text x="60" y="65" textAnchor="middle" className="text-2xl font-bold" fill={getSeverityColor(severity)}>{severity}</text>
          </svg>
          <p className="text-xs text-aegis-text3 mt-2">Confidence: {Number(result?.confidence || 0).toFixed(2)}</p>
        </motion.div>

        {/* Category Breakdown */}
        <div className="glass-card lg:col-span-2">
          <p className="text-xs text-aegis-text3 mb-4">Category Breakdown</p>
          <div className="space-y-2">
            {CATEGORIES.map((cat, i) => {
              const score = categories[cat.key];
              if (!score) return null;
              return (
                <motion.div key={cat.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3">
                  <span className="text-xs text-aegis-text2 w-28">{cat.label}</span>
                  <div className="flex-1 h-2 bg-aegis-bg rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score.severity}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                      className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                  <span className="text-xs text-aegis-text3 w-10 text-right">{score.severity}</span>
                  {score.triggered && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className="glass-card">
        <p className="text-xs text-aegis-text3 mb-3">Content ({String(content?.type)})</p>
        {content?.type === 'text' && <p className="text-sm text-aegis-text whitespace-pre-wrap">{String(content?.text || 'No text content')}</p>}
        {content?.type === 'image' && <img src={String(content?.mediaUrl)} className="max-h-[500px] rounded-lg object-contain bg-black/20" alt="Moderated content" />}
        {content?.type === 'video' && <video src={String(content?.mediaUrl)} controls className="max-h-[500px] rounded-lg bg-black/20" />}
        {content?.type === 'audio' && <audio src={String(content?.mediaUrl)} controls className="w-full" />}
      </div>

      {/* AI Explanation */}
      {Boolean(result?.explanation) && (
        <div className="glass-card">
          <p className="text-xs text-aegis-text3 mb-2">AI Explanation</p>
          <p className="text-sm text-aegis-text2">{String(result?.explanation)}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-aegis-text3">
            <span>Model: {String(result?.aiModel)}</span>
            <span>Processing: {String(result?.processingMs)}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}
