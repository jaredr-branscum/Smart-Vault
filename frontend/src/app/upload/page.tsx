'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { identifyPII, finalizeRedaction, RedactionBox } from '@/lib/security';
import RedactionEditor from '@/components/RedactionEditor';
import UploadZone from '@/components/UploadZone';
import ReviewForm, { ParsedData } from '@/components/ReviewForm';
import SuccessState from '@/components/SuccessState';

type UploadStep = 'upload' | 'redact' | 'preview' | 'review' | 'success';

interface RedactionData {
  originalImage: string;
  boxes: RedactionBox[];
  width: number;
  height: number;
  isPDF: boolean;
}

export default function UploadPage() {
  const [step, setStep] = useState<UploadStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSecuring, setIsSecuring] = useState(false);
  const [redactionData, setRedactionData] = useState<RedactionData | null>(null);
  const [redactedFile, setRedactedFile] = useState<File | null>(null);
  const [redactedPreviewUrl, setRedactedPreviewUrl] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData>({
    merchant: '',
    total_amount: '',
    date: '',
    category: ''
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleFileSelected = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setError('Please upload a valid PDF or Image file.');
      return;
    }
    
    setError(null);
    setSelectedFile(file);
    setIsSecuring(true);

    try {
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

  const cleanJsonString = (str: string): string => {
    return str.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
  };

  const processFile = async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const rawContent = await (window as any).puter.ai.img2txt(file);
      const prompt = `Extract receipt data from this text. Respond ONLY with JSON: {"merchant": string, "total_amount": number, "date": "YYYY-MM-DD"}. Text: ${rawContent}`;
      const aiResponse = await (window as any).puter.ai.chat(prompt);
      
      let data;
      const content = aiResponse.message.content[0].text;
      try {
        data = JSON.parse(cleanJsonString(content));
      } catch (e) {
        // Fallback to simpler extraction or error
        throw new Error('Failed to parse AI response as JSON');
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

      if (!response.ok) throw new Error('Failed to save the receipt.');
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setSelectedFile(null);
    setRedactedFile(null);
    setRedactedPreviewUrl(null);
    setRedactionData(null);
    setStep('upload');
    setError(null);
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
          <div className="w-24" />
        </div>

        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {step === 'upload' && !isSecuring && (
            <UploadZone 
              isDragging={isDragging}
              isLoading={isLoading}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onBrowse={() => fileInputRef.current?.click()}
              onChange={handleFileChange}
              fileInputRef={fileInputRef}
            />
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
              onCancel={resetFlow}
            />
          )}

          {step === 'preview' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Final Preview</h2>
                <button onClick={resetFlow} className="px-4 py-2 text-sm bg-transparent border border-[var(--foreground)]/20 text-[var(--foreground)] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  Start Over
                </button>
              </div>
              
              <div className="w-full h-96 rounded-2xl overflow-hidden border border-[var(--foreground)]/10 mb-8 bg-black/40 flex flex-col relative items-center justify-center">
                {redactedPreviewUrl && redactedFile ? (
                  <>
                    {redactedFile.type === 'application/pdf' ? (
                      <iframe src={redactedPreviewUrl} className="w-full h-full border-none" title="Redacted PDF Preview" />
                    ) : (
                      <img src={redactedPreviewUrl} className="w-full h-full object-contain" alt="Redacted Preview" />
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
                  onClick={() => processFile(redactedFile || selectedFile!)}
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--color-gitlab-orange)] to-[#e24329] text-white font-bold shadow-lg hover:shadow-orange-500/40 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isLoading ? 'Extracting Data...' : 'Confirm & Extract Metadata'}
                  {!isLoading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <ReviewForm 
              data={parsedData}
              isLoading={isLoading}
              onChange={setParsedData}
              onSubmit={handleSubmitReview}
              onCancel={resetFlow}
            />
          )}

          {step === 'success' && (
            <SuccessState onUploadAnother={resetFlow} />
          )}
        </div>
      </div>
    </div>
  );
}
