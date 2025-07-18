import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { SourceTargetView } from './SourceTargetView';

import { shipOrderJsonSchema, shipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { BrowserFilePickerMetadataProvider } from '../../stubs/BrowserFilePickerMetadataProvider';

describe('SourceTargetView', () => {
  describe('Source Body Document', () => {
    it('should attach and detach schema', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );
      const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });
      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileInput = screen.getByTestId('attach-schema-file-input');
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('ShipOrder.xsd');
      });

      const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
      act(() => {
        fireEvent.click(commitButton);
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

    it('should not show JSON schema option for Source Body', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );
      const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });

      await screen.findByTestId('attach-schema-modal-option-xml');
      const jsonSchemaRadio = await screen.queryByTestId('attach-schema-modal-option-json');
      expect(jsonSchemaRadio).toBeFalsy();
    });
  });

  describe('Target Body Document', () => {
    it('should attach and detach schema', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );
      const attachButton = await screen.findByTestId('attach-schema-targetBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });
      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileInput = screen.getByTestId('attach-schema-file-input');
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('ShipOrder.xsd');
      });

      const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
      act(() => {
        fireEvent.click(commitButton);
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
      expect(screen.queryByText('ShipTo')).toBeFalsy();
    });

    it('should attach JSON schema', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );
      const attachButton = await screen.findByTestId('attach-schema-targetBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });
      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const jsonSchemaRadio = await screen.findByTestId('attach-schema-modal-option-json');
      act(() => {
        fireEvent.click(jsonSchemaRadio);
      });

      const fileContent = new File([new Blob([shipOrderJsonSchema])], 'ShipOrder.json', { type: 'text/plain' });
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileInput = screen.getByTestId('attach-schema-file-input');
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('ShipOrder.json');
      });

      const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
      act(() => {
        fireEvent.click(commitButton);
      });

      const shipTo = await screen.findByText('map [@key = ShipTo]');
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
      expect(screen.queryByText('map [@key = ShipTo]')).toBeFalsy();
    });
  });
});
