import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Users, Shield, User as UserIcon, Check, Loader2 } from 'lucide-react';

export default function UserManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      setMembers(snap.docs.map(d => ({ ...d.data(), userId: d.id })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  const updateRole = async (uid: string, newRole: string) => {
    setUpdating(uid);
    try {
      await api.post('/v1/auth/set-claims', { userId: uid, role: newRole });
      await loadMembers(); // Refresh list
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> User Management
        </h2>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aegis-border text-left">
              <th className="px-6 py-4 text-xs font-medium text-aegis-text3 uppercase">User</th>
              <th className="px-6 py-4 text-xs font-medium text-aegis-text3 uppercase">Current Role</th>
              <th className="px-6 py-4 text-xs font-medium text-aegis-text3 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-aegis-border/50">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-aegis-text3">Loading members...</td></tr>
            ) : members.map((m, i) => (
              <motion.tr key={m.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-aegis-bg3/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-aegis-accent/20 flex items-center justify-center text-xs font-bold text-aegis-accent">
                      {m.email?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aegis-text">{m.displayName || 'Unnamed User'}</p>
                      <p className="text-xs text-aegis-text3">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    m.role === 'platform_admin' ? 'bg-purple-500/20 text-purple-400' :
                    m.role === 'moderator' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-aegis-text3/20 text-aegis-text3'
                  }`}>
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {m.role !== 'moderator' && m.role !== 'platform_admin' && (
                      <button 
                        onClick={() => updateRole(m.userId, 'moderator')}
                        disabled={updating === m.userId}
                        className="btn-ghost px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5"
                      >
                        {updating === m.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                        Promote to Moderator
                      </button>
                    )}
                    {(m.role === 'moderator' || m.role === 'platform_admin') && (
                      <button 
                        onClick={() => updateRole(m.userId, 'user')}
                        disabled={updating === m.userId}
                        className="btn-ghost px-3 py-1.5 text-xs text-aegis-text3 border border-aegis-border hover:bg-aegis-bg3 flex items-center gap-1.5"
                      >
                        {updating === m.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserIcon className="w-3 h-3" />}
                        Demote to User
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
