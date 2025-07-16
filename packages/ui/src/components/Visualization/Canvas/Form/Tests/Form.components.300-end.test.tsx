import { CatalogKind } from '../../../../../models';
import { FormTest } from './FormTest';

const target = { kind: CatalogKind.Component, range: { start: 300, end: undefined } } as const;

describe(`Form: ${target.kind} - [${target.range.start} - ${target.range.end}]`, () => {
  FormTest(target);
});
