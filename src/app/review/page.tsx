'use client';

import { useState } from 'react';
import './review.css';

type ViewMode = 'mobile' | 'desktop';

export default function ReviewPage() {
  const [mode, setMode] = useState<ViewMode>('mobile');
  return (
    <main className="review-page">
      <header className="review-toolbar">
        <div>
          <strong>Life OS 레이아웃 리뷰</strong>
          <span>오른쪽 화면에서 깨지는 위치를 확인하고 지시해 주세요.</span>
        </div>
        <div className="review-switch" role="group" aria-label="미리보기 크기">
          <button className={mode === 'mobile' ? 'active' : ''} onClick={() => setMode('mobile')}>
            모바일 뷰 · iPhone 13 Pro
          </button>
          <button className={mode === 'desktop' ? 'active' : ''} onClick={() => setMode('desktop')}>
            웹 뷰 · 데스크톱
          </button>
        </div>
      </header>
      <section className={`review-stage ${mode}`} aria-label={`${mode} 미리보기`}>
        <div className="review-device-label">
          {mode === 'mobile' ? '390 × 844 · iPhone 13 Pro' : '반응형 웹 · 데스크톱'}
        </div>
        <iframe title="Life OS 레이아웃 미리보기" src="/life-os/" />
      </section>
    </main>
  );
}
