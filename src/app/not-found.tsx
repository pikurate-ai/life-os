import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ minHeight: '100dvh' }}>
      <span className="empty-icon" aria-hidden="true">
        ✳
      </span>
      <h2>페이지를 찾을 수 없어요</h2>
      <p>주소를 확인하거나 나의 하루로 돌아가 주세요.</p>
      <Link href="/" className="button button-primary">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
