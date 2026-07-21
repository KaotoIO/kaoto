import { Settings } from '@carbon/icons-react';
import { Button } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';

import { DataMapperSettingsModal } from './DataMapperSettingsModal';

export const DataMapperSettingsButton: FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const onModalOpen = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const onModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <Button
        icon={<Settings />}
        variant="plain"
        title="DataMapper Settings"
        aria-label="Settings"
        data-testid="datamapper-settings-button"
        onClick={onModalOpen}
      />

      <DataMapperSettingsModal isModalOpen={isModalOpen} onModalClose={onModalClose} />
    </>
  );
};
