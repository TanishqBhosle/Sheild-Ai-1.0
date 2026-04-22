import { useAuth } from '../../app/providers/AuthProvider';
import { PLANS } from '../../constants/plans';
import { CreditCard, Zap, TrendingUp } from 'lucide-react';

export default function Billing() {
  const { plan } = useAuth();
  const currentPlan = PLANS[plan || 'free'];
  const allPlans = Object.entries(PLANS);

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><CreditCard className="w-5 h-5 text-aegis-accent" />Billing & Plan</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allPlans.map(([key, p]) => (
          <div key={key} className={`glass-card relative ${plan === key ? 'border-aegis-accent ring-1 ring-aegis-accent/30' : ''}`}>
            {plan === key && <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-aegis-accent text-white">CURRENT</span>}
            <h3 className="text-sm font-bold text-aegis-text mb-1">{p.name}</h3>
            <p className="text-2xl font-bold text-aegis-text">${p.price}<span className="text-xs text-aegis-text3 font-normal">/mo</span></p>
            <div className="mt-3 space-y-1 text-xs text-aegis-text2">
              <p className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" />{p.reqPerMin} req/min</p>
              <p className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" />{(p.reqPerMonth).toLocaleString()} req/mo</p>
            </div>
            {plan !== key && <button className="btn-ghost w-full mt-4 text-xs">Upgrade</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
