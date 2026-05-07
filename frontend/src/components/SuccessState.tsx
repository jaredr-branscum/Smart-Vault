'use client';

import React from 'react';
import Link from 'next/link';

interface SuccessStateProps {
  onUploadAnother: () => void;
}

export default function SuccessState({ onUploadAnother }: SuccessStateProps) {
  return (
    <div className="text-center py-8 animate-in zoom-in duration-500">
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[var(--color-voya-mint)] to-[var(--color-voya-light)] flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(0,168,150,0.5)]">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="text-3xl font-bold text-[var(--foreground)] mb-4">Receipt Saved!</h2>
      <p className="text-[var(--foreground)]/70 mb-8 max-w-md mx-auto">Your receipt has been successfully digitized and categorized in your Smart Vault.</p>
      
      <div className="flex justify-center gap-4">
        <button 
          onClick={onUploadAnother}
          className="py-3 px-6 rounded-full border-2 border-[var(--color-gitlab-light)] text-[var(--color-gitlab-light)] font-bold hover:bg-[var(--color-gitlab-light)] hover:text-white transition-all"
        >
          Upload Another
        </button>
        <Link 
          href="/dashboard"
          className="py-3 px-6 rounded-full bg-[var(--foreground)] text-[var(--background)] font-bold hover:opacity-90 transition-all shadow-lg"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  );
}
