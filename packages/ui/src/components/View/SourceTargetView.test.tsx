import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { BrowserFilePickerMetadataProvider } from '../../stubs/BrowserFilePickerMetadataProvider';
import { camelYamlDslJsonSchema, shipOrderJsonSchema, shipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { SourceTargetView } from './SourceTargetView';

// Mock ResizeObserver for ExpansionPanels
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      // intentional noop for test mock
    }
    unobserve() {
      // intentional noop for test mock
    }
    disconnect() {
      // intentional noop for test mock
    }
  };
});

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
        const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
        expect(xmlSchemaRadio.checked).toBeTruthy();
        const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
        expect(jsonSchemaRadio.checked).toBeFalsy();
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
        const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
        expect(jsonSchemaRadio.checked).toBeTruthy();
        const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
        expect(xmlSchemaRadio.checked).toBeFalsy();
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

    it('should attach Camel YAML JSON schema', async () => {
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

      const fileContent = new File([new Blob([camelYamlDslJsonSchema])], 'CamelYamlDsl.json', { type: 'text/plain' });
      act(() => {
        fireEvent.click(attachButton);
      });
      const fileInput = screen.getByTestId('attach-schema-file-input');
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('CamelYamlDsl.json');
        const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
        expect(jsonSchemaRadio.checked).toBeTruthy();
        const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
        expect(xmlSchemaRadio.checked).toBeFalsy();
      });

      const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
      act(() => {
        fireEvent.click(commitButton);
      });

      await waitFor(() => {
        const map = screen.getAllByTestId(/node-target-fj-map-\d+/);
        expect(map.length).toEqual(15);
      });
    }, 30_000);
  });

  describe('Zoom Controls', () => {
    it('should render zoom in and zoom out buttons', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const zoomInButton = screen.getByLabelText('Zoom in');
      const zoomOutButton = screen.getByLabelText('Zoom out');

      expect(zoomInButton).toBeInTheDocument();
      expect(zoomOutButton).toBeInTheDocument();
    });

    it('should increase scale factor when zoom in is clicked', async () => {
      const { container } = render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const zoomInButton = screen.getByLabelText('Zoom in');
      const sourceTargetView = container.querySelector('.source-target-view') as HTMLElement;

      // Initial scale should be 1
      expect(sourceTargetView.style.getPropertyValue('--datamapper-scale-factor')).toBe('1');

      act(() => {
        fireEvent.click(zoomInButton);
      });

      // After zoom in, scale should be 1.1
      await waitFor(() => {
        expect(sourceTargetView.style.getPropertyValue('--datamapper-scale-factor')).toBe('1.1');
      });
    });

    it('should decrease scale factor when zoom out is clicked', async () => {
      const { container } = render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const zoomOutButton = screen.getByLabelText('Zoom out');
      const sourceTargetView = container.querySelector('.source-target-view') as HTMLElement;

      // Initial scale should be 1
      expect(sourceTargetView.style.getPropertyValue('--datamapper-scale-factor')).toBe('1');

      act(() => {
        fireEvent.click(zoomOutButton);
      });

      // After zoom out, scale should be 0.9
      await waitFor(() => {
        expect(sourceTargetView.style.getPropertyValue('--datamapper-scale-factor')).toBe('0.9');
      });
    });

    it('should not zoom in beyond max scale (1.2x)', async () => {
      const { container } = render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const zoomInButton = screen.getByLabelText('Zoom in');
      const sourceTargetView = container.querySelector('.source-target-view') as HTMLElement;

      // Click zoom in 3 times (1.0 -> 1.1 -> 1.2 -> should stay at 1.2)
      act(() => {
        fireEvent.click(zoomInButton);
        fireEvent.click(zoomInButton);
        fireEvent.click(zoomInButton);
      });

      await waitFor(() => {
        expect(sourceTargetView.style.getPropertyValue('--datamapper-scale-factor')).toBe('1.2');
      });
    });

    it('should not zoom out beyond min scale (0.7x)', async () => {
      const { container } = render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <SourceTargetView />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const zoomOutButton = screen.getByLabelText('Zoom out');
      const sourceTargetView = container.querySelector('.source-target-view') as HTMLElement;

      // Click zoom out 4 times (1.0 -> 0.9 -> 0.8 -> 0.7 -> should stay at 0.7)
      act(() => {
        fireEvent.click(zoomOutButton);
        fireEvent.click(zoomOutButton);
        fireEvent.click(zoomOutButton);
        fireEvent.click(zoomOutButton);
      });

      await waitFor(() => {
        expect(sourceTargetView.style.getPropertyValue('--datamapper-scale-factor')).toBe('0.7');
      });
    });
  });
});
