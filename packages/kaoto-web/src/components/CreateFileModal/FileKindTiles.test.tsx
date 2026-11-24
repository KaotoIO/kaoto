import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { FILE_KINDS } from './file-kinds';
import { FileKindTiles } from './FileKindTiles';

const [routeYaml, routeXml] = FILE_KINDS;

describe('FileKindTiles', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  const renderTiles = (props: Partial<Parameters<typeof FileKindTiles>[0]> = {}) =>
    render(<FileKindTiles kinds={FILE_KINDS} selected={routeYaml} onChange={onChange} {...props} />);

  it('shows a tile named by its label for every file type', () => {
    renderTiles();

    expect(screen.getByRole('group', { name: 'File type' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(FILE_KINDS.length);
    for (const kind of FILE_KINDS) {
      expect(screen.getByRole('radio', { name: kind.label })).toBeInTheDocument();
    }
  });

  it('gives every tile the description of its file type as a tooltip', () => {
    renderTiles();

    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips.map((tooltip) => tooltip.textContent)).toEqual(FILE_KINDS.map((kind) => kind.description));
  });

  it('describes the selected file type below the tiles', () => {
    renderTiles({ selected: routeXml });

    expect(screen.getByTestId('file-kind-description')).toHaveTextContent(routeXml.description);
  });

  it('shows only the file types it is given', () => {
    renderTiles({ kinds: [routeYaml, routeXml] });

    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('marks the selected file type', () => {
    renderTiles({ selected: routeXml });

    expect(screen.getByRole('radio', { name: new RegExp(`^${routeXml.label}`) })).toBeChecked();
    expect(screen.getByRole('radio', { name: new RegExp(`^${routeYaml.label}`) })).not.toBeChecked();
  });

  it('reports the file type of the tile that is chosen', async () => {
    const user = userEvent.setup();
    renderTiles();

    await user.click(screen.getByRole('radio', { name: new RegExp(`^${routeXml.label}`) }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(routeXml);
  });

  it('does not let the file type change while it is disabled', async () => {
    const user = userEvent.setup();
    renderTiles({ disabled: true });

    await user.click(screen.getByRole('radio', { name: new RegExp(`^${routeXml.label}`) }));

    expect(onChange).not.toHaveBeenCalled();
    for (const tile of screen.getAllByRole('radio')) expect(tile).toBeDisabled();
  });
});
