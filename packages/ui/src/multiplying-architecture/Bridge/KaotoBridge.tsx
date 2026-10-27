import { SuggestionRegistryProvider } from '@kaoto/forms';
import { ChannelType, StateControlCommand } from '@kie-tools-core/editor/dist/api';
import { Notification } from '@kie-tools-core/notifications/dist/api';
import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { NodeInteractionAddonProvider } from '../../components/registers/interactions/node-interaction-addon.provider';
import { RegisterComponents } from '../../components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from '../../components/registers/RegisterNodeInteractionAddons';
import { RenderingProvider } from '../../components/RenderingAnchor/rendering.provider';
import { ControllerService } from '../../components/Visualization/Canvas/controller.service';
import { CatalogTilesProvider } from '../../dynamic-catalog/catalog-tiles.provider';
import { CitrusTestVisualEntity } from '../../models/visualization/flows';
import { EntitiesContext, IMetadataApi, MetadataProvider, VisibleFlowsProvider } from '../../providers';

interface KaotoBridgeProps extends IMetadataApi {
  /**
   * Delegation for KogitoEditorChannelApi.kogitoEditor_ready() to signal to the Channel
   * that the editor is ready.
   */
  onReady: () => void;

  /**
   * Delegation for KogitoEditorChannelApi.kogitoEditor_stateControlCommandUpdate(command) to signal to the Channel
   * that the editor is performing an undo/redo operation.
   */
  onStateControlCommandUpdate: (command: StateControlCommand) => void;

  /**
   * Delegation for NotificationsChannelApi.kogigotNotifications_setNotifications(path, notifications) to report all validation
   * notifications to the Channel that will replace existing notification for the path.
   * @param path The path that references the Notification
   * @param notifications List of Notifications
   */
  setNotifications: (path: string, notifications: Notification[]) => void;

  /**
   * ChannelType where the component is running.
   */
  channelType: ChannelType;
}

export const KaotoBridge: FunctionComponent<PropsWithChildren<KaotoBridgeProps>> = ({
  onReady,
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
  getTestReport,
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
      getTestReport,
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
      getTestReport,
    ],
  );

  /** Set editor as Ready */
  useEffect(() => {
    onReady();
  }, [onReady]);

  /** Load test reports for Citrus test entities */
  const entitiesContext = useContext(EntitiesContext);
  const entitiesContextRef = useRef(entitiesContext);
  useEffect(() => {
    entitiesContextRef.current = entitiesContext;
  });

  const reportGenerationRef = useRef(0);

  const loadTestReports = useCallback(() => {
    const ctx = entitiesContextRef.current;
    if (!ctx?.visualEntities || !getTestReport) return;

    const citrusEntities = ctx.visualEntities.filter(
      (e): e is CitrusTestVisualEntity => e instanceof CitrusTestVisualEntity,
    );
    if (citrusEntities.length === 0) return;

    const generation = reportGenerationRef.current;
    let cancelled = false;
    for (const entity of citrusEntities) {
      void getTestReport(entity.id).then((report) => {
        if (cancelled || generation !== reportGenerationRef.current) return;
        if (report) {
          entity.applyTestReport(report);
        } else {
          entity.clearTestReport();
        }
        ctx.refreshVisualEntities();
      });
    }

    return () => {
      cancelled = true;
    };
  }, [getTestReport]);

  const hasEntities = (entitiesContext?.visualEntities?.length ?? 0) > 0;
  useEffect(() => {
    if (hasEntities) {
      return loadTestReports();
    }
  }, [hasEntities, loadTestReports]);

  const clearTestReports = useCallback(() => {
    reportGenerationRef.current += 1;
    const ctx = entitiesContextRef.current;
    if (!ctx?.visualEntities) return;

    const citrusEntities = ctx.visualEntities.filter(
      (e): e is CitrusTestVisualEntity => e instanceof CitrusTestVisualEntity,
    );

    for (const entity of citrusEntities) {
      entity.clearTestReport();
    }
    ctx.refreshVisualEntities();
  }, []);

  /** Listen for test run started / test report ready messages from the extension */
  useEffect(() => {
    const expectedOrigin = window.location.origin;
    const handler = (event: MessageEvent) => {
      if (event.origin && event.origin !== expectedOrigin) return;
      if (event.data?.type === 'kaoto__testRunStarted') {
        clearTestReports();
      } else if (event.data?.type === 'kaoto__testReportReady') {
        loadTestReports();
      }
    };
    window.addEventListener('message', handler); // NOSONAR — origin verified in handler
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [loadTestReports, clearTestReports]);

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
