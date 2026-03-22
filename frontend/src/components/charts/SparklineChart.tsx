import { LineChart, Line, ResponsiveContainer } from 'recharts'

export function SparklineChart({
  data,
  color = '#6366f1',
}: {
  data: Array<{ x: string; y: number }>
  color?: string
}) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
