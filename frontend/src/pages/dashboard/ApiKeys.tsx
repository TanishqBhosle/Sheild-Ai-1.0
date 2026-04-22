import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Key, Plus, Copy, Trash2, Check } from 'lucide-react';

export default function ApiKeys() {
  const [keys, setKeys] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const loadKeys = () => { api.get<{ keys: Array<Record<string, unknown>> }>('/v1/api-keys').then(d => setKeys(d.keys || [])).catch(console.error).finally(() => setLoading(false)); };
  useEffect(loadKeys, []);

  const createKey = async () => {
    if (!newKeyName) return;
    try { const res = await api.post<{ rawKey: string }>('/v1/api-keys', { name: newKeyName }); setCreatedKey(res.rawKey); setNewKeyName(''); loadKeys(); }
    catch (err) { console.error(err); }
  };

  const revokeKey = async (prefix: string) => {
    try { await api.delete(`/v1/api-keys/${prefix}`); loadKeys(); } catch (err) { console.error(err); }
  };

  const copyKey = () => { navigator.clipboard.writeText(createdKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><Key className="w-5 h-5 text-aegis-accent" />API Keys</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Create Key</button>
      </div>

      {createdKey && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-xs text-emerald-400 font-semibold mb-2">⚠ Save this key now — it won't be shown again!</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-aegis-text font-mono bg-aegis-bg p-2 rounded">{createdKey}</code>
            <button onClick={copyKey} className="btn-ghost p-2">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>
          </div>
        </motion.div>
      )}

      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card">
          <div className="flex items-center gap-3">
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="input-field flex-1" placeholder="Key name (e.g. Production)" />
            <button onClick={createKey} className="btn-primary">Generate</button>
          </div>
        </motion.div>
      )}

      <div className="glass-card p-0">
        <table className="w-full">
          <thead><tr className="border-b border-aegis-border">
            {['Name', 'Prefix', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-aegis-text3 uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {keys.map((k, i) => (
              <tr key={i} className="border-b border-aegis-border/50">
                <td className="px-4 py-3 text-sm text-aegis-text">{String(k.name)}</td>
                <td className="px-4 py-3 text-sm font-mono text-aegis-text2">{String(k.keyPrefix)}...</td>
                <td className="px-4 py-3"><span className={`badge ${k.isActive ? 'badge-approved' : 'badge-rejected'}`}>{k.isActive ? 'Active' : 'Revoked'}</span></td>
                <td className="px-4 py-3">{Boolean(k.isActive) && <button onClick={() => revokeKey(String(k.keyPrefix))} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" />Revoke</button>}</td>
              </tr>
            ))}
            {keys.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-aegis-text3">No API keys yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
