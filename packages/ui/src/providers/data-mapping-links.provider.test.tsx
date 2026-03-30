import { act, render, screen } from '@testing-library/react';
import { useContext } from 'react';

import { useDocumentTreeStore } from '../store';
import { MappingLinksContext, MappingLinksProvider } from './data-mapping-links.provider';
import { DataMapperProvider } from './datamapper.provider';

describe('DataMappingLinksProvider', () => {
  it('should render', async () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <div data-testid="testdiv" />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('testdiv')).toBeInTheDocument();
  });

  it('should fail if not within DataMapperProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const thrower = () => {
      render(<MappingLinksProvider></MappingLinksProvider>);
    };
    expect(thrower).toThrow();
    consoleSpy.mockRestore();
  });

  describe('isNodeInSelectedMapping()', () => {
    afterEach(() => {
      useDocumentTreeStore.getState().clearSelection();
    });

    it('should return false when no node is selected', () => {
      let capturedFn: ((path: string) => boolean) | undefined;

      const TestConsumer = () => {
        const ctx = useContext(MappingLinksContext)!;
        capturedFn = ctx.isNodeInSelectedMapping;
        return null;
      };

      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TestConsumer />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );

      expect(capturedFn?.('any/path')).toBe(false);
    });

    it('should call MappingLinksService when a node is selected', async () => {
      let capturedFn: ((path: string) => boolean) | undefined;

      const TestConsumer = () => {
        const ctx = useContext(MappingLinksContext)!;
        capturedFn = ctx.isNodeInSelectedMapping;
        return null;
      };

      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TestConsumer />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );

      act(() => {
        useDocumentTreeStore.getState().setSelectedNode('some/source/path', true);
      });

      expect(capturedFn?.('some/path')).toBe(false);
    });
  });
});
