import {
  IKameletCustomProperty,
  IKameletDefinition,
  IKameletMetadataAnnotations,
  IKameletMetadataLabels,
  IKameletSpecProperty,
  KameletKnownAnnotations,
  KameletKnownLabels,
} from '../models/camel/kamelets-catalog';
import { getValue } from './get-value';
import { setValue } from './set-value';

export const updateKameletFromCustomSchema = (kamelet: IKameletDefinition, value: Record<string, unknown>): void => {
  if (!value || typeof value !== 'object') {
    return;
  }

  const previousName = getValue(kamelet, 'metadata.name');
  const previousTitle = getValue(kamelet, 'spec.definition.title');
  const previousDescription = getValue(kamelet, 'spec.definition.description');

  const newName: string = getValue(value, 'name');
  const newTitle: string = getValue(value, 'title');
  const newDescription: string = getValue(value, 'description');

  setValue(kamelet, 'metadata.name', 'name' in value ? newName : previousName);
  setValue(kamelet, 'spec.definition.title', 'title' in value ? newTitle : previousTitle);
  setValue(kamelet, 'spec.definition.description', 'description' in value ? newDescription : previousDescription);

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
    [KameletKnownAnnotations.Icon]: 'icon' in value ? newIcon : previousIcon,
    [KameletKnownAnnotations.SupportLevel]: 'supportLevel' in value ? newSupportLevel : previousSupportLevel,
    [KameletKnownAnnotations.CatalogVersion]: 'catalogVersion' in value ? newCatalogVersion : previousCatalogVersion,
    [KameletKnownAnnotations.Provider]: 'provider' in value ? newProvider : previousProvider,
    [KameletKnownAnnotations.Group]: 'group' in value ? newGroup : previousGroup,
    [KameletKnownAnnotations.Namespace]: 'namespace' in value ? newNamespace : previousNamespace,
  };

  const previousType = getValue(kamelet, 'metadata.labels', {} as IKameletMetadataLabels)[KameletKnownLabels.Type];
  const incomingLabels = getValue(value, 'labels', {});
  const newLabels = {
    ...incomingLabels,
    [KameletKnownLabels.Type]: 'type' in value ? getValue(value, 'type') : previousType,
  };
  const newAnnotations = { ...getValue(value, 'annotations', {}), ...customAnnotations };

  setValue(kamelet, 'metadata.labels', newLabels);
  setValue(kamelet, 'metadata.annotations', newAnnotations);

  const propertiesArray: IKameletCustomProperty[] = getValue(value, 'kameletProperties');
  const newProperties = propertiesArray?.reduce(
    (acc, property) => {
      if (property !== undefined) {
        const { name, ...rest } = property;
        acc[name] = rest;
      }
      return acc;
    },
    {} as Record<string, IKameletSpecProperty>,
  );

  let previousProperties: Record<string, IKameletSpecProperty> = getValue(kamelet, 'spec.definition.properties', {});
  if (typeof previousProperties !== 'object') {
    previousProperties = {};
  }

  const arePreviousPropertiesEmpty = Object.keys(previousProperties).length === 0;
  const isPropertiesArrayEmpty = propertiesArray?.length === 0;
  if (!(arePreviousPropertiesEmpty && isPropertiesArrayEmpty) && newProperties !== undefined) {
    setValue(kamelet, 'spec.definition.properties', newProperties);
  }
};
