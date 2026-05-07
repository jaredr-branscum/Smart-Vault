'use client';

import React from 'react';

interface UploadZoneProps {
  isDragging: boolean;
  isLoading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowse: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function UploadZone({
  isDragging,
  isLoading,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onChange,
  fileInputRef
}: UploadZoneProps) {
  return (
    <div 
      className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
        isDragging 
          ? 'border-[var(--color-voya-mint)] bg-[var(--color-voya-mint)]/5 scale-[1.02]' 
          : 'border-[var(--foreground)]/20 hover:border-[var(--color-gitlab-orange)]/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex justify-center mb-6">
        <div className={`p-6 rounded-full ${isDragging ? 'bg-[var(--color-voya-mint)]/20 text-[var(--color-voya-mint)]' : 'bg-[var(--foreground)]/5 text-[var(--foreground)]/60'}`}>
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Drag and drop your receipt here</h3>
      <p className="text-[var(--foreground)]/60 mb-8">Files supported: PDF, Images</p>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onChange}
        accept="application/pdf,image/*" 
        className="hidden" 
        aria-label="upload"
      />
      <button 
        onClick={onBrowse}
        disabled={isLoading}
        className="px-8 py-3 bg-gradient-to-r from-[var(--color-gitlab-orange)] to-[#e24329] text-white font-bold rounded-full shadow-[0_0_15px_rgba(252,109,38,0.3)] transition-all hover:shadow-[0_0_20px_rgba(252,109,38,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Browse Files'}
      </button>
    </div>
  );
}
