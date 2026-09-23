"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#090a0f] text-white flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
        <p className="text-xs text-zinc-400 mb-4">{error.message || "알 수 없는 오류"}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
