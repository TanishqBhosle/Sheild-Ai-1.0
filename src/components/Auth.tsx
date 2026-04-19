import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, Check, X, AlertCircle, Globe, Fingerprint, User as UserIcon, ShieldCheck, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input, Badge, cn } from './UI';
import { toast } from 'sonner';
import { useStore, UserRole } from '../store/useStore';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthProps {
  onAuth: () => void;
  initialMode?: 'signin' | 'signup';
}

export const Auth = ({ onAuth, initialMode = 'signin' }: AuthProps) => {
  const { setAuth, updateSettings } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [role, setRole] = useState<UserRole>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  const passwordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthColor = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];
  const strengthText = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAuth(true, userData.role as UserRole, user);
          updateSettings({ 
            fullName: userData.fullName || user.displayName || 'User',
            email: userData.email || user.email || ''
          });
        } else {
          const defaultData = {
            uid: user.uid,
            email: user.email,
            role: 'user' as UserRole,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), defaultData);
          setAuth(true, 'user', user);
          updateSettings({ 
            fullName: user.displayName || 'User',
            email: user.email || ''
          });
        }
        
        toast.success('Welcome back!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName,
          email,
          role: role,
          createdAt: new Date().toISOString()
        });
        
        setAuth(true, role, user);
        updateSettings({ fullName, email });
        toast.success('Account created successfully!');
      }
      onAuth();
    } catch (error: any) {
      console.error('Auth Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please sign in instead.');
        setMode('signin');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error('Invalid email or password. Please check your credentials.');
      } else if (error.message?.includes('Missing or insufficient permissions')) {
        toast.error('Permission denied. If you are signing up as Admin/Moderator, ensure your email is authorized.');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (e: any) {
        console.warn("Initial user doc fetch failed:", e.message);
      }

      if (!userDoc || !userDoc.exists()) {
        const newUser = {
          uid: user.uid,
          fullName: user.displayName,
          email: user.email,
          role: 'user' as UserRole,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), newUser);
        setAuth(true, 'user', user);
        updateSettings({ 
          fullName: user.displayName || 'User',
          email: user.email || ''
        });
      } else {
        const userData = userDoc.data();
        setAuth(true, userData.role as UserRole, user);
        updateSettings({ 
          fullName: userData.fullName || user.displayName || 'User',
          email: userData.email || user.email || ''
        });
      }

      toast.success('Signed in with Google');
      onAuth();
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfig = {
    user: { icon: UserIcon, color: 'text-blue-500', label: 'Standard User' },
    moderator: { icon: ShieldCheck, color: 'text-purple-500', label: 'Moderator' },
    admin: { icon: SettingsIcon, color: 'text-rose-500', label: 'Administrator' },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden animate-gradient-premium">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl shadow-blue-500/40 animate-float">
              <Shield className="text-white w-7 h-7" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Aegis AI</span>
          </div>
        </div>

        <Card className="glass shadow-2xl border-white/30 dark:border-slate-700/50">
          <AnimatePresence mode="wait">
            {!show2FA ? (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'signin' ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">
                    {mode === 'signin' ? 'Welcome back' : 'Create an account'}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {mode === 'signin' ? 'Enter your credentials to access your account' : 'Start protecting your community today'}
                  </p>
                </div>

                {role === 'admin' && mode === 'signup' ? (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Admin access is restricted</p>
                    <p className="text-xs text-rose-600 dark:text-rose-500">New administrators can only be added by existing owners.</p>
                    <Button variant="outline" className="w-full" onClick={() => setMode('signin')}>Back to Login</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Workspace Type</label>
                        <Badge variant="info" className="text-[8px] uppercase">{role} access</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {(['user', 'moderator', 'admin'] as UserRole[]).map((r) => {
                          const Config = roleConfig[r];
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRole(r)}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all relative group",
                                role === r 
                                  ? "bg-white dark:bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/10" 
                                  : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                              )}
                            >
                              {role === r && (
                                <motion.div 
                                  layoutId="activeRole"
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 z-10"
                                >
                                  <Check className="w-2 h-2 text-white" />
                                </motion.div>
                              )}
                              <Config.icon className={cn("w-5 h-5 transition-colors", role === r ? Config.color : "text-slate-400 group-hover:text-slate-600")} />
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors", role === r ? "text-slate-900 dark:text-white" : "text-slate-500")}>{r}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {mode === 'signup' && (
                        <Input 
                          label="Full Name" 
                          placeholder="John Doe" 
                          required 
                          value={fullName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                        />
                      )}

                      <Input 
                        label="Email Address" 
                        placeholder="name@company.com" 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        helper={role === 'admin' ? "Admin access requires @aegis.ai domain" : undefined}
                      />
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                          {mode === 'signin' && (
                            <button type="button" className="text-xs text-blue-600 hover:underline font-medium">Forgot password?</button>
                          )}
                        </div>
                        <div className="relative">
                          <input 
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {mode === 'signup' && password.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="flex gap-1 h-1">
                              {[1, 2, 3, 4].map((i) => (
                                <div key={i} className={cn("flex-1 rounded-full transition-all duration-500", i <= strength ? strengthColor : "bg-slate-200 dark:bg-slate-800")} />
                              ))}
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                              <span>Strength: <span className={cn(strength > 0 && "text-current")}>{strengthText}</span></span>
                              <span>{password.length}/8 chars</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button className="w-full py-4 text-base" isLoading={isLoading} type="submit">
                      {mode === 'signin' ? `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}` : 'Create Account'}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-800"></span></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span></div>
                    </div>

                    <Button variant="outline" className="w-full" type="button" onClick={handleGoogleAuth} isLoading={isLoading}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" alt="Google" />
                      Google
                    </Button>
                  </form>
                )}

                <p className="text-center text-sm text-slate-500">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} 
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto">
                  <Fingerprint className="w-8 h-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
                  <p className="text-sm text-slate-500">Enter the 6-digit code from your authenticator app.</p>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      className="w-full h-12 text-center text-lg font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  ))}
                </div>
                <Button className="w-full py-3" onClick={() => {
                  setAuth(true, role, auth.currentUser);
                  onAuth();
                }}>Verify & Login</Button>
                <button 
                  onClick={() => setShow2FA(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Back to login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};
