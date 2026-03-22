import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAdmin } from '../../hooks/useAdmin'
import type { UserDoc } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'

export default function TeamPage() {
  const { team, invite, loading, error } = useAdmin()
  const [users, setUsers] = useState<UserDoc[]>([])
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'moderator' | 'admin'>('moderator')

  const load = useCallback(async () => {
    const r = await team()
    setUsers(r.users)
  }, [team])

  useEffect(() => {
    void load().catch(() => undefined)
  }, [load])

  if (error) {
    return <p className="text-red-400">{error}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Team</h1>
        <Button type="button" onClick={() => setOpen(true)}>
          Invite
        </Button>
      </div>
      {loading && users.length === 0 ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="p-2">User</th>
                <th className="p-2">Role</th>
                <th className="p-2">Cases</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-[#27272a]">
                  <td className="p-2">{u.displayName || u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.casesReviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={open} title="Invite member" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value as 'moderator' | 'admin')}>
            <option value="moderator">moderator</option>
            <option value="admin">admin</option>
          </Select>
          <Button
            type="button"
            onClick={() =>
              void invite({ email, role }).then(() => {
                toast.success('Invited')
                setOpen(false)
                void load()
              })
            }
          >
            Send invite
          </Button>
        </div>
      </Modal>
    </div>
  )
}
