import '@testing-library/jest-dom';

// Polyfill Web APIs for Next.js App Router tests
if (typeof global.Request === 'undefined') {
  global.Request = class {} as any;
}
if (typeof global.Response === 'undefined') {
  global.Response = class {} as any;
}
if (typeof global.Headers === 'undefined') {
  global.Headers = class {} as any;
}

// Mock next/navigation globally
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: (key: string) => null,
    };
  },
  usePathname() {
    return '';
  },
}));

// Mock next-auth/react globally
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { name: 'Test User', email: 'test@example.com' },
      accessToken: 'mock-access-token',
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
