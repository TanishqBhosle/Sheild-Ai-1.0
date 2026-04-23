import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loginWithEmail, loginWithGoogle, signup } from '../../lib/auth';
import { useAuth } from '../../app/providers/AuthProvider';
import { getDefaultRoute } from '../../app/Router';
import Logo from '../../components/common/Logo';
import { Mail, Lock, User, ShieldCheck, Settings, Chrome, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { auth } from '../../lib/firebase';

const ROLES = [
  { key: 'user', label: 'User', icon: User, desc: 'Submit & view results', color: 'amber-500' },
  { key: 'moderator', label: 'Moderator', icon: ShieldCheck, desc: 'Review flagged items', color: 'sky-400' },
  { key: 'platform_admin', label: 'Admin', icon: Settings, desc: 'System management', color: 'purple-500' },
] as const;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      let finalRole = form.role;
      if (isLogin) {
        const res = await loginWithEmail(form.email, form.password);
        finalRole = res.user.role;
      } else {
        const res = await signup(form.email, form.password, form.displayName, form.role);
        finalRole = res.role || form.role;
        await new Promise(r => setTimeout(r, 1000)); // Claim propagation wait
      }
      refreshAuth();
      // Navigate to the correct dashboard based on the ACTUAL role
      navigate(getDefaultRoute(finalRole));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      await loginWithGoogle();
      await api.post('/v1/auth/onboarding');
      const user = auth.currentUser;
      if (user) await user.getIdToken(true);
      refreshAuth();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-aegis-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px]"
      >
        <div className="text-center mb-8">
           <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-xs text-aegis-text3 hover:text-amber-500 transition-colors mb-6 group">
             <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Landing
           </button>
           <div className="flex justify-center mb-4">
             <Logo size="lg" />
           </div>
           <h1 className="text-2xl font-black text-aegis-text">
             {isLogin ? 'Welcome Back' : 'Join Shield AI'}
           </h1>
           <p className="text-aegis-text3 text-sm mt-1">
             {isLogin ? 'Secure your session to continue' : 'Start your journey with autonomous safety'}
           </p>
        </div>

        <div className="glass-card !p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-aegis-text3 mb-3">Select your role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const isSelected = form.role === r.key;
                    return (
                      <button 
                        key={r.key} 
                        type="button" 
                        onClick={() => update('role', r.key)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all duration-300 ${
                          isSelected 
                            ? `border-${r.color} bg-${r.color}/5` 
                            : 'border-aegis-border hover:border-aegis-border2'
                        }`}
                        style={isSelected ? { borderColor: `var(--aegis-accent)` } : {}}
                      >
                        <r.icon className={`w-4.5 h-4.5 ${isSelected ? 'text-amber-500' : 'text-aegis-text3'}`} />
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-aegis-text' : 'text-aegis-text3'}`}>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {!isLogin && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-aegis-text3 mb-1.5 ml-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" />
                  <input value={form.displayName} onChange={e => update('displayName', e.target.value)} className="input-field pl-10" placeholder="John Doe" required={!isLogin} />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-aegis-text3 mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" />
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field pl-10" placeholder="you@company.com" required />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-aegis-text3 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-aegis-text3" />
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input-field pl-10" placeholder="••••••••" required minLength={8} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 relative flex items-center">
            <div className="flex-grow border-t border-aegis-border"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-aegis-text3 font-bold">OR</span>
            <div className="flex-grow border-t border-aegis-border"></div>
          </div>

          <button onClick={handleGoogle} disabled={loading} className="btn-ghost w-full mt-6 py-3 flex items-center justify-center gap-3">
            <Chrome className="w-4 h-4" /> 
            <span className="text-sm font-semibold">Continue with Google</span>
          </button>

          <p className="text-center text-sm text-aegis-text3 mt-8 font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"} 
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-amber-500 font-bold ml-1.5 hover:underline decoration-2 underline-offset-4"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
