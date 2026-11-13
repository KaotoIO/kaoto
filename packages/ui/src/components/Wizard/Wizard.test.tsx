import { fireEvent, render, screen } from '@testing-library/react';

import { Wizard } from './Wizard';

const STEPS = [
  { id: 'one', label: 'First step', content: <p>First content</p> },
  { id: 'two', label: 'Second step', content: <p>Second content</p> },
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
    expect(screen.getByText('First content')).toBeInTheDocument();
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('renders the content of the current step', () => {
    render(<Wizard steps={STEPS} currentIndex={1} onStepChange={vi.fn()} footer={null} stepsLabel="Wizard steps" />);

    expect(screen.getByText('Second content')).toBeInTheDocument();
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });

  it('notifies when another step is clicked', () => {
    const onStepChange = vi.fn();
    render(
      <Wizard steps={STEPS} currentIndex={0} onStepChange={onStepChange} footer={null} stepsLabel="Wizard steps" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /second step/i }));

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('names the steps navigation with stepsLabel', () => {
    render(<Wizard steps={STEPS} currentIndex={0} onStepChange={vi.fn()} footer={null} stepsLabel="Import steps" />);

    expect(screen.getByRole('navigation', { name: 'Import steps' })).toBeInTheDocument();
  });

  it('adds the optional className to the root element', () => {
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
});
