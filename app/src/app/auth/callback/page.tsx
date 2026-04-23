'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { processOAuthCallback } from '@/lib/sui/zklogin';
import { useAuthStore } from '@/stores/auth';

/**
 * Google OAuth コールバックページ。
 * URL フラグメント (#id_token=...) から JWT を取得し、
 * zkLogin セッションを確立して /my にリダイレクトする。
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setLoading, setAuthenticated, setError } = useAuthStore();
  const processed = useRef(false); // StrictMode の二重実行を防ぐ

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    async function handleCallback() {
      setLoading();

      const jwt = extractJwtFromHash(window.location.hash);
      if (!jwt) {
        setError('認証情報が見つかりませんでした。もう一度ログインしてください。');
        router.replace('/login');
        return;
      }

      try {
        const session = await processOAuthCallback(jwt);
        setAuthenticated(session);
        router.replace('/my');
      } catch (e) {
        const msg = e instanceof Error ? e.message : '認証処理に失敗しました';
        setError(msg);
        router.replace(`/login?error=${encodeURIComponent(msg)}`);
      }
    }

    handleCallback();
  }, [router, setAuthenticated, setError, setLoading]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div
        aria-hidden="true"
        className="h-12 w-12 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500"
      />
      <p className="text-sm text-muted-foreground">金庫を開いています...</p>
    </main>
  );
}

/**
 * URL ハッシュから id_token を抽出する。
 * Google OAuth implicit flow は "#id_token=...&state=..." 形式で返す。
 */
function extractJwtFromHash(hash: string): string | null {
  if (!hash || hash.length <= 1) return null;
  const params = new URLSearchParams(hash.slice(1)); // '#' を除去
  return params.get('id_token');
}
