import { NextResponse } from 'next/server';

// Mock NextResponse.redirect before importing the handler
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: jest.fn((url: string | URL) => ({
        status: 307,
        headers: new Map([['location', typeof url === 'string' ? url : url.toString()]]),
        url: typeof url === 'string' ? url : url.toString(),
      })),
    },
  };
});

import { GET } from '../app/api/auth/logout/route';

describe('Logout API Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.KEYCLOAK_ISSUER = 'http://localhost:8080/realms/smart-vault';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    (NextResponse.redirect as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('redirects to Keycloak logout with id_token_hint when id_token is provided', async () => {
    const req = { url: 'http://localhost:3000/api/auth/logout?id_token=test-token-123' } as any;
    
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:8080/realms/smart-vault/protocol/openid-connect/logout?id_token_hint=test-token-123&post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin'
    );
  });

  it('redirects to /login as fallback when id_token is missing', async () => {
    const req = { url: 'http://localhost:3000/api/auth/logout' } as any;
    
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith('http://localhost:3000/login');
  });

  it('falls back to safe URL if NEXTAUTH_URL environment variable is malicious', async () => {
    process.env.NEXTAUTH_URL = 'javascript:alert(1)';
    const req = { url: 'http://localhost:3000/api/auth/logout?id_token=test-token' } as any;
    
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:8080/realms/smart-vault/protocol/openid-connect/logout?id_token_hint=test-token&post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin'
    );
  });
});
