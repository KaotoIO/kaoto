import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DocumentService } from '../../services/document/document.service';
import { createPostMessageBridge } from '../bridge';
import type { IEventBus } from '../contracts';
import { createEventBus } from '../event-bus';
import { createMemoryTransports } from '../transports/memory';
import { HostBridgeProvider } from './context';
import { useHostMetadata } from './use-host-metadata';

describe('useHostMetadata', () => {
  const createWrapper =
    (bus: IEventBus): React.FC<PropsWithChildren> =>
    ({ children }) => <HostBridgeProvider bus={bus}>{children}</HostBridgeProvider>;

  it('returns undefined when the host has no value', async () => {
    const bus: Partial<IEventBus> = { request: vi.fn().mockResolvedValue({ value: null }) };
    const { result } = renderHook(() => useHostMetadata(), { wrapper: createWrapper(bus as IEventBus) });

    await expect(result.current.getMetadata('key')).resolves.toBeUndefined();
    expect(bus.request).toHaveBeenCalledWith('editor:metadata:get', { key: 'key' });
  });

  it('drops undefined properties before sending the metadata', async () => {
    const bus: Partial<IEventBus> = { request: vi.fn().mockResolvedValue(null) };
    const { result } = renderHook(() => useHostMetadata(), { wrapper: createWrapper(bus as IEventBus) });

    await result.current.setMetadata('id', {
      sourceBody: { type: 'XML Schema', filePath: ['Cart.xsd'], rootElementChoice: undefined },
    });

    expect(bus.request).toHaveBeenCalledWith('editor:metadata:set', {
      key: 'id',
      value: { sourceBody: { type: 'XML Schema', filePath: ['Cart.xsd'] } },
    });
  });

  it('sends null to remove the metadata', async () => {
    const bus: Partial<IEventBus> = { request: vi.fn().mockResolvedValue(null) };
    const { result } = renderHook(() => useHostMetadata(), { wrapper: createWrapper(bus as IEventBus) });

    await result.current.setMetadata('id', undefined);

    expect(bus.request).toHaveBeenCalledWith('editor:metadata:set', { key: 'id', value: null });
  });

  it('rejects metadata that is not JSON without calling the host', async () => {
    const bus: Partial<IEventBus> = { request: vi.fn() };
    const { result } = renderHook(() => useHostMetadata(), { wrapper: createWrapper(bus as IEventBus) });

    await expect(result.current.setMetadata('id', () => null)).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(bus.request).not.toHaveBeenCalled();
  });

  it('persists the metadata of an attached schema through the bridge, although its optional fields are undefined', async () => {
    const { host, editor } = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: editor });
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);
    const received: { key: string; value: unknown }[] = [];
    hostBus.onRequest('editor:metadata:set', (payload) => {
      received.push(payload);
      return null;
    });
    const { result } = renderHook(() => useHostMetadata(), { wrapper: createWrapper(editorBus) });

    const schema = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Cart" type="xs:string"/></xs:schema>`;
    const created = await DocumentService.createDocument(
      { getResourceContent: () => Promise.resolve(schema) } as unknown as IMetadataApi,
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      'Body',
      ['Cart.xsd'],
    );
    const definition = created.documentDefinition!;
    expect(definition.rootElementChoice).toBeUndefined();

    await DataMapperMetadataService.updateSourceBodyMetadata(
      { ...result.current, shouldSaveSchema: false } as unknown as IMetadataApi,
      'datamapper-id',
      DataMapperMetadataService.createMetadata('mapping.xsl'),
      definition,
    );

    expect(received).toHaveLength(1);
    expect(received[0].key).toBe('datamapper-id');
    expect(received[0].value).toMatchObject({
      xsltPath: 'mapping.xsl',
      sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['Cart.xsd'] },
    });
    hostBridge.dispose();
    editorBridge.dispose();
  });
});
