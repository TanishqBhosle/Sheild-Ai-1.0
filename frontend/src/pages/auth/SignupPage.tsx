import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signup } from '../../lib/auth';
import { Shield, Mail, Lock, User, Users, Settings, ShieldCheck } from 'lucide-react';

const ROLES = [
  { key: 'viewer', label: 'User', icon: User, desc: 'Submit & view moderation results', color: 'aegis-accent', gradient: 'from-indigo-500 to-blue-500' },
  { key: 'moderator', label: 'Moderator', icon: ShieldCheck, desc: 'Review flagged content', color: 'emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  { key: 'platform_admin', label: 'Admin', icon: Settings, desc: 'Manage platform & organisations', color: 'purple-400', gradient: 'from-purple-500 to-pink-500' },
] as const;

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'viewer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(form.email, form.password, form.displayName, form.role);
      // Router will redirect based on role claims
      const route = form.role === 'platform_admin' ? '/admin' : form.role === 'moderator' ? '/moderator' : '/dashboard';
      navigate(route);
    }
    catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-aegis-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-aegis-accent mb-4">
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-aegis-text">Create your account</h1>
          <p className="text-aegis-text3 text-sm mt-1">Start moderating content with AI</p>
        </div>
        <div className="glass-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-medium text-aegis-text2 mb-2">I am signing up as</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => {
                  const isSelected = form.role === r.key;
                  return (
                    <motion.button key={r.key} type="button" whileTap={{ scale: 0.95 }}
                      onClick={() => update('role', r.key)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? `border-${r.color} bg-gradient-to-br ${r.gradient} bg-opacity-10 shadow-lg`
                          : 'border-aegis-border bg-aegis-bg hover:border-aegis-border2 hover:bg-aegis-bg3'
                      }`}
                      style={isSelected ? { borderColor: `var(--tw-gradient-from)`, background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))` } : {}}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isSelected ? `bg-white/15` : 'bg-aegis-bg3'
                      }`}>
                        <r.icon className={`w-4.5 h-4.5 ${isSelected ? 'text-white' : 'text-aegis-text3'}`} />
                      </div>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-aegis-text2'}`}>{r.label}</span>
                      <span className={`text-[9px] leading-tight text-center ${isSelected ? 'text-white/70' : 'text-aegis-text3'}`}>{r.desc}</span>
                      {isSelected && (
                        <motion.div layoutId="roleIndicator" className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-aegis-bg flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-aegis-text2 mb-1">Your Name</label>
              <div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" /><input value={form.displayName} onChange={e => update('displayName', e.target.value)} className="input-field pl-10" placeholder="John Doe" required /></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-aegis-text2 mb-1">Email</label>
              <div className="relative"><Mail className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" /><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field pl-10" placeholder="you@company.com" required /></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-aegis-text2 mb-1">Password</label>
              <div className="relative"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" /><input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input-field pl-10" placeholder="min 8 characters" required minLength={8} /></div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">
              {loading ? 'Creating account...' : `Sign up as ${ROLES.find(r => r.key === form.role)?.label}`}
            </button>
          </form>
          <p className="text-center text-sm text-aegis-text3 mt-4">Already have an account? <Link to="/login" className="text-aegis-accent hover:underline">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
