import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function SeverityBarChart({
  data,
}: {
  data: Array<{ name: string; value: number }>
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 16 }}>
          <XAxis type="number" stroke="#52525b" />
          <YAxis type="category" dataKey="name" stroke="#52525b" width={80} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #27272a',
            }}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
