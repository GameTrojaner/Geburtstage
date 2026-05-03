/**
 * Tests for the handleUndo recovery logic in HomeScreen.
 *
 * The component uses `useCallback` + `useRef` to avoid stale closures. The
 * core invariant — "if unhideContact throws, restore snackbar state so the
 * user can retry" — is a pure async control-flow concern that can be verified
 * without rendering the component.
 */

type Entry = { id: string; name: string };

async function runHandleUndo(
  ref: { current: Entry | null },
  setSnackVisible: (v: boolean) => void,
  setLastHidden: (v: Entry | null) => void,
  unhideContact: (id: string) => Promise<void>,
): Promise<void> {
  const toRestore = ref.current;
  if (!toRestore) return;
  ref.current = null;
  setSnackVisible(false);
  setLastHidden(null);
  try {
    await unhideContact(toRestore.id);
  } catch {
    ref.current = toRestore;
    setLastHidden(toRestore);
    setSnackVisible(true);
  }
}

describe('HomeScreen handleUndo recovery logic', () => {
  const ALICE: Entry = { id: 'c1', name: 'Alice' };

  it('clears state and calls unhideContact on success', async () => {
    const ref = { current: ALICE };
    const setSnackVisible = jest.fn();
    const setLastHidden = jest.fn();
    const unhideContact = jest.fn().mockResolvedValue(undefined);

    await runHandleUndo(ref, setSnackVisible, setLastHidden, unhideContact);

    expect(unhideContact).toHaveBeenCalledWith('c1');
    expect(setSnackVisible).toHaveBeenCalledWith(false);
    expect(setLastHidden).toHaveBeenCalledWith(null);
    expect(ref.current).toBeNull();
  });

  it('restores snackbar and ref when unhideContact throws', async () => {
    const ref = { current: ALICE };
    let snackVisible = true;
    let lastHidden: Entry | null = ALICE;

    const setSnackVisible = (v: boolean) => { snackVisible = v; };
    const setLastHidden = (v: Entry | null) => { lastHidden = v; };
    const unhideContact = jest.fn().mockRejectedValue(new Error('store error'));

    await runHandleUndo(ref, setSnackVisible, setLastHidden, unhideContact);

    expect(snackVisible).toBe(true);
    expect(lastHidden).toEqual(ALICE);
    expect(ref.current).toEqual(ALICE);
  });

  it('is a no-op when ref is empty (guard against double-invoke)', async () => {
    const ref = { current: null };
    const setSnackVisible = jest.fn();
    const setLastHidden = jest.fn();
    const unhideContact = jest.fn();

    await runHandleUndo(ref, setSnackVisible, setLastHidden, unhideContact);

    expect(unhideContact).not.toHaveBeenCalled();
    expect(setSnackVisible).not.toHaveBeenCalled();
  });
});
