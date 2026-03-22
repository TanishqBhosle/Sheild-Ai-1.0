import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { ROUTES } from '../../constants'

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const go = (path: string) => {
    nav(path)
    setOpen(false)
    setQ('')
  }

  return (
    <>
      <button
        type="button"
        className="hidden rounded-lg border border-[#27272a] px-3 py-1 text-xs text-ink-muted md:block"
        onClick={() => setOpen(true)}
      >
        ⌘K
      </button>
      <Modal open={open} title="Command palette" onClose={() => setOpen(false)}>
        <Input
          autoFocus
          placeholder="Jump to…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-3 space-y-1 text-sm">
          <button className="block w-full text-left text-ink-muted hover:text-white" type="button" onClick={() => go(ROUTES.home)}>
            Dashboard
          </button>
          <button className="block w-full text-left text-ink-muted hover:text-white" type="button" onClick={() => go(ROUTES.queue)}>
            Queue
          </button>
          <button className="block w-full text-left text-ink-muted hover:text-white" type="button" onClick={() => go(ROUTES.submit)}>
            Submit
          </button>
        </div>
      </Modal>
    </>
  )
}
