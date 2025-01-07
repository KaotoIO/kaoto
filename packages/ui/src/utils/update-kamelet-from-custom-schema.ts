import {
  IKameletCustomProperty,
  IKameletDefinition,
  IKameletSpecProperty,
  KameletKnownAnnotations,
  KameletKnownLabels,
} from '../models/kamelets-catalog';
import { getValue } from './get-value';
import { isDefined } from './is-defined';
import { setValue } from './set-value';

export const updateKameletFromCustomSchema = (kamelet: IKameletDefinition, value: Record<string, unknown>): void => {
  if (!isDefined(value)) {
    return;
  }

  const newName: string = getValue(value, 'name');
  const newTitle: string = getValue(value, 'title');
  const newDescription: string = getValue(value, 'description');

  setValue(kamelet, 'metadata.name', newName);
  setValue(kamelet, 'spec.definition.title', newTitle);
  setValue(kamelet, 'spec.definition.description', newDescription);

  const newIcon = getValue(value, 'icon');
  const newSupportLevel = getValue(value, 'supportLevel');
  const newCatalogVersion = getValue(value, 'catalogVersion');
  const newProvider = getValue(value, 'provider');
  const newGroup = getValue(value, 'group');
  const newNamespace = getValue(value, 'namespace');

  const customAnnotations = {
    [KameletKnownAnnotations.Icon]: newIcon,
    [KameletKnownAnnotations.SupportLevel]: newSupportLevel,
    [KameletKnownAnnotations.CatalogVersion]: newCatalogVersion,
    [KameletKnownAnnotations.Provider]: newProvider,
    [KameletKnownAnnotations.Group]: newGroup,
    [KameletKnownAnnotations.Namespace]: newNamespace,
  };

  const incomingLabels = getValue(value, 'labels', {});
  const newLabels = Object.assign({}, incomingLabels, {
    [KameletKnownLabels.Type]: getValue(value, 'type'),
  });
  const newAnnotations = Object.assign({}, getValue(value, 'annotations', {}), customAnnotations);

  setValue(kamelet, 'metadata.labels', newLabels);
  setValue(kamelet, 'metadata.annotations', newAnnotations);

  const propertiesArray: IKameletCustomProperty[] = getValue(value, 'kameletProperties');
  // TODO: When deleting the content of the property name, it turns into `undefined` instead of being removed
  // TODO: Check how can we skip this issue
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
