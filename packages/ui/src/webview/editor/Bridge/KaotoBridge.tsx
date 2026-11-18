import { SuggestionRegistryProvider } from '@kaoto/forms';
import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useMemo } from 'react';

import { NodeInteractionAddonProvider } from '../../../components/registers/interactions/node-interaction-addon.provider';
import { RegisterComponents } from '../../../components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from '../../../components/registers/RegisterNodeInteractionAddons';
import { RenderingProvider } from '../../../components/RenderingAnchor/rendering.provider';
import { ControllerService } from '../../../components/Visualization/Canvas/controller.service';
import { CatalogTilesProvider } from '../../../dynamic-catalog/catalog-tiles.provider';
import { IMetadataApi, MetadataProvider, VisibleFlowsProvider } from '../../../providers';

export const KaotoBridge: FunctionComponent<PropsWithChildren<IMetadataApi>> = ({
  children,
  getMetadata,
  setMetadata,
  getResourceContent,
  saveResourceContent,
  isResourceExist,
  deleteResource,
  askUserForFileSelection,
  getSuggestions,
  shouldSaveSchema,
  onStepUpdated,
}) => {
  const controller = useMemo(() => ControllerService.createController(), []);
  const metadataApi: IMetadataApi = useMemo(
    () => ({
      getMetadata,
      setMetadata,
      getResourceContent,
      saveResourceContent,
      isResourceExist,
      deleteResource,
      askUserForFileSelection,
      getSuggestions,
      shouldSaveSchema,
      onStepUpdated,
    }),
    [
      getMetadata,
      setMetadata,
      getResourceContent,
      saveResourceContent,
      isResourceExist,
      deleteResource,
      askUserForFileSelection,
      getSuggestions,
      shouldSaveSchema,
      onStepUpdated,
    ],
  );

  return (
    <CatalogTilesProvider>
      <VisualizationProvider controller={controller}>
        <VisibleFlowsProvider>
          <RenderingProvider>
            <MetadataProvider api={metadataApi}>
              <RegisterComponents>
                <NodeInteractionAddonProvider>
                  <RegisterNodeInteractionAddons>
                    <SuggestionRegistryProvider>{children}</SuggestionRegistryProvider>
                  </RegisterNodeInteractionAddons>
                </NodeInteractionAddonProvider>
              </RegisterComponents>
            </MetadataProvider>
          </RenderingProvider>
        </VisibleFlowsProvider>
      </VisualizationProvider>
    </CatalogTilesProvider>
  );
};
