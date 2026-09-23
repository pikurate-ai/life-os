import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h2 className="text-xl font-bold text-white mb-2">페이지를 찾을 수 없습니다</h2>
      <p className="text-xs text-zinc-400 mb-4">요청하신 페이지가 존재하지 않습니다.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
