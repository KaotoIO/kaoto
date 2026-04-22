import { Types } from '../models/datamapper';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { XmlSchemaField } from './document/xml-schema/xml-schema-document.model';
import { SchemaPathSegment, SchemaPathService } from './schema-path.service';

describe('SchemaPathService', () => {
  const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

  function makeChoiceField(parent: XmlSchemaField, memberNames: string[]) {
    const choiceField = new XmlSchemaField(parent, 'choice', false);
    choiceField.wrapperKind = 'choice';
    choiceField.fields = memberNames.map((n) => new XmlSchemaField(choiceField, n, false));
    return choiceField;
  }

  function makeAbstractField(parent: XmlSchemaField, candidateNames: string[]) {
    const abstractField = new XmlSchemaField(parent, 'AbstractElement', false);
    abstractField.wrapperKind = 'abstract';
    abstractField.namespaceURI = 'io.kaoto.datamapper.poc.test';
    abstractField.fields = candidateNames.map((n) => {
      const f = new XmlSchemaField(abstractField, n, false);
      f.namespaceURI = 'io.kaoto.datamapper.poc.test';
      return f;
    });
    return abstractField;
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
      expect(result?.wrapperKind).toBeFalsy();
    });

    it('should navigate to a choice field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const result = SchemaPathService.navigateToField(doc, '/ns0:ShipOrder/{choice:0}', namespaceMap);

      expect(result?.wrapperKind).toBe('choice');
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

  describe('navigateToField() with namedTypeFragmentRefs', () => {
    it('should resolve namedTypeFragmentRefs in findIndexedChild', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const intermediateField = new XmlSchemaField(shipOrderField, 'intermediate', false);
      const choiceField = new XmlSchemaField(intermediateField, 'choice', false);
      choiceField.wrapperKind = 'choice';
      doc.namedTypeFragments['fragId'] = {
        type: Types.Container,
        fields: [choiceField],
        namedTypeFragmentRefs: [],
      };
      intermediateField.namedTypeFragmentRefs = ['fragId'];
      shipOrderField.fields.push(intermediateField);

      const result = SchemaPathService.navigateToField(doc, '/ns0:ShipOrder/intermediate/{choice:0}', namespaceMap);

      expect(result?.wrapperKind).toBe('choice');
    });

    it('should resolve namedTypeFragmentRefs in findElementChild', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const intermediateField = new XmlSchemaField(shipOrderField, 'intermediate', false);
      const innerField = new XmlSchemaField(intermediateField, 'innerField', false);
      const choiceField = new XmlSchemaField(innerField, 'choice', false);
      choiceField.wrapperKind = 'choice';
      innerField.fields = [choiceField];
      doc.namedTypeFragments['fragId'] = {
        type: Types.Container,
        fields: [innerField],
        namedTypeFragmentRefs: [],
      };
      intermediateField.namedTypeFragmentRefs = ['fragId'];
      shipOrderField.fields.push(intermediateField);

      const result = SchemaPathService.navigateToField(
        doc,
        '/ns0:ShipOrder/intermediate/innerField/{choice:0}',
        namespaceMap,
      );

      expect(result?.wrapperKind).toBe('choice');
    });
  });

  describe('buildOriginal()', () => {
    it('should return same as build() when field has no originalField', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;

      const normal = SchemaPathService.build(field, namespaceMap);
      const original = SchemaPathService.buildOriginal(field, namespaceMap);

      expect(original).toBe(normal);
    });

    it('should use originalField name and namespace for the terminal segment', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
      field.originalField = {
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        namespaceURI: 'io.kaoto.datamapper.poc.test',
        namespacePrefix: 'ns0',
        type: Types.Container,
        typeQName: null,
        namedTypeFragmentRefs: [],
      };
      field.name = 'Cat';

      const original = SchemaPathService.buildOriginal(field, namespaceMap);

      expect(original).toBe('/ns0:ShipOrder/ns0:AbstractAnimal');
    });

    it('should preserve isAttribute from the live field in the terminal segment', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
      field.originalField = {
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        namespaceURI: 'io.kaoto.datamapper.poc.test',
        namespacePrefix: 'ns0',
        type: Types.Container,
        typeQName: null,
        namedTypeFragmentRefs: [],
      };
      field.name = 'Cat';
      field.isAttribute = true;

      const original = SchemaPathService.buildOriginal(field, namespaceMap);

      expect(original).toBe('/ns0:ShipOrder/ns0:@AbstractAnimal');
    });

    it('should produce {abstract:N} for abstract ancestor in the path', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const root = doc.fields[0];
      const abstractField = makeAbstractField(root, ['Cat', 'Dog']);
      root.fields.push(abstractField);
      const catField = abstractField.fields[0];
      catField.originalField = {
        name: 'OrigCat',
        displayName: 'OrigCat',
        namespaceURI: 'io.kaoto.datamapper.poc.test',
        namespacePrefix: 'ns0',
        type: Types.String,
        typeQName: null,
        namedTypeFragmentRefs: [],
      };

      const original = SchemaPathService.buildOriginal(catField, namespaceMap);

      expect(original).toBe('/ns0:ShipOrder/{abstract:0}/ns0:OrigCat');
    });
  });

  describe('abstract segments', () => {
    it('parse() should parse {abstract:N} segments', () => {
      const result = SchemaPathService.parse('/ns0:Root/{abstract:0}/ns0:Cat');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'abstract', index: 0 },
        { kind: 'element', segment: 'ns0:Cat' },
      ]);
    });

    it('parse() should handle sibling abstract indices', () => {
      const result = SchemaPathService.parse('/ns0:Root/{abstract:0}/{abstract:1}');
      expect(result).toEqual<SchemaPathSegment[]>([
        { kind: 'element', segment: 'ns0:Root' },
        { kind: 'abstract', index: 0 },
        { kind: 'abstract', index: 1 },
      ]);
    });

    it('build() should produce {abstract:N} for abstract wrapper fields', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const abstractField = makeAbstractField(root, ['Cat', 'Dog']);
      root.fields.push(abstractField);

      const path = SchemaPathService.build(abstractField, namespaceMap);
      expect(path).toBe('/ns0:ShipOrder/{abstract:0}');
    });

    it('build() should index sibling abstract fields correctly', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const abstract0 = makeAbstractField(root, ['A']);
      const abstract1 = makeAbstractField(root, ['B']);
      root.fields.push(abstract0, abstract1);

      expect(SchemaPathService.build(abstract0, namespaceMap)).toBe('/ns0:ShipOrder/{abstract:0}');
      expect(SchemaPathService.build(abstract1, namespaceMap)).toBe('/ns0:ShipOrder/{abstract:1}');
    });

    it('navigateToField() should traverse {abstract:N} segments', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const abstractField = makeAbstractField(root, ['Cat', 'Dog']);
      root.fields.push(abstractField);

      const found = SchemaPathService.navigateToField(document, '/ns0:ShipOrder/{abstract:0}', namespaceMap);
      expect(found).toBe(abstractField);
    });
  });

  describe('formatDisplayPath()', () => {
    it('should collapse non-terminal abstract with its candidate child', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const abstractField = makeAbstractField(root, ['Cat', 'Dog']);
      root.fields.push(abstractField);
      const catField = abstractField.fields[0];

      const path = SchemaPathService.formatDisplayPath(catField, namespaceMap);
      expect(path).toBe('/ns0:ShipOrder/ns0:Cat');
    });

    it('should show abstract element name when it is the terminal segment and unselected', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const abstractField = makeAbstractField(root, ['Cat', 'Dog']);
      root.fields.push(abstractField);

      const path = SchemaPathService.formatDisplayPath(abstractField, namespaceMap);
      expect(path).toBe('/ns0:ShipOrder/ns0:AbstractElement');
    });

    it('should show selected candidate name when terminal abstract has selectedMemberIndex', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const abstractField = makeAbstractField(root, ['Cat', 'Dog']);
      abstractField.selectedMemberIndex = 1;
      root.fields.push(abstractField);

      const path = SchemaPathService.formatDisplayPath(abstractField, namespaceMap);
      expect(path).toBe('/ns0:ShipOrder/ns0:Dog');
    });

    it('should produce same output as build() for non-abstract fields', () => {
      const document = TestUtil.createSourceOrderDoc();
      const field = document.fields[0].fields.find((f) => f.name === 'OrderPerson')!;

      const displayPath = SchemaPathService.formatDisplayPath(field, namespaceMap);
      const buildPath = SchemaPathService.build(field, namespaceMap);
      expect(displayPath).toBe(buildPath);
    });

    it('should keep {choice:N} segments unchanged', () => {
      const document = TestUtil.createSourceOrderDoc();
      const root = document.fields[0];
      const choiceField = makeChoiceField(root, ['email', 'phone']);
      root.fields.push(choiceField);

      const path = SchemaPathService.formatDisplayPath(choiceField, namespaceMap);
      expect(path).toBe('/ns0:ShipOrder/{choice:0}');
    });
  });
});
