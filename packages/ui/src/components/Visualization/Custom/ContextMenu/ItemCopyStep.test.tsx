import { fireEvent, render, waitFor } from '@testing-library/react';

import { createVisualizationNode } from '../../../../models';
import { EntityType } from '../../../../models/entities';
import { ClipboardService } from '../../../../services/visualization/clipboard.service';
import { ItemCopyStep } from './ItemCopyStep';

describe('ItemCopyStep', () => {
  const vizNode = createVisualizationNode('test', {
    name: EntityType.Route,
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
  });
  const copiedContent = { name: 'log', definition: { id: 'log-1234', message: 'hello' } };

  beforeEach(() => {
    vi.spyOn(vizNode, 'getCopiedContent').mockReturnValue(copiedContent);
    vi.spyOn(ClipboardService, 'copy').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render Copy ContextMenuItem', () => {
    const { container } = render(<ItemCopyStep vizNode={vizNode} />);

    expect(container).toMatchSnapshot();
  });

  it('should call onCopyStep when the context menu item is clicked', async () => {
    const wrapper = render(<ItemCopyStep vizNode={vizNode} />);
    fireEvent.click(wrapper.getByText('Copy'));

    /* The real `useCopyStep` copies the node content into the clipboard */
    await waitFor(() => {
      expect(ClipboardService.copy).toHaveBeenCalledTimes(1);
    });
    expect(ClipboardService.copy).toHaveBeenCalledWith(copiedContent);
  });
});
