import { createVisualizationNode } from '../../models';
import { IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { ACTION_ID_DELETE_STEP_AND_FILE, ACTION_ID_DELETE_STEP_ONLY, onDeleteDataMapper } from './on-delete-datamapper';

describe('onDeleteDataMapper', () => {
  let mockApi: IMetadataApi;
  const metadataId = 'test-metadata-id';

  beforeEach(() => {
    mockApi = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      getResourceContent: vi.fn(),
      isResourceExist: vi.fn(),
      saveResourceContent: vi.fn(),
      deleteResource: vi.fn(),
      askUserForFileSelection: vi.fn(),
      getSuggestions: vi.fn(),
      shouldSaveSchema: false,
      onStepUpdated: vi.fn(),
    };

    vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockReturnValue(metadataId);
    vi.spyOn(DataMapperMetadataService, 'deleteXsltFile').mockResolvedValue(undefined);
    vi.spyOn(DataMapperMetadataService, 'deleteMetadata').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should delete step and file when modal answer is ACTION_ID_DELETE_STEP_AND_FILE', async () => {
    const vizNode = createVisualizationNode('test', {
      name: 'log',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });

    await onDeleteDataMapper(mockApi, vizNode, ACTION_ID_DELETE_STEP_AND_FILE);

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).toHaveBeenCalledWith(mockApi, metadataId);
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });

  it('should delete step only when modal answer is ACTION_ID_DELETE_STEP_ONLY', async () => {
    const vizNode = createVisualizationNode('test', {
      name: 'log',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });

    await onDeleteDataMapper(mockApi, vizNode, ACTION_ID_DELETE_STEP_ONLY);

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).not.toHaveBeenCalled();
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });

  it('should delete step only when modal answer is undefined', async () => {
    const vizNode = createVisualizationNode('test', {
      name: 'log',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });

    await onDeleteDataMapper(mockApi, vizNode, undefined);

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).not.toHaveBeenCalled();
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });

  it('should delete step only when modal answer is a different value', async () => {
    const vizNode = createVisualizationNode('test', {
      name: 'log',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });

    await onDeleteDataMapper(mockApi, vizNode, 'some-other-action');

    expect(DataMapperStepService.getDataMapperMetadataId).toHaveBeenCalledWith(vizNode);
    expect(DataMapperMetadataService.deleteXsltFile).not.toHaveBeenCalled();
    expect(DataMapperMetadataService.deleteMetadata).toHaveBeenCalledWith(mockApi, metadataId);
  });
});
