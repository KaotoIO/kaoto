import { CatalogKind, createVisualizationNode } from '../../models';
import { IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { ACTION_ID_DELETE_STEP_AND_FILE, ACTION_ID_DELETE_STEP_ONLY, onDeleteDataMapper } from './on-delete-datamapper';

jest.mock('../../services/datamapper-metadata.service');
jest.mock('../../services/datamapper-step.service');

describe('onDeleteDataMapper', () => {
  let mockApi: jest.Mocked<IMetadataApi>;
  const metadataId = 'test-metadata-id';

  beforeEach(() => {
    mockApi = {
      getMetadata: jest.fn(),
      setMetadata: jest.fn(),
      deleteMetadata: jest.fn(),
      getResourceContent: jest.fn(),
      saveResourceContent: jest.fn(),
      deleteResourceContent: jest.fn(),
    } as unknown as jest.Mocked<IMetadataApi>;

    jest.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockReturnValue(metadataId);
    jest.spyOn(DataMapperMetadataService, 'deleteXsltFile').mockResolvedValue(undefined);
    jest.spyOn(DataMapperMetadataService, 'deleteMetadata').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete step and file when modal answer is ACTION_ID_DELETE_STEP_AND_FILE', async () => {
    const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });

    await onDeleteDataMapper(mockApi, vizNode, ACTION_ID_DELETE_STEP_AND_FILE);

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).toHaveBeenCalledWith(mockApi, metadataId);
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });

  it('should delete step only when modal answer is ACTION_ID_DELETE_STEP_ONLY', async () => {
    const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });

    await onDeleteDataMapper(mockApi, vizNode, ACTION_ID_DELETE_STEP_ONLY);

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).not.toHaveBeenCalled();
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });

  it('should delete step only when modal answer is undefined', async () => {
    const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });

    await onDeleteDataMapper(mockApi, vizNode, undefined);

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).not.toHaveBeenCalled();
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });

  it('should delete step only when modal answer is a different value', async () => {
    const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });

    await onDeleteDataMapper(mockApi, vizNode, 'some-other-action');

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).not.toHaveBeenCalled();
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });
});
