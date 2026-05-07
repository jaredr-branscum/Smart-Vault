'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { identifyPII, finalizeRedaction, RedactionBox } from '@/lib/security';
import RedactionEditor from '@/components/RedactionEditor';

export default function UploadPage() {
  const [step, setStep] = useState<'upload' | 'redact' | 'preview' | 'review' | 'success'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSecuring, setIsSecuring] = useState(false);
  const [redactionData, setRedactionData] = useState<{
    originalImage: string;
    boxes: RedactionBox[];
    width: number;
    height: number;
    isPDF: boolean;
  } | null>(null);
  const [redactedFile, setRedactedFile] = useState<File | null>(null);
  const [redactedPreviewUrl, setRedactedPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState({
    merchant: '',
    total_amount: '',
    date: '',
    category: ''
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    // Basic validation
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setError('Please upload a valid PDF or Image file.');
      return;
    }
    
    setError(null);
    setSelectedFile(file);
    setIsSecuring(true);

    try {
      // Step 1: Automated PII Identification (Client-Side)
      const data = await identifyPII(file);
      setRedactionData(data);
      setStep('redact');
    } catch (err: any) {
      console.error('Security scan failed:', err);
      setError('Security scanning failed. Please try again with a clearer file.');
      setStep('upload');
    } finally {
      setIsSecuring(false);
    }
  };

  const handleApplyRedactions = async (boxes: RedactionBox[]) => {
    if (!selectedFile || !redactionData) return;
    setIsLoading(true);
    try {
      // Step 2: User-verified Finalization
      const { redactedFile, previewUrl } = await finalizeRedaction(
        redactionData.originalImage,
        boxes,
        redactionData.width,
        redactionData.height,
        redactionData.isPDF,
        selectedFile.name
      );
      setRedactedFile(redactedFile);
      setRedactedPreviewUrl(previewUrl);
      setStep('preview');
    } catch (err: any) {
      setError('Failed to apply redactions.');
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setError('Please upload a valid PDF or Image file.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const puter = (window as any).puter;
      if (!puter || !puter.ai) {
        throw new Error('Puter SDK is not loaded. Please ensure you are connected to the internet.');
      }

      // Step 1: Extract text using Puter.js OCR (Using the REDACTED file)
      const extractedText = await puter.ai.img2txt(redactedFile || file);

      // Step 2: Use Puter.js Chat to structure the extracted data
      const prompt = `Here is text extracted from a receipt:
${extractedText}

Extract the merchant name, total amount, and date. 
Return ONLY a valid JSON object with the exact keys: "merchant" (string), "total_amount" (number), and "date" (string in YYYY-MM-DD format). Do not wrap the JSON in markdown code blocks, just return the raw JSON string.`;

      const response = await puter.ai.chat(prompt);
      
      // Defensively extract content, as Puter.js might return a string, an object, or an object containing the JSON
      let rawContent = response?.message?.content ?? response;
      
      // Handle Anthropic/Claude style content arrays
      if (Array.isArray(rawContent)) {
        const textBlock = rawContent.find((b: any) => b.type === 'text' || b.text);
        rawContent = textBlock ? textBlock.text : rawContent[0];
      }
      
      let data;
      if (typeof rawContent === 'object' && rawContent !== null) {
        // If it was parsed as a direct object by the SDK
        data = rawContent;
      } else {
        let jsonStr = String(rawContent).trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '');
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/```$/, '');
        data = JSON.parse(jsonStr);
      }

      setParsedData({
        merchant: data.merchant || '',
        total_amount: data.total_amount ? data.total_amount.toString() : '',
        date: data.date || '',
        category: ''
      });
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during OCR extraction.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: parsedData.merchant,
          total_amount: parseFloat(parsedData.total_amount),
          date: parsedData.date,
          category: parsedData.category
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save the receipt.');
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-[var(--color-voya-mint)] rounded-full blur-[100px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[var(--color-gitlab-purple)] rounded-full blur-[120px] opacity-10 pointer-events-none" />
      
      <div className="max-w-3xl mx-auto z-10 relative">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-[var(--color-voya-mint)] hover:text-[var(--color-voya-light)] font-medium flex items-center transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back Home
          </Link>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Upload Receipt</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {step === 'upload' && !isSecuring && (
            <div 
              className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                isDragging 
                  ? 'border-[var(--color-voya-mint)] bg-[var(--color-voya-mint)]/5 scale-[1.02]' 
                  : 'border-[var(--foreground)]/20 hover:border-[var(--color-gitlab-orange)]/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
                onChange={handleFileChange} 
                accept="application/pdf,image/*" 
                className="hidden" 
                aria-label="upload"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-8 py-3 bg-gradient-to-r from-[var(--color-gitlab-orange)] to-[#e24329] text-white font-bold rounded-full shadow-[0_0_15px_rgba(252,109,38,0.3)] transition-all hover:shadow-[0_0_20px_rgba(252,109,38,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Browse Files'}
              </button>
            </div>
          )}

          {isSecuring && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-[var(--color-voya-mint)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">Security Scanning...</h3>
              <p className="text-white/60">Identifying sensitive PII locally in your browser</p>
            </div>
          )}

          {step === 'redact' && redactionData && (
            <RedactionEditor 
              originalImage={redactionData.originalImage}
              initialBoxes={redactionData.boxes}
              width={redactionData.width}
              height={redactionData.height}
              onSave={handleApplyRedactions}
              onCancel={() => setStep('upload')}
            />
          )}

          {step === 'preview' && selectedFile && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Final Preview</h2>
                <button 
                  onClick={() => { setSelectedFile(null); setStep('upload'); }}
                  className="px-4 py-2 text-sm bg-transparent border border-[var(--foreground)]/20 text-[var(--foreground)] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Start Over
                </button>
              </div>
              
              <div className="w-full h-96 rounded-2xl overflow-hidden border border-[var(--foreground)]/10 mb-8 bg-black/40 flex flex-col relative items-center justify-center">
                {redactedPreviewUrl && redactedFile ? (
                  <>
                    {redactedFile.type === 'application/pdf' ? (
                      <iframe 
                        src={redactedPreviewUrl} 
                        className="w-full h-full border-none"
                        title="Redacted PDF Preview"
                      />
                    ) : (
                      <img 
                        src={redactedPreviewUrl} 
                        className="w-full h-full object-contain"
                        alt="Redacted Preview"
                      />
                    )}
                    <div className="absolute top-4 right-4 bg-green-500/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg pointer-events-none">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.946-2.397 9.265-6.11 11.856L10 20l-1.89-1.143C4.397 16.265 2 11.946 2 7.001c0-.682.057-1.35.166-2.002zm7.5 1.614l-2.835 2.835-.707-.707L8.959 5.906 9.666 6.613z" clipRule="evenodd" /></svg>
                      PII Protected
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                    <p className="text-white/60">Generating Final Document...</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => processFile(redactedFile || selectedFile)}
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--color-gitlab-orange)] to-[#e24329] text-white font-bold shadow-[0_0_15px_rgba(252,109,38,0.3)] hover:shadow-[0_0_20px_rgba(252,109,38,0.6)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isLoading ? 'Extracting Data...' : 'Confirm & Extract Metadata'}
                  {!isLoading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-full bg-[var(--color-voya-mint)]/20 flex items-center justify-center text-[var(--color-voya-mint)] mr-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Review Receipt</h2>
              </div>
              
              <p className="text-[var(--foreground)]/70 mb-8">We extracted the following data. Please review and categorize your expense.</p>
              
              <form onSubmit={handleSubmitReview} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Merchant</label>
                    <input 
                      type="text" 
                      value={parsedData.merchant}
                      onChange={(e) => setParsedData({...parsedData, merchant: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Total Amount ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={parsedData.total_amount}
                      onChange={(e) => setParsedData({...parsedData, total_amount: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Date</label>
                    <input 
                      type="date" 
                      value={parsedData.date}
                      onChange={(e) => setParsedData({...parsedData, date: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)]/80 mb-2">Category</label>
                    <select 
                      value={parsedData.category}
                      onChange={(e) => setParsedData({...parsedData, category: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--foreground)]/10 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--color-voya-mint)] focus:outline-none transition-all dark:[&>option]:text-black"
                      required
                    >
                      <option value="" disabled>Select a category...</option>
                      <option value="Groceries">Groceries</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Dining">Dining</option>
                      <option value="Software">Software</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Travel">Travel</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep('upload')}
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
          )}

          {step === 'success' && (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[var(--color-voya-mint)] to-[var(--color-voya-light)] flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(0,168,150,0.5)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-3xl font-bold text-[var(--foreground)] mb-4">Receipt Saved!</h2>
              <p className="text-[var(--foreground)]/70 mb-8 max-w-md mx-auto">Your receipt has been successfully digitized and categorized in your Smart Vault.</p>
              
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => {
                    setStep('upload');
                    setParsedData({ merchant: '', total_amount: '', date: '', category: '' });
                  }}
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
          )}
        </div>
      </div>
    </div>
  );
}
