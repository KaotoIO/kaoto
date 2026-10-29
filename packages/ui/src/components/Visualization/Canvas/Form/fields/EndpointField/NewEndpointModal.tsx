import './NewEndpointModal.scss';

import { Button, ComposedModal, Layer, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { CanvasFormTabsContextResult, isDefined, ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  onConfirm: (type: string, model: Record<string, unknown>) => void;
  onCancel: () => void;
};

export const NewEndpointModal: FunctionComponent<EndpointModalProps> = ({
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
  const [endpointModel, setEndpointModel] = useState<unknown>(endpoint);
  const [endpointType, setEndpointType] = useState<string | undefined>(type);
  const catalogModalContext = useContext(CatalogModalContext);
  const hasSelectedEndpoint = useRef(false);
  /** When no endpoint is provided, the catalog modal is shown first and this modal waits for its outcome */
  const [isSelectingType, setIsSelectingType] = useState(!isDefined(endpoint));

  const selectEndpoint = useCallback(async () => {
    /** Open Catalog modal, filtering the compatible nodes */
    const endpointComponent = await catalogModalContext?.getNewComponent(((item: ITile) => {
      return item.type === CatalogKind.TestEndpoint;
    }) as TileFilter);

    return endpointComponent?.name;
  }, [catalogModalContext]);

  const onEndpointModelChange = (_propName: string, model: unknown) => {
    const jsonRecord = { ...(model as Record<string, unknown>) };
    // sanitize generated endpoint model
    for (const key in jsonRecord) {
      if (typeof jsonRecord[key] === 'object') {
        jsonRecord[key] = undefined;
      }
    }

    setEndpointModel(jsonRecord);
  };

  const handleConfirm = useCallback(() => {
    if (!endpointType || endpointModel === undefined || typeof endpointModel !== 'object') {
      return;
    }

    onConfirm(endpointType, endpointModel as Record<string, unknown>);
  }, [endpointType, endpointModel, onConfirm]);

  useEffect(() => {
    if (!isDefined(endpointModel) && !hasSelectedEndpoint.current) {
      hasSelectedEndpoint.current = true;
      selectEndpoint()
        .then((selectedType) => {
          if (selectedType) {
            setEndpointType(selectedType);
            setEndpointModel({});
          }
        })
        .catch(() => {
          /* catalog modal was dismissed */
        })
        .finally(() => {
          setIsSelectingType(false);
        });
    }
  }, [endpointModel, endpointsSchema, selectEndpoint]);

  if (!endpointsSchema || isSelectingType) {
    return null;
  }

  /** Render in document.body so the modal overlay covers the whole app instead of the surrounding form */
  return createPortal(
    <ComposedModal open size="lg" data-testid="NewEndpointModal" onClose={onCancel}>
      <ModalHeader title={`${mode} endpoint`} />

      <ModalBody>
        <p className="new-endpoint-modal__subtitle">
          Send and receive test actions may reference this endpoint by its name when sending and receiving messages
          during the test.
        </p>

        {/* ModalBody is already a Layer, reset it so the form starts on the same (white) layer as the canvas form */}
        <Layer level={0}>
          <ModelContextProvider model={endpointModel} onPropertyChange={onEndpointModelChange}>
            <SchemaProvider schema={endpointsSchema}>
              {/* The modal is rendered through a portal and must not inherit the outer canvas form tab */}
              <CanvasFormTabsProvider tab="All">
                <EndpointFieldInner
                  mode={mode}
                  propName={ROOT_PATH}
                  model={endpointModel}
                  endpointType={endpointType}
                  setEndpointType={setEndpointType}
                  onModelChange={setEndpointModel}
                />
              </CanvasFormTabsProvider>
            </SchemaProvider>
          </ModelContextProvider>
        </Layer>
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={onCancel} data-testid="endpoint-modal-cancel-btn">
          Cancel
        </Button>
        <Button
          kind="primary"
          disabled={endpointModel === undefined || endpointType === ''}
          onClick={handleConfirm}
          data-testid="endpoint-modal-confirm-btn"
        >
          {mode}
        </Button>
      </ModalFooter>
    </ComposedModal>,
    document.body,
  );
};
