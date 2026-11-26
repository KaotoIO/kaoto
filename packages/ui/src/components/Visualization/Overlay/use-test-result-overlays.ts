import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { IEventBus } from '../../../host-bridge/contracts';
import { HostBridgeContext } from '../../../host-bridge/react/context';
import { TestReportEntry } from '../../../models';
import { BaseVisualEntity } from '../../../models/visualization/base-visual-entity';
import { CitrusTestVisualEntity } from '../../../models/visualization/flows';
import { CitrusTestReportService } from '../../../models/visualization/flows/support/citrus-test-report.service';
import { createOverlayStore, OverlayOwner, OverlayStore } from '../../../store/overlay.store';
import { CanvasNodesAndEdges } from '../Canvas/canvas.models';
import { buildDesignerOverlayTargetSnapshot } from './designer-overlay-targets';
import { OverlayEntry } from './overlay-entries';
import { OverlayScope } from './overlay-targets';
import { CanvasOverlaySource } from './use-canvas-overlays';

const TEST_RESULTS_LAYER = 'test-results';

function createHighlight(nodeId: string, isSuccess: boolean): OverlayEntry {
  return {
    id: `test-hl-${nodeId}`,
    kind: 'highlight',
    target: { kind: 'node', id: nodeId },
    tone: isSuccess ? 'success' : 'error',
    emphasis: 'strong',
  };
}

function createAnnotation(nodeId: string, label: string, errorMsg: string): OverlayEntry {
  return {
    id: `test-ann-${nodeId}`,
    kind: 'annotation',
    target: { kind: 'node', id: nodeId },
    text: 'Failed',
    tone: 'error',
    interaction: {
      accessibleLabel: `${label}: ${errorMsg}`,
      tooltip: errorMsg,
    },
  };
}

function addRootEntries(entries: OverlayEntry[], nodeId: string, report: TestReportEntry): void {
  const isSuccess = report.result.result === 'SUCCESS';
  entries.push(createHighlight(nodeId, isSuccess));
  if (!isSuccess) {
    const errorMsg = report.result.errorMessage || report.result.cause || 'Test failed';
    entries.push(createAnnotation(nodeId, 'Test failed', errorMsg));
  }
}

function addStepEntries(entries: OverlayEntry[], nodeId: string, path: string, report: TestReportEntry): void {
  const result = CitrusTestReportService.findResult(path, report.actions);
  if (!result) return;

  const error = CitrusTestReportService.findError(path, report.actions);
  entries.push(createHighlight(nodeId, error === undefined));
  if (error) {
    entries.push(createAnnotation(nodeId, 'Step failed', error));
  }
}

interface OverlayResources {
  store: OverlayStore;
  owner: OverlayOwner;
  scope: OverlayScope;
}

async function requestTestReport(bus: IEventBus, name: string): Promise<TestReportEntry | undefined> {
  const { report } = await bus.request('editor:testReport:get', { name });
  return report ? (report as unknown as TestReportEntry) : undefined;
}

export function useTestResultOverlays(
  model: CanvasNodesAndEdges,
  entities: BaseVisualEntity[],
): CanvasOverlaySource | undefined {
  const bus = useContext(HostBridgeContext);

  const citrusEntities = useMemo(
    () => entities.filter((e): e is CitrusTestVisualEntity => e instanceof CitrusTestVisualEntity),
    [entities],
  );

  const active = citrusEntities.length > 0 && !!bus;

  const { nodes } = model;

  const modelRevision = useMemo(() => {
    return nodes.map((n) => n.id).join(':');
  }, [nodes]);

  const resources = useMemo((): OverlayResources | null => {
    if (!active) return null;

    const scope: OverlayScope = {
      canvasId: 'designer',
      documentId: citrusEntities.map((e) => e.getId()).join(','),
      modelRevision,
    };

    const routes = citrusEntities.map((e) => ({ id: e.getId() }));
    const snapshot = buildDesignerOverlayTargetSnapshot(scope, model, routes);
    const store = createOverlayStore(snapshot);
    const owner = store.getState().createOwner();

    return owner ? { store, owner, scope } : null;
  }, [active, citrusEntities, modelRevision, model]);

  useEffect(() => {
    if (!resources) return;
    return () => {
      resources.owner.dispose();
      resources.store.getState().dispose();
    };
  }, [resources]);

  const overlaySource = useMemo((): CanvasOverlaySource | undefined => {
    if (!resources) return undefined;
    return { model, store: resources.store };
  }, [model, resources]);

  const generationRef = useRef(0);
  const modelRef = useRef(model);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const buildEntries = useCallback((entity: CitrusTestVisualEntity, report: TestReportEntry): OverlayEntry[] => {
    if (report.result.skipped) return [];

    const entries: OverlayEntry[] = [];
    const rootPath = entity.getRootPath();

    for (const node of modelRef.current.nodes) {
      const vizNode = node.data?.vizNode;
      if (!vizNode || vizNode.data.isPlaceholder || vizNode.data.entity !== entity || !vizNode.data.path) continue;

      if (vizNode.data.path === rootPath) {
        addRootEntries(entries, node.id, report);
      } else {
        addStepEntries(entries, node.id, vizNode.data.path, report);
      }
    }

    return entries;
  }, []);

  const loadTestReports = useCallback(() => {
    if (!resources || !bus) return;

    generationRef.current += 1;
    const generation = generationRef.current;
    const { owner, scope } = resources;

    for (const entity of citrusEntities) {
      void requestTestReport(bus, entity.id)
        .then((report) => {
          if (generation !== generationRef.current) return;

          if (report) {
            const entries = buildEntries(entity, report);
            owner.replaceLayer(scope, `${TEST_RESULTS_LAYER}-${entity.id}`, entries);
          } else {
            owner.clearLayer(scope, `${TEST_RESULTS_LAYER}-${entity.id}`);
          }
        })
        .catch(() => {
          if (generation !== generationRef.current) return;
          owner.clearLayer(scope, `${TEST_RESULTS_LAYER}-${entity.id}`);
        });
    }
  }, [resources, bus, citrusEntities, buildEntries]);

  useEffect(() => {
    if (resources) {
      loadTestReports();
    }
  }, [resources, loadTestReports]);

  useEffect(() => {
    if (!resources || !bus) return;

    const clearTestReports = () => {
      generationRef.current += 1;
      const { owner, scope } = resources;
      for (const entity of citrusEntities) {
        owner.clearLayer(scope, `${TEST_RESULTS_LAYER}-${entity.id}`);
      }
    };

    const unsubStart = bus.on('host:testRun:started', () => {
      clearTestReports();
    });
    const unsubReady = bus.on('host:testReport:ready', () => {
      loadTestReports();
    });
    return () => {
      unsubStart();
      unsubReady();
    };
  }, [resources, bus, loadTestReports, citrusEntities]);

  return overlaySource;
}
