import assert from 'node:assert/strict';
import test from 'node:test';
import { lockScroll } from '../src/lib/life-os/scroll-lock.ts';

test('drawer-to-dialog transitions retain the body lock until the last overlay closes', () => {
  for (const order of ['drawer-first', 'dialog-first']) {
    const surface = { style: { overflow: 'auto' } };
    const drawer = lockScroll(surface);
    const dialog = lockScroll(surface);
    (order === 'drawer-first' ? drawer : dialog)();
    assert.equal(surface.style.overflow, 'hidden');
    (order === 'drawer-first' ? dialog : drawer)();
    assert.equal(surface.style.overflow, 'auto');
    drawer();
    dialog();
    assert.equal(surface.style.overflow, 'auto');
    const next = lockScroll(surface);
    next();
    assert.equal(surface.style.overflow, 'auto');
  }
});
