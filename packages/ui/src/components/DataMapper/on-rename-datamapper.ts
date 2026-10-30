import { IVisualizationNode } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { copyValidationWrapper } from './on-output-validation';

/**
 * Renames the XSLT file of a DataMapper step: the XSLT file, its metadata and the generated validation wrapper
 * (if any) move to the new name, and the step definition is updated.
 *
 * The wrapper is copied and the validator retargeted right before `updateXsltFileName`, which persists the step
 * definition (updateModel + updateSourceCodeFromEntities). The old files are deleted last, and the old wrapper only
 * when it was copied.
 *
 * @param api The metadata API
 * @param vizNode The DataMapper step
 * @param entitiesContext The entities context
 * @param oldPath The current XSLT file path
 * @param newPath The new XSLT file path
 * @returns true when the file was renamed; false when there was nothing to rename (no metadata, no XSLT file)
 */
export const onRenameDataMapper = async (
  api: IMetadataApi,
  vizNode: IVisualizationNode,
  entitiesContext: EntitiesContextResult,
  oldPath: string,
  newPath: string,
): Promise<boolean> => {
  const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
  const metadata = await api.getMetadata<IDataMapperMetadata>(metadataId);
  if (!metadata) return false;

  if (!(await api.isResourceExist(oldPath))) return false;

  const content = await api.getResourceContent(oldPath);
  if (content === undefined) return false;

  await api.saveResourceContent(newPath, content);
  await DataMapperMetadataService.updateXsltPath(api, metadataId, metadata, newPath);
  const wrapperCopied = await copyValidationWrapper(api, vizNode.data.definition, oldPath, newPath);
  DataMapperStepService.updateXsltFileName(vizNode, newPath, entitiesContext);
  await api.deleteResource(oldPath);
  if (wrapperCopied) {
    await DataMapperMetadataService.deleteValidationWrapper(api, oldPath);
  }
  return true;
};
