import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders loading state initially', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Loading analytics.../i)).toBeInTheDocument();
  });

  it('renders analytics data after fetch', async () => {
    const mockData = {
      total_expenses: 1250.50,
      by_category: { 'Food': 250, 'Transport': 1000 },
      receipts: [
        { id: 1, merchant: 'Target', total_amount: 50.50, date: '2026-05-01', category: 'Food' }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('$1250.50')).toBeInTheDocument();
    });

    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('$50.50')).toBeInTheDocument();
  });

  it('updates analytics when date range changes', async () => {
    const mockData = {
      total_expenses: 100,
      by_category: { 'Food': 100 },
      receipts: [{ id: 2, merchant: 'Walmart', total_amount: 100, date: '2026-05-02', category: 'Food' }]
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const { getByLabelText } = render(<DashboardPage />);

    // Wait for initial load
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const startDateInput = getByLabelText('Start Date');
    fireEvent.change(startDateInput, { target: { value: '2026-05-01' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('start_date=2026-05-01'));
    });
  });
});
