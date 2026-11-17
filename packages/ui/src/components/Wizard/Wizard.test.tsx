import { fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';

import { Wizard, WizardStep } from './Wizard';

const STEPS: WizardStep[] = [
  { id: 'one', label: 'First step', content: <p>First content</p> },
  { id: 'two', label: 'Second step', content: <p>Second content</p> },
  { id: 'three', label: 'Third step', content: <p>Third content</p>, disabled: true },
];

describe('Wizard', () => {
  it('renders the step labels, the current content and the footer', () => {
    render(
      <Wizard
        steps={STEPS}
        currentIndex={0}
        onStepChange={vi.fn()}
        footer={<button>Next</button>}
        stepsLabel="Wizard steps"
      />,
    );

    expect(screen.getByText('First step')).toBeInTheDocument();
    expect(screen.getByText('Second step')).toBeInTheDocument();
    expect(screen.getByText('Third step')).toBeInTheDocument();
    expect(screen.getByText('First content')).toBeInTheDocument();
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('renders the content of the current step', () => {
    render(<Wizard steps={STEPS} currentIndex={1} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />);

    expect(screen.getByText('Second content')).toBeInTheDocument();
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });

  it('notifies when another enabled step is clicked', () => {
    const onStepChange = vi.fn();
    render(
      <Wizard steps={STEPS} currentIndex={0} onStepChange={onStepChange} footer={null} stepsLabel="Wizard steps" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /second step/i }));

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('does not notify when a disabled step is clicked', () => {
    const onStepChange = vi.fn();
    render(
      <Wizard steps={STEPS} currentIndex={0} onStepChange={onStepChange} footer={null} stepsLabel="Wizard steps" />,
    );

    const disabledStepButton = screen.getByRole('button', { name: /third step/i });
    expect(disabledStepButton).toBeDisabled();

    fireEvent.click(disabledStepButton);

    expect(onStepChange).not.toHaveBeenCalled();
  });

  it('renders secondaryLabel on step when provided', () => {
    const stepsWithSecondaryLabel: WizardStep[] = [
      { id: 'one', label: 'First step', secondaryLabel: 'Optional info', content: <p>First content</p> },
    ];

    render(
      <Wizard
        steps={stepsWithSecondaryLabel}
        currentIndex={0}
        onStepChange={vi.fn()}
        footer={null}
        stepsLabel="Wizard steps"
      />,
    );

    expect(screen.getByText('Optional info')).toBeInTheDocument();
  });

  it('names the steps navigation with stepsLabel', () => {
    render(<Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Import steps" />);

    expect(screen.getByRole('navigation', { name: 'Import steps' })).toBeInTheDocument();
  });

  it('sets accessible region name with step count on the body container', () => {
    render(<Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Import steps" />);

    expect(screen.getByRole('region', { name: 'Step 1 of 3: First step' })).toBeInTheDocument();
  });

  it('moves focus to the body region when currentIndex changes', () => {
    const { rerender } = render(
      <Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Import steps" />,
    );

    expect(screen.getByRole('region', { name: 'Step 1 of 3: First step' })).not.toHaveFocus();

    rerender(<Wizard steps={STEPS} currentIndex={1} onStepChange={vi.fn()} footer={null} stepsLabel="Import steps" />);

    expect(screen.getByRole('region', { name: 'Step 2 of 3: Second step' })).toHaveFocus();
  });

  it('does not move focus on mount under StrictMode', () => {
    render(
      <StrictMode>
        <Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Import steps" />
      </StrictMode>,
    );

    expect(screen.getByRole('region', { name: 'Step 1 of 3: First step' })).not.toHaveFocus();
  });

  it('adds the optional className to the root element using clsx', () => {
    const { container } = render(
      <Wizard
        steps={STEPS}
        currentIndex={0}
        onStepChange={vi.fn()}
        footer={null}
        stepsLabel="Wizard steps"
        className="custom-wizard"
      />,
    );

    expect(container.firstElementChild).toHaveClass('kaoto-wizard', 'custom-wizard');
  });

  it('handles out-of-bounds currentIndex gracefully', () => {
    render(<Wizard steps={STEPS} currentIndex={99} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />);

    expect(screen.queryByText('First content')).not.toBeInTheDocument();
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
  });

  it('marks the current step and does not mark the earlier ones as complete on their own', () => {
    render(<Wizard steps={STEPS} currentIndex={2} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />);

    const stepButton = (name: RegExp) =>
      within(screen.getByRole('navigation', { name: 'Wizard steps' })).getByRole('button', { name });
    expect(stepButton(/first step/i)).toHaveTextContent('Incomplete');
    expect(stepButton(/second step/i)).toHaveTextContent('Incomplete');
    expect(stepButton(/third step/i)).toHaveTextContent('Current');
  });

  it('marks as complete or invalid only the steps that say so', () => {
    const steps: WizardStep[] = [
      { id: 'one', label: 'First step', content: <p>First</p>, complete: true },
      { id: 'two', label: 'Second step', content: <p>Second</p>, invalid: true },
      { id: 'three', label: 'Third step', content: <p>Third</p> },
    ];
    render(<Wizard steps={steps} currentIndex={2} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />);

    const nav = within(screen.getByRole('navigation', { name: 'Wizard steps' }));
    expect(nav.getByRole('button', { name: /first step/i })).toHaveTextContent('Complete');
    expect(nav.getByRole('button', { name: /second step/i })).toHaveTextContent('Invalid');
  });

  it('uses a navigation id that is unique to each wizard', () => {
    render(
      <>
        <Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="First wizard" />
        <Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Second wizard" />
      </>,
    );

    const toggles = screen.getAllByRole('button', { name: /step 1 of 3: first step/i });
    const firstNav = screen.getByRole('navigation', { name: 'First wizard' });
    const secondNav = screen.getByRole('navigation', { name: 'Second wizard' });

    expect(firstNav.id).not.toEqual(secondNav.id);
    expect(toggles[0]).toHaveAttribute('aria-controls', firstNav.id);
    expect(toggles[1]).toHaveAttribute('aria-controls', secondNav.id);
  });

  it('remounts the content when the step changes, even for steps rendering the same element type', () => {
    const sameTypeSteps: WizardStep[] = [
      { id: 'one', label: 'First step', content: <input aria-label="Field" /> },
      { id: 'two', label: 'Second step', content: <input aria-label="Field" /> },
    ];
    const { rerender } = render(
      <Wizard steps={sameTypeSteps} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />,
    );

    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'typed' } });
    expect(screen.getByLabelText('Field')).toHaveValue('typed');

    rerender(
      <Wizard steps={sameTypeSteps} currentIndex={1} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />,
    );

    expect(screen.getByLabelText('Field')).toHaveValue('');
  });

  it('toggles mobile step navigation drawer when toggle button is clicked', () => {
    render(<Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />);

    const toggleButton = screen.getByRole('button', { name: /step 1 of 3: first step/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes mobile navigation drawer when a step is selected', () => {
    const onStepChange = vi.fn();
    render(
      <Wizard steps={STEPS} currentIndex={0} onStepChange={onStepChange} footer={null} stepsLabel="Wizard steps" />,
    );

    const toggleButton = screen.getByRole('button', { name: /step 1 of 3: first step/i });
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /second step/i }));
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });
});
