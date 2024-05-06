import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { parse, stringify } from 'yaml';
import { CamelResource, SourceSchemaType, createCamelResource } from '../models/camel';
import { BaseCamelEntity } from '../models/camel/entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';
import { EventNotifier } from '../utils';

/**
 * Regular expression to match commented lines, regardless of indentation
 * Given the following examples, the regular expression should match the comments:
 * ```
 * # This is a comment
 *     # This is an indented comment
 *# This is an indented comment
 * ```
 * The regular expression should match the first three lines
 */
const COMMENTED_LINES_REGEXP = /^\s*#.*$/;

export interface EntitiesContextResult {
  entities: BaseCamelEntity[];
  currentSchemaType: SourceSchemaType;
  visualEntities: BaseVisualCamelEntity[];
  camelResource: CamelResource;

  /**
   * Notify that a property in an entity has changed, hence the source
   * code needs to be updated
   *
   * NOTE: This process shouldn't recreate the CamelResource neither
   * the entities, just the source code
   */
  updateSourceCodeFromEntities: () => void;

  /**
   * Refresh the entities from the Camel Resource, and
   * notify subscribers that a `entities:updated` happened
   *
   * NOTE: This process shouldn't recreate the CamelResource,
   * just the entities
   */
  updateEntitiesFromCamelResource: () => void;

  /**
   * Sets the current schema type and recreates the CamelResource
   */
  setCurrentSchemaType: (entity: SourceSchemaType) => void;
}

export const useEntities = (): EntitiesContextResult => {
  const eventNotifier = EventNotifier.getInstance();
  const [camelResource, setCamelResource] = useState<CamelResource>(createCamelResource());
  const [entities, setEntities] = useState<BaseCamelEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualCamelEntity[]>([]);

  /**
   * Subscribe to the `code:updated` event to recreate the CamelResource
   */
  useLayoutEffect(() => {
    return eventNotifier.subscribe('code:updated', (code) => {
      /** Extract comments from the source code */
      const lines = code.split('\n');
      const comments: string[] = [];
      for (const line of lines) {
        if (line.trim() === '' || COMMENTED_LINES_REGEXP.test(line)) {
          comments.push(line);
        } else {
          break;
        }
      }

      const rawEntities = parse(code);
      const camelResource = createCamelResource(rawEntities);
      camelResource.setComments(comments);
      const entities = camelResource.getEntities();
      const visualEntities = camelResource.getVisualEntities();
      setCamelResource(camelResource);
      setEntities(entities);
      setVisualEntities(visualEntities);
    });
  }, [eventNotifier]);

  const updateSourceCodeFromEntities = useCallback(() => {
    let code = stringify(camelResource, { sortMapEntries: camelResource.sortFn, schema: 'yaml-1.1' }) || '';

    if (camelResource.getComments().length > 0) {
      const comments = camelResource.getComments().join('\n');
      code = comments + '\n' + code;
    }

    eventNotifier.next('entities:updated', code);
  }, [camelResource, eventNotifier]);

  const updateEntitiesFromCamelResource = useCallback(() => {
    const entities = camelResource.getEntities();
    const visualEntities = camelResource.getVisualEntities();
    setEntities(entities);
    setVisualEntities(visualEntities);

    /**
     * Notify consumers that entities has been refreshed, hence the code needs to be updated
     */
    updateSourceCodeFromEntities();
  }, [camelResource, updateSourceCodeFromEntities]);

  const setCurrentSchemaType = useCallback(
    (type: SourceSchemaType) => {
      setCamelResource(createCamelResource(type));
      updateEntitiesFromCamelResource();
    },
    [updateEntitiesFromCamelResource],
  );

  return useMemo(
    () => ({
      entities,
      visualEntities,
      currentSchemaType: camelResource?.getType(),
      camelResource,
      setCurrentSchemaType,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    }),
    [
      entities,
      visualEntities,
      camelResource,
      setCurrentSchemaType,
      updateEntitiesFromCamelResource,
      updateSourceCodeFromEntities,
    ],
  );
};
