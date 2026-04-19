import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Zap, 
  Key, 
  Plus, 
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Check,
  Lock,
  Users,
  Trash2,
  ShieldCheck,
  Globe,
  Smartphone,
  Mail,
  MoreVertical,
  Sliders,
  Terminal,
  Gavel,
  Hash,
  Smile,
  AlertOctagon,
  Languages,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input, Badge, ScaleImage, cn } from './UI';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export const Settings = () => {
  const { settings, updateSettings, userRole, user } = useStore();
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [rules, setRules] = useState<any[]>([]);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleType, setNewRuleType] = useState<'keyword' | 'regex' | 'sentiment'>('keyword');
  const [newRuleAction, setNewRuleAction] = useState<'AUTO_REJECT' | 'AUTO_FLAG' | 'AUTO_APPROVE'>('AUTO_FLAG');
  const [sentimentThreshold, setSentimentThreshold] = useState(0.5);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!db || userRole !== 'admin') return;

    const q = query(collection(db, 'moderation_rules'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRules(data);
    });

    return () => unsubscribe();
  }, [userRole]);

  const handleAddRule = async () => {
    if (!newRulePattern && newRuleType !== 'sentiment') {
      toast.error('Rule pattern is required');
      return;
    }
    try {
      await addDoc(collection(db, 'moderation_rules'), {
        pattern: newRuleType === 'sentiment' ? `SENTIMENT > ${sentimentThreshold}` : newRulePattern,
        type: newRuleType,
        action: newRuleAction,
        threshold: newRuleType === 'sentiment' ? sentimentThreshold : null,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });
      setNewRulePattern('');
      toast.success('Moderation rule added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'moderation_rules', id));
      toast.success('Rule removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove rule');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fullName: settings.fullName,
        email: settings.email
      });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      if (error.message?.includes('permissions')) {
        toast.error("Permission Denied: You cannot update this profile.");
      } else {
        toast.error(error.message || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newCategories = settings.activeCategories.includes(category)
      ? settings.activeCategories.filter(c => c !== category)
      : [...settings.activeCategories, category];
    updateSettings({ activeCategories: newCategories });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, roles: ['user', 'moderator', 'admin'] },
    { id: 'rules', label: 'Moderation Rules', icon: Gavel, roles: ['admin'] },
    { id: 'security', label: 'Security', icon: Lock, roles: ['moderator', 'admin'] },
    { id: 'policy', label: 'Policy Config', icon: Sliders, roles: ['admin'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['admin'] },
    { id: 'api', label: 'API Settings', icon: Zap, roles: ['admin'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['user', 'moderator', 'admin'] },
  ].filter(tab => tab.roles.includes(userRole));

  if (isLoading) {
    return <div className="h-[500px] w-full skeleton" />;
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <Badge variant={userRole === 'admin' ? 'danger' : userRole === 'moderator' ? 'warning' : 'info'} className="px-3 py-1">
          {userRole.toUpperCase()} ACCESS
        </Badge>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.section 
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card>
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                  <ScaleImage 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${settings.fullName}`} 
                    alt="Avatar" 
                    containerClassName="w-24 h-24 rounded-3xl bg-slate-100 shadow-lg" 
                  />
                  <div>
                    <h4 className="text-xl font-bold">{settings.fullName}</h4>
                    <p className="text-sm text-slate-500 capitalize">{userRole} • {settings.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Full Name" 
                    value={settings.fullName} 
                    onChange={(e: any) => updateSettings({ fullName: e.target.value })} 
                  />
                  <Input 
                    label="Email Address" 
                    value={settings.email} 
                    onChange={(e: any) => updateSettings({ email: e.target.value })} 
                  />
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <Button isLoading={isSaving} onClick={handleSaveProfile}>Save Changes</Button>
                </div>
              </Card>
            </motion.section>
          )}

          {activeTab === 'policy' && (
            <motion.section 
              key="policy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold">Global AI Sensitivity</h4>
                      <p className="text-sm text-slate-500">Adjust how strict the AI should be when flagging content.</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{settings.sensitivity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100"
                    value={settings.sensitivity}
                    onChange={(e) => updateSettings({ sensitivity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold">Active Moderation Categories</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Hate Speech', 'Spam & Scams', 'Violence', 'Self-Harm', 'Harassment', 'Sexual Content'].map((cat, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors group">
                        <span className="text-sm font-semibold">{cat}</span>
                        <input 
                          type="checkbox" 
                          checked={settings.activeCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.section>
          )}
          {activeTab === 'rules' && (
            <motion.section 
              key="rules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="space-y-6">
                <div>
                  <h4 className="font-bold flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-blue-600" />
                    Custom Moderation Overrides
                  </h4>
                  <p className="text-sm text-slate-500">Define rigid rules that take precedence over AI logic.</p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Pattern / Target</label>
                      {newRuleType === 'sentiment' ? (
                        <div className="space-y-2 py-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>Negative/Toxic</span>
                            <span className="text-blue-600">{Math.round(sentimentThreshold * 100)}%</span>
                            <span>Neutral</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={sentimentThreshold * 100}
                            onChange={(e) => setSentimentThreshold(parseInt(e.target.value) / 100)}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      ) : (
                        <Input 
                          placeholder={newRuleType === 'keyword' ? "Enter forbidden words..." : "Enter regex pattern..."}
                          value={newRulePattern}
                          onChange={(e: any) => setNewRulePattern(e.target.value)}
                          className="h-10"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Rule Type</label>
                      <select 
                        className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-700 dark:text-slate-300"
                        value={newRuleType}
                        onChange={(e) => setNewRuleType(e.target.value as any)}
                      >
                        <option value="keyword">Keyword</option>
                        <option value="regex">Regex</option>
                        <option value="sentiment">Sentiment</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Action</label>
                      <select 
                        className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-700 dark:text-slate-300"
                        value={newRuleAction}
                        onChange={(e) => setNewRuleAction(e.target.value as any)}
                      >
                        <option value="AUTO_REJECT">Reject</option>
                        <option value="AUTO_FLAG">Flag</option>
                        <option value="AUTO_APPROVE">White-list</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddRule} className="h-9 px-6">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Active Rules ({rules.length})</h5>
                  {rules.length === 0 ? (
                    <div className="p-8 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
                      <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs text-slate-500 font-medium">No custom moderation rules defined yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {rules.map((rule) => (
                        <div key={rule.id} className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              rule.type === 'keyword' ? "bg-amber-100 text-amber-600" :
                              rule.type === 'regex' ? "bg-purple-100 text-purple-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {rule.type === 'keyword' ? <Hash className="w-5 h-5" /> :
                               rule.type === 'regex' ? <Terminal className="w-5 h-5" /> :
                               <Smile className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{rule.pattern}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="neutral" className="text-[9px] uppercase tracking-tighter px-1.5 py-0 border-none">
                                  {rule.type}
                                </Badge>
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  rule.action === 'AUTO_REJECT' ? "text-rose-500" :
                                  rule.action === 'AUTO_FLAG' ? "text-amber-500" :
                                  "text-emerald-500"
                                )}>
                                  {rule.action.replace('AUTO_', '')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
