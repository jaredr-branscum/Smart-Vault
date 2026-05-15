'use client';

import React, { useState, useEffect } from 'react';
import { API_URL, getAuthHeaders } from '@/lib/api';

interface ReceiptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: number | null;
  merchant: string;
  token: string | null;
}

export default function ReceiptDrawer({ isOpen, onClose, receiptId, merchant, token }: ReceiptDrawerProps) {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen && receiptId) {
      if (token) {
        fetchViewUrl();
      } else {
        setError('Authentication session not found. Please refresh.');
      }
    } else {
      setDocUrl(null);
      setError(null);
      setRotation(0);
      setZoom(1);
    }
  }, [isOpen, receiptId, token]);

  const fetchViewUrl = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/receipts/${receiptId}/view-url`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to retrieve document link');
      const data = await res.json();
      setDocUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        data-testid="drawer-backdrop"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-500 ease-out animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-[var(--background)] shadow-2xl z-[101] transform transition-transform duration-500 ease-out animate-in slide-in-from-right border-l border-white/10 overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
          <div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">{merchant}</h3>
            <p className="text-sm text-[var(--foreground)]/50">Receipt ID: #{receiptId}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex gap-4 items-center">
          <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))} className="p-2 hover:bg-white/10 rounded-lg text-white/70" title="Zoom In">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </button>
          <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} className="p-2 hover:bg-white/10 rounded-lg text-white/70" title="Zoom Out">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
          </button>
          <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-2 hover:bg-white/10 rounded-lg text-white/70" title="Rotate">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <div className="flex-grow" />
          {docUrl && (
            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[var(--color-voya-mint)]/20 text-[var(--color-voya-mint)] rounded-full text-sm font-medium hover:bg-[var(--color-voya-mint)]/30 transition-all border border-[var(--color-voya-mint)]/30 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Original
            </a>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-grow relative overflow-auto bg-black/40 flex items-center justify-center p-8 scrollbar-hide">
          {isLoading && (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[var(--color-voya-mint)] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white/40">Retrieving secure document...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-2xl max-w-sm">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-red-400 font-medium">{error}</p>
              <button onClick={fetchViewUrl} className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all">Try Again</button>
            </div>
          )}

          {docUrl && (
            <div 
              className="transition-all duration-300 ease-in-out shadow-2xl"
              style={{ 
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              {docUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={docUrl} className="w-[500px] h-[700px] rounded-lg border-none" title="Receipt PDF" />
              ) : (
                <img src={docUrl} alt="Receipt Document" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl pointer-events-none select-none" />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
