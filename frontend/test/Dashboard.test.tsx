import { render, screen, waitFor } from '@testing-library/react';
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
});
