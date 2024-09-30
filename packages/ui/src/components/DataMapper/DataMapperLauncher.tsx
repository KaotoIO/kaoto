import { Alert, Button, List, ListItem, Modal, ModalVariant } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useState } from 'react';
import { IVisualizationNode } from '../../models';
import DataMapperPage from '../../pages/DataMapper/DataMapperPage';
import './DataMapperLauncher.scss';
import { MetadataContext } from '../../providers';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const metadata = useContext(MetadataContext);
  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return metadata ? (
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
  ) : (
    <Alert variant="info" title={'The Kaoto DataMapper cannot be configured'}>
      <p>
        At the moment, the Kaoto DataMapper cannot be configured using the browser directly. Please use the VS Code
        extension for an enhanced experience. The Kaoto extension is bundled in the&nbsp;
        <a href="https://marketplace.visualstudio.com/items?itemName=redhat.apache-camel-extension-pack">
          Extension Pack for Apache Camel
        </a>
      </p>
    </Alert>
  );
};

export default DataMapperLauncher;
