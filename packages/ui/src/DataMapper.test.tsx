import { DataMapper } from './DataMapper';
import { render } from '@testing-library/react';
import * as fs from 'fs';

describe('DataMapper', () => {
  it('should render initial XSLT mappings', () => {
    const xsltFile = fs.readFileSync(__dirname + '/../../../test-resources/ShipOrderToShipOrder.xsl').toString();
    render(<DataMapper xsltFile={xsltFile} onUpdate={jest.fn()} />);
    // TODO assert mappings are restored even without loading schema
  });
});
