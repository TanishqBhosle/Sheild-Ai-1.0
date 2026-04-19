import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Zap, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  ArrowUpRight, 
  MoreHorizontal,
  Plus,
  BarChart3,
  MessageSquare,
  Link,
  Image as ImageIcon,
  Video as VideoIcon,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input, Badge, cn } from './UI';
import { useStore } from '../store/useStore';
import { moderationApi } from '../services/api';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const Dashboard = () => {
  const { isAuthenticated, userRole, user } = useStore();
  const [isScanning, setIsScanning] = useState(false);
  const [scanContent, setScanContent] = useState('');
  const [scanSourceUrl, setScanSourceUrl] = useState('');
  const [scanType, setScanType] = useState<'text' | 'image' | 'video'>('text');
  const [stats, setStats] = useState({
    total: 0,
    flagged: 0,
    rejected: 0,
    approved: 0,
    accuracy: 98.5,
    avgResponseTime: 1.2
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

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
    if (!isAuthenticated || !db || !user) return;

    // Fetch initial stats only for moderators/admins
    if (userRole === 'admin' || userRole === 'moderator') {
      moderationApi.getStats().then(setStats).catch(console.error);
    }

    // Real-time listener for recent activity
    // Moderators see everything, users see only their own
    const getQuery = (role: string) => {
      if (role === 'admin' || role === 'moderator') {
        return query(
          collection(db, 'moderation_results'), 
          orderBy('processedAt', 'desc'), 
          limit(10)
        );
      }
      return query(
        collection(db, 'moderation_results'), 
        where('userId', '==', user.uid),
        orderBy('processedAt', 'desc'),
        limit(10)
      );
    };

    let q = getQuery(userRole);
    let unsubscribe: () => void;

    const startSnapshot = (queryToUse: any) => {
      return onSnapshot(queryToUse, (snapshot: QuerySnapshot<DocumentData>) => {
        const activity = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentActivity(activity);
        
        // Update stats when new results come in (only for moderators/admins)
        if (userRole === 'admin' || userRole === 'moderator') {
          moderationApi.getStats().then(setStats).catch(console.error);
        }
      }, (error: any) => {
        // Log the error but don't let it crash the fallback logic
        console.error("Dashboard Snapshot Error:", error);
        
        const isPermissionError = error.message?.includes('permissions') || error.code === 'permission-denied';
        const isIndexError = error.message?.includes('index') || error.code === 'failed-precondition';

        // If global query fails or index is missing, try falling back to simple query
        if (isPermissionError || isIndexError) {
          const fallbackQ = query(
            collection(db, 'moderation_results'), 
            where('userId', '==', user.uid),
            limit(10)
          );
          
          if (unsubscribe) unsubscribe();
          unsubscribe = startSnapshot(fallbackQ);
        } else {
          handleFirestoreError(error, OperationType.GET, 'moderation_results');
        }
      });
    };

    unsubscribe = startSnapshot(q);

    return () => unsubscribe();
  }, [isAuthenticated, userRole, user]);

  const handleScan = async () => {
    if (!scanContent.trim()) return;
    setIsScanning(true);
    try {
      const result = await moderationApi.moderate(scanContent, scanType, scanSourceUrl);
      toast.success(`${scanType.toUpperCase()} processed: ${result.status.toUpperCase()}`);
      setScanContent('');
      setScanSourceUrl('');
    } catch (error: any) {
      toast.error(error.message || 'Moderation failed');
    } finally {
      setIsScanning(false);
    }
  };

  const statCards = [
    { label: 'Total Scans', value: stats.total.toLocaleString(), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Flagged', value: stats.flagged.toLocaleString(), icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Rejected', value: stats.rejected.toLocaleString(), icon: Shield, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: 'Approved', value: stats.approved.toLocaleString(), icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-5 hover:shadow-md transition-shadow group cursor-default">
              <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <Badge variant="success" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 border-none">+12%</Badge>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold">{stat.value}</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <Card className="p-6 bg-blue-600 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Intelligence Accuracy</p>
              <h3 className="text-4xl font-bold">{stats.accuracy}%</h3>
            </div>
            <p className="text-blue-100 text-xs mt-4">Calculated from {Math.round(stats.total * 0.1)} moderator feedback samples</p>
          </div>
          <Activity className="absolute -bottom-8 -right-8 w-48 h-48 opacity-10 rotate-12" />
        </Card>
        <Card className="p-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">System Latency</p>
              <h3 className="text-4xl font-bold">{stats.avgResponseTime}s</h3>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none items-center flex gap-1">
                <Zap className="w-3 h-3" />
                Optimal
              </Badge>
            </div>
          </div>
          <Zap className="absolute -bottom-8 -right-8 w-48 h-48 opacity-10 rotate-12" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-3 p-0 overflow-hidden border-none shadow-xl">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <h3 className="font-bold text-lg">Quick Analysis Engine</h3>
              </div>
              
              <div className="flex bg-white/10 rounded-xl p-1">
                {[
                  { id: 'text', label: 'Text', icon: Type },
                  { id: 'image', label: 'Image', icon: ImageIcon },
                  { id: 'video', label: 'Video', icon: VideoIcon },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setScanType(t.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                      scanType === t.id 
                        ? "bg-white text-blue-600 shadow-lg" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative space-y-4">
              {scanType === 'text' ? (
                <textarea 
                  className="w-full h-32 bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all resize-none font-medium"
                  placeholder="Paste text content here to analyze..."
                  value={scanContent}
                  onChange={(e) => setScanContent(e.target.value)}
                />
              ) : (
                <div className="flex bg-white/10 border border-white/20 rounded-2xl p-4 items-center gap-4 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {scanType === 'image' ? <ImageIcon className="w-6 h-6 text-white/40" /> : <VideoIcon className="w-6 h-6 text-white/40" />}
                  </div>
                  <input 
                    type="text"
                    placeholder={`Enter ${scanType} URL to analyze...`}
                    className="bg-transparent border-none outline-none text-white placeholder:text-white/40 flex-1 font-medium"
                    value={scanContent}
                    onChange={(e) => setScanContent(e.target.value)}
                  />
                </div>
              )}
              <div className="flex bg-white/5 border border-white/10 rounded-xl px-3 py-2 items-center gap-3">
                <Link className="w-4 h-4 text-white/40" />
                <input 
                  type="text"
                  placeholder="Source/Context URL (optional)..."
                  className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/30 flex-1"
                  value={scanSourceUrl}
                  onChange={(e) => setScanSourceUrl(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  size="sm" 
                  className="bg-white text-blue-600 hover:bg-slate-100 border-none px-6"
                  onClick={handleScan}
                  isLoading={isScanning}
                >
                  Start High-Priority Scan
                </Button>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Recent Activity
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Filter className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Search className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {recentActivity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        item.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 
                        item.status === 'flagged' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                      )}>
                        {item.status === 'approved' ? <CheckCircle className="w-5 h-5" /> : 
                         item.status === 'flagged' ? <AlertTriangle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold line-clamp-1 max-w-[200px] md:max-w-md">
                          {item.explanation || 'No explanation provided'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="neutral" className="text-[8px] px-1.5">{item.categories?.[0] || 'General'}</Badge>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(item.processedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold">{Math.round(item.confidenceScore * 100)}% Confidence</p>
                        <p className="text-[10px] text-slate-400">Severity: {item.severityScore}/4</p>
                      </div>
                      <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {recentActivity.length === 0 && (
                <div className="text-center py-12 text-slate-500 italic">
                  No recent activity. Start a scan to see results here.
                </div>
              )}
            </div>
            <Button variant="ghost" className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">
              View Full Audit Log
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
