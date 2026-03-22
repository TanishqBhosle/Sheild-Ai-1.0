import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export function ActivityLineChart({
  data,
}: {
  data: Array<{
    date: string
    submitted: number
    flagged: number
    blocked: number
  }>
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="#27272a" vertical={false} />
          <XAxis dataKey="date" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 8,
            }}
          />
          <Line type="monotone" dataKey="submitted" stroke="#6366f1" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="flagged" stroke="#f59e0b" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="blocked" stroke="#ef4444" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
