interface ScrollSurface {
  style: { overflow: string };
}
const locks = new WeakMap<ScrollSurface, { count: number; previous: string }>();

/** Drawer-to-dialog transitions can overlap for one render; release only the last owner. */
export function lockScroll(surface: ScrollSurface): () => void {
  const state = locks.get(surface) ?? { count: 0, previous: surface.style.overflow };
  state.count++;
  locks.set(surface, state);
  surface.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count--;
    if (!state.count) {
      surface.style.overflow = state.previous;
      locks.delete(surface);
    }
  };
}
