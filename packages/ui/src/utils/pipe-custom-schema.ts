import { Pipe } from '@kaoto/camel-catalog/types';
import { getValue } from './get-value';
import { setValue } from './set-value';
import { set } from 'lodash';

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
  // Ensure 'labels' and 'annotations' are defined in 'value'
  if (getValue(value, 'labels') === undefined) {
    set(value, 'labels', {});
  }
  if (getValue(value, 'annotations') === undefined) {
    set(value, 'annotations', {});
  }
  const previousName: string = getValue(pipe, 'metadata.name');
  const newName: string = getValue(value, 'name');
  setValue(pipe, 'metadata.name', newName ?? previousName);

  const previousAnnotations: Record<string, unknown> = getValue(pipe, 'metadata.annotations', {});
  const previousLabels: Record<string, unknown> = getValue(pipe, 'metadata.labels', {});

  const newLabels = Object.assign({}, getValue(value, 'labels', previousLabels));
  const newAnnotations = Object.assign({}, getValue(value, 'annotations', previousAnnotations));

  setValue(pipe, 'metadata.labels', newLabels);
  setValue(pipe, 'metadata.annotations', newAnnotations);
};
