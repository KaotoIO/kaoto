import { Pipe } from '@kaoto/camel-catalog/types';
import { getValue } from './get-value';
import { isDefined } from './is-defined';
import { setValue } from './set-value';

export const getCustomSchemaFromPipe = (pipe: Pipe) => {
  const name: string = getValue(pipe, 'metadata.name', '');
  const annotations: Record<string, unknown> = getValue(pipe, 'metadata.annotations', {});
  const labels: Record<string, unknown> = getValue(pipe, 'metadata.labels', {});

  const customSchema = {
    name,
    labels,
    annotations,
  };

  return customSchema;
};

export const updatePipeFromCustomSchema = (pipe: Pipe, value: Record<string, unknown>): void => {
  if (!isDefined(value)) {
    return;
  }

  // Ensure 'labels' and 'annotations' are defined in 'value'
  if (value && getValue(value, 'labels') === undefined) {
    value.labels = {};
  }
  if (value && getValue(value, 'annotations') === undefined) {
    value.annotations = {};
  }

  const newName: string = getValue(value, 'name');
  setValue(pipe, 'metadata.name', newName);

  const previousAnnotations: Record<string, unknown> = getValue(pipe, 'metadata.annotations', {});
  const previousLabels: Record<string, unknown> = getValue(pipe, 'metadata.labels', {});

  const newLabels = Object.assign({}, getValue(value, 'labels', previousLabels));
  const newAnnotations = Object.assign({}, getValue(value, 'annotations', previousAnnotations));

  setValue(pipe, 'metadata.labels', newLabels);
  setValue(pipe, 'metadata.annotations', newAnnotations);
};
