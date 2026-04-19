import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  MoreVertical,
  FileSpreadsheet,
  FilePieChart,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Input, Badge, cn } from './UI';
import { toast } from 'sonner';
import api from '../services/api';

export const Reports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data);
    } catch (error: any) {
      console.error("Fetch reports error:", error);
      if (error.response?.status === 403) {
        toast.error("Access Denied: Only administrators can view reports.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await api.post('/reports', {
        title: `Moderation Summary - ${new Date().toLocaleDateString()}`,
        type: 'summary',
        dateRange: 'last_7_days'
      });
      toast.success('Report generation started');
      fetchReports();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const reportTypes = [
    { label: 'Moderation Summary', icon: FilePieChart, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Violation Trends', icon: FileSpreadsheet, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Team Performance', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
        <Button onClick={handleGenerateReport} isLoading={isGenerating}>
          <Plus className="w-4 h-4 mr-2" />
          Generate New Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTypes.map((type, i) => (
          <Card key={i} className="p-6 hover:shadow-md transition-all cursor-pointer group">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", type.bg)}>
              <type.icon className={cn("w-6 h-6", type.color)} />
            </div>
            <h3 className="font-bold mb-1">{type.label}</h3>
            <p className="text-xs text-slate-500">Generate a detailed {type.label.toLowerCase()} for your team.</p>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Generated Reports
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search reports..." 
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 px-2">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Report Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Date Range</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">{report.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral" className="text-[8px]">{report.type}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 font-medium">{report.dateRange.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        report.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                      )} />
                      <span className="text-xs font-bold capitalize">{report.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 px-2">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                    No reports generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
