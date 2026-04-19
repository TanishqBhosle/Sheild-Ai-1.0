import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart3,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button, Badge, cn } from './UI';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const Analytics = () => {
  const { isAuthenticated, userRole } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>({
    timeSeries: [],
    categories: [],
    stats: {
      total: 0,
      flagged: 0,
      rejected: 0,
      approved: 0
    }
  });

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!isAuthenticated || !db || userRole !== 'admin') {
      if (userRole !== 'admin') setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const results = await getDocs(collection(db, 'moderation_results'));
        const docs = results.docs.map(d => d.data());
        
        // Process categories
        const catMap: Record<string, number> = {};
        docs.forEach(d => {
          d.categories?.forEach((c: string) => {
            catMap[c] = (catMap[c] || 0) + 1;
          });
        });
        
        const categories = Object.entries(catMap).map(([name, value]) => ({ name, value }));

        // Process time series (mocking some history if empty)
        const timeSeries = [
          { name: 'Mon', scans: 450, violations: 24 },
          { name: 'Tue', scans: 520, violations: 32 },
          { name: 'Wed', scans: 480, violations: 18 },
          { name: 'Thu', scans: 610, violations: 45 },
          { name: 'Fri', scans: 590, violations: 38 },
          { name: 'Sat', scans: 320, violations: 12 },
          { name: 'Sun', scans: 280, violations: 8 },
        ];

        setData({
          timeSeries,
          categories: categories.length > 0 ? categories : [
            { name: 'Hate Speech', value: 400 },
            { name: 'Violence', value: 300 },
            { name: 'Harassment', value: 300 },
            { name: 'Sexual', value: 200 },
          ],
          stats: {
            total: docs.length,
            flagged: docs.filter(d => d.status === 'flagged').length,
            rejected: docs.filter(d => d.status === 'rejected').length,
            approved: docs.filter(d => d.status === 'approved').length,
          }
        });
      } catch (error: any) {
        handleFirestoreError(error, OperationType.GET, 'moderation_results');
        if (error.response?.status === 403 || error.message?.includes('permissions')) {
          toast.error("Access Denied: Only administrators can view full analytics.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-20 w-full skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[400px] skeleton" />
          <div className="h-[400px] skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Last 7 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Moderation Volume
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Scans</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Violations</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeSeries}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScans)" />
                <Area type="monotone" dataKey="violations" stroke="#f43f5e" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="font-bold flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-purple-500" />
            Violation Categories
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.categories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.categories.map((cat: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-medium">{cat.name}</span>
                </div>
                <span className="text-xs font-bold">{cat.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-500" />
            Severity Distribution
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Low', count: 450 },
                { name: 'Med', count: 280 },
                { name: 'High', count: 120 },
                { name: 'Crit', count: 45 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold">Key Performance Indicators</h3>
            <Badge variant="info">Real-time</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Avg. Latency', value: '1.2s', trend: '-12%', positive: true },
              { label: 'AI Confidence', value: '94.2%', trend: '+2.4%', positive: true },
              { label: 'Manual Review', value: '8.5%', trend: '+1.2%', positive: false },
              { label: 'False Positives', value: '0.4%', trend: '-0.1%', positive: true },
            ].map((kpi, i) => (
              <div key={i} className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{kpi.value}</span>
                  <span className={cn(
                    "text-[10px] font-bold flex items-center mb-1",
                    kpi.positive ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {kpi.trend.startsWith('+') ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {kpi.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
