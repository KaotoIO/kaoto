import { CatalogKind } from '../../../../../models';
import { FormTest } from './FormTest';

const target = { kind: CatalogKind.Kamelet, range: { start: 50, end: 100 } };

describe(`Form: ${target.kind} - [${target.range.start} - ${target.range.end}]`, () => {
  FormTest(target);
});
