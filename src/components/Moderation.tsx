import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MoreVertical,
  Search,
  Filter,
  ArrowUpRight,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Flag,
  ChevronDown,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Activity,
  Check,
  Info,
  ShieldAlert,
  Type,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge, cn } from './UI';
import { useStore } from '../store/useStore';
import { moderationApi } from '../services/api';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const ConfidenceCircle = ({ score, size = 'sm' }: { score: number, size?: 'sm' | 'md' }) => {
  const percentage = Math.round(score * 100);
  const radius = size === 'sm' ? 8 : 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);
  const strokeWidth = size === 'sm' ? 2.5 : 3;
  const boxSize = size === 'sm' ? 20 : 32;

  let color = "text-rose-500";
  if (score >= 0.9) color = "text-emerald-500";
  else if (score >= 0.6) color = "text-amber-500";

  return (
    <div className="flex items-center gap-2">
      <div className="relative transform -rotate-90" style={{ width: boxSize, height: boxSize }}>
        <svg width={boxSize} height={boxSize} viewBox={`0 0 ${boxSize} ${boxSize}`}>
          <circle
            cx={boxSize / 2}
            cy={boxSize / 2}
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <motion.circle
            cx={boxSize / 2}
            cy={boxSize / 2}
            r={radius}
            className={cn("stroke-current", color)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "circOut" }}
            fill="transparent"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={cn(
        "font-bold tabular-nums",
        size === 'sm' ? "text-[10px]" : "text-sm",
        color
      )}>
        {percentage}%
      </span>
    </div>
  );
};

const SeverityLegend = () => {
  const levels = [
    { 
      level: 1, 
      label: 'Safe', 
      desc: 'No violations detected.', 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500', 
      icon: CheckCircle, 
      hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
      implication: 'Content is safe for all audiences. No action required.'
    },
    { 
      level: 2, 
      label: 'Low', 
      desc: 'Borderline or suggestive content.', 
      color: 'text-blue-500', 
      bg: 'bg-blue-500', 
      icon: Info, 
      hover: 'hover:bg-blue-50 dark:hover:bg-blue-500/10',
      implication: 'Monitor closely. May contain mild profanity or subtle policy deviations.'
    },
    { 
      level: 3, 
      label: 'Medium', 
      desc: 'Clear violation. Requires review.', 
      color: 'text-amber-500', 
      bg: 'bg-amber-500', 
      icon: AlertTriangle, 
      hover: 'hover:bg-amber-50 dark:hover:bg-amber-500/10',
      implication: 'Likely moderate violation. Requires human verification before final decision.'
    },
    { 
      level: 4, 
      label: 'High', 
      desc: 'Extreme violation. Immediate action.', 
      color: 'text-rose-600', 
      bg: 'bg-rose-600', 
      icon: ShieldAlert, 
      hover: 'hover:bg-rose-50 dark:hover:bg-rose-600/10',
      implication: 'Severe violation detected. Requires immediate content removal and potential account restriction.'
    },
  ];

  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  return (
    <Card className="p-5 bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50 shadow-inner">
      <div className="flex items-center gap-2 mb-4 ml-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Severity Protocol</h4>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="space-y-1 relative">
        {levels.map((l) => (
          <div key={l.level} className="relative">
            <motion.div 
              onMouseEnter={() => setActiveTooltip(l.level)}
              onMouseLeave={() => setActiveTooltip(null)}
              whileHover={{ x: 4 }}
              className={cn(
                "flex gap-4 items-center p-3 rounded-2xl transition-all cursor-default group",
                l.hover
              )}
            >
              <div className="relative">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm group-hover:shadow-md group-hover:scale-110", l.bg, "bg-opacity-10 dark:bg-opacity-20")}>
                  <l.icon className={cn("w-4 h-4", l.color)} />
                </div>
                <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-sm", l.bg)}>
                  {l.level}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{l.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight truncate group-hover:whitespace-normal transition-all">{l.desc}</p>
              </div>
            </motion.div>

            <AnimatePresence>
              {activeTooltip === l.level && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute left-0 right-0 -top-full mb-2 z-50 pointer-events-none"
                >
                  <div className="mx-2 p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-xl shadow-2xl border border-white/10 text-[10px] leading-relaxed">
                    <span className="font-black text-blue-400 mr-1.5 uppercase tracking-wider">Protocol {l.level}:</span>
                    {l.implication}
                    <div className="absolute -bottom-1 left-8 w-2 h-2 bg-slate-900 dark:bg-slate-950 rotate-45 border-r border-b border-white/10" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const Moderation = () => {
  const { isAuthenticated, userRole } = useStore();
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<'severity' | 'confidence' | 'date'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [moderatorFilter, setModeratorFilter] = useState<string>('all');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [feedbackAccuracy, setFeedbackAccuracy] = useState<'correct' | 'incorrect' | 'misclassified' | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');

  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newType, setNewType] = useState<'text' | 'image' | 'video'>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUrl = (str: string) => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max size 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewContent(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async () => {
    if (!newContent.trim()) {
      toast.error('Please provide content or upload a file.');
      return;
    }
    setIsSubmitting(true);
    try {
      await moderationApi.moderate(newContent, newType, newSourceUrl);
      toast.success(`${newType.toUpperCase()} submitted for assessment`);
      setIsSubmittingNew(false);
      setNewContent('');
      setNewSourceUrl('');
    } catch (error: any) {
      toast.error(error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!isAuthenticated || !db || (userRole !== 'admin' && userRole !== 'moderator')) return;

    // Real-time listener for review queue
    // We remove the status filter from the query to allow client-side filtering for 'completed'
    const q = query(
      collection(db, 'review_queue'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Apply Status Filter
      if (statusFilter !== 'all') {
        items = items.filter(item => item.status === statusFilter);
      }

      // Apply Category Filter
      if (categoryFilter !== 'all') {
        items = items.filter(item => 
          item.moderationResult?.categories?.some((c: string) => c.toLowerCase() === categoryFilter.toLowerCase())
        );
      }

      // Apply Moderator Filter (resolvedBy field)
      if (moderatorFilter !== 'all') {
        items = items.filter(item => item.resolvedBy === moderatorFilter);
      }

      // Apply search filter
      if (searchQuery) {
        const queryText = searchQuery.toLowerCase();
        items = items.filter(item => 
          item.content.toLowerCase().includes(queryText) || 
          item.moderationResult?.explanation?.toLowerCase().includes(queryText) ||
          item.id.toLowerCase().includes(queryText) ||
          (item.submissionId && item.submissionId.toLowerCase().includes(queryText))
        );
      }

      // Apply sorting
      items.sort((a: any, b: any) => {
        if (sortBy === 'severity') {
          return (b.moderationResult?.severityScore || 0) - (a.moderationResult?.severityScore || 0);
        }
        if (sortBy === 'confidence') {
          return (b.moderationResult?.confidenceScore || 0) - (a.moderationResult?.confidenceScore || 0);
        }
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setQueue(items);
      if (items.length > 0 && !selectedItem) {
        setSelectedItem(items[0]);
      }
    }, (error: any) => {
      handleFirestoreError(error, OperationType.GET, 'review_queue');
      if (error.message?.includes('permissions')) {
        toast.error("Access Denied: You do not have moderator permissions.");
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, userRole, sortBy, searchQuery, statusFilter, categoryFilter, moderatorFilter]);

  // Fetch user data for history section
  useEffect(() => {
    if (queue.length === 0) return;

    const fetchUsers = async () => {
      const userIds = Array.from(new Set(queue.map(item => item.userId).filter(Boolean))) as string[];
      const missingIds: string[] = userIds.filter(id => !usersMap[id]);
      
      if (missingIds.length === 0) return;

      // Parallelize fetching for better performance
      const results = await Promise.all(
        missingIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              return { uid, data: userDoc.data() };
            }
            return { uid, data: { uid, unknown: true } };
          } catch (error) {
            console.error(`Error fetching user ${uid}:`, error);
            return { uid, data: { uid, error: true } };
          }
        })
      );
      
      setUsersMap(prev => {
        const next = { ...prev };
        results.forEach(res => {
          next[res.uid] = res.data;
        });
        return next;
      });
    };

    fetchUsers();
  }, [queue]);

  const uniqueModerators = Array.from(new Set(
    queue.filter(item => item.resolvedBy).map(item => item.resolvedBy)
  ));

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || moderatorFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setModeratorFilter('all');
    setSearchQuery('');
  };

  const handleQuickAction = async (item: any, status: 'approved' | 'rejected' | 'flagged', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await moderationApi.updateStatus(item.id, status);
      toast.success(`Content ${status.toUpperCase()}`);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      // Remove from selected multi-select if it was there
      if (selectedIds.has(item.id)) {
        const newIds = new Set(selectedIds);
        newIds.delete(item.id);
        setSelectedIds(newIds);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewContext = () => {
    if (selectedItem?.sourceUrl) {
      window.open(selectedItem.sourceUrl, '_blank');
    } else {
      toast.info('No external source URL available for this submission.', {
        description: 'Analysis was performed on the raw text provided directly to the system.',
        duration: 5000
      });
    }
  };

  const handleBulkAction = async (status: 'approved' | 'rejected' | 'flagged') => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    const idsToProcess = Array.from(selectedIds);
    try {
      await Promise.all(idsToProcess.map(id => moderationApi.updateStatus(id as string, status)));
      toast.success(`Bulk ${status.toUpperCase()} processed for ${selectedIds.size} items`);
      setSelectedIds(new Set());
      setSelectedItem(null);
    } catch (error: any) {
      toast.error('Bulk operation partial failure. Please check logs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) newIds.delete(id);
    else newIds.add(id);
    setSelectedIds(newIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === queue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map(item => item.id)));
    }
  };

  const handleDecision = async (status: 'approved' | 'rejected' | 'flagged') => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      const feedback = feedbackAccuracy ? {
        accuracy: feedbackAccuracy,
        note: feedbackNote
      } : undefined;
      
      await moderationApi.updateStatus(selectedItem.id, status, feedback);
      toast.success(`Content ${status.toUpperCase()}`);
      setSelectedItem(null);
      setFeedbackAccuracy(null);
      setFeedbackNote('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Moderation Queue</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={isSubmittingNew ? 'outline' : 'primary'} 
            size="sm" 
            className="rounded-xl px-4 py-2 h-auto"
            onClick={() => setIsSubmittingNew(!isSubmittingNew)}
          >
            {isSubmittingNew ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {isSubmittingNew ? 'Cancel Submission' : 'New Manual Audit'}
          </Button>
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            {[
              { id: 'date', label: 'Recent', icon: Clock },
              { id: 'severity', label: 'Severity', icon: AlertTriangle },
              { id: 'confidence', label: 'Confidence', icon: TrendingDown },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  sortBy === s.id 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>
          <Badge variant="warning" className="px-3 py-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {queue.length} Pending
          </Badge>
        </div>
      </div>

      <AnimatePresence>
        {isSubmittingNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 border-blue-100 dark:border-blue-900/30 bg-blue-50/10 dark:bg-blue-900/5 shadow-inner">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-blue-600" />
                    Direct Content Submission
                  </h3>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {[
                      { id: 'text', label: 'Text', icon: Type },
                      { id: 'image', label: 'Image', icon: ImageIcon },
                      { id: 'video', label: 'Video', icon: VideoIcon },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setNewType(t.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          newType === t.id 
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                            : "text-slate-500 hover:bg-white/50"
                        )}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Payload to Analysis</label>
                    {newType === 'text' ? (
                      <textarea 
                        className="w-full h-40 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        placeholder="Paste text content for safety assessment..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input 
                            type="text"
                            placeholder={`Enter ${newType} URL...`}
                            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                          />
                          <span className="text-xs font-bold text-slate-400">OR</span>
                          <label className="flex items-center justify-center h-12 px-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all">
                            <Upload className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Upload {newType}</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept={newType === 'image' ? 'image/*' : 'video/*'}
                              onChange={handleFileUpload}
                            />
                          </label>
                        </div>
                        {newContent.startsWith('data:') && (
                           <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                File ready for processing ({newType})
                              </span>
                              <button onClick={() => setNewContent('')} className="text-slate-400 hover:text-rose-500">
                                <X className="w-4 h-4" />
                              </button>
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Source Context / Reference</label>
                    <textarea 
                      className="w-full h-40 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      placeholder="Enter a descriptive context or original platform URL..."
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" onClick={() => setIsSubmittingNew(false)}>Discard</Button>
                  <Button 
                    variant="primary" 
                    className="px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    isLoading={isSubmitting}
                    onClick={handleManualSubmit}
                  >
                    Initiate Security Audit
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)]">
        {/* Queue List */}
        <Card className="lg:col-span-4 p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search queue..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <Button 
                variant={isFilterVisible ? 'primary' : 'outline'} 
                size="sm" 
                className={cn(
                  "h-9 w-9 p-0 flex items-center justify-center shrink-0 relative",
                  hasActiveFilters && !isFilterVisible && "border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-500/10"
                )}
                onClick={() => setIsFilterVisible(!isFilterVisible)}
              >
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
              </Button>
              <button 
                onClick={toggleSelectAll}
                className={cn(
                  "h-9 px-3 rounded-xl border text-xs font-bold transition-all shrink-0",
                  selectedIds.size > 0 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "border-slate-200 dark:border-slate-800 text-slate-500"
                )}
              >
                {selectedIds.size === queue.length && queue.length > 0 ? "Deselect All" : "Select All"}
              </button>
            </div>

            <AnimatePresence>
              {isFilterVisible && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Status</label>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/30"
                      >
                        <option value="all">All Items</option>
                        <option value="pending">Pending Only</option>
                        <option value="completed">Reviewed Only</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Category</label>
                      <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/30"
                      >
                        <option value="all">Any Category</option>
                        <option value="Hate Speech">Hate Speech</option>
                        <option value="Violence">Violence</option>
                        <option value="Harassment">Harassment</option>
                        <option value="Sexual">Sexual</option>
                        <option value="Self-Harm">Self-Harm</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Moderator</label>
                      <select 
                        value={moderatorFilter}
                        onChange={(e) => setModeratorFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/30"
                      >
                        <option value="all">Any Moderator</option>
                        {uniqueModerators.map(mId => (
                          <option key={mId as string} value={mId as string}>ID: {(mId as string).slice(0, 8)}...</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20"
                >
                  <span className="text-[10px] font-bold text-blue-600 ml-2">{selectedIds.size} Selected</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleBulkAction('approved')}
                      disabled={isProcessing}
                      className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm disabled:opacity-50"
                      title="Bulk Approve"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleBulkAction('rejected')}
                      disabled={isProcessing}
                      className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 shadow-sm disabled:opacity-50"
                      title="Bulk Reject"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleBulkAction('flagged')}
                      disabled={isProcessing}
                      className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm disabled:opacity-50"
                      title="Bulk Escalate"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 items-center">
                {statusFilter !== 'all' && (
                  <Badge variant="info" className="flex items-center gap-1 normal-case font-medium pr-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="hover:bg-blue-200 dark:hover:bg-blue-500/30 p-0.5 rounded-full transition-colors">
                      <XCircle className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                )}
                {categoryFilter !== 'all' && (
                  <Badge variant="info" className="flex items-center gap-1 normal-case font-medium pr-1">
                    {categoryFilter}
                    <button onClick={() => setCategoryFilter('all')} className="hover:bg-blue-200 dark:hover:bg-blue-500/30 p-0.5 rounded-full transition-colors">
                      <XCircle className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                )}
                {moderatorFilter !== 'all' && (
                  <Badge variant="info" className="flex items-center gap-1 normal-case font-medium pr-1">
                    Mod: {moderatorFilter.slice(0, 5)}...
                    <button onClick={() => setModeratorFilter('all')} className="hover:bg-blue-200 dark:hover:bg-blue-500/30 p-0.5 rounded-full transition-colors">
                      <XCircle className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <AnimatePresence mode="popLayout">
              {queue.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedItem(item)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all group relative border cursor-pointer",
                    selectedItem?.id === item.id 
                      ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" 
                      : (selectedIds.has(item.id) 
                          ? "bg-slate-50 dark:bg-slate-800/50 border-blue-100 dark:border-blue-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-sm")
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div 
                        onClick={(e) => toggleSelect(item.id, e)}
                        className={cn(
                          "mt-1 w-4 h-4 rounded-md border transition-all flex items-center justify-center shrink-0",
                          selectedIds.has(item.id)
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 dark:border-slate-700 bg-transparent"
                        )}
                      >
                        {selectedIds.has(item.id) && <Check className="w-3 h-3" strokeWidth={3} />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant={item.moderationResult?.severityScore >= 3 ? "danger" : "warning"} className="text-[8px] px-1.5 w-fit">
                          {item.moderationResult?.categories?.[0] || 'Flagged'}
                        </Badge>
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4].map(step => (
                            <div 
                              key={step}
                              className={cn(
                                "w-3 h-1 rounded-full",
                                step <= (item.moderationResult?.severityScore || 1)
                                  ? (item.moderationResult?.severityScore >= 3 ? "bg-rose-500" : "bg-amber-500")
                                  : "bg-slate-200 dark:bg-slate-800"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[10px] text-slate-400 font-bold block">{new Date(item.createdAt).toLocaleTimeString()}</span>
                      <ConfidenceCircle score={item.moderationResult?.confidenceScore || 0} />
                      {item.status === 'completed' && (
                        <Badge variant="neutral" className="bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 text-[8px] border-none">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold line-clamp-2 mb-3 group-hover:text-blue-600 dark:text-slate-200 transition-colors">
                    {item.content}
                  </p>

                  {/* User History Quick Stats */}
                  <div className="mb-3 space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Behavioral Profile</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(usersMap[item.userId]?.trustScore || 100) >= 80 ? (
                          <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase italic">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Elite Trust
                          </div>
                        ) : (usersMap[item.userId]?.trustScore || 100) < 40 ? (
                          <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase italic">
                            <TrendingDown className="w-2.5 h-2.5" />
                            High Risk
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase italic">Standard</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-end">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Compliance</p>
                          <p className={cn(
                            "text-xs font-black",
                            (usersMap[item.userId]?.trustScore || 100) > 70 ? "text-emerald-500" : 
                            (usersMap[item.userId]?.trustScore || 100) > 40 ? "text-amber-500" : "text-rose-500"
                          )}>
                            {usersMap[item.userId]?.trustScore || 100}%
                          </p>
                        </div>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${usersMap[item.userId]?.trustScore || 100}%` }}
                            className={cn(
                              "h-full transition-all duration-1000",
                              (usersMap[item.userId]?.trustScore || 100) > 70 ? "bg-emerald-500 shadow-[0_0_8px_-2px_rgba(16,185,129,0.5)]" : 
                              (usersMap[item.userId]?.trustScore || 100) > 40 ? "bg-amber-500" : "bg-rose-500"
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex justify-around items-center pt-1">
                        <div className="text-center">
                          <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">Submissions</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1">{usersMap[item.userId]?.totalSubmissions || 0}</p>
                        </div>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center">
                          <p className="text-[8px] text-rose-400 font-bold uppercase leading-none">Violations</p>
                          <p className="text-xs font-black text-rose-500 mt-1">{usersMap[item.userId]?.violations || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.userId}`} alt="User" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">UD: {item.userId.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleQuickAction(item, 'approved', e)}
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleQuickAction(item, 'rejected', e)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleQuickAction(item, 'flagged', e)}
                        className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                        title="Escalate"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform group-hover:hidden", selectedItem?.id === item.id && "translate-x-1 text-blue-500")} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold">Queue is empty!</p>
                  <p className="text-xs text-slate-500">All flagged content has been reviewed.</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Detail View */}
        <Card className="lg:col-span-8 p-0 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col h-full"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Review Submission</h3>
                      <p className="text-xs text-slate-500">ID: {selectedItem.id} • Submitted {new Date(selectedItem.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleViewContext}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Context
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Flagged {(!selectedItem.type || selectedItem.type === 'text') ? 'Content' : selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}</h4>
                      <Badge variant="neutral" className="text-[10px] items-center flex gap-1 bg-slate-100 dark:bg-slate-800 border-none">
                        {(!selectedItem.type || selectedItem.type === 'text') && <Type className="w-3 h-3" />}
                        {selectedItem.type === 'image' && <ImageIcon className="w-3 h-3" />}
                        {selectedItem.type === 'video' && <VideoIcon className="w-3 h-3" />}
                        {(selectedItem.type || 'text').toUpperCase()}
                      </Badge>
                    </div>

                    {selectedItem.type === 'text' ? (
                      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-lg leading-relaxed font-medium">
                        {selectedItem.content}
                      </div>
                    ) : selectedItem.type === 'image' ? (
                      <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <img 
                          src={selectedItem.content} 
                          alt="Flagged" 
                          className="w-full h-auto max-h-[500px] object-contain mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 aspect-video">
                        <video 
                          src={selectedItem.content} 
                          controls 
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Analysis</h4>
                      <Card className="p-5 space-y-4 border-blue-100 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">Severity Score</span>
                          <Badge variant="danger" className="text-xs px-2 py-1">{selectedItem.moderationResult?.severityScore}/4</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">AI Confidence</span>
                          <ConfidenceCircle score={selectedItem.moderationResult?.confidenceScore || 0} size="md" />
                        </div>
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Detected Categories</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedItem.moderationResult?.categories?.map((cat: string) => (
                              <Badge key={cat} variant="neutral">{cat}</Badge>
                            ))}
                          </div>
                        </div>
                        {selectedItem.moderationResult?.flaggedPhrases?.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-blue-100 dark:border-blue-900/30">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flagged Phrases</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedItem.moderationResult.flaggedPhrases.map((phrase: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-rose-900/30">
                                  {phrase}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Explanation</h4>
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 italic">
                        "{selectedItem.moderationResult?.explanation}"
                      </div>
                    </div>
                  </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">User History</h4>
                      <div className="flex items-center gap-6 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">User ID: {selectedItem.userId.slice(0, 12)}...</p>
                            <p className="text-[10px] text-slate-500">Joined Oct 2023 • 12 previous violations</p>
                          </div>
                        </div>
                        <div className="h-8 w-px bg-slate-100 dark:border-slate-800" />
                        <div className="flex gap-4">
                          <div className="text-center">
                            <p className="text-xs font-bold">85</p>
                            <p className="text-[8px] text-slate-500 uppercase">Total Posts</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-rose-500">14%</p>
                            <p className="text-[8px] text-slate-500 uppercase">Violation Rate</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Source & Context</h4>
                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {selectedItem.sourceUrl ? (
                          isUrl(selectedItem.sourceUrl) ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <ExternalLink className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">External Resource URL</p>
                                <a 
                                  href={selectedItem.sourceUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                >
                                  {selectedItem.sourceUrl}
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Internal Platform Context</p>
                              <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-xl overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                                {selectedItem.sourceUrl}
                              </pre>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Type className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Submission Source</p>
                              <p className="text-sm text-slate-500 italic">No external context or URL provided for this audit.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Accuracy Rating</h4>
                      <Card className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800">
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'correct', label: 'Accurate Flag', color: 'emerald', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
                              { id: 'incorrect', label: 'False Positive', color: 'rose', activeClass: 'bg-rose-500 text-white border-rose-500' },
                              { id: 'misclassified', label: 'Misclassified', color: 'amber', activeClass: 'bg-amber-500 text-white border-amber-500' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => setFeedbackAccuracy(opt.id as any)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                                  feedbackAccuracy === opt.id
                                    ? opt.activeClass
                                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            placeholder="Add a reason or note (optional)..."
                            value={feedbackNote}
                            onChange={(e) => setFeedbackNote(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[80px] resize-none"
                          />
                        </div>
                      </Card>
                    </div>
                    
                    <SeverityLegend />
                  </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="text-rose-500 hover:bg-rose-50 border-rose-100"
                      onClick={() => handleDecision('rejected')}
                      isLoading={isProcessing}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Content
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-amber-600 hover:bg-amber-50 border-amber-100"
                      onClick={() => handleDecision('flagged')}
                      isLoading={isProcessing}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Escalate
                    </Button>
                  </div>
                  <Button 
                    variant="primary" 
                    className="px-8"
                    onClick={() => handleDecision('approved')}
                    isLoading={isProcessing}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Content
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <Shield className="w-12 h-12 text-slate-300" />
                </div>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg">Select an item to review</h3>
                  <p className="text-sm text-slate-500">Choose a flagged submission from the queue to perform a manual review.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
};
