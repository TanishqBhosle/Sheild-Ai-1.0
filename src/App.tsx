import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { X, Info } from 'lucide-react';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Moderation } from './components/Moderation';
import { Analytics } from './components/Analytics';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Button, cn } from './components/UI';

import { moderationApi } from './services/api';
import { useStore } from './store/useStore';
import { db, auth, isConfigValid } from './firebase';
import { collection, query, orderBy, onSnapshot, limit, where, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function AppContent() {
  const { 
    isAuthenticated, 
    userRole,
    user,
    logout,
    activeTab, 
    setTab, 
    theme, 
    setModerationData
  } = useStore();
  
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [scanContent, setScanContent] = useState('');
  const [scanType, setScanType] = useState('Text');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && isAuthenticated) {
        logout();
      }
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (!isAuthenticated || !user || !isConfigValid) return;

    let q;
    try {
      if (userRole === 'admin' || userRole === 'moderator') {
        q = query(
          collection(db, 'content_submissions'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } else {
        q = query(
          collection(db, 'content_submissions'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            content: docData.content || '',
            category: docData.category || 'General',
            status: (docData.status?.charAt(0).toUpperCase() + docData.status?.slice(1)) || 'Pending',
            confidence: docData.confidenceScore || 0,
            time: docData.createdAt ? new Date(docData.createdAt).toLocaleTimeString() : 'Just now',
            priority: docData.severityScore >= 3 ? 'High' : docData.severityScore === 2 ? 'Medium' : 'Low',
            severity: docData.severityScore || 1,
            aiExplanation: docData.explanation || 'Processing...',
            flaggedPhrases: docData.flaggedPhrases || [],
            userHistory: docData.userHistory || {
              totalSubmissions: 12,
              violations: 0,
              trustScore: 98
            },
            assignedTo: docData.assignedTo,
            notes: docData.notes
          };
        });
        setModerationData(data as any);
      }, (error) => {
        console.error("Firestore Listener Error:", error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Query construction error:", err);
    }
  }, [isAuthenticated, user, userRole, setModerationData]);

  const handleStartScan = async () => {
    if (!scanContent.trim()) {
      toast.error('Please enter some content to scan');
      return;
    }
    
    try {
      await moderationApi.moderate(scanContent, scanType.toLowerCase() as any);
      toast.success('Analysis started successfully');
      setIsScanModalOpen(false);
      setScanContent('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start analysis');
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Initializing Aegis AI...</p>
        </div>
      </div>
    );
  }

  if (!isConfigValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Info className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Firebase Setup Required</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Please configure your Firebase credentials in firebase-applet-config.json to continue.
          </p>
          <Button className="w-full" onClick={() => window.location.reload()}>Refresh App</Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Auth onAuth={() => {}} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setTab} 
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'moderation' && <Moderation />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </Layout>

      {/* New Scan Modal */}
      <AnimatePresence>
        {isScanModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScanModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-[70] p-8 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">New Content Scan</h2>
                <button onClick={() => setIsScanModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Text', 'Image', 'Video'].map((type) => (
                      <button 
                        key={type} 
                        onClick={() => setScanType(type)}
                        className={cn(
                          "py-2 rounded-xl border text-sm font-medium transition-all",
                          scanType === type ? "border-blue-600 bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Input Content</label>
                  <textarea 
                    value={scanContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScanContent(e.target.value)}
                    placeholder="Paste the content you want to analyze..." 
                    className="w-full h-32 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    Large batches may take up to 30 seconds to process. You will be notified once the scan is complete.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsScanModalOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleStartScan}>Start Analysis</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
    </>
  );
}
