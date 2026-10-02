import { useMemo } from 'react';
import type { FileTypes, FileTypesResponse } from '@kaoto/editor-api';
import { useHostBus } from './context';

export function useHostResources() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      getResourceContent: (path: string): Promise<string | undefined> =>
        bus.request('editor:resource:getContent', { path }).then((r) => r.content ?? undefined),
      saveResourceContent: (path: string, content: string): Promise<void> =>
        bus.request('editor:resource:save', { path, content }).then(() => undefined),
      isResourceExist: (path: string): Promise<boolean> =>
        bus.request('editor:resource:exists', { path }).then((r) => r.exists),
      deleteResource: (path: string): Promise<boolean> =>
        bus.request('editor:resource:delete', { path }).then((r) => r.success),
      getResourcesContentByType: (fileType: FileTypes): Promise<FileTypesResponse[]> =>
        bus.request('editor:resource:getByType', { fileType }).then((r) => r.resources),
    }),
    [bus],
  );
}
