import { CatalogKind } from '../../../../../models';
import { FormTest } from './FormTest';

const target = { kind: CatalogKind.Component, range: { start: 150, end: 200 } } as const;

describe(`Form: ${target.kind} - [${target.range.start} - ${target.range.end}]`, () => {
  FormTest(target);
});
