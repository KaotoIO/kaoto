import { AddPropertyButtons } from './AddPropertyButtons.tsx';
import { screen } from '@testing-library/dom';
import { fireEvent, render } from '@testing-library/react';

describe('AddPropertyButtons.tsx', () => {
  test('Add string property button', () => {
    const events: boolean[] = [];
    render(
      <AddPropertyButtons
        path={['foo', 'bar']}
        createPlaceholder={(isObject) => events.push(isObject)}
      />,
    );
    const element = screen.getByTestId('properties-add-string-property-foo-bar-btn');
    expect(events.length).toBe(0);
    fireEvent.click(element);
    expect(events.length).toBe(1);
    expect(events[0]).toBeFalsy();
  });

  test('Add object property button', () => {
    const events: boolean[] = [];
    render(
      <AddPropertyButtons
        path={['foo', 'bar']}
        createPlaceholder={(isObject) => events.push(isObject)}
      />,
    );
    const element = screen.getByTestId('properties-add-object-property-foo-bar-btn');
    expect(events.length).toBe(0);
    fireEvent.click(element);
    expect(events.length).toBe(1);
    expect(events[0]).toBeTruthy();
  });
});
