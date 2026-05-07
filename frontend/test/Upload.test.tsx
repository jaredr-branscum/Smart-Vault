import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadPage from '@/app/upload/page';

// Mock the global fetch API
global.fetch = jest.fn();

describe('Upload Page', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the upload dropzone initially', () => {
    render(<UploadPage />);
    expect(screen.getByText(/Drag and drop your receipt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
  });

  it('handles file selection, shows preview, then allows confirmation to review', async () => {
    // Mock the backend upload response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ merchant: 'Test Merchant', total_amount: 123.45, date: '2026-05-07' }),
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

    // Assert fetch was called with the file
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Wait for the review form to appear
    await waitFor(() => {
      expect(screen.getByText(/We extracted the following data/i)).toBeInTheDocument();
    });

    // Check if the inputs are populated with the parsed data
    const merchantInput = screen.getByDisplayValue('Test Merchant');
    expect(merchantInput).toBeInTheDocument();
    
    const amountInput = screen.getByDisplayValue('123.45');
    expect(amountInput).toBeInTheDocument();
  });
});
