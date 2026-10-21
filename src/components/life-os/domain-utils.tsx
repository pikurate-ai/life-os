'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui';
import styles from './domain.module.css';

export function DeleteControl({
  onDelete,
  label = '이 기록 삭제',
}: {
  onDelete: () => void;
  label?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className={styles.deleteArea}>
      {confirm ? (
        <div className={styles.confirm}>
          <p>이 기록을 삭제할까요? 삭제한 기록은 동기화된 기기에서도 사라집니다.</p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.confirmButtons}>
            <Button variant="danger" onClick={() => attempt(onDelete, setError)}>
              삭제하기
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(false);
                setError('');
              }}
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          <Trash2 size={14} />
          {label}
        </Button>
      )}
    </div>
  );
}

export function attempt(action: () => void, onError: (message: string) => void): boolean {
  try {
    action();
    return true;
  } catch (error) {
    onError(
      error instanceof Error
        ? error.message
        : '저장하지 못했어요. 기기 저장 공간과 계정 상태를 확인해 주세요.',
    );
    return false;
  }
}

export const formatWon = (amount: number) =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(amount);
export const shortDate = (date: string) => {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return parsed ? `${parsed[1]}.${parsed[2]}.${parsed[3]}` : date;
};
export const validDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === Number(date.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(date.slice(5, 7)) &&
    parsed.getDate() === Number(date.slice(8, 10))
  );
};
export const validUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};
