import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Shield, Plus, Check } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

export default function Policies() {
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [enabledCats, setEnabledCats] = useState<Record<string, boolean>>(() => Object.fromEntries(CATEGORIES.map(c => [c.key, true])));

  const load = () => { api.get<{ policies: Array<Record<string, unknown>> }>('/v1/policies').then(d => setPolicies(d.policies || [])).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const createPolicy = async () => {
    if (!newName) return;
    const categories = CATEGORIES.map(c => ({ name: c.key, enabled: enabledCats[c.key] ?? true, sensitivity: 70, alwaysReview: false }));
    try { await api.post('/v1/policies', { name: newName, categories }); setNewName(''); setShowCreate(false); load(); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><Shield className="w-5 h-5 text-aegis-accent" />Moderation Policies</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New Policy</button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card space-y-4">
          <input value={newName} onChange={e => setNewName(e.target.value)} className="input-field" placeholder="Policy name" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setEnabledCats(p => ({ ...p, [c.key]: !p[c.key] }))}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${enabledCats[c.key] ? 'bg-aegis-accent/15 text-aegis-accent border-aegis-accent/40' : 'bg-aegis-bg text-aegis-text3 border-aegis-border'}`}>
                {enabledCats[c.key] && <Check className="w-3 h-3 inline mr-1" />}{c.label}
              </button>
            ))}
          </div>
          <button onClick={createPolicy} className="btn-primary">Create Policy</button>
        </motion.div>
      )}

      <div className="space-y-3">
        {policies.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-aegis-text">{String(p.name)}</p>
              <p className="text-xs text-aegis-text3">v{String(p.version)} • {(p.categories as Array<Record<string, unknown>>)?.length || 0} categories</p>
            </div>
            <span className={`badge ${p.isActive ? 'badge-approved' : 'badge-pending'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
          </motion.div>
        ))}
        {!loading && policies.length === 0 && <p className="text-sm text-aegis-text3 text-center py-8">No policies created yet</p>}
      </div>
    </div>
  );
}
