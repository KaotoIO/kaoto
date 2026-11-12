import { TestActions } from '../../models/citrus/entities/Test';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CitrusTestSchemaService } from '../../models/visualization/flows/support/citrus-test-schema.service';
import { CITRUS_WAIT_FOR_ACTION_NAME } from './citrus-wait-for.activationfn';

/**
 * A `waitFor` is rendered as a container only when its `action` condition is selected.
 * When an update makes the node shape differ from the rendered one, the visualization tree needs to be rebuilt.
 */
export const onUpdateCitrusWaitFor = (vizNode: IVisualizationNode, rebuild: () => void) => {
  const waitForDefinition = vizNode.data.definition;
  const shouldBeGroup =
    CitrusTestSchemaService.getTestContainerSettings(CITRUS_WAIT_FOR_ACTION_NAME, {
      [CITRUS_WAIT_FOR_ACTION_NAME]: waitForDefinition,
    } as TestActions) !== undefined;

  if (shouldBeGroup !== Boolean(vizNode.data.isGroup)) {
    rebuild();
  }
};
