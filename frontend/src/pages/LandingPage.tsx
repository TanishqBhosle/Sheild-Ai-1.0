import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Search, 
  Image as ImageIcon, 
  Video, 
  Zap, 
  Users, 
  Lock, 
  BarChart3, 
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Activity
} from 'lucide-react';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../app/providers/AuthProvider';
import { getDefaultRoute } from '../app/Router';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-aegis-bg text-aegis-text selection:bg-amber-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-aegis-bg/80 backdrop-blur-md border-b border-aegis-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-bold text-lg tracking-tight">Shield AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-aegis-text2">
            <a href="#features" className="hover:text-aegis-accent transition-colors">Features</a>
            <a href="#about" className="hover:text-aegis-accent transition-colors">Technology</a>
            <a href="#panels" className="hover:text-aegis-accent transition-colors">Panels</a>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <button 
                onClick={() => navigate(getDefaultRoute(role))}
                className="btn-primary px-5 py-2 text-xs font-bold"
              >
                Dashboard
              </button>
            ) : (
              <Link 
                to="/auth"
                className="btn-primary px-5 py-2 text-xs font-bold no-underline"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] -z-10" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-40 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -z-10" 
        />

        {/* Floating Icons */}
        <div className="absolute inset-0 pointer-events-none -z-5">
           <motion.div 
             animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-[20%] left-[10%] opacity-20"
           >
             <Shield className="w-12 h-12 text-amber-500" />
           </motion.div>
           <motion.div 
             animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
             className="absolute top-[60%] right-[10%] opacity-20"
           >
             <Lock className="w-10 h-10 text-indigo-400" />
           </motion.div>
           <motion.div 
             animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
             className="absolute bottom-[10%] left-[20%] opacity-10"
           >
             <Zap className="w-16 h-16 text-amber-500" />
           </motion.div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.span 
              whileHover={{ scale: 1.05 }}
              className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20 mb-6 inline-block cursor-default"
            >
              AI-Powered Content Moderation
            </motion.span>
            <h1 className="text-5xl md:text-8xl font-black mb-6 bg-gradient-to-b from-aegis-text to-aegis-text/40 bg-clip-text text-transparent leading-[1.1]">
              Shield Your Platform <br /> with <span className="text-amber-500 relative">
                Autonomous Safety
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="absolute bottom-2 left-0 h-2 bg-amber-500/20 -z-10"
                />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-aegis-text2 max-w-2xl mx-auto mb-10 leading-relaxed">
              Real-time AI moderation for text, images, and video. 
              Deploy enterprise-grade safety pipelines in minutes, not months.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/auth"
                className="btn-primary px-10 py-4 text-sm font-bold flex items-center gap-2 group overflow-hidden relative no-underline"
              >
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 relative z-10"
                >
                  Get Started Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.div>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </Link>
              <motion.a 
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                href="#features" 
                className="btn-ghost px-10 py-4 text-sm font-bold"
              >
                Explore Features
              </motion.a>
            </div>
          </motion.div>

          {/* Dashboard Preview Overlay with Parallax */}
          <motion.div 
            style={{ perspective: 1000 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <motion.div 
              initial={{ opacity: 0, y: 100, rotateX: 20 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
              className="relative rounded-2xl overflow-hidden border border-aegis-border shadow-2xl bg-aegis-bg2 p-2 group"
            >
              <div className="bg-aegis-bg rounded-xl overflow-hidden aspect-video relative">
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 10 }}
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover opacity-30 mix-blend-luminosity transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-aegis-bg2 via-transparent to-transparent" />
                
                {/* Floating Mock UI elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-12 grid grid-cols-3 gap-6">
                  {[
                    { label: 'Safety Score', value: '99.8%', icon: ShieldCheck, color: 'text-emerald-500' },
                    { label: 'Avg Latency', value: '24ms', icon: Activity, color: 'text-amber-500' },
                    { label: 'Total Scans', value: '1.2M+', icon: Zap, color: 'text-sky-500' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + (i * 0.1) }}
                      whileHover={{ y: -10, scale: 1.05, borderColor: "rgba(245,158,11,0.3)" }}
                      className="glass-card h-32 flex flex-col justify-center items-center text-center group/card transition-all"
                    >
                       <item.icon className={`w-8 h-8 ${item.color} mb-2 group-hover/card:animate-pulse`} />
                       <div className="text-xl font-black text-aegis-text">{item.value}</div>
                       <div className="text-[10px] uppercase font-bold text-aegis-text3 tracking-widest">{item.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
            {/* Glossy Reflection */}
            <div className="absolute -inset-10 bg-amber-500/5 blur-[80px] -z-10 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-aegis-bg2/50 border-y border-aegis-border relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Multimodal Intelligence</h2>
            <p className="text-aegis-text3 max-w-xl mx-auto text-lg">One platform to analyze and secure every type of content your users create.</p>
          </motion.div>

          <motion.div 
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { icon: Search, title: "Text Moderation", desc: "Instantly detect hate speech, harassment, spam, and PII across 100+ languages.", color: "text-sky-400" },
              { icon: ImageIcon, title: "Image Analysis", desc: "Flag inappropriate visuals, gore, drugs, and weapon detections with deep vision AI.", color: "text-amber-500" },
              { icon: Video, title: "Video Safety", desc: "Frame-by-frame analysis with scene change detection for comprehensive safety audits.", color: "text-purple-500" },
              { icon: Zap, title: "Real-Time Processing", desc: "Millisecond latency for text and streamlined async pipelines for high-res media.", color: "text-emerald-500" },
              { icon: Cpu, title: "Advanced Score System", desc: "Customizable thresholds and severity scores tailored to your platform's rules.", color: "text-blue-500" },
              { icon: Users, title: "Role-Based Access", desc: "Dedicated panels for Users, Moderators, and Platform Admins to stay in sync.", color: "text-rose-500" },
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                variants={{
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 }
                }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="glass-card group hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <feature.icon className="w-24 h-24" />
                </div>
                <div className={`p-4 rounded-2xl bg-aegis-bg inline-block mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-xl`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-base text-aegis-text3 leading-relaxed">{feature.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
                  Learn More <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Panels Overview */}
      <section id="panels" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-6xl font-black mb-10 leading-[1.1] tracking-tight">
                A Unified Ecosystem <br /> for <span className="text-amber-500">Total Control</span>
              </h2>
              <div className="space-y-4">
                {[
                  { title: "User Dashboard", desc: "Simple interface for users to submit content and track moderation status.", icon: CheckCircle2 },
                  { title: "Moderator Panel", desc: "Powerful queue management for human-in-the-loop verification.", icon: CheckCircle2 },
                  { title: "Admin Analytics", desc: "High-level insights into platform safety trends and system health.", icon: CheckCircle2 }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-start gap-5 p-6 rounded-2xl hover:bg-aegis-bg2 transition-all border border-transparent hover:border-aegis-border group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <item.icon className="w-5 h-5 text-amber-500 group-hover:text-white transition-all" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1 group-hover:text-amber-500 transition-colors">{item.title}</h4>
                      <p className="text-base text-aegis-text3">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
               <div className="aspect-square bg-gradient-to-br from-indigo-500/20 to-amber-500/20 rounded-3xl blur-[80px] absolute -inset-10 -z-10" />
               <motion.div 
                 whileHover={{ rotateY: -5, rotateX: 5 }}
                 className="glass-card p-0 overflow-hidden relative border-white/5 shadow-2xl"
               >
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-bold text-amber-500 uppercase tracking-widest animate-pulse">
                      Live Analysis
                    </div>
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-1/3 bg-aegis-border rounded animate-pulse" />
                      <div className="h-4 w-12 bg-aegis-border/20 rounded" />
                    </div>
                    
                    {/* Mock Moderation Items */}
                    <div className="space-y-3">
                      {[
                        { label: 'Hate Speech Detected', severity: '98%', status: 'Flagged', color: 'text-red-400', bg: 'bg-red-400/10' },
                        { label: 'Spam Pattern Found', severity: '82%', status: 'Review', color: 'text-amber-400', bg: 'bg-amber-400/10' },
                        { label: 'Safe Content', severity: '12%', status: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                      ].map((item, i) => (
                        <motion.div 
                          key={i}
                          initial={{ x: -10, opacity: 0 }}
                          whileInView={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + (i * 0.1) }}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between group/item"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-6 rounded-full ${item.status === 'Flagged' ? 'bg-red-500' : item.status === 'Review' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <div>
                              <p className="text-[10px] font-bold text-aegis-text mb-0.5">{item.label}</p>
                              <p className="text-[8px] text-aegis-text3 uppercase tracking-tighter">Severity: {item.severity}</p>
                            </div>
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.bg} ${item.color}`}>
                            {item.status}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="h-9 w-full bg-aegis-border/30 rounded-lg flex items-center justify-center text-[9px] font-bold text-aegis-text3">
                        Dismiss
                      </div>
                      <div className="h-9 w-full bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center text-[9px] font-bold text-amber-500">
                        Take Action
                      </div>
                    </div>
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-aegis-bg via-transparent to-transparent pointer-events-none" />
               </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto rounded-[3rem] bg-gradient-to-br from-indigo-600 to-indigo-950 p-12 md:p-24 text-center relative overflow-hidden shadow-2xl"
        >
          {/* Decorative element */}
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 blur-[120px]" 
          />
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tight"
          >
            Ready to secure your community?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-indigo-100/70 text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Join 1,000+ developers building safer digital spaces with Shield AI's autonomous moderation engine. Start for free today.
          </motion.p>
          <Link 
            to="/auth"
            className="bg-white text-indigo-900 hover:bg-amber-500 hover:text-white px-12 py-6 rounded-2xl font-black text-xl transition-all duration-300 shadow-xl shadow-indigo-500/40 active:scale-95 inline-block no-underline"
          >
            Get Started for Free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-aegis-border text-center relative bg-aegis-bg2/30">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 1 }}
            className="mb-8"
          >
            <Logo size="lg" />
          </motion.div>
          <div className="flex gap-10 mb-8 text-sm font-bold text-aegis-text3 uppercase tracking-widest">
            <a href="#" className="hover:text-amber-500 transition-colors">Documentation</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Pricing</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Privacy</a>
          </div>
          <p className="text-aegis-text3 text-sm max-w-md mx-auto opacity-60">
            © 2026 Aegis Global Systems. All rights reserved. <br />
            Built with cutting-edge AI for the future of digital safety.
          </p>
        </div>
      </footer>
    </div>
  );
}
