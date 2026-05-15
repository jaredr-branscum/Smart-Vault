'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-voya-mint)] rounded-full blur-[120px] opacity-30 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-gitlab-orange)] rounded-full blur-[150px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[var(--color-gitlab-light)] rounded-full blur-[100px] opacity-20" />

      <div className="z-10 text-center max-w-5xl px-6">
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-voya-mint)] via-[var(--color-gitlab-orange)] to-[var(--color-gitlab-light)] drop-shadow-sm mb-6 pb-2">
          Smart Vault
        </h1>
        <p className="text-xl md:text-2xl text-[var(--foreground)] opacity-80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Your intelligent digital receipt archivist. Upload, parse, and track your expenses effortlessly.
        </p>

        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl transition-transform hover:scale-[1.02] duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-left space-y-4">
              <h2 className="text-3xl font-bold text-[var(--foreground)]">Ready to digitize?</h2>
              <p className="text-lg text-[var(--foreground)] opacity-70">
                Drop a PDF receipt and watch as we automatically extract the merchant, total, and date for your records.
              </p>
            </div>
              <div className="flex flex-col gap-4">
                {session ? (
                  <>
                    <Link
                      href="/upload"
                      className="group relative flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[var(--color-gitlab-orange)] to-[#e24329] text-white font-bold rounded-full overflow-hidden shadow-[0_0_15px_rgba(252,109,38,0.4)] transition-all hover:shadow-[0_0_25px_rgba(252,109,38,0.7)]"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Upload Receipt
                      </span>
                    </Link>
                    <Link
                      href="/dashboard"
                      className="px-8 py-4 bg-transparent border-2 border-[var(--color-voya-mint)] text-[var(--foreground)] font-bold rounded-full transition-all hover:bg-[var(--color-voya-mint)] hover:text-white hover:border-transparent shadow-lg text-center"
                    >
                      View Analytics Dashboard
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="text-[var(--foreground)] opacity-60 hover:opacity-100 text-sm font-medium transition-all"
                    >
                      Sign Out ({session.user?.name || session.user?.email})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => signIn('keycloak')}
                    className="px-8 py-4 bg-[var(--color-voya-mint)] text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    Login to Start
                  </button>
                )}
              </div>
          </div>
        </div>
      </div>
    </main>
  );
}
