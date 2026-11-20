import { SourceDocument } from '@kaoto/kaoto/components';

import { createFileSourceCodeAdapter } from './file-source-code-adapter';

describe('createFileSourceCodeAdapter', () => {
  const routeA = { id: 'a', path: 'routes/a.camel.yaml', content: '- route:\n    id: a\n' };
  const routeB = { id: 'b', path: 'routes/b.camel.yaml', content: '- route:\n    id: b\n' };

  const subscribe = (adapter: ReturnType<typeof createFileSourceCodeAdapter>) => {
    const delivered: SourceDocument[] = [];
    adapter.subscribe((document) => {
      delivered.push(document);
    });
    return delivered;
  };

  it('delivers the opened file with its path on subscribe', () => {
    const adapter = createFileSourceCodeAdapter();
    adapter.open(routeA);

    const delivered = subscribe(adapter);

    expect(delivered).toEqual([{ code: routeA.content, path: routeA.path }]);
  });

  it('delivers the next file when another file is opened', () => {
    const adapter = createFileSourceCodeAdapter();
    adapter.open(routeA);
    const delivered = subscribe(adapter);

    adapter.open(routeB);

    expect(delivered.at(-1)).toEqual({ code: routeB.content, path: routeB.path });
  });

  it('saves a change to the file that is open', () => {
    const save = vi.fn();
    const adapter = createFileSourceCodeAdapter();
    adapter.setSave(save);
    adapter.open(routeA);
    subscribe(adapter);

    adapter.onChange?.('changed');

    expect(save).toHaveBeenCalledWith('a', 'changed');
  });

  it('does not save the content it delivered', () => {
    const save = vi.fn();
    const adapter = createFileSourceCodeAdapter();
    adapter.setSave(save);
    adapter.open(routeA);
    subscribe(adapter);

    adapter.onChange?.(routeA.content);

    expect(save).not.toHaveBeenCalled();
  });

  it('does not save the content it saved last again', () => {
    const save = vi.fn();
    const adapter = createFileSourceCodeAdapter();
    adapter.setSave(save);
    adapter.open(routeA);
    subscribe(adapter);
    adapter.onChange?.('changed');

    adapter.onChange?.('changed');

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('saves to the new file after a switch, never to the previous one', () => {
    const save = vi.fn();
    const adapter = createFileSourceCodeAdapter();
    adapter.setSave(save);
    adapter.open(routeA);
    subscribe(adapter);
    adapter.open(routeB);

    adapter.onChange?.('changed');

    expect(save).toHaveBeenCalledExactlyOnceWith('b', 'changed');
  });

  it('does not save before it knows where to', () => {
    const adapter = createFileSourceCodeAdapter();
    adapter.open(routeA);
    subscribe(adapter);

    adapter.onChange?.('changed');
    const save = vi.fn();
    adapter.setSave(save);
    adapter.onChange?.('changed');

    expect(save).toHaveBeenCalledExactlyOnceWith('a', 'changed');
  });

  it('delivers the last saved content to a new subscriber, not the content the file was opened with', () => {
    const adapter = createFileSourceCodeAdapter();
    adapter.setSave(vi.fn());
    adapter.open(routeA);
    subscribe(adapter);
    adapter.onChange?.('changed');

    const delivered = subscribe(adapter);

    expect(delivered).toEqual([{ code: 'changed', path: routeA.path }]);
  });

  it('stops delivering after unsubscribing', () => {
    const adapter = createFileSourceCodeAdapter();
    adapter.open(routeA);
    const delivered: SourceDocument[] = [];
    const unsubscribe = adapter.subscribe((document) => {
      delivered.push(document);
    });
    unsubscribe();

    adapter.open(routeB);

    expect(delivered).toHaveLength(1);
  });
});
