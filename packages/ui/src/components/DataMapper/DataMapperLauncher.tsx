import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useState } from 'react';
import { IVisualizationNode } from '../../models';
import DataMapperPage from '../../pages/DataMapper/DataMapperPage';
import './DataMapperLauncher.scss';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)} icon={<WrenchIcon />}>
        Configure
      </Button>
      <Modal
        aria-label="DataMapper Modal"
        className="datamapper-launcher-modal"
        position="top"
        variant={ModalVariant.large}
        width="95%"
        isOpen={isOpen}
        onClose={onClose}
        data-testid="datamapper-launcher-modal"
        actions={[
          <Button key="close-datamapper" onClick={onClose} data-testid="close-datamapper-btn">
            Close
          </Button>,
        ]}
      >
        <DataMapperPage vizNode={vizNode!} />
      </Modal>
    </>
  );
};

export default DataMapperLauncher;
