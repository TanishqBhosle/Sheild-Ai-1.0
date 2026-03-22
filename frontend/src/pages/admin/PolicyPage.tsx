import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAdmin } from '../../hooks/useAdmin'
import type { ModerationRule, PolicyDoc } from '../../types'
import { Card } from '../../components/ui/Card'
import { Slider } from '../../components/ui/Slider'
import { Toggle } from '../../components/ui/Toggle'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'

export default function PolicyPage() {
  const { policiesGet, policiesSave, rulesList, ruleCreate, loading, error } =
    useAdmin()
  const [policy, setPolicy] = useState<PolicyDoc | null>(null)
  const [rules, setRules] = useState<ModerationRule[]>([])
  const [tab, setTab] = useState<'thresholds' | 'rules' | 'allowlist'>(
    'thresholds'
  )

  const load = useCallback(async () => {
    try {
      const p = await policiesGet()
      setPolicy(p)
    } catch {
      setPolicy({
        thresholds: {
          hateSpeech: 0.65,
          spam: 0.8,
          violence: 0.7,
          nsfw: 0.75,
          harassment: 0.68,
        },
        automation: {
          autoBlockCritical: true,
          humanReviewMediumPlus: true,
          learningMode: false,
        },
        updatedBy: '',
        updatedAt: { seconds: 0, nanoseconds: 0 },
      })
    }
    const r = await rulesList()
    setRules(r.rules)
  }, [policiesGet, rulesList])

  useEffect(() => {
    void load().catch(() => undefined)
  }, [load])

  const save = async () => {
    if (!policy) {
      return
    }
    try {
      await policiesSave({
        thresholds: policy.thresholds,
        automation: policy.automation,
      })
      toast.success('Saved')
    } catch {
      toast.error('Save failed')
    }
  }

  if (error) {
    return <p className="text-red-400">{error}</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Policy</h1>
      <div className="flex gap-2">
        {(['thresholds', 'rules', 'allowlist'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'primary' : 'secondary'}
            type="button"
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {loading && !policy ? (
        <Skeleton className="h-48" />
      ) : policy && tab === 'thresholds' ? (
        <Card className="space-y-4">
          {(
            [
              'hateSpeech',
              'spam',
              'violence',
              'nsfw',
              'harassment',
            ] as const
          ).map((k) => (
            <label key={k} className="block text-sm">
              <span className="text-ink-muted">{k}</span>
              <Slider
                min={0}
                max={100}
                value={Math.round(policy.thresholds[k] * 100)}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    thresholds: {
                      ...policy.thresholds,
                      [k]: Number(e.target.value) / 100,
                    },
                  })
                }
              />
            </label>
          ))}
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center justify-between gap-2 text-sm">
              Auto-block critical
              <Toggle
                checked={policy.automation.autoBlockCritical}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    automation: {
                      ...policy.automation,
                      autoBlockCritical: e.target.checked,
                    },
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              Human review medium+
              <Toggle
                checked={policy.automation.humanReviewMediumPlus}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    automation: {
                      ...policy.automation,
                      humanReviewMediumPlus: e.target.checked,
                    },
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-sm">
              Learning mode
              <Toggle
                checked={policy.automation.learningMode}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    automation: {
                      ...policy.automation,
                      learningMode: e.target.checked,
                    },
                  })
                }
              />
            </label>
          </div>
          <Button onClick={() => void save()}>Save changes</Button>
        </Card>
      ) : null}
      {tab === 'rules' ? (
        <Card className="space-y-3">
          <p className="text-sm text-ink-muted">
            Active rules: {rules.length}
          </p>
          <RuleQuickAdd
            onCreate={async (body) => {
              await ruleCreate(body)
              await load()
              toast.success('Rule created')
            }}
          />
        </Card>
      ) : null}
      {tab === 'allowlist' ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Allowlist management can extend trusted domains/users (placeholder UI).
          </p>
        </Card>
      ) : null}
    </div>
  )
}

function RuleQuickAdd({
  onCreate,
}: {
  onCreate: (b: {
    name: string
    category: string
    conditions: ModerationRule['conditions']
    action: ModerationRule['action']
    priority: number
  }) => Promise<void>
}) {
  const [name, setName] = useState('New rule')
  return (
    <div className="flex flex-wrap gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          void onCreate({
            name,
            category: 'Safe Content',
            conditions: [
              { field: 'category', operator: 'equals', value: 'Safe Content' },
            ],
            action: 'allow',
            priority: 1,
          })
        }
      >
        Add sample rule
      </Button>
    </div>
  )
}
