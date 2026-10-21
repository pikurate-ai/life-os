'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import type { LifeRecord, NewRecord } from './types';
import {
  BACKUP_LIMIT,
  MAX_RECORDS,
  createRecord,
  emptyWorkspace,
  makeBackup,
  mergeRecords,
  mergeWorkspaces,
  nextTimestamp,
  parseWorkspace,
  recordFingerprint,
  recordVersion,
  validateRecord,
  workspaceKey,
  type WorkspaceEnvelope,
} from './records';
import { demoRecords } from './demo';
import { firebaseConfigured, getLifeFirebase, type FirebaseServices } from './firebase';
import { readLegacy } from './legacy';
import { storageKey } from './storage';
import {
  BackupImportSession,
  backupTargetVersion,
  inspectBackupText,
  preserveLegacyImport,
  type BackupImportPreview,
} from './backup';

interface LifeUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
interface LifeContextValue {
  records: LifeRecord[];
  allRecords: LifeRecord[];
  ready: boolean;
  demo: boolean;
  setDemo: (demo: boolean) => void;
  addRecord: (input: NewRecord) => string;
  updateRecord: (id: string, patch: Partial<NewRecord>) => void;
  deleteRecord: (id: string) => void;
  notify: (message: string) => void;
  toast: string;
  user: LifeUser | null;
  syncStatus: string;
  syncError: string | null;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  exportBackup: () => void;
  previewBackup: (file: File) => Promise<BackupImportPreview>;
  discardBackupPreview: () => void;
  importBackup: (file: File, confirmationToken?: string) => Promise<void>;
  importLegacy: () => Promise<number>;
  migrationReport: string[];
}

const MODE_KEY = storageKey('mode');
const LifeContext = createContext<LifeContextValue | null>(null);
function errorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code.includes('popup-closed') || code.includes('cancelled-popup'))
    return '로그인이 취소되었습니다.';
  if (code.includes('popup-blocked'))
    return '로그인 창이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.';
  if (code.includes('unauthorized-domain'))
    return '이 도메인이 Firebase 로그인 허용 목록에 없습니다. 관리자 설정이 필요합니다.';
  if (code.includes('permission-denied'))
    return '클라우드 접근이 거부되었습니다. 로그인 계정과 Firestore 보안 규칙을 확인해 주세요.';
  if (code.includes('unavailable') || code.includes('network'))
    return '네트워크에 연결할 수 없습니다. 기기의 변경 사항을 보관하고 다시 시도합니다.';
  if (code.includes('resource-exhausted'))
    return '클라우드 사용 한도에 도달했습니다. 변경 사항은 기기에 보관됩니다.';
  if (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'SecurityError')
  )
    return '기기 저장 공간을 사용할 수 없습니다. 백업 후 공간 또는 브라우저 설정을 확인해 주세요.';
  return error instanceof Error ? error.message : '처리하지 못했습니다. 다시 시도해 주세요.';
}

export function LifeProvider({ children }: { children: ReactNode }) {
  const [demo, setDemoState] = useState(true);
  const [booted, setBooted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<LifeUser | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceEnvelope | null>(null);
  const [toast, setToast] = useState('');
  const [syncStatus, setSyncStatus] = useState('불러오는 중');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [migrationReport, setMigrationReport] = useState<string[]>([]);
  const services = useRef<FirebaseServices | null>(null);
  const active = useRef<WorkspaceEnvelope | null>(null);
  const blocked = useRef(false);
  const storageError = useRef<string | null>(null);
  const cloudError = useRef<string | null>(null);
  const authError = useRef<string | null>(null);
  const verifiedCloud = useRef(false);
  const flush = useRef<() => void>(() => {});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupSession = useRef(new BackupImportSession());
  const scope = demo ? 'demo' : user ? `uid:${user.uid}` : 'guest';
  const expectedScope = useRef(scope);
  expectedScope.current = scope;
  const ready = booted && (demo || authReady) && workspace?.scope === scope;

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5500);
  }, []);
  const refreshStatus = useCallback(() => {
    const current = active.current;
    if (!current || current.scope !== expectedScope.current) return;
    setSyncError(storageError.current ?? authError.current ?? cloudError.current);
    if (storageError.current) setSyncStatus('기기 저장 오류');
    else if (current.scope === 'demo') setSyncStatus('체험 데이터');
    else if (current.scope === 'guest') setSyncStatus('이 기기에 저장');
    else if (!navigator.onLine) setSyncStatus('오프라인 · 기기에 저장');
    else if (cloudError.current) setSyncStatus('동기화 확인 필요');
    else if (current.pending.length) setSyncStatus(`동기화 대기 ${current.pending.length}건`);
    else if (!verifiedCloud.current) setSyncStatus('클라우드 확인 중');
    else setSyncStatus('동기화 완료');
  }, []);

  /** Storage must succeed before the UI promises a save. Never overwrite corrupt cache. */
  const commit = useCallback(
    (candidate: WorkspaceEnvelope, ack?: { id: string; fingerprint: string }) => {
      if (candidate.scope !== expectedScope.current || active.current?.scope !== candidate.scope)
        throw new Error('계정이 변경되었습니다. 현재 작업 공간에서 다시 시도해 주세요.');
      if (blocked.current)
        throw new Error(
          '기기 저장 데이터를 안전하게 읽을 수 없어 덮어쓰기를 중단했습니다. 백업과 브라우저 저장 공간을 확인해 주세요.',
        );
      try {
        const raw = localStorage.getItem(workspaceKey(candidate.scope));
        let next = mergeWorkspaces(active.current, candidate);
        if (raw) next = mergeWorkspaces(next, parseWorkspace(raw, candidate.scope));
        if (next.records.length > MAX_RECORDS)
          throw new Error('작업 공간당 최대 10,000개의 기록을 저장할 수 있습니다.');
        if (
          ack &&
          next.records.some(
            (record) => record.id === ack.id && recordFingerprint(record) === ack.fingerprint,
          )
        ) {
          const record = next.records.find((record) => record.id === ack.id)!;
          next = {
            ...next,
            pending: next.pending.filter((id) => id !== ack.id),
            acknowledged: { ...next.acknowledged, [ack.id]: recordVersion(record) },
          };
        }
        const serialized = JSON.stringify(next);
        if (raw !== serialized) localStorage.setItem(workspaceKey(next.scope), serialized);
        active.current = next;
        storageError.current = null;
        setWorkspace(next);
        refreshStatus();
        return next;
      } catch (error) {
        storageError.current = errorMessage(error);
        refreshStatus();
        throw error;
      }
    },
    [refreshStatus],
  );

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      setDemoState(localStorage.getItem(MODE_KEY) !== 'personal');
    } catch {
      authError.current = '브라우저 저장 공간이 차단되어 있습니다. 저장 설정을 확인해 주세요.';
    }
    setBooted(true);
    try {
      const firebase = getLifeFirebase();
      services.current = firebase;
      if (!firebase) {
        setAuthReady(true);
        return;
      }
      unsubscribe = onAuthStateChanged(
        firebase.auth,
        (current) => {
          setUser(
            current
              ? { uid: current.uid, email: current.email, displayName: current.displayName }
              : null,
          );
          setAuthReady(true);
        },
        (error) => {
          authError.current = errorMessage(error);
          setAuthReady(true);
          refreshStatus();
        },
      );
    } catch (error) {
      authError.current = errorMessage(error);
      setAuthReady(true);
      refreshStatus();
    }
    return () => {
      unsubscribe();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [refreshStatus]);

  useEffect(() => {
    if (!booted || (!demo && !authReady)) return;
    // Clear old references synchronously before loading a new account's cache.
    active.current = null;
    verifiedCloud.current = false;
    cloudError.current = null;
    setMigrationReport([]);
    backupSession.current.discard();
    storageError.current = null;
    blocked.current = false;
    let next = emptyWorkspace(scope);
    try {
      const raw = localStorage.getItem(workspaceKey(scope));
      next = raw
        ? parseWorkspace(raw, scope)
        : { ...next, records: scope === 'demo' ? demoRecords() : [] };
      if (!raw) localStorage.setItem(workspaceKey(scope), JSON.stringify(next));
    } catch (error) {
      blocked.current = true;
      storageError.current = errorMessage(error);
      notify('저장 공간을 읽지 못했습니다. 기존 데이터는 덮어쓰지 않았습니다.');
    }
    active.current = next;
    setWorkspace(next);
    refreshStatus();
  }, [authReady, booted, demo, notify, refreshStatus, scope]);

  useEffect(() => {
    if (!booted) return;
    const changed = (event: StorageEvent) => {
      const current = active.current;
      if (
        !current ||
        event.key !== workspaceKey(current.scope) ||
        !event.newValue ||
        current.scope !== expectedScope.current
      )
        return;
      try {
        commit(mergeWorkspaces(current, parseWorkspace(event.newValue, current.scope)));
        flush.current();
      } catch (error) {
        notify(errorMessage(error));
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [booted, commit, notify]);

  useEffect(() => {
    const firebase = services.current;
    if (
      !booted ||
      !authReady ||
      demo ||
      !user ||
      !firebase ||
      active.current?.scope !== scope ||
      blocked.current
    )
      return;
    let cancelled = false;
    let running = false;
    let lastRetry = 0;
    let listenerFailed = false;
    let listenerRetryAt = 0;
    let unsubscribe = () => {};
    const uid = user.uid;
    const thisScope = scope;
    const valid = () =>
      !cancelled &&
      expectedScope.current === thisScope &&
      active.current?.scope === thisScope &&
      firebase.auth.currentUser?.uid === uid;
    const send = async () => {
      if (running || !valid() || !navigator.onLine) {
        refreshStatus();
        return;
      }
      running = true;
      try {
        while (valid() && navigator.onLine) {
          const pending = active.current!.pending;
          if (!pending.length) break;
          const id = pending[0];
          const record = active.current!.records.find((item) => item.id === id);
          if (!record) break;
          const target = doc(firebase.db, 'users', uid, 'records', id);
          const winner = await runTransaction(firebase.db, async (transaction) => {
            const snapshot = await transaction.get(target);
            const remote = snapshot.exists() ? validateRecord(snapshot.data()) : null;
            if (remote && remote.id !== id)
              throw new Error('클라우드 기록 ID가 일치하지 않습니다.');
            const merged = remote ? mergeRecords([record], [remote])[0] : record;
            if (!remote || recordFingerprint(merged) !== recordFingerprint(remote))
              transaction.set(target, merged);
            return merged;
          });
          if (!valid()) break;
          // Remove a queued write only when the exact winning version was acknowledged.
          commit(
            { ...active.current!, records: [winner] },
            { id, fingerprint: recordFingerprint(winner) },
          );
          cloudError.current = null;
          lastRetry = 0;
        }
      } catch (error) {
        if (valid()) {
          cloudError.current = errorMessage(error);
          lastRetry = Date.now();
        }
      } finally {
        running = false;
        if (valid()) refreshStatus();
      }
    };
    const schedule = () => {
      if (listenerFailed && navigator.onLine && Date.now() - listenerRetryAt >= 15_000) watch();
      if (!lastRetry || Date.now() - lastRetry >= 12_000) void send();
    };
    flush.current = schedule;
    const watch = () => {
      unsubscribe();
      listenerFailed = false;
      unsubscribe = onSnapshot(
        collection(firebase.db, 'users', uid, 'records'),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!valid()) return;
          try {
            const incoming = snapshot.docs.map((snapshotDoc) => {
              const record = validateRecord(snapshotDoc.data());
              if (record.id !== snapshotDoc.id)
                throw new Error('클라우드 기록 ID가 일치하지 않습니다.');
              return record;
            });
            commit({ ...active.current!, records: incoming });
            verifiedCloud.current = !snapshot.metadata.fromCache;
            if (verifiedCloud.current) cloudError.current = null;
            refreshStatus();
            schedule();
          } catch (error) {
            cloudError.current = errorMessage(error);
            verifiedCloud.current = false;
            refreshStatus();
          }
        },
        (error) => {
          if (!valid()) return;
          listenerFailed = true;
          listenerRetryAt = Date.now();
          cloudError.current = errorMessage(error);
          verifiedCloud.current = false;
          refreshStatus();
        },
      );
    };
    watch();
    const online = () => {
      lastRetry = 0;
      listenerRetryAt = 0;
      refreshStatus();
      schedule();
    };
    const offline = () => {
      verifiedCloud.current = false;
      refreshStatus();
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    const retry = setInterval(schedule, 15_000);
    schedule();
    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(retry);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      if (flush.current === schedule) flush.current = () => {};
    };
  }, [authReady, booted, commit, demo, refreshStatus, scope, user]);

  const requireWorkspace = useCallback(() => {
    const current = active.current;
    if (!current || current.scope !== expectedScope.current)
      throw new Error('데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    if (blocked.current)
      throw new Error(storageError.current ?? '기기 저장 공간을 사용할 수 없습니다.');
    return current;
  }, []);
  const setDemo = useCallback(
    (value: boolean) => {
      try {
        localStorage.setItem(MODE_KEY, value ? 'demo' : 'personal');
        setDemoState(value);
      } catch (error) {
        notify(errorMessage(error));
        throw error;
      }
    },
    [notify],
  );
  const addRecord = useCallback(
    (input: NewRecord) => {
      const current = requireWorkspace();
      const id = crypto.randomUUID();
      const record = createRecord(input, id, nextTimestamp(current.records));
      commit({ ...current, records: [record], pending: [...current.pending, id] });
      flush.current();
      return id;
    },
    [commit, requireWorkspace],
  );
  const updateRecord = useCallback(
    (id: string, patch: Partial<NewRecord>) => {
      const current = requireWorkspace();
      const existing = current.records.find((record) => record.id === id && !record.deletedAt);
      if (!existing) throw new Error('기록을 찾을 수 없습니다.');
      if (patch.type && patch.type !== existing.type)
        throw new Error('기록의 종류는 변경할 수 없습니다. 새 기록으로 추가해 주세요.');
      const record = validateRecord({
        ...existing,
        ...patch,
        id,
        updatedAt: nextTimestamp(current.records),
      });
      commit({ ...current, records: [record], pending: [...current.pending, id] });
      flush.current();
    },
    [commit, requireWorkspace],
  );
  const deleteRecord = useCallback(
    (id: string) => {
      const current = requireWorkspace();
      const existing = current.records.find((record) => record.id === id && !record.deletedAt);
      if (!existing) return;
      const updatedAt = nextTimestamp(current.records);
      const record: LifeRecord = {
        ...existing,
        title: '',
        body: '',
        data: {},
        deletedAt: updatedAt,
        updatedAt,
      };
      commit({ ...current, records: [record], pending: [...current.pending, id] });
      flush.current();
    },
    [commit, requireWorkspace],
  );

  const signIn = useCallback(async () => {
    try {
      const firebase = services.current;
      if (!firebase)
        throw new Error(
          'Google 로그인을 사용하려면 Firebase 환경 변수와 인증 도메인을 먼저 설정해 주세요.',
        );
      await setPersistence(firebase.auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const mobile =
        typeof navigator !== 'undefined' &&
        (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
      if (mobile) {
        await signInWithRedirect(firebase.auth, provider);
        return;
      }
      try {
        await signInWithPopup(firebase.auth, provider);
      } catch (error) {
        const code = String((error as { code?: string })?.code || '');
        if (code.includes('popup-blocked') || code.includes('operation-not-supported')) {
          await signInWithRedirect(firebase.auth, provider);
          return;
        }
        throw error;
      }
      authError.current = null;
      setDemo(false);
      notify('로그인했습니다. 이 계정의 기록을 불러옵니다.');
    } catch (error) {
      authError.current = errorMessage(error);
      refreshStatus();
      notify(errorMessage(error));
      throw error;
    }
  }, [notify, refreshStatus, setDemo]);
  const signOut = useCallback(async () => {
    try {
      if (services.current) await firebaseSignOut(services.current.auth);
      setUser(null);
      setDemo(false);
      authError.current = null;
      notify('로그아웃했습니다. 계정 기록은 개인 작업 공간에 보관됩니다.');
    } catch (error) {
      notify(errorMessage(error));
      throw error;
    }
  }, [notify, setDemo]);
  const exportBackup = useCallback(() => {
    const current = requireWorkspace();
    const blob = new Blob([JSON.stringify(makeBackup(current.records, current.scope), null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `life-os-${current.scope === 'demo' ? 'demo-' : ''}${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('백업을 내보냈습니다. 일기·금융 정보가 포함되므로 안전한 곳에 보관해 주세요.');
  }, [notify, requireWorkspace]);
  const discardBackupPreview = useCallback(() => {
    backupSession.current.discard();
  }, []);
  const previewBackup = useCallback(
    async (file: File) => {
      const startingScope = requireWorkspace().scope;
      const request = backupSession.current.begin();
      if (file.size > BACKUP_LIMIT) throw new Error('백업 파일은 25MB 이하여야 합니다.');
      const candidate = await inspectBackupText(await file.text());
      const current = requireWorkspace();
      if (current.scope !== startingScope)
        throw new Error('가져오는 동안 계정이 바뀌었습니다. 다시 시도해 주세요.');
      const legacyPlan =
        candidate.source === 'v1' ? preserveLegacyImport(current.records, candidate.records) : null;
      const currentIds = new Map(current.records.map((record) => [record.id, record]));
      const duplicates = legacyPlan
        ? legacyPlan.unchanged + legacyPlan.deletedSkipped
        : candidate.records.filter(
            (record) =>
              currentIds.has(record.id) &&
              recordFingerprint(currentIds.get(record.id)!) === recordFingerprint(record),
          ).length;
      const kind =
        current.scope === 'demo' ? 'demo' : current.scope === 'guest' ? 'guest' : 'account';
      const preview = backupSession.current.stage(
        request,
        {
          scope: current.scope,
          file,
          candidate,
          targetVersion: backupTargetVersion(current.records),
        },
        {
          source: candidate.source,
          sourceWorkspace: candidate.sourceWorkspace,
          total: candidate.records.length,
          active: candidate.records.filter((record) => !record.deletedAt).length,
          deleted: candidate.records.filter((record) => record.deletedAt).length,
          skipped: candidate.skipped,
          duplicates: candidate.duplicates + duplicates,
          conflicts: legacyPlan?.conflicts ?? 0,
          targetKind: kind,
          targetLabel:
            kind === 'demo'
              ? '예시 전용 공간 · 실제 개인 기록 공간이 아닙니다'
              : kind === 'guest'
                ? '현재 기기의 브라우저 · 로그인되지 않은 개인 공간'
                : `${user?.email || user?.displayName || '현재 Google 계정'} · 계정 전용 공간`,
          warnings: [
            ...candidate.warnings,
            ...(legacyPlan?.conflicts
              ? [
                  '기존 ID의 변경분은 원본을 덮어쓰지 않고 기억 탭에 검토 사본으로 보존합니다. 금액·운동 집계에는 자동 반영하지 않습니다. 암호금고 변경분은 암호문 사본으로 보관합니다.',
                ]
              : []),
            ...(legacyPlan?.deletedSkipped
              ? ['현재 공간에서 삭제한 기록은 이전 원본을 다시 가져와도 복원하지 않습니다.']
              : []),
          ],
        },
      );
      return preview;
    },
    [requireWorkspace, user],
  );
  const importBackup = useCallback(
    async (file: File, confirmationToken?: string) => {
      const current = requireWorkspace();
      const prepared = backupSession.current.confirm(
        confirmationToken,
        file,
        current.scope,
        backupTargetVersion(current.records),
      );
      const backup = prepared.candidate;
      const existingTypes = new Map(current.records.map((record) => [record.id, record.type]));
      if (
        backup.records.some(
          (record) => existingTypes.has(record.id) && existingTypes.get(record.id) !== record.type,
        )
      ) {
        throw new Error(
          '같은 ID에 다른 종류의 기록이 있습니다. 올바른 작업 공간의 백업인지 확인해 주세요.',
        );
      }
      const plan =
        backup.source === 'v1' ? preserveLegacyImport(current.records, backup.records) : null;
      const merged = mergeRecords(current.records, plan ? plan.additions : backup.records);
      const before = new Map(
        current.records.map((record) => [record.id, recordFingerprint(record)]),
      );
      const changed = merged
        .filter((record) => before.get(record.id) !== recordFingerprint(record))
        .map((record) => record.id);
      commit({ ...current, records: merged, pending: [...current.pending, ...changed] });
      backupSession.current.discard();
      flush.current();
      setMigrationReport([
        `${backup.source.toUpperCase()} 백업에서 ${changed.length}개를 저장했습니다. 원본 파일과 기존 기록은 삭제하지 않았습니다.`,
        ...(plan?.conflicts
          ? [`이전 변경분 ${plan.conflicts}개를 검토 사본으로 보존했습니다.`]
          : []),
        ...backup.warnings,
      ]);
      notify(`${changed.length}개의 기록을 가져왔습니다. 기존 기록은 병합해 보존했습니다.`);
    },
    [commit, notify, requireWorkspace],
  );
  const importLegacy = useCallback(async () => {
    const startingScope = requireWorkspace().scope;
    const legacy = await readLegacy(localStorage);
    const current = requireWorkspace();
    if (current.scope !== startingScope)
      throw new Error(
        '이전 자료를 읽는 동안 계정이 바뀌었습니다. 현재 공간에서 다시 시도해 주세요.',
      );
    const plan = preserveLegacyImport(current.records, legacy.records);
    const added = plan.additions;
    commit({
      ...current,
      records: added,
      pending: [...current.pending, ...added.map((record) => record.id)],
    });
    flush.current();
    setMigrationReport([
      `${added.length}개를 추가했습니다. 동일한 기록 ${plan.unchanged}개와 이미 삭제한 기록 ${plan.deletedSkipped}개는 다시 추가하지 않았습니다. 지원하지 않거나 읽지 못한 항목 ${legacy.unsupported}개.`,
      ...(plan.conflicts
        ? [
            `기존 ID의 변경분 ${plan.conflicts}개를 검토 사본으로 보존했습니다. 기존 기록과 집계는 바꾸지 않았습니다. 일반 변경분은 기억 탭에서, 금고 변경분은 암호문 상태로 확인할 수 있습니다.`,
          ]
        : []),
      ...legacy.warnings,
    ]);
    notify(
      `${added.length}개의 이전 기록을 가져왔습니다.${legacy.warnings.length ? ' 아래의 가져오기 결과를 확인해 주세요.' : ' 이전 원본은 보존되었습니다.'}`,
    );
    return added.length;
  }, [commit, notify, requireWorkspace]);

  // Scope mismatch always returns an empty view, including the first render after sign out.
  const allRecords = workspace?.scope === scope ? workspace.records : [];
  return (
    <LifeContext.Provider
      value={{
        records: allRecords.filter((record) => !record.deletedAt),
        allRecords,
        ready,
        demo,
        setDemo,
        addRecord,
        updateRecord,
        deleteRecord,
        notify,
        toast,
        user,
        syncStatus,
        syncError,
        configured: firebaseConfigured,
        signIn,
        signOut,
        exportBackup,
        previewBackup,
        discardBackupPreview,
        importBackup,
        importLegacy,
        migrationReport,
      }}
    >
      {children}
    </LifeContext.Provider>
  );
}

export function useLife(): LifeContextValue {
  const context = useContext(LifeContext);
  if (!context) throw new Error('useLife must be used within LifeProvider.');
  return context;
}
