import { parse } from 'yaml';

import { CitrusTestVisualEntity } from '../models';
import { Test } from '../models/citrus/entities/Test';

/**
 * This is a stub Citrus test in YAML format.
 */
export const citrusTestYaml = `
name: sample-test
actions:
  - print:
      message: Hello from Citrus!
`;

/**
 * This is a stub Citrus test in JSON format.
 */
export const citrusTestJson: Test = parse(citrusTestYaml);

export const citrusTest = new CitrusTestVisualEntity(citrusTestJson);
