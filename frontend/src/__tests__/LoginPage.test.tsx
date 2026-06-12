import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-auth
const mockSignIn = jest.fn();
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

// Mock next/navigation
const mockPush = jest.fn();
let mockSearchParamsGet = jest.fn((): string | null => null);
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (...args: unknown[]) => mockSearchParamsGet(...args) }),
}));

import LoginPage from '../app/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet = jest.fn((): string | null => null);
  });

  it('renders the Smart Vault branding', () => {
    render(<LoginPage />);
    expect(screen.getByText('Smart Vault')).toBeInTheDocument();
  });

  it('renders a Sign In button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a Create Account button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls signIn with keycloak provider when Sign In is clicked', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/' });
    });
  });

  it('calls signIn with keycloak and kc_action=register as third arg when Create Account is clicked', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'keycloak',
        { callbackUrl: '/' },
        { kc_action: 'register' }
      );
    });
  });

  it('passes sanitized callbackUrl from search params to signIn', async () => {
    mockSearchParamsGet = jest.fn((key: string): string | null =>
      key === 'callbackUrl' ? '/dashboard' : null
    );
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/dashboard' });
    });
  });

  it('rejects absolute URL callbackUrl and falls back to /', async () => {
    mockSearchParamsGet = jest.fn((key: string): string | null =>
      key === 'callbackUrl' ? 'https://malicious.com' : null
    );
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/' });
    });
  });

  it('rejects protocol-relative callbackUrl and falls back to /', async () => {
    mockSearchParamsGet = jest.fn((key: string): string | null =>
      key === 'callbackUrl' ? '//malicious.com' : null
    );
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/' });
    });
  });

  it('shows a loading state on the Sign In button when clicked', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    });
  });

  it('shows a loading state on the Create Account button when clicked', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /redirecting/i })).toBeInTheDocument();
    });
  });

  it('disables buttons while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  it('displays a tagline describing the product', () => {
    render(<LoginPage />);
    expect(screen.getByText(/intelligent digital receipt archivist/i)).toBeInTheDocument();
  });

  it('shows an error banner when the error query param is present', () => {
    mockSearchParamsGet = jest.fn((key: string): string | null => key === 'error' ? 'OAuthCallback' : null);
    render(<LoginPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/sign-in was cancelled or failed/i)).toBeInTheDocument();
  });

  it('does not show an error banner when there is no error query param', () => {
    render(<LoginPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('redirects authenticated users to / by default', () => {
    const { useSession } = require('next-auth/react');
    useSession.mockReturnValue({ data: { user: { name: 'Test' } }, status: 'authenticated' });
    render(<LoginPage />);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('redirects authenticated users to sanitized callbackUrl', () => {
    mockSearchParamsGet = jest.fn((key: string): string | null =>
      key === 'callbackUrl' ? '/upload' : null
    );
    const { useSession } = require('next-auth/react');
    useSession.mockReturnValue({ data: { user: { name: 'Test' } }, status: 'authenticated' });
    render(<LoginPage />);
    expect(mockPush).toHaveBeenCalledWith('/upload');
  });
});
