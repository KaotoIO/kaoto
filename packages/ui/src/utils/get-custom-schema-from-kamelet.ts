import {
  IKameletCustomDefinition,
  IKameletDefinition,
  IKameletMetadataAnnotations,
  IKameletMetadataLabels,
  KameletKnownAnnotations,
  KameletKnownLabels,
} from '../models/kamelets-catalog';
import { getValue } from './get-value';

export const getCustomSchemaFromKamelet = (kamelet: IKameletDefinition): IKameletCustomDefinition => {
  const name = getValue(kamelet, 'metadata.name', '');
  const title = getValue(kamelet, 'spec.definition.title', '');
  const description = getValue(kamelet, 'spec.definition.description', '');
  const type = getValue(kamelet, 'metadata.labels', {} as IKameletMetadataLabels)[KameletKnownLabels.Type];
  const annotations = getValue(kamelet, 'metadata.annotations', {} as IKameletMetadataAnnotations);
  const labels = getValue(kamelet, 'metadata.labels', {} as IKameletMetadataLabels);

  const filteredLabels = Object.keys(labels).reduce((acc, key) => {
    if (key !== KameletKnownLabels.Type) {
      acc[key] = labels[key];
    }
    return acc;
  }, {} as IKameletMetadataLabels);

  const filteredAnnotations = Object.entries(annotations).reduce((acc, [annotationKey, annotationValue]) => {
    switch (annotationKey) {
      case KameletKnownAnnotations.Icon:
      case KameletKnownAnnotations.SupportLevel:
      case KameletKnownAnnotations.CatalogVersion:
      case KameletKnownAnnotations.Provider:
      case KameletKnownAnnotations.Group:
      case KameletKnownAnnotations.Namespace:
        break;
      default:
        acc[annotationKey] = annotationValue as string;
    }

    return acc;
  }, {} as IKameletMetadataAnnotations);

  const customSchema: IKameletCustomDefinition = {
    name,
    title,
    description,
    type,
    icon: annotations[KameletKnownAnnotations.Icon],
    supportLevel: annotations[KameletKnownAnnotations.SupportLevel],
    catalogVersion: annotations[KameletKnownAnnotations.CatalogVersion],
    provider: annotations[KameletKnownAnnotations.Provider],
    group: annotations[KameletKnownAnnotations.Group],
    namespace: annotations[KameletKnownAnnotations.Namespace],
    labels: filteredLabels,
    annotations: filteredAnnotations,
  };

  return customSchema;
};
