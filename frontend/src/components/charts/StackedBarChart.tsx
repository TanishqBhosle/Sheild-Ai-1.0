import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

export function StackedBarChart({
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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="#27272a" vertical={false} />
          <XAxis dataKey="date" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #27272a',
            }}
          />
          <Legend />
          <Bar dataKey="submitted" stackId="a" fill="#6366f1" />
          <Bar dataKey="flagged" stackId="a" fill="#f59e0b" />
          <Bar dataKey="blocked" stackId="a" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
