'use client';

import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Cloud,
  Database,
  Download,
  FileJson,
  Fingerprint,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Upload,
  Check,
  AlertCircle,
  HardDrive,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { Badge, Button, Modal, ModalCloseButton, SectionHeader } from './ui';
import type { BackupImportPreview } from '@/lib/life-os/backup';

const previewBuild = process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW === 'true';

export function SettingsView() {
  const {
    user,
    configured,
    syncStatus,
    syncError,
    demo,
    setDemo,
    signIn,
    signOut,
    exportBackup,
    importBackup,
    previewBackup,
    discardBackupPreview,
    importLegacy,
    migrationReport,
    notify,
    records,
  } = useLife();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupImportPreview | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [inspectionAttempt, setInspectionAttempt] = useState(0);
  const [confirmLegacy, setConfirmLegacy] = useState(false);
  const [install, setInstall] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setBackupPreview(null);
    setBackupError('');
    if (!file) {
      setInspecting(false);
      discardBackupPreview();
      return;
    }
    setInspecting(true);
    previewBackup(file)
      .then((result) => {
        if (!cancelled) setBackupPreview(result);
      })
      .catch((reason) => {
        if (!cancelled)
          setBackupError(reason instanceof Error ? reason.message : '파일을 확인하지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setInspecting(false);
      });
    return () => {
      cancelled = true;
      discardBackupPreview();
    };
  }, [file, previewBackup, discardBackupPreview, inspectionAttempt]);
  useEffect(() => {
    setFile(null);
    setBackupPreview(null);
    setConfirmLegacy(false);
    setBackupError('');
    discardBackupPreview();
  }, [demo, user?.uid, discardBackupPreview]);
  const closeBackup = () => {
    if (!pending) {
      discardBackupPreview();
      setFile(null);
      setBackupPreview(null);
      setBackupError('');
    }
  };
  async function action(fn: () => Promise<unknown>) {
    setPending(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '작업을 완료하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="A SPACE THAT IS YOURS"
        title="설정과 데이터"
        description="내 기록의 저장 위치와 계정을 한눈에 확인하세요."
      />
      {(error || syncError) && (
        <div className="feedback-error" role="alert">
          <AlertCircle size={18} />
          {error || syncError}
        </div>
      )}
      <section className="card settings-section">
        <div className="settings-section-title">
          <span className="settings-icon">
            <Fingerprint size={21} />
          </span>
          <div>
            <h2>내 계정</h2>
            <p>
              {previewBuild
                ? '테스트 기록은 현재 기기에 보관됩니다.'
                : '같은 계정으로 로그인하면 기기가 달라도 같은 기록을 봅니다.'}
            </p>
          </div>
        </div>
        <div className="account-card">
          <span className="avatar large">{user?.displayName?.slice(0, 1) || '나'}</span>
          <div>
            <strong>
              {user?.displayName || (demo ? 'Life OS 둘러보기' : '나의 로컬 워크스페이스')}
            </strong>
            <p>
              {user?.email ||
                (demo
                  ? '예시 데이터로 기능을 살펴보고 있어요.'
                  : '이 브라우저에 기록을 저장하고 있어요.')}
            </p>
          </div>
          <Badge tone={user ? 'green' : 'neutral'}>
            {user ? 'Google 계정' : demo ? '미리보기' : '로컬 모드'}
          </Badge>
        </div>
        <div className="settings-actions">
          {!previewBuild &&
            (user ? (
              <Button variant="secondary" disabled={pending} onClick={() => action(signOut)}>
                <LogOut size={16} />
                로그아웃
              </Button>
            ) : (
              <Button disabled={pending || !configured} onClick={() => action(signIn)}>
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.8 4.8 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Zm-5.7-8.2a6 6 0 0 1 0-3.6V7.5H2.9a10 10 0 0 0 0 9l3.4-2.7ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9.1 5.5l3.4 2.7C7.1 7.8 9.4 6 12 6Z"
                  />
                </svg>
                {pending ? '연결 중…' : 'Google로 로그인'}
              </Button>
            ))}
          {demo && (
            <Button variant="secondary" onClick={() => setDemo(false)}>
              내 기록 시작하기
            </Button>
          )}
          {!demo && !user && (
            <Button variant="ghost" onClick={() => setDemo(true)}>
              예시 화면 보기
            </Button>
          )}
        </div>
        {previewBuild && (
          <div className="setting-note">
            테스트 기록은 이 브라우저에만 저장돼요. 중요한 기록은 백업 파일로 보관하고, 다른
            기기에서 이어 쓰려면 해당 파일을 가져와 주세요.
          </div>
        )}
        {!previewBuild && !configured && (
          <div className="setting-note">
            현재 클라우드 연결을 사용할 수 없어요. 이 기기에서 기록하고 백업할 수 있어요.
          </div>
        )}
        {!previewBuild && !user && configured && (
          <div className="setting-note">
            로그인하면 계정 전용 공간이 열립니다. 이 기기의 기존 기록을 옮기려면 먼저 백업한 뒤,
            로그인 후 가져오기를 진행하세요.
          </div>
        )}
      </section>
      <section className="card settings-section">
        <div className="settings-section-title">
          <span className="settings-icon">
            <Cloud size={21} />
          </span>
          <div>
            <h2>저장과 동기화</h2>
            <p>접속 상태와 실제 저장 위치를 알려드려요.</p>
          </div>
        </div>
        <div className="sync-info-grid">
          <div>
            <span className="muted text-small">현재 상태</span>
            <strong>
              <span className={`status-dot ${syncError ? 'warning' : ''}`} />
              {syncStatus}
            </strong>
          </div>
          <div>
            <span className="muted text-small">기록 보관 장소</span>
            <strong>
              {demo ? '예시 전용 공간' : user ? '이 기기 + 내 계정 클라우드' : '이 기기의 브라우저'}
            </strong>
          </div>
          <div>
            <span className="muted text-small">저장된 기록</span>
            <strong>{records.length.toLocaleString()}개</strong>
          </div>
        </div>
        <div className="setting-note">
          <MonitorSmartphone size={17} />
          {previewBuild
            ? '이 테스트 버전은 PC와 아이폰 간 자동 동기화를 제공하지 않아요. 다른 기기로 옮길 때는 백업 파일을 사용해 주세요.'
            : 'PC와 모바일에서 같은 Google 계정으로 로그인해 주세요. 네트워크가 끊기면 기록은 기기에 보관되고, 연결이 돌아오면 다시 전송됩니다.'}
        </div>
      </section>
      <section className="card settings-section">
        <div className="settings-section-title">
          <span className="settings-icon">
            <Database size={21} />
          </span>
          <div>
            <h2>내 데이터는 내가 보관</h2>
            <p>정기적으로 백업하면 브라우저를 바꾸어도 안심할 수 있어요.</p>
          </div>
        </div>
        <div className="backup-options">
          <div>
            <FileJson size={23} />
            <div>
              <h3>전체 기록 백업</h3>
              <p>일기·운동·메모·사진·암호화된 금고를 JSON 파일로 저장합니다.</p>
            </div>
            <Button variant="secondary" onClick={exportBackup}>
              <Download size={16} />
              내보내기
            </Button>
          </div>
          <div>
            <Upload size={23} />
            <div>
              <h3>백업 파일 가져오기</h3>
              <p>기존 기록과 병합합니다. 파일 형식과 데이터 구조를 확인합니다.</p>
            </div>
            <label className="button button-secondary file-button">
              <Upload size={16} />
              가져오기
              <input
                type="file"
                accept="application/json,.json"
                disabled={pending}
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div>
            <HardDrive size={23} />
            <div>
              <h3>이전 Life OS 기록 이전</h3>
              <p>현재 브라우저에 남아 있는 이전 버전 기록을 복사합니다. 원본은 보존합니다.</p>
            </div>
            <Button variant="secondary" disabled={pending} onClick={() => setConfirmLegacy(true)}>
              이전 기록 찾기
            </Button>
          </div>
        </div>
        <p className="setting-note">
          백업에는 일반 기록의 원문이 포함됩니다. 암호금고 내용은 암호화된 상태로 보관됩니다.
        </p>
      </section>
      {migrationReport.length > 0 && (
        <section className="card settings-section" aria-label="이전 기록 가져오기 결과">
          <h2>이전 기록 가져오기 결과</h2>
          <p className="setting-note">원본은 그대로 보존했습니다. 아래 내용을 확인해 주세요.</p>
          <ul className="migration-report">
            {migrationReport.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="card settings-section">
        <div className="settings-section-title">
          <span className="settings-icon">
            <Smartphone size={21} />
          </span>
          <div>
            <h2>앱처럼 가볍게</h2>
            <p>홈 화면에 추가하고 더 빠르게 기록을 시작하세요.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setInstall(true)}>
          홈 화면에 설치하는 방법
          <ArrowUpRight size={16} />
        </Button>
      </section>
      <div className="settings-footer">
        <span>
          <ShieldCheck size={16} />
          나의 속도, 나의 기록, 나의 공간.
        </span>
        <span>Life OS · 2.0</span>
      </div>
      {file && (
        <Modal title="백업 가져오기 확인" onClose={closeBackup}>
          <div className="page-stack">
            <p>
              <strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)
            </p>
            {inspecting && (
              <p role="status">파일을 읽고 기록을 검증하고 있어요. 아직 저장하지 않았습니다.</p>
            )}
            {backupError && (
              <div className="page-stack">
                <p className="feedback-error" role="alert">
                  {backupError}
                </p>
                <Button
                  variant="secondary"
                  disabled={pending || inspecting}
                  onClick={() => setInspectionAttempt((value) => value + 1)}
                >
                  미리보기 다시 확인
                </Button>
              </div>
            )}
            {backupPreview && (
              <>
                <div className="setting-note">
                  <strong>가져올 대상</strong>
                  <p>{backupPreview.targetLabel}</p>
                  {backupPreview.targetKind === 'demo' && (
                    <p>
                      현재 예시 공간입니다. 실제 기록을 보관하려면 취소 후 ‘내 기록 시작하기’로
                      전환해 주세요.
                    </p>
                  )}
                </div>
                <dl className="sync-info-grid">
                  <div>
                    <dt className="muted text-small">파일 출처</dt>
                    <dd style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
                      <strong>
                        {backupPreview.source === 'v1'
                          ? '이전 Life OS v1 전체 백업'
                          : 'Life OS v2 전체 백업'}
                      </strong>
                      <p>
                        {backupPreview.sourceWorkspace === 'demo'
                          ? '예시 데이터 백업'
                          : backupPreview.sourceWorkspace === 'guest'
                            ? '비로그인 기기 백업'
                            : backupPreview.sourceWorkspace === 'account'
                              ? '계정 기록 백업'
                              : '이전 형식 · 계정 정보 미포함'}
                      </p>
                    </dd>
                  </div>
                  <div>
                    <dt className="muted text-small">검증된 기록</dt>
                    <dd style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
                      <strong>{backupPreview.total.toLocaleString()}개</strong>
                      <p>
                        일반 {backupPreview.active.toLocaleString()}개 · 삭제 이력{' '}
                        {backupPreview.deleted.toLocaleString()}개
                      </p>
                    </dd>
                  </div>
                  <div>
                    <dt className="muted text-small">건너뛰기·중복</dt>
                    <dd style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
                      <strong>지원 불가 {backupPreview.skipped.toLocaleString()}개</strong>
                      <p>중복·이미 보관 {backupPreview.duplicates.toLocaleString()}개</p>
                    </dd>
                  </div>
                </dl>
                {backupPreview.conflicts > 0 && (
                  <p className="setting-note">
                    원본과 다른 이전 변경분 {backupPreview.conflicts}개를 검토 사본으로 보관합니다.
                    가계·자산·운동 집계에는 자동 반영하지 않습니다.
                  </p>
                )}
                {backupPreview.warnings.length > 0 && (
                  <ul className="migration-report">
                    {backupPreview.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
                <p className="muted">
                  {backupPreview.source === 'v2'
                    ? '동일한 ID는 최신 기록을 유지하고 삭제 이력도 적용합니다. '
                    : '이전 원본과 현재 기록을 삭제하지 않고 보존합니다. '}
                  원본 파일은 변경하지 않습니다. 대상 공간과 건너뛸 항목을 확인한 뒤 저장해 주세요.
                </p>
              </>
            )}
            <div className="form-actions">
              <ModalCloseButton disabled={pending}>취소</ModalCloseButton>
              <Button
                disabled={pending || inspecting || !backupPreview}
                onClick={() =>
                  action(async () => {
                    try {
                      await importBackup(file, backupPreview?.token);
                    } catch (reason) {
                      setBackupError(
                        reason instanceof Error
                          ? reason.message
                          : '가져오기를 완료하지 못했습니다. 파일을 다시 선택해 주세요.',
                      );
                      throw reason;
                    }
                    setFile(null);
                    setBackupPreview(null);
                  })
                }
              >
                {pending ? '저장 중…' : '대상 확인 · 가져오기'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {confirmLegacy && (
        <Modal title="이전 버전 기록 가져오기" onClose={() => setConfirmLegacy(false)}>
          <div className="page-stack">
            <p>
              이 브라우저의 이전 Life OS 데이터를 현재 공간으로 복사합니다. 다른 컴퓨터의 데이터는
              그 컴퓨터에서 먼저 백업해야 합니다.
            </p>
            <p className="muted">
              이전 금고의 잠금 방식은 별도로 확인이 필요합니다. 가져온 뒤 기록 수와 내용을 확인해
              주세요.
            </p>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setConfirmLegacy(false)}>
                취소
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  action(async () => {
                    const count = await importLegacy();
                    setConfirmLegacy(false);
                    notify(`${count}개의 이전 기록을 확인했어요.`);
                  })
                }
              >
                기록 찾아서 복사
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {install && (
        <Modal title="Life OS를 홈 화면에 추가" onClose={() => setInstall(false)}>
          <div className="page-stack">
            <div className="install-step">
              <span>1</span>
              <div>
                <h3>iPhone · iPad</h3>
                <p>Safari로 접속 → 공유 버튼 → ‘홈 화면에 추가’ → 추가</p>
              </div>
            </div>
            <div className="install-step">
              <span>2</span>
              <div>
                <h3>Android · 데스크톱</h3>
                <p>
                  Chrome 또는 Edge에서 주소창의 설치 아이콘이나 브라우저 메뉴의 ‘앱 설치’를 선택해
                  주세요.
                </p>
              </div>
            </div>
            <p className="setting-note">
              앱스토어 앱과는 별도로 설치되는 웹 앱입니다. 기기를 연결하려면 같은 계정으로 로그인해
              주세요.
            </p>
            <Button onClick={() => setInstall(false)}>확인했어요</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
