// Hosts of this component do not load carbon-overrides.scss, which carries these PatternFly adjustments
import '../../styles/patternfly-carbon-compat.scss';

import { SuggestionRegistryProvider } from '@kaoto/forms';
import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { NodeInteractionAddonProvider } from '../../components/registers/interactions/node-interaction-addon.provider';
import {
  componentModeRegistration,
  groupAutoStartupRegistration,
  RegisterComponents,
} from '../../components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from '../../components/registers/RegisterNodeInteractionAddons';
import { RenderingProvider } from '../../components/RenderingAnchor/rendering.provider';
import { DesignerVisualization } from '../../components/Visualization';
import { ControllerService } from '../../components/Visualization/Canvas/controller.service';
import { CatalogLoaderProvider } from '../../dynamic-catalog/catalog.provider';
import { CatalogModalProvider } from '../../dynamic-catalog/catalog-modal.provider';
import { CatalogTilesProvider } from '../../dynamic-catalog/catalog-tiles.provider';
import {
  EntitiesContext,
  EntitiesProvider,
  KaotoResourceProvider,
  ReloadProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisibleFlowsContext,
  VisibleFlowsProvider,
} from '../../providers';
import { ActionConfirmationModalContextProvider } from '../../providers/action-confirmation-modal.provider';
import { EventNotifier } from '../../utils';

/**
 * The DataMapper launcher is left out: it navigates to the DataMapper page of the Kaoto web app, which the hosts of
 * this component do not have.
 */
const componentsToRegister = [componentModeRegistration, groupAutoStartupRegistration];

const VisibleFlowsVisualization: FunctionComponent<{ className?: string; hotkeysDisabled?: boolean }> = ({
  className = '',
  hotkeysDisabled,
}) => {
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  // `showFlows()` dispatches an action that returns a new `visibleFlows`
  // reference, so depending on `visibleFlows` here would re-run this effect
  // indefinitely. We only need to reveal the flows once per api instance.
  useEffect(() => {
    visualFlowsApi.showFlows();
  }, [visualFlowsApi]);

  return (
    <DesignerVisualization
      className={`canvas-page ${className}`}
      entities={visualEntities}
      hotkeysDisabled={hotkeysDisabled}
    />
  );
};

const Viz: FunctionComponent<{
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  className?: string;
  hotkeysDisabled?: boolean;
}> = ({ catalogUrl, runtimeCatalogName, testingCatalogName, className = '', hotkeysDisabled }) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <ReloadProvider>
      <KaotoResourceProvider>
        <RuntimeProvider
          catalogUrl={catalogUrl}
          runtimeCatalogName={runtimeCatalogName}
          testingCatalogName={testingCatalogName}
        >
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <EntitiesProvider>
                <CatalogTilesProvider>
                  <VisualizationProvider controller={controller}>
                    <VisibleFlowsProvider>
                      {/* Renders the auto startup switch of routes and the component mode selector of the forms */}
                      <RenderingProvider>
                        <RegisterComponents components={componentsToRegister}>
                          {/* Step specific handling of copy, duplicate, paste, delete and update, e.g. DataMapper or Citrus waitFor */}
                          <NodeInteractionAddonProvider>
                            <RegisterNodeInteractionAddons>
                              {/* Required by the forms of the side panel to register their suggestion providers */}
                              <SuggestionRegistryProvider>
                                {/* Opens the catalog to add, append, prepend or replace a step and checks where a step fits */}
                                <CatalogModalProvider>
                                  {/* Asks before deleting a step with children, a route or a group */}
                                  <ActionConfirmationModalContextProvider>
                                    <VisibleFlowsVisualization
                                      className={className}
                                      hotkeysDisabled={hotkeysDisabled}
                                    />
                                  </ActionConfirmationModalContextProvider>
                                </CatalogModalProvider>
                              </SuggestionRegistryProvider>
                            </RegisterNodeInteractionAddons>
                          </NodeInteractionAddonProvider>
                        </RegisterComponents>
                      </RenderingProvider>
                    </VisibleFlowsProvider>
                  </VisualizationProvider>
                </CatalogTilesProvider>
              </EntitiesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </KaotoResourceProvider>
    </ReloadProvider>
  );
};

export const RouteVisualization: FunctionComponent<{
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  code: string;
  codeChange: (code: string) => void;
  className?: string;
  /**
   * Turns the page-wide hotkeys of the canvas off (Delete and Backspace). Set it while the canvas is kept mounted
   * but not shown, so that a key pressed elsewhere on the page does not delete the selected step.
   */
  hotkeysDisabled?: boolean;
}> = ({ catalogUrl, runtimeCatalogName, testingCatalogName, code, codeChange, className, hotkeysDisabled }) => {
  const eventNotifier = EventNotifier.getInstance();
  /** The code the entities currently represent, either parsed from `code` or serialized from a canvas edit */
  const entitiesCodeRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    return eventNotifier.subscribe('entities:updated', (code: string) => {
      entitiesCodeRef.current = code;
      codeChange(code);
    });
  }, [eventNotifier, codeChange]);

  useEffect(() => {
    // A host that feeds `codeChange` back into `code` would otherwise re-parse the canvas' own output,
    // rebuilding every node and dropping the selection, which closes the side panel after each edit.
    if (code === entitiesCodeRef.current) return;

    entitiesCodeRef.current = code;
    eventNotifier.next('code:updated', { code });
  }, [code, eventNotifier]);

  return (
    <Viz
      catalogUrl={catalogUrl}
      runtimeCatalogName={runtimeCatalogName}
      testingCatalogName={testingCatalogName}
      className={className}
      hotkeysDisabled={hotkeysDisabled}
    />
  );
};
