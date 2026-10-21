'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          background: '#f6f7f5',
          color: '#293b32',
          fontFamily: 'system-ui, sans-serif',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16,
        }}
      >
        <h2>나의 공간을 불러오지 못했어요</h2>
        <p style={{ color: '#74806e', fontSize: 14, maxWidth: 420, textAlign: 'center' }}>
          잠시 후 다시 시도해 주세요. 저장된 기록은 그대로 보관됩니다.
        </p>
        <button
          onClick={() => reset()}
          style={{
            border: 0,
            borderRadius: 9,
            padding: '12px 22px',
            background: '#386750',
            color: 'white',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
