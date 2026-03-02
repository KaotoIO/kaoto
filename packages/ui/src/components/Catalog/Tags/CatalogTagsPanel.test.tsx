import { act, fireEvent, render, screen } from '@testing-library/react';

import { CatalogTagsPanel } from './CatalogTagsPanel';

describe('CatalogTagsPanel', () => {
  it('should render all tags', () => {
    render(<CatalogTagsPanel tags={['http', 'rest']} onTagClick={jest.fn()} />);

    expect(screen.getByTestId('tag-http')).toBeInTheDocument();
    expect(screen.getByTestId('tag-rest')).toBeInTheDocument();
  });

  it('should call onTagClick with the tag value when clicked', () => {
    const onTagClick = jest.fn();
    render(<CatalogTagsPanel tags={['http']} onTagClick={onTagClick} />);

    act(() => {
      fireEvent.click(screen.getByTestId('tag-http'));
    });

    expect(onTagClick).toHaveBeenCalledWith(expect.anything(), 'http');
  });

  it('should stop click event propagation', () => {
    const parentClickHandler = jest.fn();
    render(
      <div onClick={parentClickHandler}>
        <CatalogTagsPanel tags={['http']} onTagClick={jest.fn()} />
      </div>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('tag-http'));
    });

    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it('should call preventDefault on mousedown to suppress focus-on-click', () => {
    render(<CatalogTagsPanel tags={['http']} onTagClick={jest.fn()} />);

    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    act(() => {
      fireEvent(screen.getByTestId('tag-http'), mouseDownEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
