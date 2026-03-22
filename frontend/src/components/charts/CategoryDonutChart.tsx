import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#a1a1aa']

export function CategoryDonutChart({
  data,
}: {
  data: Array<{ category: string; count: number }>
}) {
  const total = data.reduce((a, b) => a + b.count, 0) || 1
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend verticalAlign="middle" align="right" layout="vertical" />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fafafa"
            fontSize={14}
          >
            {total}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
