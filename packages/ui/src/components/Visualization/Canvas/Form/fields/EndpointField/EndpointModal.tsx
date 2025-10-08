import { isDefined } from '@kaoto/forms';
import { CanvasFormTabsContext, CanvasFormTabsContextResult, ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CatalogModalContext } from '../../../../../../dynamic-catalog/catalog-modal.provider';
import { CatalogKind, KaotoSchemaDefinition } from '../../../../../../models';
import { ROOT_PATH } from '../../../../../../utils';
import { ITile, TileFilter } from '../../../../../Catalog';
import { EndpointFieldInner } from './EndpointFieldInner';

export type EndpointModalProps = {
  mode: string;
  endpoint?: unknown;
  type?: string;
  endpointsSchema?: KaotoSchemaDefinition['schema'];
  onConfirm: (type: string, model: unknown) => void;
  onCancel: () => void;
};

export const EndpointModal: FunctionComponent<EndpointModalProps> = ({
  mode,
  endpoint,
  type,
  endpointsSchema,
  onConfirm,
  onCancel,
}) => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const [endpointModel = endpoint, setEndpointModel] = useState<unknown>();
  const [endpointType, setEndpointType] = useState<string | undefined>(type);
  const catalogModalContext = useContext(CatalogModalContext);

  useEffect(() => {
    if (!isDefined(endpointModel)) {
      selectEndpoint().then((selectedType) => {
        if (selectedType) {
          setEndpointType(selectedType);
          setEndpointModel({});
        }
      });
    }
  });

  const selectEndpoint = useCallback(async () => {
    /** Open Catalog modal, filtering the compatible nodes */
    const endpointComponent = await catalogModalContext?.getNewComponent(((item: ITile) => {
      return item.type === CatalogKind.TestEndpoint;
    }) as TileFilter);

    return endpointComponent?.name;
  }, [catalogModalContext]);

  const onEndpointModelChange = (_propName: string, model: unknown) => {
    const jsonRecord = model as Record<string, unknown>;
    // sanitize generated endpoint model
    for (const key in jsonRecord) {
      if (typeof jsonRecord[key] === 'object') {
        jsonRecord[key] = undefined;
      }
    }

    setEndpointModel(jsonRecord);
  };

  const handleConfirm = useCallback(async () => {
    if (!endpointType || endpointModel === undefined || typeof endpointModel !== 'object') {
      return;
    }

    onConfirm(endpointType, endpointModel);
  }, [endpointType, endpointModel, onConfirm]);

  if (!isDefined(endpointsSchema)) {
    return null;
  }

  return (
    <Modal isOpen variant={ModalVariant.large} data-testid="EndpointModal" onClose={onCancel} ouiaId="EndpointModal">
      <ModalHeader
        title={`${mode} endpoint`}
        description="Send and receive test actions may reference this endpoint by its name when sending and receiving messages during the test."
      />

      <ModalBody>
        <ModelContextProvider model={endpointModel} onPropertyChange={onEndpointModelChange}>
          <SchemaProvider schema={endpointsSchema}>
            <CanvasFormTabsContext.Provider value={formTabsValue}>
              <EndpointFieldInner
                propName={ROOT_PATH}
                model={endpointModel}
                endpointType={endpointType}
                setEndpointType={setEndpointType}
                onModelChange={setEndpointModel}
              />
            </CanvasFormTabsContext.Provider>
          </SchemaProvider>
        </ModelContextProvider>
      </ModalBody>

      <ModalFooter>
        <Button
          key="confirm"
          variant="primary"
          isDisabled={endpointModel === undefined}
          onClick={handleConfirm}
          data-testid="endpoint-modal-confirm-btn"
        >
          {mode}
        </Button>
        <Button key="cancel" variant="link" onClick={onCancel} data-testid="endpoint-modal-cancel-btn">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
