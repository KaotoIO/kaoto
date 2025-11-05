import { CatalogLibrary } from '@kaoto/camel-catalog/catalog-index.d.ts';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { act, render } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, IVisualizationNode } from '../../models';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { ComponentMode } from './ComponentMode';

let mockUpdateSourceCodeFromEntities: jest.Mock;
jest.mock('../../hooks/useEntityContext/useEntityContext', () => ({
  useEntityContext: () => ({ updateSourceCodeFromEntities: mockUpdateSourceCodeFromEntities }),
}));

describe('ComponentMode', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, { ...catalogsMap.patternCatalogMap });

    mockUpdateSourceCodeFromEntities = jest.fn();
  });

  const getMockVizNode = (processorName = 'to'): IVisualizationNode => {
    return {
      data: { processorName, path: `route.from.steps.0.${processorName}` },
      getNodeSchema: () => undefined,
      getNodeDefinition: () => ({}),
      updateModel: jest.fn(),
    } as unknown as IVisualizationNode;
  };

  it('renders the three toggle buttons', () => {
    const wrapper = render(<ComponentMode vizNode={getMockVizNode('to')} />);

    expect(wrapper.getByText('Static')).toBeInTheDocument();
    expect(wrapper.getByText('Dynamic')).toBeInTheDocument();
    expect(wrapper.getByText('Poll')).toBeInTheDocument();
  });

  it('should not call updateSourceCodeFromEntities if there is no VizNode', () => {
    render(<ComponentMode vizNode={undefined} />);

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('should not call updateSourceCodeFromEntities if we are switching to the same EIP', async () => {
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('should not call updateSourceCodeFromEntities if the vizNode does not contain a path', async () => {
    const vizNode = getMockVizNode('to');
    vizNode.data.path = undefined;
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('calls updateModel when switching from "to" to "poll"', async () => {
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const pollButton = wrapper.getByText('Poll');
    expect(pollButton).toBeInTheDocument();

    await act(async () => {
      pollButton.click();
    });

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.poll');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateModel when switching from "to" to "toD"', async () => {
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toDButton = wrapper.getByText('Dynamic');
    expect(toDButton).toBeInTheDocument();

    await act(async () => {
      toDButton.click();
    });

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.toD');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateModel when switching from "poll" to "to"', async () => {
    const vizNode = getMockVizNode('poll');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.to');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateSourceCodeFromEntities when switching from "poll" to "to"', async () => {
    const vizNode = getMockVizNode('poll');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(mockUpdateSourceCodeFromEntities).toHaveBeenCalled();
  });

  it('should query the camel catalog for the component description', () => {
    const getComponentSpy = jest.spyOn(CamelCatalogService, 'getComponent');
    const vizNode = getMockVizNode('to');

    render(<ComponentMode vizNode={vizNode} />);

    expect(getComponentSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
    expect(getComponentSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'toD');
    expect(getComponentSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'poll');
    expect(getComponentSpy).not.toHaveBeenCalledWith(CatalogKind.Entity, 'from');
  });

  it('should not render the to button if the catalog is not available', () => {
    const camelPatternsCatalog = CamelCatalogService.getCatalogByKey(CatalogKind.Pattern)!;
    delete camelPatternsCatalog['to'];
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, camelPatternsCatalog);
    const vizNode = getMockVizNode('to');

    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.queryByText('Static');
    const toDButton = wrapper.queryByText('Dynamic');
    const pollButton = wrapper.queryByText('Poll');

    expect(toButton).not.toBeInTheDocument();
    expect(toDButton).toBeInTheDocument();
    expect(pollButton).toBeInTheDocument();
  });

  it('should not render the toD button if the catalog is not available', () => {
    const camelPatternsCatalog = CamelCatalogService.getCatalogByKey(CatalogKind.Pattern)!;
    delete camelPatternsCatalog['toD'];
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, camelPatternsCatalog);
    const vizNode = getMockVizNode('toD');

    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.queryByText('Static');
    const toDButton = wrapper.queryByText('Dynamic');
    const pollButton = wrapper.queryByText('Poll');

    expect(toButton).toBeInTheDocument();
    expect(toDButton).not.toBeInTheDocument();
    expect(pollButton).toBeInTheDocument();
  });

  it('should not render the poll button if the catalog is not available', () => {
    const camelPatternsCatalog = CamelCatalogService.getCatalogByKey(CatalogKind.Pattern)!;
    delete camelPatternsCatalog['poll'];
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, camelPatternsCatalog);
    const vizNode = getMockVizNode('to');

    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.queryByText('Static');
    const toDButton = wrapper.queryByText('Dynamic');
    const pollButton = wrapper.queryByText('Poll');

    expect(toButton).toBeInTheDocument();
    expect(toDButton).toBeInTheDocument();
    expect(pollButton).not.toBeInTheDocument();
  });
});
