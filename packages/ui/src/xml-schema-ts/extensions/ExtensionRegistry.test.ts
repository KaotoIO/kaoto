import { QName } from '../QName';
import { XmlSchemaObject } from '../XmlSchemaObject';
import { ExtensionDeserializer } from './ExtensionDeserializer';
import { ExtensionRegistry } from './ExtensionRegistry';
import { ExtensionSerializer } from './ExtensionSerializer';

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;
  const mockNode = {} as Node;
  const mockSchemaObject = {} as XmlSchemaObject;

  beforeEach(() => {
    registry = new ExtensionRegistry();
  });

  describe('serializeExtension', () => {
    it('should call registered serializer when one is registered for the type', () => {
      const serializer: ExtensionSerializer = { serialize: jest.fn() };
      registry.registerSerializer('MyType', serializer);
      registry.serializeExtension(mockSchemaObject, 'MyType', mockNode);
      expect(serializer.serialize).toHaveBeenCalledWith(mockSchemaObject, 'MyType', mockNode);
    });

    it('should call default serializer when no serializer is registered for the type', () => {
      const defaultSerializer: ExtensionSerializer = { serialize: jest.fn() };
      registry.setDefaultExtensionSerializer(defaultSerializer);
      registry.serializeExtension(mockSchemaObject, 'UnknownType', mockNode);
      expect(defaultSerializer.serialize).toHaveBeenCalledWith(mockSchemaObject, 'UnknownType', mockNode);
    });
  });

  describe('deserializeExtension', () => {
    it('should call registered deserializer when one is registered for the QName', () => {
      const qName = new QName('http://example.com', 'myElement');
      const deserializer: ExtensionDeserializer = { deserialize: jest.fn() };
      registry.registerDeserializer(qName, deserializer);
      registry.deserializeExtension(mockSchemaObject, qName, mockNode);
      expect(deserializer.deserialize).toHaveBeenCalledWith(mockSchemaObject, qName, mockNode);
    });

    it('should call default deserializer when no deserializer is registered for the QName', () => {
      const defaultDeserializer: ExtensionDeserializer = { deserialize: jest.fn() };
      registry.setDefaultExtensionDeserializer(defaultDeserializer);
      const qName = new QName('http://example.com', 'unknown');
      registry.deserializeExtension(mockSchemaObject, qName, mockNode);
      expect(defaultDeserializer.deserialize).toHaveBeenCalledWith(mockSchemaObject, qName, mockNode);
    });
  });
});
