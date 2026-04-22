import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Building2, Ban, Play } from 'lucide-react';

export default function OrgManagement() {
  const [orgs, setOrgs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { api.get<{ organizations: Array<Record<string, unknown>> }>('/v1/admin/organizations').then(d => setOrgs(d.organizations || [])).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const suspend = async (orgId: string) => { await api.post(`/v1/admin/organizations/${orgId}/suspend`, { reason: 'Admin action' }); load(); };
  const reinstate = async (orgId: string) => { await api.post(`/v1/admin/organizations/${orgId}/reinstate`, {}); load(); };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-400" />Organisation Management</h2>
      <div className="glass-card p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-aegis-border">
            {['Name', 'Plan', 'Status', 'Owner', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-aegis-text3 uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {orgs.map((org, i) => (
              <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-aegis-border/50 hover:bg-aegis-bg3/50 transition-colors" whileHover={{ scale: 1.005 }}>
                <td className="px-4 py-3 text-sm text-aegis-text font-medium">{String(org.name)}</td>
                <td className="px-4 py-3"><span className="badge badge-pending">{String(org.plan)}</span></td>
                <td className="px-4 py-3">
                  <span className={`badge ${org.status === 'active' ? 'badge-approved' : org.status === 'suspended' ? 'badge-rejected' : 'badge-flagged'}`}>
                    {String(org.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-aegis-text3">{String(org.ownerId || '').substring(0, 12)}...</td>
                <td className="px-4 py-3">
                  {org.status === 'active' ? (
                    <button onClick={() => suspend(String(org.orgId))} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"><Ban className="w-3 h-3" />Suspend</button>
                  ) : (
                    <button onClick={() => reinstate(String(org.orgId))} className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"><Play className="w-3 h-3" />Reinstate</button>
                  )}
                </td>
              </motion.tr>
            ))}
            {!loading && orgs.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-aegis-text3">No organisations found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
