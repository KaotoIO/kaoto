import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { SimpleSelector } from './SimpleSelector';
import { TypeaheadItem } from './Typeahead.types';

describe('SimpleSelector', () => {
  const items: TypeaheadItem[] = [
    { name: 'Item 1', value: 'item-1' },
    { name: 'Item 2', value: 'item-2' },
    { name: 'Item 3', value: 'item-3' },
  ];

  it('renders without crashing', () => {
    render(<SimpleSelector items={items} onChange={jest.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders all items', () => {
    render(<SimpleSelector items={items} onChange={jest.fn()} />);
    items.forEach((item) => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });
  });

  it('calls onChange when an item is selected', () => {
    const handleChange = jest.fn();
    render(<SimpleSelector items={items} onChange={handleChange} />);

    fireEvent.click(screen.getByText('Item 1'));
    expect(handleChange).toHaveBeenCalledWith(items[0]);
  });

  it('updates selected state when an item is clicked', () => {
    render(<SimpleSelector items={items} onChange={jest.fn()} />);

    const itemButton1 = screen.getByRole('tab', {
      name: /item 1/i,
    });
    fireEvent.click(itemButton1);

    expect(itemButton1).toHaveAttribute('aria-selected', 'true');
  });

  it('does not call onChange if the same item is clicked again', () => {
    const handleChange = jest.fn();
    render(<SimpleSelector items={items} onChange={handleChange} selectedItem={items[0]} />);

    fireEvent.click(screen.getByText('Item 1'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});
