import { Users } from 'lucide-react';

export default function TeamMembers() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aegis-text flex items-center gap-2"><Users className="w-5 h-5 text-aegis-accent" />Team Members</h2>
        <button className="btn-primary">Invite Member</button>
      </div>
      <div className="glass-card">
        <p className="text-sm text-aegis-text3 text-center py-8">Team management is available on Pro and Enterprise plans.</p>
      </div>
    </div>
  );
}
