'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      let url = `${apiUrl}/analytics?`;
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/receipts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete receipt');
      
      // Update UI state locally
      setData((prev: any) => ({
        ...prev,
        receipts: prev.receipts.filter((r: any) => r.id !== id),
        total_expenses: prev.total_expenses - (prev.receipts.find((r: any) => r.id === id)?.total_amount || 0)
      }));
      setIsDeleting(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--foreground)] text-2xl font-bold animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  // ... (Keep existing Chart Data preparation) ...
  const pieData = data?.by_category 
    ? Object.keys(data.by_category).map(key => ({ name: key, value: data.by_category[key] }))
    : [];
    
  const COLORS = ['#00a896', '#fc6d26', '#6666c4', '#02c39a', '#e24329', '#003b49'];

  const lineDataMap: Record<string, number> = {};
  if (data?.receipts) {
    data.receipts.forEach((r: any) => {
      if (r.date) {
        lineDataMap[r.date] = (lineDataMap[r.date] || 0) + (r.total_amount || 0);
      }
    });
  }
  const lineData = Object.keys(lineDataMap).sort().map(date => ({
    date,
    amount: lineDataMap[date]
  }));

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-5%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-voya-mint)] rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-[var(--color-gitlab-orange)] rounded-full blur-[100px] opacity-10 pointer-events-none" />

      {/* Confirmation Modal */}
      {isDeleting !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--background)] border border-[var(--foreground)]/20 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">Delete Receipt?</h3>
            <p className="text-[var(--foreground)]/70 mb-8 leading-relaxed">
              This action cannot be undone. All extracted data and metadata for this receipt will be permanently removed from the vault.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsDeleting(null)}
                className="flex-1 py-3 px-6 rounded-2xl border border-[var(--foreground)]/10 hover:bg-[var(--foreground)]/5 font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(isDeleting)}
                className="flex-1 py-3 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ... (Keep existing header and filters) ... */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <Link href="/" className="text-[var(--color-voya-mint)] hover:text-[var(--color-voya-light)] font-medium flex items-center mb-2 transition-colors">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back Home
            </Link>
            <h1 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">Analytics Dashboard</h1>
          </div>

          <div className="flex gap-4 items-center bg-white/5 dark:bg-black/20 p-3 rounded-2xl border border-[var(--foreground)]/10 backdrop-blur-md">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[var(--foreground)] border-none focus:ring-0 outline-none text-sm [color-scheme:dark] cursor-pointer"
              aria-label="Start Date"
            />
            <span className="text-[var(--foreground)]/50">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[var(--foreground)] border-none focus:ring-0 outline-none text-sm [color-scheme:dark] cursor-pointer"
              aria-label="End Date"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ... (Summary and Line Chart cards stay same) ... */}
          <div className="lg:col-span-1 bg-gradient-to-br from-[var(--color-voya-dark)] to-[var(--color-gitlab-purple)] rounded-3xl p-8 shadow-2xl border border-white/10 flex flex-col justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
             <h2 className="text-white/70 text-lg font-medium mb-2 z-10">Total Expenses</h2>
             <p className="text-5xl font-extrabold text-white z-10 tracking-tight">
               ${data?.total_expenses?.toFixed(2) || '0.00'}
             </p>
             <div className="mt-8 z-10">
               <Link href="/upload" className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all font-medium border border-white/10">
                 + Add Receipt
               </Link>
             </div>
          </div>

          <div className="lg:col-span-2 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-[var(--foreground)]/10 rounded-3xl p-6 shadow-xl">
             <h3 className="text-xl font-bold text-[var(--foreground)] mb-6">Spending Over Time</h3>
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={lineData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="var(--foreground)" opacity={0.1} vertical={false} />
                   <XAxis dataKey="date" stroke="var(--foreground)" opacity={0.5} tick={{ fill: 'var(--foreground)' }} axisLine={false} tickLine={false} />
                   <YAxis stroke="var(--foreground)" opacity={0.5} tick={{ fill: 'var(--foreground)' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                   <RechartsTooltip 
                     contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--color-voya-mint)', borderRadius: '12px', color: 'var(--foreground)' }}
                     itemStyle={{ color: 'var(--color-voya-mint)', fontWeight: 'bold' }}
                   />
                   <Line type="monotone" dataKey="amount" stroke="var(--color-voya-mint)" strokeWidth={4} dot={{ r: 4, fill: 'var(--color-voya-mint)' }} activeDot={{ r: 8, fill: 'var(--color-gitlab-orange)', stroke: 'none' }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="lg:col-span-1 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-[var(--foreground)]/10 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2 self-start w-full">By Category</h3>
            {pieData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--color-voya-mint)', borderRadius: '12px', color: 'var(--foreground)' }}
                       itemStyle={{ fontWeight: 'bold' }}
                       formatter={(value: number) => `$${value.toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[var(--foreground)]/50">No category data</div>
            )}
          </div>

          {/* Recent Receipts List with Delete Action */}
          <div className="lg:col-span-2 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-[var(--foreground)]/10 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-6">Recent Receipts</h3>
            {data?.receipts && data.receipts.length > 0 ? (
              <div className="space-y-4">
                {data.receipts.slice(-5).reverse().map((r: any) => (
                  <div key={r.id} className="group relative flex justify-between items-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all hover:shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--color-voya-mint)] to-[var(--color-gitlab-light)] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {r.merchant ? r.merchant.charAt(0).toUpperCase() : 'R'}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--foreground)] text-lg">{r.merchant}</p>
                        <p className="text-sm text-[var(--foreground)]/60">{r.date} • {r.category || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-[var(--color-voya-mint)] text-xl">${r.total_amount?.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => setIsDeleting(r.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                        title="Delete Receipt"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--foreground)]/50">No receipts found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
