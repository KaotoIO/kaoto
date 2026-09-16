import { useMemo } from 'react';

import { useHostBus } from './context';
import { FilePickerOptions } from './contracts';

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
