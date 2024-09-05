import { act, fireEvent, render, screen } from '@testing-library/react';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { SourceTargetView } from './SourceTargetView';

import { shipOrderXsd } from '../../stubs/data-mapper';

describe('SourceTargetView', () => {
  describe('Source Body Document', () => {
    it('should attach and detach schema', async () => {
      render(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <SourceTargetView />
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
      );
      const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileInput = screen.getByTestId('attach-schema-sourceBody-Body-file-input');
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });
      const shipTo = await screen.findByText('ShipTo');
      expect(shipTo).toBeTruthy();
      const detachButton = screen.getByTestId('detach-schema-sourceBody-Body-button');
      act(() => {
        fireEvent.click(detachButton);
      });
      const detachConfirmButton = screen.getByTestId('detach-schema-modal-confirm-btn');
      act(() => {
        fireEvent.click(detachConfirmButton);
      });
      await screen.findByTestId('attach-schema-sourceBody-Body-button');
      expect(screen.queryByTestId('ShipTo')).toBeFalsy();
    });
  });

  describe('Target Body Document', () => {
    it('should attach and detach schema', async () => {
      render(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <SourceTargetView />
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
      );
      const attachButton = await screen.findByTestId('attach-schema-targetBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileInput = screen.getByTestId('attach-schema-targetBody-Body-file-input');
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });
      const shipTo = await screen.findByText('ShipTo');
      expect(shipTo).toBeTruthy();
      const detachButton = screen.getByTestId('detach-schema-targetBody-Body-button');
      act(() => {
        fireEvent.click(detachButton);
      });
      const detachConfirmButton = screen.getByTestId('detach-schema-modal-confirm-btn');
      act(() => {
        fireEvent.click(detachConfirmButton);
      });
      await screen.findByTestId('attach-schema-sourceBody-Body-button');
      expect(screen.queryByTestId('ShipTo')).toBeFalsy();
    });
  });
});
