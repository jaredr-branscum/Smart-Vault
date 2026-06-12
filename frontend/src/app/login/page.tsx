'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

type LoadingState = 'idle' | 'signin' | 'register';

/**
 * Reject absolute URLs and protocol-relative paths to prevent open redirects.
 * Only relative paths starting with a single '/' are allowed.
 */
function getSafeCallbackUrl(url: string | null): string {
  if (!url) return '/';
  if (url.startsWith('//') || /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    return '/';
  }
  if (!url.startsWith('/')) {
    return '/';
  }
  return url;
}

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<LoadingState>('idle');

  const authError = searchParams.get('error');
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'));

  // Reset loading state if user navigates back here from Keycloak
  useEffect(() => {
    setLoading('idle');
  }, []);

  // Redirect already-authenticated users to their intended destination
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleSignIn = async () => {
    setLoading('signin');
    await signIn('keycloak', { callbackUrl });
  };

  const handleRegister = async () => {
    setLoading('register');
    // kc_action=register is passed as an authorization param (third arg)
    await signIn('keycloak', { callbackUrl }, { kc_action: 'register' });
  };

  const isLoading = loading !== 'idle';

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center relative overflow-hidden px-4">
      {/* Ambient background orbs — matches the app's existing design language */}
      <div
        aria-hidden="true"
        className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-25 animate-pulse"
        style={{ background: 'var(--color-voya-mint)' }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[160px] opacity-20 animate-pulse"
        style={{ background: 'var(--color-gitlab-orange)', animationDelay: '2s' }}
      />
      <div
        aria-hidden="true"
        className="absolute top-[30%] right-[5%] w-[25%] h-[25%] rounded-full blur-[100px] opacity-15"
        style={{ background: 'var(--color-gitlab-light)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-voya-mint), var(--color-gitlab-orange))' }}
          >
            {/* Vault icon */}
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(90deg, var(--color-voya-mint), var(--color-gitlab-orange), var(--color-gitlab-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Smart Vault
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Your intelligent digital receipt archivist
          </p>
        </div>

        {/* Auth card */}
        <div
          className="rounded-3xl p-8 shadow-2xl border backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
            Welcome back
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--foreground)', opacity: 0.55 }}>
            Sign in to your account or create a new one to get started.
          </p>

          {authError && (
            <div
              className="mb-6 px-4 py-3 rounded-xl text-sm font-medium border"
              style={{
                background: 'rgba(252,109,38,0.08)',
                borderColor: 'rgba(252,109,38,0.3)',
                color: 'var(--color-gitlab-orange)',
              }}
              role="alert"
            >
              Sign-in was cancelled or failed. Please try again.
            </div>
          )}

          <div className="space-y-4">
            {/* Sign In */}
            <button
              id="login-signin-btn"
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--color-voya-mint) 0%, var(--color-voya-light) 100%)',
                boxShadow: '0 0 20px rgba(0,168,150,0.35)',
              }}
            >
              {loading === 'signin' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign In
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--foreground)', opacity: 0.4 }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Create Account */}
            <button
              id="login-register-btn"
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] border"
              style={{
                background: 'rgba(252,109,38,0.08)',
                borderColor: 'rgba(252,109,38,0.35)',
                color: 'var(--color-gitlab-orange)',
              }}
            >
              {loading === 'register' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-xs text-center" style={{ color: 'var(--foreground)', opacity: 0.35 }}>
            Secured by Keycloak · Your data is private and encrypted
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: '🔒', label: 'Zero-trust Auth' },
            { icon: '🧾', label: 'AI Receipt Parsing' },
            { icon: '📊', label: 'Expense Analytics' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="text-center p-3 rounded-2xl border"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)', opacity: 0.5 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
