import { useState } from 'react';
import { api } from '../../lib/api';
import { Webhook, Send, Check, X } from 'lucide-react';

export default function Webhooks() {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const saveConfig = async () => {
    setSaving(true);
    try { await api.patch('/v1/webhooks/config', { webhookUrl: url, webhookSecret: secret }); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const testFire = async () => {
    try { const res = await api.post<{ success: boolean; message: string }>('/v1/webhooks/test', {}); setTestResult(res); }
    catch (err) { setTestResult({ success: false, message: (err as Error).message }); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><Webhook className="w-5 h-5 text-aegis-accent" />Webhooks</h2>
      <div className="glass-card space-y-4">
        <div><label className="block text-xs font-medium text-aegis-text2 mb-1">Webhook URL</label><input value={url} onChange={e => setUrl(e.target.value)} className="input-field" placeholder="https://your-app.com/webhook" /></div>
        <div><label className="block text-xs font-medium text-aegis-text2 mb-1">Webhook Secret</label><input value={secret} onChange={e => setSecret(e.target.value)} className="input-field font-mono" placeholder="whsec_..." /></div>
        <div className="flex items-center gap-3">
          <button onClick={saveConfig} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Config'}</button>
          <button onClick={testFire} className="btn-ghost flex items-center gap-2"><Send className="w-4 h-4" />Test Fire</button>
        </div>
        {testResult && (
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{testResult.message}
          </div>
        )}
      </div>
      <div className="glass-card">
        <p className="text-xs text-aegis-text3 mb-2">Webhook Events</p>
        <div className="space-y-1">
          {['moderation.completed', 'moderation.flagged', 'review.completed', 'test.ping'].map(e => (
            <div key={e} className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-500" /><code className="text-aegis-text2 font-mono text-xs">{e}</code></div>
          ))}
        </div>
      </div>
    </div>
  );
}
