// Hosts of this component do not load carbon-overrides.scss, which carries these PatternFly adjustments
import '../../styles/patternfly-carbon-compat.scss';
import './RouteVisualization.scss';

import { SuggestionRegistryProvider } from '@kaoto/forms';
import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

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
import { useUndoRedo } from '../../hooks/undo-redo.hook';
import {
  EntitiesContext,
  EntitiesProvider,
  KaotoResourceProvider,
  ReloadProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeProvider,
  VisibleFlowsContext,
  VisibleFlowsProvider,
} from '../../providers';
import { ActionConfirmationModalContextProvider } from '../../providers/action-confirmation-modal.provider';
import type { SourceCodeAdapter } from '../../providers/source-code.provider';
import { EventNotifier } from '../../utils';
import { RouteSourceCode } from './RouteSourceCode';

/**
 * The DataMapper launcher is left out: it navigates to the DataMapper page of the Kaoto web app, which the hosts of
 * this component do not have.
 */
const componentsToRegister = [componentModeRegistration, groupAutoStartupRegistration];

const VisibleFlowsVisualization: FunctionComponent<{ className?: string }> = ({ className = '' }) => {
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  // `showFlows()` dispatches an action that returns a new `visibleFlows`
  // reference, so depending on `visibleFlows` here would re-run this effect
  // indefinitely. We only need to reveal the flows once per api instance.
  useEffect(() => {
    visualFlowsApi.showFlows();
  }, [visualFlowsApi]);

  return <DesignerVisualization className={`canvas-page ${className}`} entities={visualEntities} />;
};

const Viz: FunctionComponent<{
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  className?: string;
  adapter?: SourceCodeAdapter;
  view?: RouteVisualizationView;
  onUndoRedoChange?: (state: RouteVisualizationUndoRedo) => void;
}> = ({
  catalogUrl,
  runtimeCatalogName,
  testingCatalogName,
  className = '',
  adapter,
  view = 'design',
  onUndoRedoChange,
}) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <ReloadProvider>
      <SourceCodeBoundary adapter={adapter}>
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
                      {onUndoRedoChange && <UndoRedoReporter onUndoRedoChange={onUndoRedoChange} />}
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
                                      <div className="route-visualization-design" hidden={view === 'code'}>
                                        <VisibleFlowsVisualization className={className} />
                                      </div>
                                      {view === 'code' && (
                                        <div className="route-visualization-code">
                                          <RouteSourceCode />
                                        </div>
                                      )}
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
      </SourceCodeBoundary>
    </ReloadProvider>
  );
};

/** Inside the reload boundary, so a reload asks the adapter for the document again */
const SourceCodeBoundary: FunctionComponent<PropsWithChildren<{ adapter?: SourceCodeAdapter }>> = ({
  adapter,
  children,
}) => (adapter ? <SourceCodeProvider adapter={adapter}>{children}</SourceCodeProvider> : children);

export type RouteVisualizationView = 'design' | 'code';

/** The shared undo/redo history of the canvas and the code view, for hosts with their own Undo and Redo buttons */
export interface RouteVisualizationUndoRedo {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/** Reports the history from inside the providers, where undo and redo can reset the graph through the controller */
const UndoRedoReporter: FunctionComponent<{ onUndoRedoChange: (state: RouteVisualizationUndoRedo) => void }> = ({
  onUndoRedoChange,
}) => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useEffect(() => {
    onUndoRedoChange({ undo, redo, canUndo, canRedo });
  }, [undo, redo, canUndo, canRedo, onUndoRedoChange]);

  return null;
};

interface RouteVisualizationBaseProps {
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  className?: string;
}

/** The host owns the code and feeds it back after every change, like a controlled input */
interface RouteVisualizationCodeProps extends RouteVisualizationBaseProps {
  code: string;
  codeChange: (code: string) => void;
  adapter?: never;
  view?: never;
  onUndoRedoChange?: never;
}

/** The host connects its document through a source code adapter */
interface RouteVisualizationAdapterProps extends RouteVisualizationBaseProps {
  adapter: SourceCodeAdapter;
  /** The canvas or the code of the document; the canvas stays mounted while the code is shown */
  view?: RouteVisualizationView;
  /** Called with the undo/redo history whenever it changes */
  onUndoRedoChange?: (state: RouteVisualizationUndoRedo) => void;
  code?: never;
  codeChange?: never;
}

export type RouteVisualizationProps = RouteVisualizationCodeProps | RouteVisualizationAdapterProps;

export type { SourceCodeAdapter, SourceDocument } from '../../providers/source-code.provider';
export { inMemorySourceCodeAdapter } from '../../providers/source-code.provider';

export const RouteVisualization: FunctionComponent<RouteVisualizationProps> = (props) =>
  props.adapter ? (
    <Viz
      catalogUrl={props.catalogUrl}
      runtimeCatalogName={props.runtimeCatalogName}
      testingCatalogName={props.testingCatalogName}
      className={props.className}
      adapter={props.adapter}
      view={props.view}
      onUndoRedoChange={props.onUndoRedoChange}
    />
  ) : (
    <CodeRouteVisualization {...props} />
  );

const CodeRouteVisualization: FunctionComponent<RouteVisualizationCodeProps> = ({
  catalogUrl,
  runtimeCatalogName,
  testingCatalogName,
  code,
  codeChange,
  className,
}) => {
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
    />
  );
};
