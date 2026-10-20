'use client';

import { useEffect, useRef, useState } from 'react';
import './review.css';

type ViewMode = 'mobile' | 'desktop';

export default function ReviewPage() {
  const [mode, setMode] = useState<ViewMode>('mobile');
  const [landscape, setLandscape] = useState(false);
  const [shortHeight, setShortHeight] = useState(false);
  const [available, setAvailable] = useState(440);
  const [ready, setReady] = useState(false);
  const stage = useRef<HTMLElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('life-os:layout-review:view');
      if (saved === 'mobile' || saved === 'desktop') setMode(saved);
    } catch {}
    setReady(true);
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('life-os:layout-review:view', mode);
    } catch {}
  }, [mode, ready]);
  const width = mode === 'desktop' ? 1440 : landscape ? 844 : 390;
  const height = mode === 'desktop' ? 900 : shortHeight ? 500 : landscape ? 390 : 844;
  const scale = Math.min(1, Math.max(0.1, available / (width + 16)));
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return (
    <main className="review-page">
      <header className="review-toolbar">
        <div>
          <strong>Life OS 레이아웃 리뷰</strong>
          <span>
            선택한 크기를 유지합니다. iOS Safari의 실제 키보드·날짜 선택기는 아이폰에서 확인해
            주세요.
          </span>
        </div>
        <div className="review-switch" role="group" aria-label="미리보기 크기">
          <button
            aria-pressed={mode === 'mobile'}
            className={mode === 'mobile' ? 'active' : ''}
            onClick={() => setMode('mobile')}
          >
            모바일 뷰 · iPhone 13 Pro
          </button>
          <button
            aria-pressed={mode === 'desktop'}
            className={mode === 'desktop' ? 'active' : ''}
            onClick={() => setMode('desktop')}
          >
            웹 뷰 · 데스크톱
          </button>
        </div>
      </header>
      <div className="review-options">
        <span role="status">
          {width} × {height} · {Math.round(scale * 100)}% 맞춤 표시
        </span>
        {mode === 'mobile' && (
          <>
            <button aria-pressed={landscape} onClick={() => setLandscape(!landscape)}>
              가로 화면
            </button>
            <button aria-pressed={shortHeight} onClick={() => setShortHeight(!shortHeight)}>
              입력 중 높이 모의
            </button>
          </>
        )}
        <a href={`${base}/`} target="_blank" rel="noreferrer">
          실제 앱 열기 ↗
        </a>
      </div>
      <section ref={stage} className={`review-stage ${mode}`} aria-label={`${mode} 미리보기`}>
        <div
          className="review-canvas"
          style={{ width: (width + 16) * scale, height: (height + 16) * scale }}
        >
          <div
            className="review-device"
            style={{ width: width + 16, height: height + 16, transform: `scale(${scale})` }}
          >
            <iframe title="Life OS 레이아웃 미리보기" src={`${base}/`} style={{ width, height }} />
          </div>
        </div>
      </section>
    </main>
  );
}
