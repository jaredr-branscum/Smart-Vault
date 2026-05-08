import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { PII_PATTERNS } from './pii-patterns';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface RedactionBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'suggested' | 'manual';
  text?: string;
}

export async function identifyPII(file: File): Promise<{ 
  originalImage: string; 
  boxes: RedactionBox[]; 
  width: number; 
  height: number; 
  isPDF: boolean 
}> {
  // Security check: Limit file size to 10MB to prevent browser DoS
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const isPDF = file.type === 'application/pdf';

  if (isPDF) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
  } else {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = objectUrl;
    });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(objectUrl);
  }

  const originalImage = canvas.toDataURL('image/jpeg', 0.9);

  // OCR for identification
  const worker = await createWorker('eng');
  const { data: { words } } = await worker.recognize(canvas);
  await worker.terminate();

  const PII_KEYWORDS = ['name', 'ssn', 'dob', 'phone', 'email', 'address', 'customer', 'cardholder', 'acc', 'account', 'routing', 'iban'];
  const CONTEXTUAL_PII_PATTERNS = [
    { pattern: /\b\d{3}[- ]?\d{2}[- ]?(?:\d{4}|[X]{4})\b/gi, keywords: ['ssn', 'social', 'tax', 'id'] },
    { pattern: /\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g, keywords: ['dob', 'birth', 'born'] },
    { pattern: /\b\d{5}(?:-\d{4})?\b/g, keywords: ['address', 'zip', 'customer', 'bill', 'ship'] }
  ];

  const boxes: RedactionBox[] = [];
  let flagRestOfLine = false;
  let recentKeywords: string[] = [];
  let currentY = -1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const text = word.text.toLowerCase().replace(/[:\s#]/g, '');
    
    if (Math.abs(word.bbox.y0 - currentY) > 10) {
      flagRestOfLine = false;
      recentKeywords = [];
      currentY = word.bbox.y0;
    }

    const matchesGlobal = PII_PATTERNS.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(word.text);
    });

    const isKeyword = PII_KEYWORDS.some(kw => text.includes(kw));
    if (isKeyword) {
      recentKeywords.push(text);
      flagRestOfLine = true;
    }

    const matchesContextual = CONTEXTUAL_PII_PATTERNS.some(cp => {
      cp.pattern.lastIndex = 0;
      if (cp.pattern.test(word.text)) {
        return cp.keywords.some(kw => recentKeywords.some(rk => rk.includes(kw)));
      }
      return false;
    });

    if (matchesGlobal || matchesContextual || flagRestOfLine) {
      if (isKeyword && !matchesGlobal && !matchesContextual) continue;
      
      boxes.push({
        id: `box-${i}`,
        x: word.bbox.x0 - 2,
        y: word.bbox.y0 - 2,
        width: (word.bbox.x1 - word.bbox.x0) + 4,
        height: (word.bbox.y1 - word.bbox.y0) + 4,
        type: 'suggested',
        text: word.text
      });
    }
  }

  return { originalImage, boxes, width: canvas.width, height: canvas.height, isPDF };
}

export async function finalizeRedaction(
  originalImageDataUrl: string, 
  boxes: RedactionBox[], 
  width: number, 
  height: number,
  isPDF: boolean,
  originalFileName: string
): Promise<{ redactedFile: File; previewUrl: string }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = width;
  canvas.height = height;

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = originalImageDataUrl;
  });
  ctx.drawImage(img, 0, 0);

  // Draw redactions
  ctx.fillStyle = 'black';
  for (const box of boxes) {
    ctx.fillRect(box.x, box.y, box.width, box.height);
  }

  if (isPDF) {
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
    const pdfBlob = pdf.output('blob');
    const redactedFile = new File([pdfBlob], `redacted_${originalFileName}`, { type: 'application/pdf' });
    const previewUrl = URL.createObjectURL(redactedFile);
    return { redactedFile, previewUrl };
  } else {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas to Blob failed'));
        const redactedFile = new File([blob], `redacted_${originalFileName}`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(redactedFile);
        resolve({ redactedFile, previewUrl });
      }, 'image/jpeg', 0.9);
    });
  }
}
