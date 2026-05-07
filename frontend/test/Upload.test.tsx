import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadPage from '@/app/upload/page';

// Mock the global fetch API (still used for saving)
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

describe('Upload Page', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    mockImg2Txt.mockClear();
    mockChat.mockClear();
  });

  it('renders the upload dropzone initially', () => {
    render(<UploadPage />);
    expect(screen.getByText(/Drag and drop your receipt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
  });

  it('handles file selection, shows preview, then allows confirmation to review', async () => {
    mockImg2Txt.mockResolvedValueOnce("Walmart\nTotal: 123.45\nDate: 2026-05-07");
    mockChat.mockResolvedValueOnce({
      message: { 
        content: [
          {
            type: "text",
            text: '{"merchant": "Walmart", "total_amount": 123.45, "date": "2026-05-07"}'
          }
        ] 
      }
    });

    // Mock URL.createObjectURL since JSDOM doesn't have it
    window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'receipt.pdf', { type: 'application/pdf' });
    
    // Simulate user selecting a file
    await userEvent.upload(fileInput, file);

    // Wait for the preview step to be shown
    await waitFor(() => {
      expect(screen.getByText(/Preview Receipt/i)).toBeInTheDocument();
    });
    
    // Check if the 'Confirm & Extract Metadata' button is there
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Extract Metadata/i });
    expect(confirmBtn).toBeInTheDocument();
    
    // Check if 'Choose Different File' is there
    expect(screen.getByRole('button', { name: /Choose Different File/i })).toBeInTheDocument();

    // Click confirm
    await userEvent.click(confirmBtn);

    // Assert puter was called
    expect(mockImg2Txt).toHaveBeenCalledWith(file);
    expect(mockChat).toHaveBeenCalled();

    // Wait for the review form to appear
    await waitFor(() => {
      expect(screen.getByText(/We extracted the following data/i)).toBeInTheDocument();
    });

    // Check if the inputs are populated with the parsed data
    const merchantInput = screen.getByDisplayValue('Walmart');
    expect(merchantInput).toBeInTheDocument();
    
    const amountInput = screen.getByDisplayValue('123.45');
    expect(amountInput).toBeInTheDocument();
  });
});
