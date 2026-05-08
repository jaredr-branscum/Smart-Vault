import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock the global fetch API
global.fetch = jest.fn();

describe('Dashboard Deletion Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    
    // Mock analytics response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        total_expenses: 100.0,
        by_category: { "Food": 100.0 },
        receipts: [
          { id: 1, merchant: "Test Store", total_amount: 100.0, date: "2026-05-07", category: "Food" }
        ]
      })
    });
  });

  it('shows the deletion modal when clicking delete button', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    // Find and click delete button (it's hidden by opacity but fireEvent works)
    const deleteBtn = screen.getByTitle('Delete Receipt');
    fireEvent.click(deleteBtn);

    // Verify modal appears
    expect(screen.getByText(/Delete Receipt\?/i)).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
  });

  it('successfully deletes a receipt and updates the UI', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTitle('Delete Receipt'));

    // Mock deletion success
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "Receipt deleted" })
    });

    // Click Delete in modal
    const confirmDeleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(confirmDeleteBtn);

    // Verify item is removed from UI and total is updated
    await waitFor(() => {
      expect(screen.queryByText('Test Store')).not.toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Total was 100, now 0
    });
  });

  it('cancels deletion when clicking cancel', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete Receipt'));
    
    const cancelBtn = screen.getByText(/Cancel/i);
    fireEvent.click(cancelBtn);

    // Verify modal is gone but item remains
    expect(screen.queryByText(/Delete Receipt\?/i)).not.toBeInTheDocument();
    expect(screen.getByText('Test Store')).toBeInTheDocument();
  });
});
