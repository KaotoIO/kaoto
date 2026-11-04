import { render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { CanvasFocusContext, useCanvasFocusManager, useCanvasFocusRef } from './canvas-focus';

const FocusProvider = ({ children }: PropsWithChildren) => {
  const manager = useCanvasFocusManager();
  return <CanvasFocusContext.Provider value={manager}>{children}</CanvasFocusContext.Provider>;
};

const View = () => {
  const ref = useCanvasFocusRef();
  return <div ref={ref} tabIndex={0} aria-label="Canvas focus target" />;
};

it.each([false, true])(
  'restores focus after replacing the canvas unless the user focused elsewhere (%s)',
  (focusOutside) => {
    const view = (visible: boolean) => (
      <FocusProvider>
        {visible && <View />}
        <button>Outside</button>
      </FocusProvider>
    );
    const { rerender } = render(view(true));
    screen.getByLabelText('Canvas focus target').focus();
    rerender(view(false));
    if (focusOutside) screen.getByRole('button', { name: 'Outside' }).focus();
    rerender(view(true));
    const expected = focusOutside
      ? screen.getByRole('button', { name: 'Outside' })
      : screen.getByLabelText('Canvas focus target');
    expect(expected).toHaveFocus();
  },
);

it('waits until a replacement canvas is ready before handing off focus', () => {
  const DeferredView = ({ ready }: { ready: boolean }) => {
    const ref = useCanvasFocusRef(ready);
    return <div ref={ref} tabIndex={0} aria-label="Deferred canvas" />;
  };
  const view = (visible: boolean, ready: boolean) => (
    <FocusProvider>{visible && <DeferredView ready={ready} />}</FocusProvider>
  );
  const { rerender } = render(view(true, true));
  screen.getByLabelText('Deferred canvas').focus();
  rerender(view(false, false));
  rerender(view(true, false));
  expect(screen.getByLabelText('Deferred canvas')).not.toHaveFocus();
  rerender(view(true, true));
  expect(screen.getByLabelText('Deferred canvas')).toHaveFocus();
});
