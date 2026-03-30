import { getNearestVisiblePort, NearestVisiblePortOptions } from './get-nearest-visible-port';

describe('getNearestVisiblePort', () => {
  it('should return the exact port if it exists', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://customer/address/zipcode': [100, 200],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://customer/address/zipcode'],
      expansionState: {},
      expansionStateArray: ['SOURCE_BODY:customer://customer/address/zipcode'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', options);

    expect(result).toEqual({ connectionTarget: 'node', position: [100, 200] });
  });

  it('should return parent port when child is collapsed', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://customer/address': [150, 250],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://customer/address'],
      expansionState: {
        'SOURCE_BODY:customer://customer/address': false,
      },
      expansionStateArray: [
        'SOURCE_BODY:customer://customer/address',
        'SOURCE_BODY:customer://customer/address/zipcode',
      ],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', options);

    expect(result).toEqual({ connectionTarget: 'parent', position: [150, 250] });
  });

  it('should walk up multiple levels to find visible ancestor', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://customer': [80, 180],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://customer'],
      expansionState: {
        'SOURCE_BODY:customer://customer': false,
      },
      expansionStateArray: ['SOURCE_BODY:customer://customer', 'SOURCE_BODY:customer://customer/address/zipcode'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', options);

    expect(result).toEqual({ connectionTarget: 'parent', position: [80, 180] });
  });

  it('should return document root port when all ancestors are collapsed', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://': [50, 150],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://'],
      expansionState: {
        'SOURCE_BODY:customer://': false,
      },
      expansionStateArray: ['SOURCE_BODY:customer://', 'SOURCE_BODY:customer://customer/address/zipcode'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', options);

    expect(result).toEqual({ connectionTarget: 'parent', position: [50, 150] });
  });

  it('should return edge bottom when no visible ancestor exists', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:other://other/field': [100, 200],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:other://other/field'],
      expansionState: {},
      expansionStateArray: ['SOURCE_BODY:customer://customer/address/zipcode'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', options);

    expect(result).toEqual({ connectionTarget: 'edge', position: [0, 500] });
  });

  it('should work with target nodes', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'TARGET:shipment://shipment/address': [200, 300],
        'shipment:EDGE:top': [0, 0],
        'shipment:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['TARGET:shipment://shipment/address'],
      expansionState: {
        'TARGET:shipment://shipment/address': false,
      },
      expansionStateArray: ['TARGET:shipment://shipment/address', 'TARGET:shipment://shipment/address/zipcode'],
    };

    const result = getNearestVisiblePort('TARGET:shipment://shipment/address/zipcode', options);

    expect(result).toEqual({ connectionTarget: 'parent', position: [200, 300] });
  });

  it('should work with parameter nodes', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_PARAM:param1://data': [120, 220],
        'param1:EDGE:top': [0, 0],
        'param1:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_PARAM:param1://data'],
      expansionState: {
        'SOURCE_PARAM:param1://data': false,
      },
      expansionStateArray: ['SOURCE_PARAM:param1://data', 'SOURCE_PARAM:param1://data/nested/field'],
    };

    const result = getNearestVisiblePort('SOURCE_PARAM:param1://data/nested/field', options);

    expect(result).toEqual({ connectionTarget: 'parent', position: [120, 220] });
  });

  it('should prefer closer ancestors over distant ones', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://customer': [80, 180],
        'SOURCE_BODY:customer://customer/address': [150, 250],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://customer', 'SOURCE_BODY:customer://customer/address'],
      expansionState: {
        'SOURCE_BODY:customer://customer/address': false,
      },
      expansionStateArray: [
        'SOURCE_BODY:customer://customer',
        'SOURCE_BODY:customer://customer/address',
        'SOURCE_BODY:customer://customer/address/zipcode',
      ],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', options);

    // Should return the closer parent (address), not the more distant one (customer)
    expect(result).toEqual({ connectionTarget: 'parent', position: [150, 250] });
  });

  it('should handle empty path segments', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:doc://': [50, 150],
        'doc:EDGE:top': [0, 0],
        'doc:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:doc://'],
      expansionState: {},
      expansionStateArray: ['SOURCE_BODY:doc://'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:doc://', options);

    expect(result).toEqual({ connectionTarget: 'node', position: [50, 150] });
  });

  it('should handle single-level paths', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://': [50, 150],
        'customer:EDGE:top': [0, 0],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://'],
      expansionState: {
        'SOURCE_BODY:customer://': false,
      },
      expansionStateArray: ['SOURCE_BODY:customer://', 'SOURCE_BODY:customer://customer'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer', options);

    expect(result).toEqual({ connectionTarget: 'parent', position: [50, 150] });
  });

  it('should return [0, 0] when edge ports are not registered', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {},
      nodesConnectionPortsArray: [],
      expansionState: {},
      expansionStateArray: [],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/field', options);

    expect(result).toEqual({ connectionTarget: 'edge', position: [0, 0] });
  });

  it('should return edge top when node is scrolled above the visible area', () => {
    const options: NearestVisiblePortOptions = {
      nodesConnectionPorts: {
        'SOURCE_BODY:customer://customer/phone': [100, 300],
        'customer:EDGE:top': [0, 50],
        'customer:EDGE:bottom': [0, 500],
      },
      nodesConnectionPortsArray: ['SOURCE_BODY:customer://customer/phone'],
      expansionState: {},
      expansionStateArray: ['SOURCE_BODY:customer://customer/address', 'SOURCE_BODY:customer://customer/phone'],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address', options);

    expect(result).toEqual({ connectionTarget: 'edge', position: [0, 50] });
  });
});
