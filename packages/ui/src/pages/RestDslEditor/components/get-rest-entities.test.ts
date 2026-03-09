import { CamelResourceFactory } from '../../../models/camel/camel-resource-factory';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { getRestEntities } from './get-rest-entities';

describe('getRestEntities', () => {
  it('should return an empty array when given an empty array', () => {
    const result = getRestEntities([]);

    expect(result).toEqual([]);
  });

  it('should filter and return only CamelRestVisualEntity instances', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
- rest:
    id: rest-2
    post:
      - id: post-1
        path: /orders
        to:
          uri: direct:createOrder
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(CamelRestVisualEntity);
    expect(result[1]).toBeInstanceOf(CamelRestVisualEntity);
    expect((result[0] as CamelRestVisualEntity).id).toBe('rest-1');
    expect((result[1] as CamelRestVisualEntity).id).toBe('rest-2');
  });

  it('should filter and return only CamelRestConfigurationVisualEntity instances', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
    port: "8080"
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(CamelRestConfigurationVisualEntity);
  });

  it('should filter and return both CamelRestVisualEntity and CamelRestConfigurationVisualEntity instances', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- restConfiguration:
    host: localhost
    port: "8080"
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
- rest:
    id: rest-2
    delete:
      - id: delete-1
        path: /items/{id}
        to:
          uri: direct:deleteItem
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(CamelRestConfigurationVisualEntity);
    expect(result[1]).toBeInstanceOf(CamelRestVisualEntity);
    expect(result[2]).toBeInstanceOf(CamelRestVisualEntity);
  });

  it('should filter out non-REST entities (e.g., routes)', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- route:
    id: route-1
    from:
      uri: direct:start
      steps:
        - to:
            uri: log:info
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /test
        to:
          uri: direct:test
- route:
    id: route-2
    from:
      uri: timer:tick
      steps:
        - log:
            message: "tick"
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    // Should only return REST entities, filtering out routes
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(CamelRestVisualEntity);
    expect((result[0] as CamelRestVisualEntity).id).toBe('rest-1');
  });

  it('should handle mixed entity types and return only REST-related entities', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- route:
    id: route-1
    from:
      uri: direct:start
      steps:
        - to:
            uri: log:info
- restConfiguration:
    host: api.example.com
    port: "443"
    scheme: https
- rest:
    id: rest-1
    path: /api/v1
    get:
      - id: get-users
        path: /users
        to:
          uri: direct:getUsers
    post:
      - id: create-user
        path: /users
        to:
          uri: direct:createUser
- route:
    id: route-2
    from:
      uri: direct:getUsers
      steps:
        - to:
            uri: sql:select * from users
- rest:
    id: rest-2
    path: /api/v1
    delete:
      - id: delete-user
        path: /users/{id}
        to:
          uri: direct:deleteUser
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(CamelRestConfigurationVisualEntity);
    expect(result[1]).toBeInstanceOf(CamelRestVisualEntity);
    expect(result[2]).toBeInstanceOf(CamelRestVisualEntity);

    // Verify the correct REST entities were returned
    const restEntities = result.filter((e) => e instanceof CamelRestVisualEntity);
    expect(restEntities).toHaveLength(2);
    expect(restEntities[0].id).toBe('rest-1');
    expect(restEntities[1].id).toBe('rest-2');

    // Verify RestConfiguration was included
    const restConfigEntities = result.filter((e) => e instanceof CamelRestConfigurationVisualEntity);
    expect(restConfigEntities).toHaveLength(1);
  });

  it('should return empty array when no REST entities exist', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- route:
    id: route-1
    from:
      uri: direct:start
      steps:
        - to:
            uri: log:info
- route:
    id: route-2
    from:
      uri: timer:tick
      steps:
        - log:
            message: "tick"
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should preserve the order of REST entities', () => {
    const camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-first
    get:
      - id: get-1
        path: /first
        to:
          uri: direct:first
- restConfiguration:
    host: localhost
- rest:
    id: rest-second
    post:
      - id: post-1
        path: /second
        to:
          uri: direct:second
- rest:
    id: rest-third
    delete:
      - id: delete-1
        path: /third
        to:
          uri: direct:third
    `);

    const entities = camelResource.getEntities();
    const result = getRestEntities(entities);

    expect(result).toHaveLength(4);
    // RestConfiguration comes first in the entities array
    expect(result[0]).toBeInstanceOf(CamelRestConfigurationVisualEntity);
    expect((result[1] as CamelRestVisualEntity).id).toBe('rest-first');
    expect((result[2] as CamelRestVisualEntity).id).toBe('rest-second');
    expect((result[3] as CamelRestVisualEntity).id).toBe('rest-third');
  });
});
