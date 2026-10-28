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
 * This is a stub Citrus test in XML format.
 */
export const citrusTestXml = `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase" name="sample-test">
  <actions>
    <print>
      <message>Hello from Citrus!</message>
    </print>
  </actions>
</test>`;

/**
 * This is a stub Citrus test in JSON format.
 */
export const citrusTestJson: Test = parse(citrusTestYaml);

export const citrusTest = new CitrusTestVisualEntity(citrusTestJson);
