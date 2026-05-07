'use client';

import React from 'react';

export interface ParsedData {
  merchant: string;
  total_amount: string;
  date: string;
  category: string;
}

interface ReviewFormProps {
  data: ParsedData;
  isLoading: boolean;
  onChange: (data: ParsedData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const CATEGORIES = ["Groceries", "Utilities", "Dining", "Software", "Office Supplies", "Travel", "Other"];

export default function ReviewForm({ data, isLoading, onChange, onSubmit, onCancel }: ReviewFormProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-full bg-[var(--color-voya-mint)]/20 flex items-center justify-center text-[var(--color-voya-mint)] mr-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Review Receipt</h2>
      </div>
      
      <p className="text-[var(--foreground)]/70 mb-8">We extracted the following data. Please review and categorize your expense.</p>
      
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Merchant</label>
            <input 
              type="text" 
              required
              value={data.merchant}
              onChange={(e) => onChange({...data, merchant: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Total Amount ($)</label>
            <input 
              type="number" 
              step="0.01" 
              required
              value={data.total_amount}
              onChange={(e) => onChange({...data, total_amount: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Date</label>
            <input 
              type="date" 
              required
              value={data.date}
              onChange={(e) => onChange({...data, date: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Category</label>
            <select 
              required
              value={data.category}
              onChange={(e) => onChange({...data, category: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all dark:[&>option]:text-black"
            >
              <option value="" disabled>Select a category...</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-[var(--foreground)]/20 text-[var(--foreground)] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--color-voya-mint)] to-[var(--color-voya-light)] text-white font-bold shadow-[0_0_15px_rgba(0,168,150,0.4)] hover:shadow-[0_0_20px_rgba(0,168,150,0.6)] transition-all disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
