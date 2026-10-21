'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Command,
  Ellipsis,
  FolderHeart,
  Heart,
  Home,
  Layers3,
  LockKeyhole,
  Menu,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  Target,
  Wallet,
  X,
  NotebookPen,
  Bookmark,
  WifiOff,
} from 'lucide-react';
import { LifeProvider, useLife } from '@/lib/life-os/store';
import { LifeRecord, localDate, PageId, pageTitles, RecordKind } from '@/lib/life-os/types';
import { searchRecords, searchableBody } from '@/lib/life-os/search';
import { storageKey } from '@/lib/life-os/storage';
import { lockScroll } from '@/lib/life-os/scroll-lock';
import { Badge, Button, Field, IconButton, Modal, ModalCloseButton } from './ui';
import { TodayView } from './TodayView';
import { SettingsView } from './SettingsView';
import { HealthView } from './HealthView';
import { DiaryView } from './DiaryView';
import { VaultView } from './VaultView';
import { MemoryView } from './MemoryView';
import { FinanceView } from './FinanceView';
import { LibraryView } from './LibraryView';
import { GalleryView } from './GalleryView';
import { GoalsView } from './GoalsView';

const navigation: {
  id: PageId;
  label: string;
  icon: typeof Home;
  group: string;
  type?: RecordKind;
}[] = [
  { id: 'today', label: '오늘', icon: Home, group: '나의 일상' },
  { id: 'diary', label: '하루 일기', icon: NotebookPen, group: '나의 일상', type: 'diary' },
  { id: 'memory', label: '기억과 메모', icon: Layers3, group: '나의 일상', type: 'memory' },
  { id: 'health', label: '건강과 운동', icon: Heart, group: '나의 일상', type: 'workout' },
  { id: 'finance', label: '가계와 자산', icon: Wallet, group: '나의 일상', type: 'transaction' },
  { id: 'goals', label: '목표와 성장', icon: Target, group: '나의 보관함', type: 'goal' },
  { id: 'library', label: '나중에 읽기', icon: Bookmark, group: '나의 보관함', type: 'bookmark' },
  { id: 'gallery', label: '소중한 순간', icon: FolderHeart, group: '나의 보관함', type: 'photo' },
  { id: 'vault', label: '암호금고', icon: LockKeyhole, group: '나의 보관함', type: 'vault' },
];
const PAGE_KEY = storageKey('page');
const previewBuild = process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW === 'true';
const kindPage: Record<RecordKind, PageId> = {
  task: 'today',
  routine: 'today',
  diary: 'diary',
  memory: 'memory',
  transaction: 'finance',
  asset: 'finance',
  workout: 'health',
  weight: 'health',
  bookmark: 'library',
  photo: 'gallery',
  goal: 'goals',
  vault: 'vault',
};

export function LifeLogo({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 25 : 35}
      height={small ? 25 : 35}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="12" fill="#386750" />
      <path
        d="M20 10V30M10 20H30M13 13L27 27M13 27L27 13"
        stroke="#F7F8ED"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="3.8" fill="#386750" />
      <circle cx="20" cy="20" r="2.1" fill="#F7F8ED" />
    </svg>
  );
}

function Shell() {
  const { records, ready, demo, setDemo, user, syncStatus, syncError, toast, addRecord, notify } =
    useLife();
  function guard(action: () => void) {
    try {
      action();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : '기록을 저장하지 못했어요. 다시 시도해 주세요.',
      );
    }
  }
  const [page, setPage] = useState<PageId>('today');
  const [date, setDate] = useState(localDate());
  const [diaryDate, setDiaryDate] = useState<string>();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState(false);
  const [quickKind, setQuickKind] = useState<'memory' | 'task' | 'bookmark'>('memory');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [quickError, setQuickError] = useState('');
  function guardQuick(action: () => void) {
    try {
      action();
    } catch (error) {
      setQuickError(
        error instanceof Error ? error.message : '기록을 저장하지 못했어요. 다시 시도해 주세요.',
      );
    }
  }
  const contentRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (search || quick || help) setDrawer(false);
  }, [search, quick, help]);
  useEffect(() => {
    let previousToday = localDate();
    const refresh = () => {
      const today = localDate();
      if (today !== previousToday) {
        const previous = previousToday;
        setDate((selected) => (selected === previous ? today : selected));
        previousToday = today;
      }
    };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  function navigate(target: PageId, selectedDate?: string) {
    if (target === 'diary') setDiaryDate(selectedDate);
    setPage(target);
    setDrawer(false);
    setSearch(false);
    try {
      localStorage.setItem(PAGE_KEY, target);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  useEffect(() => {
    try {
      const last = localStorage.getItem(PAGE_KEY) as PageId;
      if (last && Object.hasOwn(pageTitles, last)) setPage(last);
    } catch {}
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockScroll(document.body);
    const buttons = () =>
      Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button,a[href]') || []).filter(
        (element) => element.offsetParent !== null,
      );
    buttons()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(false);
      if (event.key === 'Tab') {
        const list = buttons(),
          first = list[0],
          last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      unlock();
      document.removeEventListener('keydown', keydown);
      if (!document.querySelector('[role="dialog"][aria-modal="true"]') && previous?.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [drawer]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setSearch((s) => !s);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setQuick(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const path =
        process.env.NEXT_PUBLIC_BASE_PATH ||
        (process.env.GITHUB_PAGES === 'true' ? '/life-os' : '');
      navigator.serviceWorker.register(`${path}/sw.js`, { scope: `${path}/` }).catch(() => {});
    }
  }, []);
  const filtered = searchRecords(records, query);
  const CurrentIcon = navigation.find((n) => n.id === page)?.icon || Settings2;
  function sideContents() {
    return (
      <>
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        <button className="brand" onClick={() => navigate('today')} aria-label="Life OS 홈">
          <LifeLogo />
          <span>
            Life OS<small>나를 위한 일상의 공간</small>
          </span>
        </button>
        <button className="workspace-switch" onClick={() => navigate('settings')}>
          <span className="workspace-avatar">{user?.displayName?.slice(0, 1) || '나'}</span>
          <span>
            {user?.displayName ? `${user.displayName}의 공간` : '나의 워크스페이스'}
            <small>{demo ? '미리보기' : user ? '개인 계정' : '개인용 · 로컬'}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button
          className="sidebar-search"
          onClick={() => {
            setQuery('');
            setSearch(true);
          }}
        >
          <Search size={15} />
          <span>무엇을 찾으세요?</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav aria-label="주 메뉴">
          {['나의 일상', '나의 보관함'].map((group) => (
            <div className="nav-group" key={group}>
              <span className="nav-label">{group}</span>
              {navigation
                .filter((n) => n.group === group)
                .map((n) => (
                  <button
                    key={n.id}
                    className={`nav-item ${page === n.id ? 'active' : ''}`}
                    onClick={() => navigate(n.id)}
                    aria-current={page === n.id ? 'page' : undefined}
                  >
                    <n.icon size={18} />
                    <span>{n.label}</span>
                    {n.id === 'today' && <span className="nav-today-dot" />}
                    {n.id === 'library' &&
                      records.filter((r) => r.type === 'bookmark' && !r.data.read).length > 0 && (
                        <span className="nav-count">
                          {records.filter((r) => r.type === 'bookmark' && !r.data.read).length}
                        </span>
                      )}
                    {n.id === 'vault' && <LockKeyhole size={12} className="nav-end-icon" />}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="mini-plant">✳</span>
            <strong>작은 기록, 더 나은 내일.</strong>
            <p>어제보다 조금 더 나다운 삶.</p>
            <button onClick={() => setHelp(true)}>
              Life OS 사용 가이드
              <ArrowUpRight size={12} />
            </button>
          </div>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={18} />
            <span>설정과 데이터</span>
          </button>
          <button className="sync-status" onClick={() => navigate('settings')}>
            <Cloud size={14} />
            <span>{syncStatus}</span>
            <span className={`status-dot ${syncError ? 'warning' : ''}`} />
          </button>
          <button className="sidebar-profile" onClick={() => navigate('settings')}>
            <span className="avatar">{user?.displayName?.slice(0, 1) || '나'}</span>
            <span>
              <strong>{user?.displayName || '나의 Life OS'}</strong>
              <small>{user ? '개인 워크스페이스' : '기록이 쌓이는 나만의 공간'}</small>
            </span>
            <Ellipsis size={17} />
          </button>
        </div>
      </>
    );
  }
  function renderPage() {
    switch (page) {
      case 'today':
        return <TodayView navigate={navigate} date={date} onDate={setDate} />;
      case 'memory':
        return <MemoryView />;
      case 'diary':
        return <DiaryView key={diaryDate || 'all'} initialDate={diaryDate} />;
      case 'health':
        return <HealthView />;
      case 'finance':
        return <FinanceView />;
      case 'library':
        return <LibraryView />;
      case 'gallery':
        return <GalleryView />;
      case 'goals':
        return <GoalsView />;
      case 'vault':
        return <VaultView />;
      case 'settings':
        return <SettingsView />;
    }
  }
  return (
    <div className="life-app">
      <aside className="sidebar">{sideContents()}</aside>
      <div className="app-workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="전체 메뉴 열기"
              onClick={() => setDrawer(true)}
            >
              <Menu size={21} />
            </button>
            <LifeLogo small />
            <span className="breadcrumb-space">나의 공간</span>
            <ChevronRight size={13} />
            <span className="breadcrumb-current">
              <CurrentIcon size={15} />
              {pageTitles[page]}
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-search icon-button"
              aria-label="전체 기록 검색"
              onClick={() => {
                setQuery('');
                setSearch(true);
              }}
            >
              <Search size={18} />
            </button>
            <button className="quick-add" onClick={() => setQuick(true)}>
              <Plus size={17} />
              <span>빠른 기록</span>
              <kbd>⌘ J</kbd>
            </button>
            <button
              className="avatar topbar-avatar"
              onClick={() => navigate('settings')}
              aria-label="계정 설정"
            >
              {user?.displayName?.slice(0, 1) || '나'}
            </button>
          </div>
        </header>
        {previewBuild && (
          <div className="preview-notice" role="note">
            iPhone 미리보기 · 기록은 이 기기에 저장돼요 · 클라우드 연결 없음
          </div>
        )}
        {demo && (
          <div className="demo-bar">
            <span>
              <span className="demo-dot" />
              미리보기{' '}
              <span className="demo-explanation">· 예시 데이터로 Life OS를 둘러보고 있어요</span>
            </span>
            <button
              onClick={() => {
                guard(() => {
                  setDemo(false);
                  navigate('today');
                });
              }}
            >
              내 기록 시작하기
              <ArrowRightSmall />
            </button>
          </div>
        )}
        <main id="main-content" className="main-content" ref={contentRef} tabIndex={-1}>
          {ready ? (
            renderPage()
          ) : (
            <div className="loading-state">
              <LifeLogo />
              <p>나의 공간을 준비하고 있어요.</p>
            </div>
          )}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="모바일 메뉴">
        {navigation
          .filter((n) => ['today', 'diary', 'memory', 'health'].includes(n.id))
          .map((n) => (
            <button
              key={n.id}
              className={page === n.id ? 'active' : ''}
              aria-current={page === n.id ? 'page' : undefined}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={21} />
              <span>
                {n.id === 'health'
                  ? '건강'
                  : n.id === 'diary'
                    ? '일기'
                    : n.id === 'memory'
                      ? '기억'
                      : n.label}
              </span>
            </button>
          ))}
        <button className={drawer ? 'active' : ''} onClick={() => setDrawer(true)}>
          <Menu size={21} />
          <span>전체</span>
        </button>
      </nav>
      {drawer && (
        <div
          className="drawer-backdrop"
          onClick={(e) => {
            if (e.currentTarget === e.target) setDrawer(false);
          }}
        >
          <aside
            ref={drawerRef}
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="전체 메뉴"
          >
            <IconButton label="메뉴 닫기" onClick={() => setDrawer(false)}>
              <X size={20} />
            </IconButton>
            {sideContents()}
          </aside>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {search && ready && (
        <Modal title="내 기록에서 찾기" onClose={() => setSearch(false)} wide>
          <div className="global-search-input">
            <Search size={20} />
            <input
              aria-label="전체 기록 검색어"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="일기, 기억, 목표, 읽을거리를 검색하세요…"
            />
          </div>
          <div className="search-results">
            {!query.trim() ? (
              <div className="search-hint">
                <Command size={22} />
                <p>지금 떠오르는 단어 하나로 찾아보세요.</p>
                <small>잠긴 암호금고의 내용은 검색하지 않습니다.</small>
              </div>
            ) : filtered.length ? (
              filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    if (r.type === 'task') setDate(r.date);
                    navigate(kindPage[r.type], r.type === 'diary' ? r.date : undefined);
                  }}
                >
                  <span className="search-result-icon">
                    <Search size={16} />
                  </span>
                  <span>
                    <strong>{r.title}</strong>
                    <small>
                      {pageTitles[kindPage[r.type]]} · {r.date} · {searchableBody(r).slice(0, 60)}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <div className="search-hint">
                <p>‘{query}’ 기록이 아직 없어요.</p>
                <small>다른 단어로 찾아보세요.</small>
              </div>
            )}
          </div>
        </Modal>
      )}
      {quick && ready && (
        <Modal
          title="떠오른 순간, 빠른 기록"
          onClose={() => {
            setQuick(false);
            setTitle('');
            setBody('');
            setUrl('');
            setQuickError('');
          }}
          dirty={Boolean(title.trim() || body.trim() || url.trim())}
        >
          <form
            className="page-stack"
            onSubmit={(e) => {
              e.preventDefault();
              setQuickError('');
              guardQuick(() => {
                if (!title.trim()) {
                  setQuickError('제목을 한 글자 이상 입력해 주세요.');
                  return;
                }
                let data: LifeRecord['data'] = {};
                if (quickKind === 'task')
                  data = { completed: false, category: '나를 위한 일', time: '' };
                if (quickKind === 'memory') data = { category: 'daily', pinned: false };
                if (quickKind === 'bookmark') {
                  try {
                    const parsed = new URL(url);
                    if (
                      !['https:', 'http:'].includes(parsed.protocol) ||
                      parsed.username ||
                      parsed.password
                    )
                      throw new Error();
                  } catch {
                    setQuickError(
                      '계정 정보가 포함되지 않은 http 또는 https 주소를 입력해 주세요.',
                    );
                    return;
                  }
                  data = { url, tags: [], read: false, favorite: false };
                }
                addRecord({ type: quickKind, title: title.trim(), body, date: localDate(), data });
                setQuick(false);
                setTitle('');
                setBody('');
                setUrl('');
                notify('기록을 저장했어요.');
              });
            }}
          >
            <div className="tabs">
              {(
                [
                  ['memory', '메모'],
                  ['task', '할 일'],
                  ['bookmark', '나중에 읽기'],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  className={`tab ${quickKind === kind ? 'active' : ''}`}
                  onClick={() => setQuickKind(kind)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Field label="제목">
              <input
                className="input"
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  quickKind === 'task'
                    ? '오늘 해내고 싶은 작은 일'
                    : '기억하고 싶은 것을 적어보세요'
                }
              />
            </Field>
            {quickKind === 'bookmark' && (
              <Field label="웹 주소">
                <input
                  className="input"
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                />
              </Field>
            )}
            <Field label="내용 (선택)">
              <textarea
                className="textarea"
                rows={4}
                maxLength={20000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="조금 더 남기고 싶은 이야기"
              />
            </Field>
            {quickError && (
              <p className="form-error" role="alert">
                {quickError}
              </p>
            )}
            <div className="form-actions">
              <ModalCloseButton>취소</ModalCloseButton>
              <Button type="submit">기록 저장하기</Button>
            </div>
          </form>
        </Modal>
      )}
      {help && (
        <Modal title="나를 위한 Life OS" onClose={() => setHelp(false)}>
          <div className="page-stack guide-content">
            <p>흩어진 일상을 한곳에 기록하고, 필요할 때 다시 꺼내보는 나만의 공간입니다.</p>
            <div>
              <strong>오늘</strong>
              <p>가장 중요한 할 일을 정하고, 나를 만드는 루틴을 체크하세요.</p>
            </div>
            <div>
              <strong>기록하기</strong>
              <p>일기·건강·가계·메모에서 일상을 남기세요. 빠른 기록은 언제든 꺼낼 수 있습니다.</p>
            </div>
            <div>
              <strong>다시 꺼내보기</strong>
              <p>
                좋은 자료는 나중에 읽기에, 소중한 사진은 순간 보관함에 모으세요. 전체 검색은 ⌘/Ctrl
                K, 빠른 기록은 ⌘/Ctrl J로 열 수 있습니다.
              </p>
            </div>
            <div>
              <strong>내 기록 지키기</strong>
              <p>
                설정에서 같은 Google 계정을 연결하면 여러 기기를 이어 쓸 수 있어요. 백업 파일도
                정기적으로 보관하세요.
              </p>
            </div>
            <Button onClick={() => setHelp(false)}>나의 하루로</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ArrowRightSmall() {
  return <ArrowUpRight size={13} />;
}
export function LifeOS() {
  return (
    <LifeProvider>
      <WorkspaceShell />
    </LifeProvider>
  );
}

/** Destroy every draft and dialog when the active data owner changes. */
function WorkspaceShell() {
  const { demo, user } = useLife();
  const scope = demo ? 'demo' : user ? `uid:${user.uid}` : 'guest';
  return <Shell key={scope} />;
}
