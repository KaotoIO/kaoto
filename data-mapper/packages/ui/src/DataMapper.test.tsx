import { DataMapper } from './DataMapper';
import { render, screen } from '@testing-library/react';
import * as fs from 'fs';

describe('DataMapper', () => {
  it('should render initial XSLT mappings', () => {
    const xsltFile = fs.readFileSync(__dirname + '/../../../test-resources/ShipOrderToShipOrder.xsl').toString();
    render(<DataMapper xsltFile={xsltFile} onUpdate={jest.fn()} />);
    // TODO assert mappings are restored even without loading schema
  });

  it('should render toolbar menu in standalone mode', () => {
    render(<DataMapper />);
    expect(screen.getByTestId('main-menu-button')).toBeInTheDocument();
  });

  it('should not render toolbar menu in embedded mode', () => {
    render(<DataMapper isEmbedded={true} />);
    expect(screen.queryByTestId('main-menu-button')).toBeFalsy();
  });
});
