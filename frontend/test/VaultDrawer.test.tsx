import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReceiptDrawer from '@/components/ReceiptDrawer';

// Mock fetch
global.fetch = jest.fn();

describe('ReceiptDrawer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReceipt = {
    id: 123,
    merchant: 'Test Merchant'
  };

  it('renders correctly when open and fetches URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://vault-storage/receipt.jpg' }),
    });

    render(
      <ReceiptDrawer 
        isOpen={true} 
        onClose={jest.fn()} 
        receiptId={mockReceipt.id} 
        merchant={mockReceipt.merchant} 
      />
    );

    expect(screen.getByText('Test Merchant')).toBeInTheDocument();
    expect(screen.getByText('Receipt ID: #123')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/receipts/123/view-url'));
    });

    // Check if image is rendered
    const img = await screen.findByAltText('Receipt Document');
    expect(img).toHaveAttribute('src', 'https://vault-storage/receipt.jpg');
  });

  it('handles zoom and rotate interactions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://vault-storage/receipt.jpg' }),
    });

    render(
      <ReceiptDrawer 
        isOpen={true} 
        onClose={jest.fn()} 
        receiptId={mockReceipt.id} 
        merchant={mockReceipt.merchant} 
      />
    );

    // Initial state check implicitly via image rendering
    const img = await screen.findByAltText('Receipt Document');
    
    // Click Rotate
    const rotateBtn = screen.getByTitle('Rotate');
    fireEvent.click(rotateBtn);
    
    // Style check (Note: in JSDOM, transforms might not reflect exactly, but we test the state transition indirectly)
    expect(img.parentElement).toHaveStyle('transform: rotate(90deg) scale(1)');
    
    // Click Zoom In
    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);
    expect(img.parentElement).toHaveStyle('transform: rotate(90deg) scale(1.2)');
  });

  it('shows error message on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ReceiptDrawer 
        isOpen={true} 
        onClose={jest.fn()} 
        receiptId={mockReceipt.id} 
        merchant={mockReceipt.merchant} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking backdrop', () => {
    const onCloseMock = jest.fn();
    render(
      <ReceiptDrawer 
        isOpen={true} 
        onClose={onCloseMock} 
        receiptId={mockReceipt.id} 
        merchant={mockReceipt.merchant} 
      />
    );

    const backdrop = screen.getByTestId('drawer-backdrop');
    fireEvent.click(backdrop);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
