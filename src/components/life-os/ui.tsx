'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { X, Inbox } from 'lucide-react';
import { lockScroll } from '@/lib/life-os/scroll-lock';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button type="button" className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

const ModalCloseContext = createContext<(() => void) | null>(null);

/** Cancel, Escape, backdrop and the close icon all follow the same draft guard. */
export function ModalCloseButton({
  children = '취소',
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const close = useContext(ModalCloseContext);
  return (
    <Button variant="secondary" {...props} onClick={() => close?.()}>
      {children}
    </Button>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
  dirty = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  dirty?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else closeRef.current();
  };
  const requestRef = useRef(requestClose);
  requestRef.current = requestClose;
  const confirmRef = useRef(confirmDiscard);
  confirmRef.current = confirmDiscard;
  const previousConfirmation = useRef(false);
  useEffect(() => {
    if (confirmDiscard) continueButton.current?.focus({ preventScroll: true });
    else if (previousConfirmation.current) ref.current?.focus({ preventScroll: true });
    previousConfirmation.current = confirmDiscard;
  }, [confirmDiscard]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = backdrop.current;
        if (!node) return;
        // Safari's layout viewport does not necessarily shrink with the keyboard.
        node.style.setProperty('--modal-visible-height', `${viewport.height}px`);
        node.style.setProperty('--modal-visible-width', `${viewport.width}px`);
        node.style.setProperty('--modal-visible-top', `${viewport.offsetTop}px`);
        node.style.setProperty('--modal-visible-left', `${viewport.offsetLeft}px`);
      });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockScroll(document.body);
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]',
        ) || [],
      ).filter((e) => e.offsetParent !== null);
    const initial = ref.current?.querySelector<HTMLElement>(
      'input:not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    );
    const compact = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    (compact ? ref.current : initial || focusable()[0])?.focus({ preventScroll: true });
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (confirmRef.current) setConfirmDiscard(false);
        else requestRef.current();
      }
      if (e.key === 'Tab') {
        const list = focusable(),
          first = list[0],
          last = list.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        const position = list.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && position <= 0) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && (position < 0 || document.activeElement === last)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      unlock();
      const target = previous?.isConnected
        ? previous
        : document.querySelector<HTMLElement>('.quick-add');
      target?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      ref={backdrop}
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={`modal ${wide ? 'modal-wide' : ''}`}
      >
        <div className="modal-heading">
          <h2 id={id}>{title}</h2>
          <IconButton label="닫기" onClick={requestClose}>
            <X size={19} />
          </IconButton>
        </div>
        <div className="modal-content">
          <ModalCloseContext.Provider value={requestClose}>
            {confirmDiscard && (
              <div className="page-stack discard-prompt" role="alert">
                <h3>작성한 내용을 버릴까요?</h3>
                <p>
                  아직 저장하지 않은 내용이 있어요. 계속 작성하거나, 내용을 버리고 닫을 수 있어요.
                </p>
                <div className="form-actions">
                  <button
                    type="button"
                    ref={continueButton}
                    className="button button-secondary"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    계속 작성
                  </button>
                  <Button variant="danger" onClick={() => closeRef.current()}>
                    버리고 닫기
                  </Button>
                </div>
              </div>
            )}
            <div className="modal-body" hidden={confirmDiscard}>
              {children}
            </div>
          </ModalCloseContext.Provider>
        </div>
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'amber' | 'blue' | 'neutral';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon || <Inbox size={25} />}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.max(0, Math.min(100, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
