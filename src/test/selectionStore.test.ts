import { beforeEach, describe, expect, it } from 'vitest';

import { useSelectionStore } from '../store/selection';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      folderId: undefined,
      pageId: undefined
    });
  });

  it('setFolder updates folder selection and clears any selected page', () => {
    useSelectionStore.setState({ folderId: 'f1', pageId: 'p1' });
    useSelectionStore.getState().setFolder('f2');

    const state = useSelectionStore.getState();
    expect(state.folderId).toBe('f2');
    expect(state.pageId).toBeUndefined();
  });

  it('selectPage stores both folder and page identifiers', () => {
    useSelectionStore.getState().selectPage('f3', 'p3');

    const state = useSelectionStore.getState();
    expect(state.folderId).toBe('f3');
    expect(state.pageId).toBe('p3');
  });

  it('clear resets folder and page selection', () => {
    useSelectionStore.setState({ folderId: 'f1', pageId: 'p1' });
    useSelectionStore.getState().clear();

    const state = useSelectionStore.getState();
    expect(state.folderId).toBeUndefined();
    expect(state.pageId).toBeUndefined();
  });
});
