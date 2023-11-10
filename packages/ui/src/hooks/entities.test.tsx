import { act, renderHook } from '@testing-library/react';
import { CamelResource, SourceSchemaType } from '../models/camel';
import { CamelRouteVisualEntity } from '../models/visualization/flows';
import { camelRouteJson, camelRouteYaml } from '../stubs/camel-route';
import { EventNotifier } from '../utils';
import { useEntities } from './entities';

describe('useEntities', () => {
  let eventNotifier: EventNotifier;
  beforeEach(() => {
    eventNotifier = EventNotifier.getInstance();
  });

  it('it should subscribe to the `code:updated` notification', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'subscribe');

    renderHook(() => useEntities());

    expect(notifierSpy).toHaveBeenCalledWith('code:updated', expect.anything());
  });

  it('updating the source code should NOT recreate the Camel Resource', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      const firstCamelResource = result.current.camelResource;
      result.current.updateSourceCodeFromEntities();
      const secondCamelResource = result.current.camelResource;

      expect(firstCamelResource).toBe(secondCamelResource);
    });
  });

  it('should recreate the entities when the source code is updated', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      eventNotifier.next('code:updated', camelRouteYaml);
    });

    expect(result.current.entities).toEqual([]);
    expect(result.current.visualEntities).toEqual([new CamelRouteVisualEntity(camelRouteJson.route)]);
  });

  it('should notifiy subscribers when the entities are updated', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');

    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.camelResource.addNewEntity();
      result.current.updateSourceCodeFromEntities();
    });

    expect(notifierSpy).toHaveBeenCalledWith(
      'entities:updated',
      `- route:
    from:
      uri: timer:template
      parameters:
        period: "1000"
      steps:
        - log:
            message: template message
    id: route-1234
`,
    );
  });

  it('updating entities should NOT recreate the Camel Resource', () => {
    let firstCamelResource: CamelResource;
    let secondCamelResource: CamelResource;

    const { result } = renderHook(() => useEntities());

    act(() => {
      firstCamelResource = result.current.camelResource;
      result.current.updateEntitiesFromCamelResource();
    });

    act(() => {
      secondCamelResource = result.current.camelResource;
      expect(firstCamelResource).toBe(secondCamelResource);
    });
  });

  it('should refresh entities', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.camelResource.addNewEntity();
      result.current.camelResource.addNewEntity();
      result.current.updateEntitiesFromCamelResource();
    });

    expect(result.current.entities).toEqual([]);
    expect(result.current.visualEntities).toHaveLength(2);
  });

  it('should refresh entities and notify subscribers', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.updateEntitiesFromCamelResource();
    });

    expect(notifierSpy).toHaveBeenCalledWith(
      'entities:updated',
      `[]
`,
    );
  });

  it('should recreate the Camel Resource when the schema is updated', () => {
    let firstCamelResource: CamelResource;
    let secondCamelResource: CamelResource;

    const { result } = renderHook(() => useEntities());

    act(() => {
      firstCamelResource = result.current.camelResource;
      result.current.setCurrentSchemaType(SourceSchemaType.Route);
    });

    act(() => {
      secondCamelResource = result.current.camelResource;
      expect(firstCamelResource).not.toBe(secondCamelResource);
    });
  });

  it('should notify subscribers when the schema is updated', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.setCurrentSchemaType(SourceSchemaType.Route);
    });

    expect(notifierSpy).toHaveBeenCalledWith(
      'entities:updated',
      `[]
`,
    );
  });
});
