import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';

import { CanvasFocusProvider, useCanvasFocusTarget } from './canvas-focus-handoff';

const Surface = ({ name, ready = true }: { name: string; ready?: boolean }) => {
  const ref = useCanvasFocusTarget(ready);
  return (
    <div ref={ref} tabIndex={0} aria-label={name} hidden={!ready}>
      <svg>
        <g tabIndex={-1} aria-label="Step" />
      </svg>
      <input aria-label="Property" />
    </div>
  );
};

function view(name?: string, ready = true, showOutside = true) {
  return (
    <StrictMode>
      <CanvasFocusProvider>{name && <Surface key={name} name={name} ready={ready} />}</CanvasFocusProvider>
      {showOutside && (
        <button
          onFocus={(event) => {
            event.stopPropagation();
          }}
        >
          Outside
        </button>
      )}
    </StrictMode>
  );
}

it.each(['Original', 'Step', 'Property'])(
  'restores focus after the view containing the focused %s is removed',
  (origin) => {
    const { rerender } = render(view('Original'));
    screen.getByLabelText(origin).focus();
    rerender(view());
    expect(document.body).toHaveFocus();
    rerender(view('Replacement'));
    expect(screen.getByLabelText('Replacement')).toHaveFocus();
  },
);

it('restores focus when one ready surface immediately replaces another', () => {
  const { rerender } = render(view('Original'));
  screen.getByLabelText('Original').focus();
  rerender(view('Replacement'));
  expect(screen.getByLabelText('Replacement')).toHaveFocus();
});

it('waits for readiness and retains the request if an unready replacement is removed', () => {
  const { rerender } = render(view('Original'));
  screen.getByLabelText('Original').focus();
  rerender(view());
  rerender(view('Replacement', false));
  expect(document.body).toHaveFocus();
  rerender(view());
  rerender(view('Replacement', false));
  expect(document.body).toHaveFocus();
  rerender(view('Replacement'));
  expect(screen.getByLabelText('Replacement')).toHaveFocus();
});

it('supports repeated replacements without replaying a completed handoff', () => {
  const { rerender } = render(view('Original'));
  screen.getByLabelText('Original').focus();
  for (const name of ['Empty', 'Populated', 'Empty', 'Populated']) {
    rerender(view(name));
    expect(screen.getByLabelText(name)).toHaveFocus();
  }
  screen.getByRole('button', { name: 'Outside' }).focus();
  rerender(view('Next'));
  expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
});

it.each(['keep', 'blur', 'remove'] as const)('cancels a handoff after non-bubbling outside focus (%s)', (action) => {
  const { rerender } = render(view('Original'));
  screen.getByLabelText('Original').focus();
  rerender(view());
  const outside = screen.getByRole('button', { name: 'Outside' });
  outside.focus();
  if (action === 'blur') outside.blur();
  if (action === 'remove') rerender(view(undefined, true, false));
  rerender(view('Replacement', true, action !== 'remove'));
  expect(action === 'keep' ? outside : document.body).toHaveFocus();

  // A canceled request must not disable future legitimate transfers.
  screen.getByLabelText('Replacement').focus();
  rerender(view('Next'));
  expect(screen.getByLabelText('Next')).toHaveFocus();
});

it('does not request focus when an unfocused surface is replaced or rerendered', () => {
  const { rerender } = render(view('Original'));
  expect(document.body).toHaveFocus();
  rerender(view('Original', false));
  rerender(view('Replacement'));
  expect(document.body).toHaveFocus();
  const outside = screen.getByRole('button', { name: 'Outside' });
  outside.focus();
  rerender(view('Next'));
  outside.blur();
  rerender(view('Final'));
  expect(document.body).toHaveFocus();
});

it('keeps a focused descendant on unrelated rerenders and readiness changes', () => {
  const { rerender } = render(view('Original'));
  const property = screen.getByLabelText('Property');
  property.focus();
  rerender(view('Original'));
  expect(property).toHaveFocus();
  rerender(view('Original', false));
  rerender(view('Original'));
  expect(property).toHaveFocus();
});

it('does not transfer pending focus into another visualization', () => {
  const views = (first?: string, second?: string) => (
    <>
      <CanvasFocusProvider>{first && <Surface key={first} name={first} />}</CanvasFocusProvider>
      <CanvasFocusProvider>{second && <Surface key={second} name={second} />}</CanvasFocusProvider>
    </>
  );
  const { rerender } = render(views('First', 'Second'));
  screen.getByLabelText('First').focus();
  rerender(views(undefined, 'Other replacement'));
  expect(document.body).toHaveFocus();
  rerender(views('First replacement', 'Other replacement'));
  expect(screen.getByLabelText('First replacement')).toHaveFocus();
});

it('discards pending focus when the owning visualization is unmounted', () => {
  const { rerender } = render(view('Original'));
  screen.getByLabelText('Original').focus();
  rerender(view());
  rerender(<button>Outside</button>);
  rerender(view('Replacement'));
  expect(document.body).toHaveFocus();
});
