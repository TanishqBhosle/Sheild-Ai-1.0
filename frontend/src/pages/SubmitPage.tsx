import { useEffect, useState, type DragEventHandler } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { fbDb } from '../config/firebase'
import { useContent } from '../hooks/useContent'
import { uploadMedia } from '../services/upload.service'
import { createAppeal } from '../services/appeals.service'
import type { ContentDoc, ContentType } from '../types'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'

export default function SubmitPage() {
  const { user } = useAuth()
  const { submit } = useContent()
  const [type, setType] = useState<ContentType>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [contentId, setContentId] = useState<string | null>(null)
  const [status, setStatus] = useState<ContentDoc['status'] | null>(null)
  const [busy, setBusy] = useState(false)

  const onDrop: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) {
      setFile(f)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      return
    }
    setBusy(true)
    try {
      let storageRef: string | undefined
      if (type !== 'text' && file) {
        const up = await uploadMedia(user.uid, type, file)
        storageRef = up.gsUri
      }
      const res = await submit({
        type,
        payload: type === 'text' ? text : undefined,
        storageRef,
      })
      setContentId(res.contentId)
      setStatus('analyzing')
    } catch {
      toast.error('Submit failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!contentId) {
      return undefined
    }
    return onSnapshot(doc(fbDb, 'content', contentId), (snap) => {
      const d = snap.data() as ContentDoc | undefined
      if (d) {
        setStatus(d.status)
      }
    })
  }, [contentId])

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <h1 className="text-xl font-semibold">Submit content</h1>
      {!contentId ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['text', 'image', 'audio', 'video'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  type === t
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-[#27272a]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {type === 'text' ? (
            <>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} />
              <p
                className={`text-xs ${text.length > 9000 ? 'text-red-400' : 'text-ink-muted'}`}
              >
                {text.length} / 10,000
              </p>
            </>
          ) : (
            <div
              className="cursor-pointer rounded-xl border border-dashed border-[#27272a] p-8 text-center text-sm text-ink-muted"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => document.getElementById('f')?.click()}
            >
              <input
                id="f"
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              Drop or click to upload
              {file ? <p className="mt-2 text-ink-primary">{file.name}</p> : null}
            </div>
          )}
          <Button className="h-11 w-full" loading={busy} onClick={() => void handleSubmit()}>
            Submit for moderation
          </Button>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {status === 'analyzing' ? (
            <div className="space-y-3 text-center">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#27272a]">
                <motion.div
                  className="h-full bg-indigo-500"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                />
              </div>
              <p className="text-sm text-ink-muted">Analyzing with AI…</p>
            </div>
          ) : (
            <Card className="space-y-4 text-center">
              <p className="text-lg font-medium">
                {status === 'allowed'
                  ? 'Content approved'
                  : status === 'flagged'
                    ? 'Content flagged'
                    : 'Content blocked'}
              </p>
              <p className="text-xs text-ink-muted">ID: {contentId}</p>
              {status === 'flagged' || status === 'blocked' ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    void createAppeal({
                      contentId: contentId!,
                      reason: 'User appeal',
                    }).then(() => toast.success('Appeal submitted'))
                  }
                >
                  Submit an appeal
                </Button>
              ) : null}
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
