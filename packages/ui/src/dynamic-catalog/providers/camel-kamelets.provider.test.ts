import { IKameletDefinition } from '../../models/camel/kamelets-catalog';
import { FileTypes } from '../../models/file-types';
import { CamelKameletsProvider } from './camel-kamelets.provider';

describe('CamelKameletsProvider', () => {
  describe('fetchAll', () => {
    it('should return only embedded kamelets when no client is provided', async () => {
      const embedded = { 'timer-source': { metadata: { name: 'timer-source' } } as IKameletDefinition };
      const provider = new CamelKameletsProvider(embedded);

      const result = await provider.fetchAll();

      expect(result).toEqual(embedded);
    });

    it('should parse YAML content from remote resources', async () => {
      const yamlContent = `
kind: Kamelet
metadata:
  name: http-source
spec:
  definition:
    title: HTTP Source
`;
      const client = vi.fn().mockResolvedValue([{ filename: 'http-source.kamelet.yaml', content: yamlContent }]);
      const provider = new CamelKameletsProvider({}, client);

      const result = await provider.fetchAll();

      expect(client).toHaveBeenCalledWith(FileTypes.Kamelets);
      expect(result['http-source.kamelet.yaml']).toMatchObject({ kind: 'Kamelet', metadata: { name: 'http-source' } });
    });

    it('should merge embedded kamelets with remote kamelets, remote taking precedence', async () => {
      const embedded = { 'timer-source': { metadata: { name: 'timer-source' } } as IKameletDefinition };
      const remoteYaml = 'kind: Kamelet\nmetadata:\n  name: http-source\n';
      const client = vi.fn().mockResolvedValue([{ filename: 'http-source.kamelet.yaml', content: remoteYaml }]);
      const provider = new CamelKameletsProvider(embedded, client);

      const result = await provider.fetchAll();

      expect(result).toHaveProperty('timer-source');
      expect(result).toHaveProperty('http-source.kamelet.yaml');
    });

    it('should skip an entry and log an error when YAML parsing fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badContent = ': invalid: yaml: {[';
      const client = vi.fn().mockResolvedValue([{ filename: 'bad-kamelet.yaml', content: badContent }]);
      const provider = new CamelKameletsProvider({}, client);

      const result = await provider.fetchAll();

      expect(result).not.toHaveProperty('bad-kamelet.yaml');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing bad-kamelet.yaml', expect.anything());
      consoleErrorSpy.mockRestore();
    });

    it('should continue processing valid entries after a failed parse', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const validYaml = 'kind: Kamelet\nmetadata:\n  name: good-kamelet\n';
      const client = vi.fn().mockResolvedValue([
        { filename: 'bad.yaml', content: ': {[' },
        { filename: 'good.yaml', content: validYaml },
      ]);
      const provider = new CamelKameletsProvider({}, client);

      const result = await provider.fetchAll();

      expect(result).toHaveProperty('good.yaml');
      expect(result).not.toHaveProperty('bad.yaml');
      consoleErrorSpy.mockRestore();
    });

    it('should return an empty object when client returns an empty list', async () => {
      const client = vi.fn().mockResolvedValue([]);
      const provider = new CamelKameletsProvider({}, client);

      const result = await provider.fetchAll();

      expect(result).toEqual({});
    });
  });

  describe('fetch', () => {
    it('should return the kamelet for a given key', async () => {
      const embedded = { 'timer-source': { metadata: { name: 'timer-source' } } as IKameletDefinition };
      const provider = new CamelKameletsProvider(embedded);

      const result = await provider.fetch('timer-source');

      expect(result).toEqual(embedded['timer-source']);
    });

    it('should return undefined when the key does not exist', async () => {
      const provider = new CamelKameletsProvider({});

      const result = await provider.fetch('non-existent');

      expect(result).toBeUndefined();
    });
  });
});
