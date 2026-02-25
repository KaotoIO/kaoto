import { Types } from '../models/datamapper';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { SchemaPathSegment, SchemaPathService } from './schema-path.service';
import { XmlSchemaField } from './xml-schema-document.model';

describe('SchemaPathService', () => {
  const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

  function makeChoiceField(parent: XmlSchemaField, memberNames: string[]) {
    const choiceField = new XmlSchemaField(parent, 'choice', false);
    choiceField.isChoice = true;
    choiceField.fields = memberNames.map((n) => new XmlSchemaField(choiceField, n, false));
    return choiceField;
  }

  describe('parse()', () => {
    it('should parse a simple element path', () => {
      const result = SchemaPathService.parse('/ns0:Root/ns0:Child');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'element', segment: 'ns0:Child' },
      ]);
    });

    it('should parse a path with a choice segment', () => {
      const result = SchemaPathService.parse('/ns0:Root/{choice:0}');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'choice', index: 0 },
      ]);
    });

    it('should parse a path with sibling choices', () => {
      const result = SchemaPathService.parse('/ns0:Root/{choice:1}');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'choice', index: 1 },
      ]);
    });

    it('should parse a path with directly nested choices', () => {
      const result = SchemaPathService.parse('/ns0:Root/{choice:0}/{choice:0}');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'choice', index: 0 },
        { kind: 'choice', index: 0 },
      ]);
    });

    it('should parse a path with element nested inside choice', () => {
      const result = SchemaPathService.parse('/ns0:Root/{choice:0}/ns0:Option1/{choice:0}');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'choice', index: 0 },
        { kind: 'element', segment: 'ns0:Option1' },
        { kind: 'choice', index: 0 },
      ]);
    });

    it('should return empty array for empty path', () => {
      expect(SchemaPathService.parse('')).toEqual([]);
    });

    it('should return empty array for root-only path', () => {
      expect(SchemaPathService.parse('/')).toEqual([]);
    });
  });

  describe('build()', () => {
    it('should build a basic schema path for a choice field under a namespaced element', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const path = SchemaPathService.build(choiceField, namespaceMap);

      expect(path).toBe('/ns0:ShipOrder/{choice:0}');
    });

    it('should build correct path for directly nested choices', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const outerChoice = makeChoiceField(shipOrderField, []);
      const innerChoice = makeChoiceField(outerChoice, ['optA', 'optB']);
      outerChoice.fields = [innerChoice];
      shipOrderField.fields.push(outerChoice);

      const path = SchemaPathService.build(innerChoice, namespaceMap);

      expect(path).toBe('/ns0:ShipOrder/{choice:0}/{choice:0}');
    });

    it('should build correct index when non-choice fields are interspersed between choices', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const elementA = new XmlSchemaField(shipOrderField, 'ElementA', false);
      const choice0 = makeChoiceField(shipOrderField, ['optA', 'optB']);
      const elementB = new XmlSchemaField(shipOrderField, 'ElementB', false);
      const choice1 = makeChoiceField(shipOrderField, ['optX', 'optY']);
      shipOrderField.fields.push(elementA, choice0, elementB, choice1);

      expect(SchemaPathService.build(choice0, namespaceMap)).toBe('/ns0:ShipOrder/{choice:0}');
      expect(SchemaPathService.build(choice1, namespaceMap)).toBe('/ns0:ShipOrder/{choice:1}');
    });

    it('should use bare name when element namespace URI has no matching prefix in map', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const bareParent = new XmlSchemaField(shipOrderField, 'bareParent', false);
      const choiceField = makeChoiceField(bareParent, ['optA', 'optB']);
      bareParent.fields = [choiceField];
      shipOrderField.fields.push(bareParent);

      const path = SchemaPathService.build(choiceField, namespaceMap);

      expect(path).toBe('/ns0:ShipOrder/bareParent/{choice:0}');
    });
  });

  describe('navigateToField()', () => {
    it('should navigate to a regular (non-choice) field', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = SchemaPathService.navigateToField(doc, '/ns0:ShipOrder/ns0:OrderPerson', namespaceMap);

      expect(result).toBeDefined();
      expect(result?.isChoice).toBeFalsy();
    });

    it('should navigate to a choice field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const result = SchemaPathService.navigateToField(doc, '/ns0:ShipOrder/{choice:0}', namespaceMap);

      expect(result?.isChoice).toBe(true);
    });

    it('should return undefined for empty path', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = SchemaPathService.navigateToField(doc, '', namespaceMap);

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent path', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = SchemaPathService.navigateToField(doc, '/ns0:ShipOrder/NonExistent', namespaceMap);

      expect(result).toBeUndefined();
    });

    it('should navigate to a field inside a choice member', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, []);
      const emailField = new XmlSchemaField(choiceField, 'email', false);
      const emailAddressField = new XmlSchemaField(emailField, 'emailAddress', false);
      emailField.fields = [emailAddressField];
      choiceField.fields = [emailField];
      shipOrderField.fields.push(choiceField);

      const result = SchemaPathService.navigateToField(
        doc,
        '/ns0:ShipOrder/{choice:0}/email/emailAddress',
        namespaceMap,
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('emailAddress');
    });
  });

  describe('navigateToChoiceField()', () => {
    it('should navigate to a choice field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const result = SchemaPathService.navigateToChoiceField(doc, '/ns0:ShipOrder/{choice:0}', namespaceMap);

      expect(result?.isChoice).toBe(true);
    });

    it('should return undefined for empty path', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = SchemaPathService.navigateToChoiceField(doc, '', namespaceMap);

      expect(result).toBeUndefined();
    });

    it('should return undefined when terminal field is not a choice', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = SchemaPathService.navigateToChoiceField(doc, '/ns0:ShipOrder/ns0:OrderPerson', namespaceMap);

      expect(result).toBeUndefined();
    });

    it('should resolve namedTypeFragmentRefs in findChoiceChildByIndex', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const intermediateField = new XmlSchemaField(shipOrderField, 'intermediate', false);
      const choiceField = new XmlSchemaField(intermediateField, 'choice', false);
      choiceField.isChoice = true;
      doc.namedTypeFragments['fragId'] = {
        type: Types.Container,
        fields: [choiceField],
        namedTypeFragmentRefs: [],
      };
      intermediateField.namedTypeFragmentRefs = ['fragId'];
      shipOrderField.fields.push(intermediateField);

      const result = SchemaPathService.navigateToChoiceField(
        doc,
        '/ns0:ShipOrder/intermediate/{choice:0}',
        namespaceMap,
      );

      expect(result?.isChoice).toBe(true);
    });

    it('should resolve namedTypeFragmentRefs in findElementChild', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const intermediateField = new XmlSchemaField(shipOrderField, 'intermediate', false);
      const innerField = new XmlSchemaField(intermediateField, 'innerField', false);
      const choiceField = new XmlSchemaField(innerField, 'choice', false);
      choiceField.isChoice = true;
      innerField.fields = [choiceField];
      doc.namedTypeFragments['fragId'] = {
        type: Types.Container,
        fields: [innerField],
        namedTypeFragmentRefs: [],
      };
      intermediateField.namedTypeFragmentRefs = ['fragId'];
      shipOrderField.fields.push(intermediateField);

      const result = SchemaPathService.navigateToChoiceField(
        doc,
        '/ns0:ShipOrder/intermediate/innerField/{choice:0}',
        namespaceMap,
      );

      expect(result?.isChoice).toBe(true);
    });
  });
});
