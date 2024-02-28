import {
  IKameletDefinition,
  IKameletMetadataAnnotations,
  IKameletMetadataLabels,
  KameletKnownAnnotations,
  KameletKnownLabels,
} from '../models/kamelets-catalog';
import { getValue } from './get-value';
import { setValue } from './set-value';

export const getActualKameletSchemaFromCustomSchema = (
  kamelet: IKameletDefinition,
  value: Record<string, unknown>,
): void => {
  const previousName = getValue(kamelet, 'metadata.name');
  const previousTitle = getValue(kamelet, 'spec.definition.title');
  const previousDescription = getValue(kamelet, 'spec.definition.description');

  const newName: string = getValue(value, 'name');
  const newTitle: string = getValue(value, 'title');
  const newDescription: string = getValue(value, 'description');

  setValue(kamelet, 'metadata.name', newName ?? previousName);
  setValue(kamelet, 'spec.definition.title', newTitle ?? previousTitle);
  setValue(kamelet, 'spec.definition.description', newDescription ?? previousDescription);

  const previousAnnotations = getValue(kamelet, 'metadata.annotations', {} as IKameletMetadataAnnotations);
  const previousIcon = previousAnnotations[KameletKnownAnnotations.Icon];
  const previousSupportLevel = previousAnnotations[KameletKnownAnnotations.SupportLevel];
  const previousCatalogVersion = previousAnnotations[KameletKnownAnnotations.CatalogVersion];
  const previousProvider = previousAnnotations[KameletKnownAnnotations.Provider];
  const previousGroup = previousAnnotations[KameletKnownAnnotations.Group];
  const previousNamespace = previousAnnotations[KameletKnownAnnotations.Namespace];

  const newIcon = getValue(value, 'icon');
  const newSupportLevel = getValue(value, 'supportLevel');
  const newCatalogVersion = getValue(value, 'catalogVersion');
  const newProvider = getValue(value, 'provider');
  const newGroup = getValue(value, 'group');
  const newNamespace = getValue(value, 'namespace');

  const customAnnotations = {
    [KameletKnownAnnotations.Icon]: newIcon ?? previousIcon,
    [KameletKnownAnnotations.SupportLevel]: newSupportLevel ?? previousSupportLevel,
    [KameletKnownAnnotations.CatalogVersion]: newCatalogVersion ?? previousCatalogVersion,
    [KameletKnownAnnotations.Provider]: newProvider ?? previousProvider,
    [KameletKnownAnnotations.Group]: newGroup ?? previousGroup,
    [KameletKnownAnnotations.Namespace]: newNamespace ?? previousNamespace,
  };

  const previousType = getValue(kamelet, 'metadata.labels', {} as IKameletMetadataLabels)[KameletKnownLabels.Type];
  const newLabels = getValue(value, 'labels', {});
  Object.assign(newLabels, {
    [KameletKnownLabels.Type]: getValue(value, 'type', previousType),
  });
  const newAnnotations = Object.assign(getValue(value, 'annotations', {}), customAnnotations);

  setValue(kamelet, 'metadata.labels', newLabels);
  setValue(kamelet, 'metadata.annotations', newAnnotations);
};
