import { setValue } from './set-value';
import { IKameletDefinition } from '../models/kamelets-catalog';

export const getCustomSchemaFromActualKameletSchema = (kamelet: IKameletDefinition): Record<string, unknown> => {
  const customSchema = {
    name: kamelet.metadata.name,
    title: kamelet.spec.definition.title,
    description: kamelet.spec.definition.description,
    type: kamelet.metadata.labels['camel.apache.org/kamelet.type'],
    icon: kamelet.metadata.annotations['camel.apache.org/kamelet.icon'],
    supportLevel: kamelet.metadata.annotations['camel.apache.org/kamelet.support.level'],
    catalogVersion: kamelet.metadata.annotations['camel.apache.org/catalog.version'],
    provider: kamelet.metadata.annotations['camel.apache.org/provider'],
    group: kamelet.metadata.annotations['camel.apache.org/kamelet.group'],
    namespace: kamelet.metadata.annotations['camel.apache.org/kamelet.namespace'],
  };

  const labels: { [key: string]: string } = {};
  if (kamelet.metadata.labels && Object.keys(kamelet.metadata.labels).length > 0) {
    for (const [labelKey, labelValue] of Object.entries(kamelet.metadata.labels)) {
      switch (labelKey) {
        case 'camel.apache.org/kamelet.type':
          break;
        default:
          labels[labelKey] = labelValue as string;
      }
    }
  }
  setValue(customSchema, 'labels', labels);

  const annotations: { [key: string]: string } = {};
  if (kamelet.metadata.annotations && Object.keys(kamelet.metadata.annotations).length > 0) {
    for (const [annotationKey, annotationValue] of Object.entries(kamelet.metadata.annotations)) {
      switch (annotationKey) {
        case 'camel.apache.org/kamelet.icon':
        case 'camel.apache.org/kamelet.support.level':
        case 'camel.apache.org/catalog.version':
        case 'camel.apache.org/provider':
        case 'camel.apache.org/kamelet.group':
        case 'camel.apache.org/kamelet.namespace':
          break;
        default:
          annotations[annotationKey] = annotationValue as string;
      }
    }
  }
  setValue(customSchema, 'annotations', annotations);

  return customSchema;
};
