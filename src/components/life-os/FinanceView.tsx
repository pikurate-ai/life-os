'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Plus,
  Pencil,
  Wallet,
  MessageSquareText,
  X,
} from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { localDate, numberData, type LifeRecord } from '@/lib/life-os/types';
import { Badge, Button, EmptyState, Field, Modal, SectionHeader } from './ui';
import { attempt, DeleteControl, formatWon, shortDate, validDate } from './domain-utils';
import styles from './domain.module.css';

const expenseCategories = [
  '식비',
  '생활',
  '교통',
  '주거·통신',
  '가족',
  '건강',
  '교육',
  '여가',
  '기타',
];
const incomeCategories = ['급여', '사업', '부수입', '기타'];
const assetCategories = ['예금·현금', '투자', '보증금', '기타'];
const liabilityCategories = ['대출', '카드 미결제', '기타'];
type Draft = {
  type: 'transaction' | 'asset';
  title: string;
  body: string;
  amount: string;
  date: string;
  direction: string;
  category: string;
};
const blank = (type: 'transaction' | 'asset'): Draft => ({
  type,
  title: '',
  body: '',
  amount: '',
  date: localDate(),
  direction: type === 'asset' ? 'asset' : 'expense',
  category: type === 'asset' ? assetCategories[0] : expenseCategories[0],
});
const options = (direction: string) =>
  direction === 'income'
    ? incomeCategories
    : direction === 'asset'
      ? assetCategories
      : direction === 'liability'
        ? liabilityCategories
        : expenseCategories;

export function FinanceView() {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [directionFilter, setDirectionFilter] = useState('all');
  const [editing, setEditing] = useState<LifeRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(() => blank('transaction'));
  const [error, setError] = useState('');
  const [smsOpen, setSmsOpen] = useState(false);
  const [sms, setSms] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const transactions = useMemo(
    () =>
      records
        .filter((record) => record.type === 'transaction' && record.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [records, month],
  );
  const assets = useMemo(() => records.filter((record) => record.type === 'asset'), [records]);
  const income = transactions
    .filter((record) => record.data.direction === 'income')
    .reduce((sum, record) => sum + numberData(record, 'amount'), 0);
  const expense = transactions
    .filter((record) => record.data.direction !== 'income')
    .reduce((sum, record) => sum + numberData(record, 'amount'), 0);
  const assetTotal = assets
    .filter((record) => record.data.direction !== 'liability')
    .reduce((sum, record) => sum + numberData(record, 'amount'), 0);
  const liabilityTotal = assets
    .filter((record) => record.data.direction === 'liability')
    .reduce((sum, record) => sum + numberData(record, 'amount'), 0);
  const filtered = transactions.filter(
    (record) => directionFilter === 'all' || record.data.direction === directionFilter,
  );
  const categoryTotals = expenseCategories
    .map((category) => ({
      category,
      amount: transactions
        .filter((record) => record.data.direction !== 'income' && record.data.category === category)
        .reduce((sum, record) => sum + numberData(record, 'amount'), 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const openEditor = (record: LifeRecord | null, type: 'transaction' | 'asset' = 'transaction') => {
    setEditing(record);
    setError('');
    setSmsOpen(false);
    setSms('');
    setSmsMessage('');
    setDraft(
      record
        ? {
            type: record.type as Draft['type'],
            title: record.title,
            body: record.body,
            amount: String(numberData(record, 'amount')),
            date: record.date,
            direction: String(record.data.direction || (type === 'asset' ? 'asset' : 'expense')),
            category: String(record.data.category || '기타'),
          }
        : blank(type),
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(draft.amount.replace(/,/g, ''));
    if (
      !draft.title.trim() ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 100000000000000 ||
      !validDate(draft.date)
    ) {
      setError('내용, 올바른 날짜, 0원보다 큰 정수 금액을 입력해 주세요.');
      return;
    }
    const value = {
      type: draft.type,
      title: draft.title.trim(),
      body: draft.body.trim(),
      date: draft.date,
      data: { amount, direction: draft.direction, category: draft.category },
    };
    if (
      !attempt(() => {
        if (editing) updateRecord(editing.id, value);
        else addRecord(value);
      }, setError)
    )
      return;
    setEditing(undefined);
    notify(draft.type === 'asset' ? '자산 정보를 저장했어요.' : '거래를 기록했어요.');
  };
  const parseSms = () => {
    if (/취소|거절|실패/.test(sms)) {
      setSmsMessage(
        '취소·거절 문자는 자동 해석하지 않아요. 실제 거래를 확인해 직접 입력해 주세요.',
      );
      return;
    }
    const match = sms.match(/([\d,]+)\s*원/);
    if (!match || Number(match[1].replace(/,/g, '')) <= 0) {
      setSmsMessage('원 단위 금액을 찾지 못했어요. 금액을 직접 입력해 주세요.');
      return;
    }
    const lines = sms
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const amountLine = lines.findIndex((line) => /[\d,]+\s*원/.test(line));
    const candidate =
      lines
        .slice(amountLine + 1)
        .find((line) => !/잔액|누적|한도|[0-9]{1,2}[:/][0-9]{2}/.test(line)) || '';
    const direction = /입금/.test(sms) && !/출금|결제|승인/.test(sms) ? 'income' : 'expense';
    setDraft((current) => ({
      ...current,
      amount: match[1].replace(/,/g, ''),
      direction,
      category: options(direction)[0],
      title: current.title || candidate.slice(0, 120),
    }));
    setSmsMessage(
      '첫 번째 원 단위 금액을 가져왔어요. 가맹점·금액·날짜를 확인한 뒤 저장해 주세요. 문자는 저장하지 않아요.',
    );
  };
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="BUILD YOUR NEXT CHAPTER"
        title="가계와 자산"
        description="지금의 숫자를 차분하게 기록하고, 나의 다음을 준비하세요."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus size={16} />
            거래 기록
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <input
            aria-label="조회할 월"
            type="month"
            className={`input ${styles.monthInput}`}
            value={month}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
          <span className={styles.help}>KRW · 원화 기준</span>
        </div>
        <Badge tone="green">한 걸음씩, 나의 페이스로</Badge>
      </div>
      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">이번 달 수입</span>
          <div className={`${styles.metricAmount} ${styles.amountIncome}`}>
            {formatWon(income)}
            <span className={styles.amountUnit}>원</span>
          </div>
          <div className={styles.statCompact}>기록된 수입 기준</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">이번 달 지출</span>
          <div className={styles.metricAmount}>
            {formatWon(expense)}
            <span className={styles.amountUnit}>원</span>
          </div>
          <div className={styles.statCompact}>일상의 흐름을 확인해요</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">이번 달 남은 돈</span>
          <div className={styles.metricAmount}>
            {formatWon(income - expense)}
            <span className={styles.amountUnit}>원</span>
          </div>
          <div className={styles.statCompact}>수입 − 지출</div>
        </div>
      </div>
      <div className={styles.twoCol}>
        <section className={`card card-pad ${styles.listCard}`}>
          <div className={styles.panelHeading}>
            <h2 className={styles.panelTitle}>
              거래 내역 <span className={styles.count}>{filtered.length}</span>
            </h2>
            <div className={styles.filters}>
              {[
                ['all', '전체'],
                ['expense', '지출'],
                ['income', '수입'],
              ].map(([key, label]) => (
                <button
                  className={`${styles.filter} ${directionFilter === key ? styles.selected : ''}`}
                  key={key}
                  onClick={() => setDirectionFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filtered.length ? (
            filtered.map((record) => (
              <div className={styles.record} key={record.id}>
                <span
                  className={`${styles.recordIcon} ${record.data.direction === 'income' ? styles.incomeIcon : styles.expenseIcon}`}
                >
                  {record.data.direction === 'income' ? <ArrowDownLeft /> : <ArrowUpRight />}
                </span>
                <div className={styles.recordText}>
                  <p className={styles.recordTitle}>{record.title}</p>
                  <div className={styles.recordMeta}>
                    {shortDate(record.date)} · {String(record.data.category || '기타')}
                    {record.body && ` · ${record.body}`}
                  </div>
                </div>
                <span
                  className={`${styles.recordAmount} ${record.data.direction === 'income' ? styles.amountIncome : ''}`}
                >
                  {record.data.direction === 'income' ? '+' : '−'}
                  {formatWon(numberData(record, 'amount'))}
                  <span className={styles.currencyMark}> 원</span>
                </span>
                <button
                  className={styles.icon}
                  aria-label={`${record.title} 거래 편집`}
                  onClick={() => openEditor(record)}
                >
                  <Pencil />
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Wallet size={25} />}
              title="아직 기록된 거래가 없어요"
              description={`${month.replace('-', '년 ')}월의 첫 기록을 남겨 보세요.`}
              action={
                <Button variant="secondary" onClick={() => openEditor(null)}>
                  거래 기록하기
                </Button>
              }
            />
          )}
        </section>
        <div className="page-stack">
          <section className="card card-pad">
            <div className={styles.panelHeading}>
              <h2 className={styles.panelTitle}>자산 현황</h2>
              <button
                className={styles.icon}
                aria-label="자산 또는 부채 추가"
                onClick={() => openEditor(null, 'asset')}
              >
                <Plus />
              </button>
            </div>
            <span className={styles.inlineLabel}>기록한 순자산</span>
            <div className={styles.metricAmount}>
              {formatWon(assetTotal - liabilityTotal)}
              <span className={styles.amountUnit}>원</span>
            </div>
            <div className={styles.assetBar}>
              <div
                className={styles.assetFill}
                style={{
                  width: `${assetTotal + liabilityTotal > 0 ? Math.max(0, (assetTotal / (assetTotal + liabilityTotal)) * 100) : 0}%`,
                }}
              />
            </div>
            <div className={styles.assetTotals}>
              <span>자산 {formatWon(assetTotal)}원</span>
              <span>부채 {formatWon(liabilityTotal)}원</span>
            </div>
            {assets.length ? (
              assets.map((record) => (
                <div className={styles.record} key={record.id}>
                  <span className={styles.recordIcon}>
                    {record.data.direction === 'liability' ? <CreditCard /> : <Building2 />}
                  </span>
                  <div className={styles.recordText}>
                    <p className={styles.recordTitle}>{record.title}</p>
                    <div className={styles.recordMeta}>
                      {record.data.direction === 'liability' ? '부채' : '자산'} ·{' '}
                      {shortDate(record.date)} 기준
                    </div>
                  </div>
                  <span className={styles.assetValue}>
                    {formatWon(numberData(record, 'amount'))}원
                  </span>
                  <button
                    className={styles.icon}
                    aria-label={`${record.title} 자산 편집`}
                    onClick={() => openEditor(record, 'asset')}
                  >
                    <Pencil />
                  </button>
                </div>
              ))
            ) : (
              <p className={styles.emptyInline}>예금, 현금, 부채를 직접 기록해 보세요.</p>
            )}
            <p className={styles.help}>
              직접 입력한 잔액 기준이며 금융기관과 자동 연결되지 않아요. 자산은 거래 기록과 별도로
              갱신해 주세요.
            </p>
          </section>
          <section className="card card-pad">
            <h2 className={styles.panelTitle}>어디에 사용했나요?</h2>
            <p className={styles.help}>이번 달 카테고리별 지출</p>
            {categoryTotals.length ? (
              categoryTotals.map((item) => (
                <div key={item.category} style={{ marginTop: 15 }}>
                  <div className={styles.amountRow}>
                    <span className={styles.assetName}>{item.category}</span>
                    <span className={styles.assetValue}>{formatWon(item.amount)}원</span>
                  </div>
                  <div className={styles.assetBar} style={{ height: 5, marginTop: 7 }}>
                    <div
                      className={styles.assetFill}
                      style={{ width: `${expense ? (item.amount / expense) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.emptyInline}>지출을 기록하면 흐름이 보여요.</p>
            )}
          </section>
        </div>
      </div>
      {editing !== undefined && (
        <Modal
          title={
            draft.type === 'asset'
              ? editing
                ? '자산 정보 수정'
                : '자산과 부채 기록'
              : editing
                ? '거래 수정'
                : '새 거래 기록'
          }
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={submit} className={styles.formStack}>
            {draft.type === 'transaction' && !editing && (
              <div>
                <button
                  type="button"
                  className={styles.filter}
                  onClick={() => setSmsOpen(!smsOpen)}
                >
                  <MessageSquareText size={14} />
                  결제 문자에서 입력{smsOpen && <X size={12} />}
                </button>
                {smsOpen && (
                  <div className={styles.topSpacing}>
                    <Field
                      label="결제 또는 입출금 문자"
                      hint="금액을 추출하는 보조 기능입니다. 저장 전에 직접 확인해 주세요."
                    >
                      <textarea
                        className="textarea"
                        rows={4}
                        value={sms}
                        maxLength={5000}
                        placeholder="문자를 여기에 붙여 넣으세요."
                        onChange={(event) => {
                          setSms(event.target.value);
                          setSmsMessage('');
                        }}
                      />
                    </Field>
                    <Button variant="secondary" disabled={!sms.trim()} onClick={parseSms}>
                      문자 내용 불러오기
                    </Button>
                    {smsMessage && (
                      <p className={styles.smsPreview} role="status">
                        {smsMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="form-grid">
              <Field label="구분">
                <select
                  className="select"
                  value={draft.direction}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      direction: event.target.value,
                      category: options(event.target.value)[0],
                    })
                  }
                >
                  {draft.type === 'asset' ? (
                    <>
                      <option value="asset">자산</option>
                      <option value="liability">부채</option>
                    </>
                  ) : (
                    <>
                      <option value="expense">지출</option>
                      <option value="income">수입</option>
                    </>
                  )}
                </select>
              </Field>
              <Field label="카테고리">
                <select
                  className="select"
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                >
                  {options(draft.direction).map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={draft.type === 'asset' ? '이름' : '사용처 또는 수입 내용'}>
              <input
                className="input"
                autoFocus
                required
                value={draft.title}
                maxLength={120}
                placeholder={draft.type === 'asset' ? '예: 생활비 통장' : '예: 가족과 저녁 식사'}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="금액 (원)">
                <input
                  className="input"
                  inputMode="numeric"
                  required
                  value={draft.amount}
                  maxLength={20}
                  placeholder="0"
                  onChange={(event) => {
                    if (/^[\d,]*$/.test(event.target.value))
                      setDraft({ ...draft, amount: event.target.value });
                  }}
                />
              </Field>
              <Field label={draft.type === 'asset' ? '잔액 기준일' : '거래일'}>
                <input
                  className="input"
                  type="date"
                  required
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                />
              </Field>
            </div>
            <Field label="메모 (선택)">
              <textarea
                className="textarea"
                rows={2}
                value={draft.body}
                maxLength={1000}
                placeholder="기억해 둘 내용을 적어 주세요."
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </Field>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setEditing(undefined)}>
                취소
              </Button>
              <Button type="submit">기록 저장하기</Button>
            </div>
          </form>
          {editing && (
            <DeleteControl
              onDelete={() => {
                deleteRecord(editing.id);
                setEditing(undefined);
                notify('기록을 삭제했어요.');
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
