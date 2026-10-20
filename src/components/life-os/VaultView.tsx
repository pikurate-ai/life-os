'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  FileUp,
  Globe,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { localDate, type LifeRecord } from '@/lib/life-os/types';
import { importCredentials, type Credential } from '@/lib/life-os/imports';
import {
  decryptVault,
  deriveVaultKey,
  encryptVault,
  generatePassword,
  randomSalt,
  VAULT_ITERATIONS,
} from '@/lib/life-os/vault-crypto';
import { resolveVaultConfig, vaultConfigs, vaultEntriesForConfig } from '@/lib/life-os/vault-model';
import { Badge, Button, EmptyState, Field, Modal, ModalCloseButton, SectionHeader } from './ui';
import './health-diary-vault.css';

type OpenCredential = Credential & { id: string };
const blank = (): Credential => ({ title: '', username: '', password: '', url: '', notes: '' });
const SENTINEL = 'life-os-vault-verified-v2';
export function VaultView() {
  const { records, addRecord, updateRecord, deleteRecord, notify, demo } = useLife();
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const configs = useMemo(() => vaultConfigs(records), [records]);
  const config = resolveVaultConfig(configs, selectedConfigId);
  const encryptedEntries = useMemo(
    () => vaultEntriesForConfig(records, config?.id, configs.length),
    [records, config?.id, configs.length],
  );
  const orphanCount = records.filter(
    (record) =>
      record.type === 'vault' &&
      record.data.role === 'entry' &&
      (!record.data.keyId
        ? configs.length !== 1
        : !configs.some((candidate) => candidate.id === record.data.keyId)),
  ).length;
  const legacyCount = records.filter(
    (record) => record.type === 'vault' && record.data.legacy,
  ).length;
  const [unlocked, setUnlocked] = useState(false);
  const [master, setMaster] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<OpenCredential[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [unreadable, setUnreadable] = useState(0);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Credential | null>(null);
  const initialDraft = useRef<Credential | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remove, setRemove] = useState<OpenCredential | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [imports, setImports] = useState<Credential[]>([]);
  const [importError, setImportError] = useState('');
  const [importSource, setImportSource] = useState('');
  const keyRef = useRef<CryptoKey | null>(null);
  const keyConfig = useRef<string | null>(null);
  const generation = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    // Pin the first available config. A newly synchronized, older config must never silently switch the open key.
    if (config && selectedConfigId !== config.id) setSelectedConfigId(config.id);
  }, [config, selectedConfigId]);
  const lock = useCallback(() => {
    generation.current++;
    keyRef.current = null;
    keyConfig.current = null;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setUnlocked(false);
    setMaster('');
    setConfirmation('');
    setEntries([]);
    setLoadingEntries(false);
    initialDraft.current = null;
    setDraft(null);
    setEditingId(null);
    setRemove(null);
    setImports([]);
    setImportSource('');
    setImportOpen(false);
    setSearch('');
    setError('');
    setFormError('');
    setImportError('');
    setShowPassword(false);
    setBusy(false);
    setUnreadable(0);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      if (!keyRef.current) return;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, 5 * 60 * 1000);
    };
    const visibility = () => {
      if (document.visibilityState !== 'visible') lock();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointerdown', refresh);
    window.addEventListener('keydown', refresh);
    window.addEventListener('touchstart', refresh, { passive: true });
    return () => {
      mounted.current = false;
      generation.current++;
      keyRef.current = null;
      keyConfig.current = null;
      initialDraft.current = null;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointerdown', refresh);
      window.removeEventListener('keydown', refresh);
      window.removeEventListener('touchstart', refresh);
    };
  }, [lock]);
  useEffect(() => {
    if (unlocked) {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, 5 * 60 * 1000);
    }
  }, [unlocked, lock]);
  useEffect(() => {
    if (keyConfig.current && config?.id !== keyConfig.current) lock();
  }, [config?.id, lock]);
  useEffect(() => {
    const key = keyRef.current;
    if (!key || !unlocked) return;
    setLoadingEntries(true);
    let cancelled = false;
    const currentGeneration = generation.current;
    (async () => {
      const results = await Promise.allSettled(
        encryptedEntries.map(async (record) => {
          if (record.data.keyId && record.data.keyId !== keyConfig.current)
            throw new Error('다른 금고의 항목');
          const value = await decryptVault<Credential>(key, {
            iv: String(record.data.iv),
            ciphertext: String(record.data.ciphertext),
          });
          if (
            !value ||
            ['title', 'username', 'password', 'url', 'notes'].some(
              (field) => typeof value[field as keyof Credential] !== 'string',
            )
          )
            throw new Error('지원하지 않는 항목 형식');
          return { ...value, id: record.id };
        }),
      );
      if (cancelled || !mounted.current || generation.current !== currentGeneration) return;
      setEntries(
        results
          .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
          .sort((a, b) => a.title.localeCompare(b.title)),
      );
      setUnreadable(results.filter((result) => result.status === 'rejected').length);
      setLoadingEntries(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [encryptedEntries, unlocked]);
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!config && (master.length < 12 || master !== confirmation)) {
      setError(
        master.length < 12
          ? '마스터 비밀번호는 12자 이상으로 설정해 주세요.'
          : '두 비밀번호가 일치하지 않습니다.',
      );
      return;
    }
    setBusy(true);
    const currentGeneration = generation.current;
    try {
      const salt = config ? String(config.data.salt) : randomSalt();
      const key = await deriveVaultKey(
        master,
        salt,
        config ? Number(config.data.iterations) : VAULT_ITERATIONS,
      );
      if (config) {
        const sentinel = await decryptVault<{ check: string }>(key, {
          iv: String(config.data.iv),
          ciphertext: String(config.data.ciphertext),
        });
        if (sentinel.check !== SENTINEL) throw new Error('비밀번호 확인 실패');
      }
      if (!mounted.current || currentGeneration !== generation.current) return;
      let id = config?.id;
      if (!id) {
        const encrypted = await encryptVault(key, { check: SENTINEL });
        if (!mounted.current || currentGeneration !== generation.current) return;
        id = addRecord({
          type: 'vault',
          title: '암호화된 금고 설정',
          body: '',
          date: localDate(),
          data: { role: 'config', version: 2, salt, iterations: VAULT_ITERATIONS, ...encrypted },
        });
      }
      setSelectedConfigId(id);
      keyRef.current = key;
      keyConfig.current = id;
      setMaster('');
      setConfirmation('');
      setUnlocked(true);
      setLoadingEntries(true);
      setError('');
    } catch (error) {
      if (mounted.current && currentGeneration === generation.current)
        setError(
          config
            ? '비밀번호가 맞지 않거나 암호화된 금고 데이터를 읽을 수 없습니다. 비밀번호와 데이터 백업을 확인해 주세요.'
            : error instanceof Error
              ? error.message
              : '금고를 만들지 못했습니다.',
        );
    } finally {
      if (mounted.current && currentGeneration === generation.current) setBusy(false);
    }
  }
  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${what} 복사했어요. 사용 후 클립보드를 지워 주세요.`);
    } catch {
      notify('클립보드 접근이 차단됐어요. 브라우저 권한을 확인해 주세요.');
    }
  }
  const openDraft = (entry?: OpenCredential) => {
    setEditingId(entry?.id || null);
    const value = entry
      ? {
          title: entry.title,
          username: entry.username,
          password: entry.password,
          url: entry.url,
          notes: entry.notes,
        }
      : blank();
    initialDraft.current = value;
    setDraft(value);
    setShowPassword(false);
    setFormError('');
  };
  const set = (key: keyof Credential, value: string) =>
    setDraft((current) => (current ? { ...current, [key]: value } : null));
  const dirtyDraft = Boolean(
    draft && initialDraft.current && JSON.stringify(draft) !== JSON.stringify(initialDraft.current),
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const key = keyRef.current;
    if (!key || !draft || busy) return;
    if (!draft.title.trim() || !draft.password) {
      setFormError('서비스 이름과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setFormError('');
    const currentGeneration = generation.current;
    try {
      const encrypted = await encryptVault(key, {
        ...draft,
        title: draft.title.trim(),
        username: draft.username.trim(),
        url: draft.url.trim(),
      });
      if (!mounted.current || currentGeneration !== generation.current) return;
      const value = {
        type: 'vault' as const,
        title: '암호화된 항목',
        body: '',
        date: localDate(),
        data: { role: 'entry', version: 2, keyId: keyConfig.current, ...encrypted },
      };
      if (editingId) updateRecord(editingId, value);
      else addRecord(value);
      initialDraft.current = null;
      setDraft(null);
      notify('로그인 정보를 암호화해 저장했어요.');
    } catch (error) {
      if (mounted.current && currentGeneration === generation.current)
        setFormError(
          error instanceof Error
            ? error.message
            : '암호화하여 저장하지 못했습니다. 다시 시도해 주세요.',
        );
    } finally {
      if (mounted.current && currentGeneration === generation.current) setBusy(false);
    }
  }
  async function readCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImportError('');
    setImports([]);
    if (!file) return;
    if (!keyRef.current) {
      event.target.value = '';
      notify('화면 전환으로 금고가 잠겼어요. 다시 연 뒤 CSV 파일을 선택해 주세요.');
      return;
    }
    setBusy(true);
    const currentGeneration = generation.current;
    try {
      if (!/\.csv$/i.test(file.name))
        throw new Error(
          'CSV 파일을 선택해 주세요. Excel 파일은 UTF-8 CSV로 내보낸 뒤 가져올 수 있습니다.',
        );
      if (file.size > 5 * 1024 * 1024) throw new Error('5 MB 이하의 CSV 파일을 선택해 주세요.');
      const values = importCredentials(await file.text());
      if (mounted.current && currentGeneration === generation.current) {
        setImports(values);
        setImportSource(file.name);
      }
    } catch (error) {
      if (mounted.current && currentGeneration === generation.current)
        setImportError(error instanceof Error ? error.message : '파일을 읽지 못했습니다.');
    } finally {
      event.target.value = '';
      if (mounted.current && currentGeneration === generation.current) setBusy(false);
    }
  }
  const uniqueImports = useMemo(() => {
    const known = new Set(
      entries.map((value) =>
        JSON.stringify([value.title, value.username, value.password, value.url, value.notes]),
      ),
    );
    return imports.filter((value) => {
      const key = JSON.stringify([
        value.title,
        value.username,
        value.password,
        value.url,
        value.notes,
      ]);
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
  }, [imports, entries]);
  async function commitImport() {
    const key = keyRef.current;
    if (!key || busy) return;
    if (loadingEntries) {
      setImportError('금고에 저장된 항목을 확인하고 있어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setBusy(true);
    setImportError('');
    const currentGeneration = generation.current;
    let saved = 0;
    try {
      // Encrypt the entire batch before mutating persistence. Plain CSV values never enter the shared store.
      const encrypted = await Promise.all(uniqueImports.map((value) => encryptVault(key, value)));
      if (!mounted.current || currentGeneration !== generation.current) return;
      encrypted.forEach((value) => {
        addRecord({
          type: 'vault',
          title: '암호화된 항목',
          body: '',
          date: localDate(),
          data: { role: 'entry', version: 2, keyId: keyConfig.current, ...value },
        });
        saved++;
      });
      setImportOpen(false);
      setImports([]);
      notify(`${encrypted.length}개의 로그인 정보를 암호화해 가져왔어요.`);
    } catch (error) {
      if (mounted.current && currentGeneration === generation.current)
        setImportError(
          `${saved}개 저장 후 중단되었습니다. 저장된 항목은 중복에서 제외됩니다. ${error instanceof Error ? error.message : '저장 공간을 확인하고 다시 시도해 주세요.'}`,
        );
    } finally {
      if (mounted.current && currentGeneration === generation.current) {
        // A partially saved batch must be decrypted before retry deduplication can be trusted.
        if (saved > 0) setLoadingEntries(true);
        setBusy(false);
      }
    }
  }
  function deleteEntry() {
    if (!remove) return;
    try {
      deleteRecord(remove.id);
      setRemove(null);
      notify('로그인 정보를 삭제했어요.');
    } catch (error) {
      notify(error instanceof Error ? error.message : '로그인 정보를 삭제하지 못했습니다.');
    }
  }
  const visible = entries.filter((entry) =>
    `${entry.title} ${entry.username} ${entry.url}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page-stack hdv-vault">
      <SectionHeader
        eyebrow="나만 열 수 있는 개인 금고"
        title="비밀번호는 한곳에, 안전하게"
        description="마스터 비밀번호로 잠그고, 필요할 때 빠르게 꺼내 쓰세요."
        action={
          unlocked ? (
            <div className="hdv-header-actions">
              <Button variant="secondary" onClick={lock}>
                <LockKeyhole size={16} />
                금고 잠그기
              </Button>
              <Button onClick={() => openDraft()}>
                <Plus size={17} />
                로그인 추가
              </Button>
            </div>
          ) : undefined
        }
      />
      {demo && (
        <div className="hdv-info">
          <ShieldCheck size={19} />
          <span>체험 공간입니다. 비밀번호 저장과 가져오기는 예시 정보로 연습해 주세요.</span>
        </div>
      )}
      {legacyCount > 0 && (
        <div className="hdv-warning">
          <LockKeyhole size={19} />
          <span>
            이전 버전 암호화 기록 {legacyCount}개가 보존되어 있습니다. 현재 금고와 형식이 달라 직접
            열 수 없습니다. 이전 앱에서 CSV로 내보내 새 금고로 가져오세요. 이 화면은 기존 암호화
            데이터를 변경하지 않습니다.
          </span>
        </div>
      )}
      {configs.length > 1 && (
        <section className="card card-pad hdv-vault-picker">
          <Field
            label="열어볼 금고 선택"
            hint="서로 다른 비밀번호로 만든 금고를 각각 열 수 있습니다. 금고를 바꾸면 현재 금고가 즉시 잠깁니다."
          >
            <select
              className="select"
              value={config?.id || ''}
              disabled={busy}
              onChange={(event) => {
                lock();
                setSelectedConfigId(event.target.value);
              }}
            >
              {configs.map((candidate, index) => (
                <option value={candidate.id} key={candidate.id}>
                  금고 {index + 1} ·{' '}
                  {new Date(candidate.updatedAt).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ·{' '}
                  {
                    records.filter(
                      (record) =>
                        record.type === 'vault' &&
                        record.data.role === 'entry' &&
                        record.data.keyId === candidate.id,
                    ).length
                  }
                  개 항목
                </option>
              ))}
            </select>
          </Field>
          <p className="muted text-small">
            선택한 금고의 마스터 비밀번호를 입력하세요. 다른 금고의 암호화된 기록도 그대로
            보존됩니다.
          </p>
        </section>
      )}
      {orphanCount > 0 && (
        <div className="hdv-warning" role="alert">
          암호화 키 설정이 없거나 연결할 금고를 확인할 수 없는 항목이 {orphanCount}개 있습니다.
          암호화된 원본은 보존됩니다. 해당 금고 설정을 포함한 전체 백업을 가져와 주세요.
        </div>
      )}
      {!unlocked ? (
        <section className="card hdv-lock-card">
          <div className="hdv-lock-symbol">
            <LockKeyhole size={32} />
          </div>
          <Badge tone="green">기기 안에서 암호화</Badge>
          <h3>{config ? '금고가 잠겨 있어요' : '나만의 금고를 만들어 보세요'}</h3>
          <p className="muted">
            {config
              ? '마스터 비밀번호를 입력해 로그인 정보를 확인하세요.'
              : '기억할 비밀번호는 하나. 나머지는 금고가 보관할게요.'}
          </p>
          <form className="page-stack hdv-lock-form" onSubmit={unlock}>
            <Field
              label={config ? '마스터 비밀번호' : '마스터 비밀번호 만들기'}
              hint={
                !config ? '최소 12자. 다른 서비스에서 쓰지 않는 긴 문장을 권장합니다.' : undefined
              }
            >
              <input
                required
                autoComplete={config ? 'current-password' : 'new-password'}
                className="input"
                type="password"
                placeholder={config ? '마스터 비밀번호 입력' : '12자 이상의 비밀번호'}
                minLength={config ? undefined : 12}
                value={master}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                onChange={(event) => setMaster(event.target.value)}
              />
            </Field>
            {!config && (
              <Field label="마스터 비밀번호 확인">
                <input
                  required
                  autoComplete="new-password"
                  className="input"
                  type="password"
                  placeholder="비밀번호를 다시 입력해 주세요"
                  value={confirmation}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </Field>
            )}
            {error && (
              <p className="hdv-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !master || (!config && !confirmation)}>
              <Unlock size={17} />
              {busy ? '안전하게 확인 중…' : config ? '금고 열기' : '암호화 금고 만들기'}
            </Button>
          </form>
          <div className="hdv-lock-footnote">
            <ShieldCheck size={16} />
            <span>
              AES-GCM 256비트 · PBKDF2 600,000회
              <br />
              비밀번호, 사이트 이름, 아이디, 메모까지 암호화합니다.
            </span>
          </div>
          <p className="text-small muted hdv-lock-notice">
            마스터 비밀번호는 저장되지 않으며, 분실 시 복구할 수 없습니다.
            <br />
            화면을 벗어나거나 5분 동안 사용하지 않으면 자동으로 잠깁니다.
          </p>
        </section>
      ) : (
        <>
          <div className="hdv-vault-status card card-pad">
            <span className="hdv-symbol">
              <ShieldCheck size={22} />
            </span>
            <div className="hdv-grow">
              <strong>금고가 열려 있어요</strong>
              <p className="muted text-small">
                {loadingEntries
                  ? '로그인 정보를 확인하고 있어요'
                  : `${entries.length}개 로그인 정보`}{' '}
                · 화면을 벗어나거나 5분 동안 미사용 시 자동 잠금
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={loadingEntries}
              onClick={() => {
                setImports([]);
                setImportError('');
                setImportOpen(true);
              }}
            >
              <FileUp size={16} />
              CSV 가져오기
            </Button>
          </div>
          {unreadable > 0 && (
            <div className="hdv-warning" role="alert">
              {unreadable}개의 암호화 항목을 열지 못했습니다. 다른 마스터 키로 생성되었거나 데이터가
              손상되었을 수 있습니다. 원본 데이터는 보존됩니다.
            </div>
          )}
          <section className="card card-pad">
            <div className="hdv-list-heading">
              <div>
                <h3>나의 로그인 정보</h3>
                <p className="muted text-small">검색하고, 복사하고, 안전하게 보관하세요</p>
              </div>
              <label className="hdv-search">
                <Search size={17} />
                <span className="hdv-sr-only">로그인 정보 검색</span>
                <input
                  type="search"
                  placeholder="사이트 또는 아이디 검색"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            {loadingEntries && !entries.length ? (
              <p className="muted" role="status">
                암호화된 로그인 정보를 확인하고 있어요…
              </p>
            ) : !visible.length ? (
              <EmptyState
                icon={<KeyRound size={29} />}
                title={search ? '검색 결과가 없어요' : '첫 로그인 정보를 저장하세요'}
                description={
                  search
                    ? '서비스 이름이나 아이디로 다시 검색해 보세요.'
                    : '서비스 이름과 비밀번호도 암호화되어 저장됩니다.'
                }
                action={!search && <Button onClick={() => openDraft()}>로그인 추가하기</Button>}
              />
            ) : (
              <div className="record-list">
                {visible.map((entry) => (
                  <article className="record-row hdv-record" key={entry.id}>
                    <span className="hdv-record-icon">
                      <Globe size={20} />
                    </span>
                    <div className="hdv-grow">
                      <strong className="hdv-break">{entry.title}</strong>
                      <p className="muted text-small hdv-break">
                        {entry.username || '아이디 없음'}
                        {entry.url ? ` · ${entry.url}` : ''}
                      </p>
                    </div>
                    <div className="hdv-vault-actions">
                      <button
                        className="hdv-copy-button"
                        onClick={() => copy(entry.password, '비밀번호를')}
                        title="비밀번호 복사"
                        aria-label={`${entry.title} 비밀번호 복사`}
                      >
                        <Copy size={14} />
                        <span>비밀번호</span>
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${entry.title} 수정`}
                        onClick={() => openDraft(entry)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${entry.title} 삭제`}
                        onClick={() => setRemove(entry)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <p className="muted text-small hdv-security-note">
            <LockKeyhole size={14} />
            마스터 키는 현재 화면의 메모리에만 유지됩니다. 별도 보안 감사를 완료한 비밀번호 관리자와
            동일한 수준을 보장하지 않습니다.
          </p>
        </>
      )}
      {unlocked && draft && (
        <Modal
          title={editingId ? '로그인 정보 수정' : '로그인 정보 추가'}
          onClose={() => {
            if (!busy) {
              initialDraft.current = null;
              setDraft(null);
            }
          }}
          dirty={dirtyDraft && !busy}
        >
          <form className="page-stack" onSubmit={save}>
            <Field label="서비스 이름">
              <input
                required
                disabled={busy}
                className="input"
                placeholder="예: Google"
                value={draft.title}
                maxLength={200}
                onChange={(event) => set('title', event.target.value)}
              />
            </Field>
            <Field label="아이디 / 이메일">
              <div className="hdv-input-action">
                <input
                  className="input"
                  autoComplete="off"
                  aria-label="아이디 또는 이메일"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  placeholder="이메일 또는 아이디"
                  value={draft.username}
                  onChange={(event) => set('username', event.target.value)}
                />
                {draft.username && (
                  <button
                    type="button"
                    className="icon-button"
                    disabled={busy}
                    aria-label="아이디 복사"
                    onClick={() => copy(draft.username, '아이디를')}
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </Field>
            <Field
              label="비밀번호"
              hint="여기에서 수정해도 실제 서비스의 비밀번호는 바뀌지 않아요."
            >
              <div className="hdv-input-action">
                <input
                  required
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-label="저장할 비밀번호"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  value={draft.password}
                  onChange={(event) => set('password', event.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                {draft.password && (
                  <button
                    type="button"
                    className="icon-button"
                    disabled={busy}
                    aria-label="비밀번호 복사"
                    onClick={() => copy(draft.password, '비밀번호를')}
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </Field>
            <div className="hdv-inline">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => set('password', generatePassword())}
              >
                <RefreshCw size={14} />
                강력한 비밀번호 생성
              </Button>
              <span className="muted text-small">24자 · 보안 난수 사용</span>
            </div>
            <Field label="웹사이트 (선택)">
              <input
                className="input"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
                disabled={busy}
                placeholder="https://example.com"
                value={draft.url}
                onChange={(event) => set('url', event.target.value)}
              />
            </Field>
            <Field label="메모 (선택)">
              <textarea
                className="textarea"
                rows={3}
                maxLength={20000}
                disabled={busy}
                value={draft.notes}
                onChange={(event) => set('notes', event.target.value)}
                placeholder="복구 정보, 계정 관련 메모 등"
              />
            </Field>
            {formError && (
              <p className="hdv-error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <ModalCloseButton disabled={busy}>취소</ModalCloseButton>
              <Button type="submit" disabled={busy}>
                <LockKeyhole size={16} />
                {busy ? '암호화 중…' : '암호화해 저장'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {unlocked && remove && (
        <Modal title="로그인 정보를 삭제할까요?" onClose={() => setRemove(null)}>
          <p>‘{remove.title}’의 암호화된 로그인 정보가 삭제됩니다.</p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setRemove(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={deleteEntry}>
              삭제
            </Button>
          </div>
        </Modal>
      )}
      {unlocked && importOpen && (
        <Modal
          title="비밀번호 CSV 가져오기"
          onClose={() => {
            if (!busy) {
              setImportOpen(false);
              setImports([]);
            }
          }}
          dirty={!busy && uniqueImports.length > 0}
          wide
        >
          <div className="page-stack">
            <p className="muted">
              Chrome·Google 비밀번호 관리자, LastPass에서 내보낸 CSV를 지원합니다. Excel은{' '}
              <strong>CSV UTF-8 (.csv)</strong> 형식으로 저장해 주세요.
            </p>
            <p className="muted text-small">
              기존 서비스에서 내보낸 파일을 먼저 기기의 파일 앱에 저장하세요. 파일 선택 → 항목
              미리보기 → 가져오기 순서로 진행합니다. 다른 앱으로 전환하면 금고가 잠길 수 있으니
              파일을 준비한 뒤 시작하세요.
            </p>
            <div className="hdv-warning">
              <ShieldCheck size={19} />
              <span>
                CSV에는 비밀번호가 평문으로 들어 있습니다. 가져온 뒤 원본 CSV는 안전하게 삭제하세요.
                파일은 브라우저에서 읽고, 확인 후 모든 항목을 암호화해 저장합니다.
              </span>
            </div>
            <label className="hdv-upload">
              <Upload size={22} />
              <strong>{busy ? '파일을 확인하고 있어요…' : 'CSV 파일 선택'}</strong>
              <span className="muted text-small">최대 5 MB · 1,000개 항목</span>
              <input type="file" accept=".csv,text/csv" disabled={busy} onChange={readCSV} />
            </label>
            {importError && (
              <p role="alert" className="hdv-error">
                {importError}
              </p>
            )}
            {imports.length > 0 && (
              <>
                <p className="muted text-small hdv-break">{importSource}</p>
                <div className="hdv-inline">
                  <Badge tone="green">새 항목 {uniqueImports.length}개</Badge>
                  <Badge>중복 {imports.length - uniqueImports.length}개 제외</Badge>
                </div>
                {uniqueImports.length === 0 && (
                  <p className="muted text-small" role="status">
                    모두 이미 금고에 있는 로그인 정보예요. 같은 정보는 다시 추가하지 않습니다.
                  </p>
                )}
                <div className="hdv-import-preview">
                  {uniqueImports.slice(0, 20).map((entry, index) => (
                    <div key={index}>
                      <strong>{entry.title}</strong>
                      <p className="text-small muted">
                        {entry.username || '아이디 없음'} · 비밀번호 ••••••••
                      </p>
                    </div>
                  ))}
                  {uniqueImports.length > 20 && (
                    <p className="muted">외 {uniqueImports.length - 20}개</p>
                  )}
                </div>
              </>
            )}
            <p className="muted text-small">
              직접 만든 CSV 헤더: name, url, username, password, notes
            </p>
            <div className="form-actions">
              <ModalCloseButton disabled={busy}>취소</ModalCloseButton>
              <Button
                disabled={busy || loadingEntries || !uniqueImports.length}
                onClick={commitImport}
              >
                <LockKeyhole size={16} />
                {busy
                  ? '암호화 중…'
                  : loadingEntries
                    ? '기존 항목 확인 중…'
                    : `${uniqueImports.length}개 암호화해 가져오기`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
