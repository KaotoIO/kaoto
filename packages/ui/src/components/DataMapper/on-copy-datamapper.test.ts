import { IVisualizationNode } from '../../models';
import { IClipboardContent } from '../../models/visualization/clipboard';
import { onCopyDataMapper } from './on-copy-datamapper';

describe('onCopyDataMapper', () => {
  let mockVizNode: Mocked<IVisualizationNode>;

  beforeEach(() => {
    mockVizNode = {} as Mocked<IVisualizationNode>;
  });

  it('should fix the processor name from kaoto-datamapper to step', () => {
    const content: IClipboardContent = {
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

    const result = onCopyDataMapper({ sourceVizNode: mockVizNode, content: content });

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
    const content: IClipboardContent = {
      name: 'log',
      definition: {
        log: {
          id: 'test-id',
          message: 'test',
        },
      },
    };

    const result = onCopyDataMapper({ sourceVizNode: mockVizNode, content: content });

    expect(result).toBeDefined();
    expect(result!.name).toBe('log');
    expect(result).toEqual(content);
  });

  it('should handle undefined content', () => {
    const result = onCopyDataMapper({ sourceVizNode: mockVizNode, content: undefined });

    expect(result).toBeUndefined();
  });
});
