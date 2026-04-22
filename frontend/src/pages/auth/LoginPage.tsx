import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginWithEmail, loginWithGoogle } from '../../lib/auth';
import { Shield, Mail, Lock, Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { 
      await loginWithEmail(email, password); 
      // The AppRouter will handle redirection once the auth state updates
    }
    catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { 
      await loginWithGoogle(); 
      // The AppRouter will handle redirection once the auth state updates
    }
    catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-aegis-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-aegis-accent to-purple-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-aegis-text">Welcome back</h1>
          <p className="text-aegis-text3 text-sm mt-1">Sign in to Aegis AI</p>
        </div>
        <div className="glass-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-aegis-text2 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-10" placeholder="you@company.com" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-aegis-text2 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field pl-10" placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className="mt-4 relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-aegis-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-aegis-bg2 px-2 text-aegis-text3">or</span></div></div>
          <button onClick={handleGoogle} disabled={loading} className="btn-ghost w-full mt-4 flex items-center justify-center gap-2">
            <Chrome className="w-4 h-4" />Continue with Google
          </button>
          <p className="text-center text-sm text-aegis-text3 mt-4">Don't have an account? <Link to="/signup" className="text-aegis-accent hover:underline">Sign up</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
