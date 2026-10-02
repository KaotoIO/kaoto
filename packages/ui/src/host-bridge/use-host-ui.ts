import { useMemo } from 'react';
import type { FilePickerOptions } from '@kaoto/editor-api';
import { useHostBus } from './context';

export function useHostUI() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      askUserForFileSelection: (
        include: string,
        exclude?: string,
        options?: FilePickerOptions,
      ): Promise<string[] | string | undefined> =>
        bus
          .request('host:ui:pickFile', {
            include,
            ...(exclude !== undefined ? { exclude } : {}),
            ...(options !== undefined ? { options } : {}),
          })
          .then((r) => r.selection ?? undefined),
    }),
    [bus],
  );
}
