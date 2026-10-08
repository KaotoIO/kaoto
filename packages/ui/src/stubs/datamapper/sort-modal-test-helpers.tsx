import { act, screen, waitFor } from '@testing-library/react';
import { editor } from 'monaco-editor';
import { FunctionComponent, PropsWithChildren } from 'react';

import { MappingTree } from '../../models/datamapper/mapping';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { endPointerDrag, firePrimaryPointerDown } from '../dnd-test-helpers';
import { createDataMapperContext, createDataMapperContextWrapper } from './data-mapper-context';

/**
 * Wrapper for the sort / for-each-group modals: a DataMapper context with the given mapping tree, plus the
 * `MappingLinksProvider` the embedded (real) XPath editor needs.
 */
export const createSortModalWrapper = (mappingTree: MappingTree): FunctionComponent<PropsWithChildren> => {
  const DataMapperContextWrapper = createDataMapperContextWrapper(createDataMapperContext({ mappingTree }));
  const SortModalWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperContextWrapper>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperContextWrapper>
  );
  return SortModalWrapper;
};

/** Starts a real pointer drag on the `DragDropSort` drag handle at the given index. */
export const startSortKeyDrag = (index: number) => {
  firePrimaryPointerDown(screen.getAllByRole('button', { name: 'Drag button' })[index]);
};

/**
 * Drops the dragged sort key. In JSDOM every element has an empty rect, so the drop target is the first sort key.
 * See {@link endPointerDrag}: it also waits until clicks work again.
 */
export const endSortKeyDrag = endPointerDrag;

/** Replaces the content of the open (real, Monaco based) XPath editor, like a user typing into it. */
export const typeInXPathEditor = async (expression: string) => {
  await waitFor(() => {
    expect(editor.getEditors().length).toBeGreaterThan(0);
  });
  act(() => {
    editor.getEditors().at(-1)!.getModel()!.setValue(expression);
  });
};
