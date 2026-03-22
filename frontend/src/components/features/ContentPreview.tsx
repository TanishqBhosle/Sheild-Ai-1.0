import type { ContentDoc } from '../../types'

export function ContentPreview({ content }: { content: ContentDoc }) {
  if (content.type === 'text' && content.payload) {
    return (
      <pre className="max-h-32 overflow-auto rounded-lg border border-[#27272a] bg-[#09090b] p-3 font-mono text-xs text-ink-muted">
        {content.payload}
      </pre>
    )
  }
  if (content.storageRef) {
    return (
      <p className="text-sm text-ink-muted break-all">
        Media: {content.storageRef}
      </p>
    )
  }
  return <p className="text-sm text-ink-muted">No preview available.</p>
}
