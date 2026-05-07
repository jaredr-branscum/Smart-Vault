import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadPage from '@/app/upload/page';

// Mock the global fetch API
global.fetch = jest.fn();

// Mock puter.js
const mockImg2Txt = jest.fn();
const mockChat = jest.fn();

beforeAll(() => {
  (window as any).puter = {
    ai: {
      img2txt: mockImg2Txt,
      chat: mockChat
    }
  };
});

// Mock the security utility
jest.mock('@/lib/security', () => ({
  identifyPII: jest.fn().mockImplementation((file) => Promise.resolve({
    originalImage: 'mock-original-url',
    boxes: [{ id: 'box-1', x: 10, y: 10, width: 50, height: 20, type: 'suggested' }],
    width: 800,
    height: 1000,
    isPDF: file.type === 'application/pdf'
  })),
  finalizeRedaction: jest.fn().mockImplementation(() => Promise.resolve({
    redactedFile: new File([''], 'redacted.jpg', { type: 'image/jpeg' }),
    previewUrl: 'mock-redacted-url'
  }))
}));

describe('Upload Page with Interactive Redaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('renders the upload dropzone initially', () => {
    render(<UploadPage />);
    expect(screen.getByText(/Drag and drop your receipt/i)).toBeInTheDocument();
  });

  it('handles the interactive redaction flow', async () => {
    mockImg2Txt.mockResolvedValueOnce("Walmart\nTotal: 123.45\nDate: 2026-05-07");
    mockChat.mockResolvedValueOnce({
      message: { 
        content: [{ type: "text", text: '{"merchant": "Walmart", "total_amount": 123.45, "date": "2026-05-07"}' }] 
      }
    });

    render(<UploadPage />);
    
    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/upload/i);
    
    fireEvent.change(input, { target: { files: [file] } });

    // 1. Verify Identification step
    await waitFor(() => {
      expect(screen.getByText(/Privacy Editor/i)).toBeInTheDocument();
      expect(screen.getByText(/PII/i)).toBeInTheDocument(); // Suggested box
    });

    // 2. Click Confirm Redactions
    const confirmRedactBtn = screen.getByText(/Confirm Redactions & Continue/i);
    fireEvent.click(confirmRedactBtn);

    // 3. Verify Final Preview
    await waitFor(() => {
      expect(screen.getByText(/Final Preview/i)).toBeInTheDocument();
    });

    // 4. Proceed to Extract
    const extractBtn = screen.getByText(/Confirm & Extract Metadata/i);
    fireEvent.click(extractBtn);

    // 5. Verify Review Form
    await waitFor(() => {
      expect(screen.getByText(/Review Receipt/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Walmart')).toBeInTheDocument();
    });
  });
});
