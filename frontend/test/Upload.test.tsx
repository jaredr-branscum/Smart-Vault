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

  it('handles file selection and shows review form', async () => {
    // Mock the backend upload response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ merchant: 'Test Merchant', total_amount: 123.45, date: '2026-05-07' }),
    });

    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement;
    const file = new File(['dummy content'], 'receipt.pdf', { type: 'application/pdf' });
    
    // Simulate user selecting a file
    await userEvent.upload(fileInput, file);

    // Assert fetch was called with the file
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Wait for the review form to appear
    await waitFor(() => {
      expect(screen.getByText(/Review Receipt/i)).toBeInTheDocument();
    });

    // Check if the inputs are populated with the parsed data
    const merchantInput = screen.getByDisplayValue('Test Merchant');
    expect(merchantInput).toBeInTheDocument();
    
    const amountInput = screen.getByDisplayValue('123.45');
    expect(amountInput).toBeInTheDocument();
  });
});
