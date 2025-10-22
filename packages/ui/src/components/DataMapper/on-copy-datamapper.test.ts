import { onCopyDataMapper } from './on-copy-datamapper';
import { IVisualizationNode } from '../../models';
import { SourceSchemaType } from '../../models/camel/source-schema-type';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';

describe('onCopyDataMapper', () => {
  let mockVizNode: jest.Mocked<IVisualizationNode>;

  beforeEach(() => {
    mockVizNode = {} as jest.Mocked<IVisualizationNode>;
  });

  it('should fix the processor name from kaoto-datamapper to step', () => {
    const content: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'kaoto-datamapper',
      definition: {
        step: {
          id: 'test-id',
          steps: [
            {
              to: {
                id: 'test-xslt-id',
                uri: 'xslt:test-id.xsl',
              },
            },
          ],
        },
      },
    };

    const result = onCopyDataMapper(mockVizNode, content);

    expect(result).toBeDefined();
    expect(result!.name).toBe('step');
    expect(result!.definition).toEqual({
      step: {
        id: 'test-id',
        steps: [
          {
            to: {
              id: 'test-xslt-id',
              uri: 'xslt:test-id.xsl',
            },
          },
        ],
      },
    });
  });

  it('should not modify content if name is not kaoto-datamapper', () => {
    const content: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'log',
      definition: {
        log: {
          id: 'test-id',
          message: 'test',
        },
      },
    };

    const result = onCopyDataMapper(mockVizNode, content);

    expect(result).toBeDefined();
    expect(result!.name).toBe('log');
    expect(result).toEqual(content);
  });

  it('should handle undefined content', () => {
    const result = onCopyDataMapper(mockVizNode, undefined);

    expect(result).toBeUndefined();
  });
});
