import { getNearestVisiblePort } from './get-nearest-visible-port';

describe('getNearestVisiblePort', () => {
  it('should return the exact port if it exists', () => {
    const connectionPorts = {
      'SOURCE_BODY:customer://customer/address/zipcode': [100, 200] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', connectionPorts);

    expect(result).toEqual([100, 200]);
  });

  it('should return parent port when child is collapsed', () => {
    const connectionPorts = {
      'SOURCE_BODY:customer://customer/address': [150, 250] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', connectionPorts);

    expect(result).toEqual([150, 250]);
  });

  it('should walk up multiple levels to find visible ancestor', () => {
    const connectionPorts = {
      'SOURCE_BODY:customer://customer': [80, 180] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', connectionPorts);

    expect(result).toEqual([80, 180]);
  });

  it('should return document root port when all ancestors are collapsed', () => {
    const connectionPorts = {
      'SOURCE_BODY:customer://': [50, 150] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', connectionPorts);

    expect(result).toEqual([50, 150]);
  });

  it('should return null when no visible ancestor exists', () => {
    const connectionPorts = {
      'SOURCE_BODY:other://other/field': [100, 200] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', connectionPorts);

    expect(result).toBeNull();
  });

  it('should work with target nodes', () => {
    const connectionPorts = {
      'TARGET:shipment://shipment/address': [200, 300] as [number, number],
    };

    const result = getNearestVisiblePort('TARGET:shipment://shipment/address/zipcode', connectionPorts);

    expect(result).toEqual([200, 300]);
  });

  it('should work with parameter nodes', () => {
    const connectionPorts = {
      'SOURCE_PARAM:param1://data': [120, 220] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_PARAM:param1://data/nested/field', connectionPorts);

    expect(result).toEqual([120, 220]);
  });

  it('should prefer closer ancestors over distant ones', () => {
    const connectionPorts = {
      'SOURCE_BODY:customer://customer': [80, 180] as [number, number],
      'SOURCE_BODY:customer://customer/address': [150, 250] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer/address/zipcode', connectionPorts);

    // Should return the closer parent (address), not the more distant one (customer)
    expect(result).toEqual([150, 250]);
  });

  it('should handle empty path segments', () => {
    const connectionPorts = {
      'SOURCE_BODY:doc://': [50, 150] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:doc://', connectionPorts);

    expect(result).toEqual([50, 150]);
  });

  it('should handle single-level paths', () => {
    const connectionPorts = {
      'SOURCE_BODY:customer://': [50, 150] as [number, number],
    };

    const result = getNearestVisiblePort('SOURCE_BODY:customer://customer', connectionPorts);

    expect(result).toEqual([50, 150]);
  });
});
