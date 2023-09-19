import { act, renderHook } from '@testing-library/react';
import { useEntities } from './entities';
import { camelRouteYaml } from '../stubs/camel-route';

describe('useEntities', () => {
  it('should set the source code', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.setCode(camelRouteYaml);
    });

    expect(result.current.code).toEqual(camelRouteYaml);
  });

  it('should parse the source code and set visual entities', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.setCode(camelRouteYaml);
    });

    expect(result.current.visualEntities).toEqual([
      {
        id: expect.any(String),
        route: {
          from: {
            steps: [
              {
                'set-header': {
                  name: 'myChoice',
                  simple: '${random(2)}',
                },
              },
              {
                choice: {
                  otherwise: {
                    steps: [
                      {
                        to: {
                          uri: 'amqp:queue:',
                        },
                      },
                      {
                        to: {
                          uri: 'amqp:queue:',
                        },
                      },
                      {
                        log: {
                          id: 'log-2',
                          message: 'We got a ${body}',
                        },
                      },
                    ],
                  },
                  when: [
                    {
                      simple: '${header.myChoice} == 1',
                      steps: [
                        {
                          log: {
                            id: 'log-1',
                            message: 'We got a one.',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
              {
                to: {
                  parameters: {
                    bridgeErrorHandler: true,
                  },
                  uri: 'direct:my-route',
                },
              },
            ],
            uri: 'timer:tutorial',
          },
          id: 'route-8888',
        },
        type: 'route',
      },
    ]);
  });

  it('should parse the source code and set entities', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.setCode(`
      - rest:
          consumes: application/json
          get:
            description: "Returns all the orders"
            outType: java.util.List
            responseCode: 200
            to: "direct:getOrders"
      `);
    });

    expect(result.current.entities).toEqual([
      {
        rest: {
          consumes: 'application/json',
          get: {
            description: 'Returns all the orders',
            outType: 'java.util.List',
            responseCode: 200,
            to: 'direct:getOrders',
          },
        },
      },
    ]);
  });

  it('should return empty arrays if the source code is empty', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.setCode('');
    });

    expect(result.current.visualEntities).toEqual([]);
    expect(result.current.entities).toEqual([]);
  });

  it('should return empty arrays if the source code is invalid', () => {
    const { result } = renderHook(() => useEntities());

    act(() => {
      result.current.setCode('invalid');
    });

    expect(result.current.visualEntities).toEqual([]);
    expect(result.current.entities).toEqual([]);
  });
});
