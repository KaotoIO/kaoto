import { Rest } from '@kaoto/camel-catalog/types';

import { CamelRestConfigurationVisualEntity } from '../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../models/visualization/flows/camel-rest-visual-entity';
import { restStub } from './rest';
import { restConfigurationStub } from './rest-configuration';

/**
 * Creates a CamelRestVisualEntity instance for testing
 */
export function createRestVisualEntity(rest?: { rest: Rest }): CamelRestVisualEntity {
  return new CamelRestVisualEntity(rest ?? restStub);
}

/**
 * Creates a CamelRestConfigurationVisualEntity instance for testing
 */
export function createRestConfigurationVisualEntity(): CamelRestConfigurationVisualEntity {
  return new CamelRestConfigurationVisualEntity(restConfigurationStub);
}

/**
 * Simple REST entity stub for basic tests
 */
export function createSimpleRestVisualEntity(id: string = 'rest-1'): CamelRestVisualEntity {
  return new CamelRestVisualEntity({
    rest: {
      id,
      path: '/api',
      get: [
        { id: 'op1', path: '/users', to: 'direct:users' },
        { id: 'op2', path: '/posts', to: 'direct:posts' },
      ],
    },
  });
}

/**
 * Creates a REST entity for testing direct route detection
 */
export function createRestEntityWithDirectRouteNotFound(id: string = 'rest-1'): CamelRestVisualEntity {
  return new CamelRestVisualEntity({
    rest: {
      id,
      get: [{ id: 'op1', path: '/users', to: 'direct:posts' }],
    },
  });
}

/**
 * Creates a REST entity without 'to' field for testing
 */
export function createRestEntityWithoutTo(id: string = 'rest-1'): CamelRestVisualEntity {
  return new CamelRestVisualEntity({
    rest: {
      id,
      get: [{ id: 'op1', path: '/users' }],
    },
  });
}

/**
 * Creates a REST entity with non-direct URI for testing
 */
export function createRestEntityWithNonDirectUri(id: string = 'rest-1'): CamelRestVisualEntity {
  return new CamelRestVisualEntity({
    rest: {
      id,
      get: [{ id: 'op1', path: '/users', to: 'log:info' }],
    },
  });
}
