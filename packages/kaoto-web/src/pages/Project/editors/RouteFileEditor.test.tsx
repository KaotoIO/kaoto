import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewMode } from '../../../context/IntegrationHeaderContext';
import { stubRouteVisualization } from '../../../test/route-visualization-stub';
import { RouteFileEditor } from './RouteFileEditor';

const MAIN_FLOW = { id: 'main-flow', path: 'integrations/main-flow.camel.yaml', content: '- route:\n    id: main\n' };
const ERROR_HANDLER = {
  id: 'error-handler',
  path: 'integrations/error-handler.camel.yaml',
  content: '- errorHandler: {}\n',
};

const codeEditor = () => screen.queryByRole('textbox', { name: 'Code' });
const canvas = () => screen.getByTestId('route-visualization');

const typeInCodeView = (code: string) => {
  fireEvent.change(codeEditor()!, { target: { value: code } });
};

describe('RouteFileEditor', () => {
  let routeVisualization: ReturnType<typeof stubRouteVisualization>;
  const onSave = vi.fn();

  const renderEditor = (view: ViewMode, file = MAIN_FLOW) => {
    const result = render(<RouteFileEditor file={file} view={view} onSave={onSave} />);
    const rerender = (nextView: ViewMode, nextFile = file) => {
      result.rerender(<RouteFileEditor file={nextFile} view={nextView} onSave={onSave} />);
    };
    return { rerender };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    routeVisualization = stubRouteVisualization();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the stored code on the canvas and no code editor in the design view', () => {
    renderEditor('design');

    expect(canvas()).toBeVisible();
    expect(canvas()).toHaveAttribute('data-code', MAIN_FLOW.content);
    expect(codeEditor()).not.toBeInTheDocument();
  });

  it('hides the canvas in the code view', () => {
    const view: ViewMode = 'code';
    renderEditor(view);

    expect(canvas()).not.toBeVisible();
  });

  it('shows the stored code in the code view', () => {
    renderEditor('code');

    expect(codeEditor()).toHaveValue(MAIN_FLOW.content);
  });

  it('keeps the canvas mounted when switching to the code view and back', () => {
    const { rerender } = renderEditor('design');

    rerender('code');
    rerender('design');

    expect(routeVisualization.mountCount()).toBe(1);
  });

  it('focuses the code editor when the code view opens, so keys go to the code rather than the hidden canvas', () => {
    const { rerender } = renderEditor('design');

    rerender('code');

    expect(codeEditor()).toHaveFocus();
  });

  it('saves the code typed in the code view once typing pauses', () => {
    renderEditor('code');

    typeInCodeView('- route:\n    id: typed\n');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onSave).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onSave).toHaveBeenCalledExactlyOnceWith('main-flow', '- route:\n    id: typed\n');
  });

  it('hands the code typed just before switching to the design view to the canvas and saves it', () => {
    const { rerender } = renderEditor('code');
    typeInCodeView('- route:\n    id: typed\n');

    rerender('design');

    expect(canvas()).toHaveAttribute('data-code', '- route:\n    id: typed\n');
    expect(onSave).toHaveBeenCalledExactlyOnceWith('main-flow', '- route:\n    id: typed\n');
  });

  it('saves a pending edit to its own file when another file opens', () => {
    const { rerender } = renderEditor('code');
    typeInCodeView('- route:\n    id: typed\n');

    rerender('design', ERROR_HANDLER);

    expect(onSave).toHaveBeenCalledExactlyOnceWith('main-flow', '- route:\n    id: typed\n');
    expect(canvas()).toHaveAttribute('data-code', ERROR_HANDLER.content);
  });

  it('hands invalid YAML to the canvas as typed', () => {
    const { rerender } = renderEditor('code');
    typeInCodeView('- route: [');

    rerender('design');

    expect(canvas()).toHaveAttribute('data-code', '- route: [');
  });

  it('saves the code edited on the canvas and shows it in the code view', () => {
    const { rerender } = renderEditor('design');

    routeVisualization.editOnCanvas('- route:\n    id: drawn\n');
    rerender('code');

    expect(onSave).toHaveBeenCalledExactlyOnceWith('main-flow', '- route:\n    id: drawn\n');
    expect(codeEditor()).toHaveValue('- route:\n    id: drawn\n');
  });

  it('does not save the code the canvas reports back unchanged', () => {
    renderEditor('design');

    routeVisualization.editOnCanvas(MAIN_FLOW.content);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the code of the newly opened file', () => {
    const { rerender } = renderEditor('design');

    rerender('code', ERROR_HANDLER);

    expect(codeEditor()).toHaveValue(ERROR_HANDLER.content);
  });
});
