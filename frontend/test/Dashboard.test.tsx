import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

global.fetch = jest.fn();

describe('Dashboard Page', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<DashboardPage />);
    expect(screen.getByText(/Loading analytics.../i)).toBeInTheDocument();
  });

  it('renders analytics data after fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_expenses: 150.50,
        by_category: { 'Groceries': 100, 'Travel': 50.50 },
        receipts: [
          { id: 1, merchant: 'Target', amount: 100, date: '2026-05-01', category: 'Groceries' },
          { id: 2, merchant: 'Uber', amount: 50.50, date: '2026-05-02', category: 'Travel' }
        ]
      }),
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/\$150\.50/)).toBeInTheDocument();
    });

    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  it('updates analytics when date range changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        total_expenses: 100,
        by_category: { 'Groceries': 100 },
        receipts: []
      }),
    });

    const { getByLabelText } = render(<DashboardPage />);
    
    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Wait for loading to finish and inputs to appear
    await waitFor(() => {
      expect(getByLabelText('Start Date')).toBeInTheDocument();
    });

    // Change start date
    const startDateInput = getByLabelText('Start Date');
    const endDateInput = getByLabelText('End Date');

    // Setup fetch mock to return filtered data
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        total_expenses: 50,
        by_category: { 'Groceries': 50 },
        receipts: [
          { id: 3, merchant: 'FilteredMerchant', amount: 50, date: '2026-05-01', category: 'Groceries' }
        ]
      }),
    });

    fireEvent.change(startDateInput, { target: { value: '2026-05-01' } });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('start_date=2026-05-01'));
      expect(screen.getByText('FilteredMerchant')).toBeInTheDocument();
      expect(screen.getAllByText(/\$50\.00/).length).toBeGreaterThan(0);
    });

    fireEvent.change(endDateInput, { target: { value: '2026-05-07' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('end_date=2026-05-07'));
    });
  });
});
