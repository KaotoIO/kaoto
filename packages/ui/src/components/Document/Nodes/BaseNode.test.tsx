import { fireEvent, render, screen } from '@testing-library/react';
import { Types } from '../../../models/datamapper';
import { BaseNode } from './BaseNode';

describe('BaseNode', () => {
  describe('Basic Rendering', () => {
    it('should render title as string', () => {
      render(<BaseNode title="Test Title" data-testid="test-node" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render title as ReactNode', () => {
      render(<BaseNode title={<span data-testid="custom-title">Custom Title</span>} data-testid="test-node" />);
      expect(screen.getByTestId('custom-title')).toBeInTheDocument();
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <BaseNode title="Title" data-testid="test-node">
          <span data-testid="child-element">Child Content</span>
        </BaseNode>,
      );
      expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    it('should render with node__row class', () => {
      const { container } = render(<BaseNode title="Title" data-testid="test-node" />);
      const section = container.querySelector('section.node__row');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Expansion Controls', () => {
    it('should not show expand icon when isExpandable is false', () => {
      render(<BaseNode title="Title" data-testid="test-node" isExpandable={false} />);
      expect(screen.queryByTestId('expand-icon-test-node')).not.toBeInTheDocument();
      expect(screen.queryByTestId('collapse-icon-test-node')).not.toBeInTheDocument();
    });

    it('should show ChevronDown when expandable and expanded', () => {
      render(
        <BaseNode
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={true}
          onExpandChange={() => {}}
        />,
      );
      expect(screen.getByTestId('expand-icon-test-node')).toBeInTheDocument();
      expect(screen.queryByTestId('collapse-icon-test-node')).not.toBeInTheDocument();
    });

    it('should show ChevronRight when expandable and collapsed', () => {
      render(
        <BaseNode
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={false}
          onExpandChange={() => {}}
        />,
      );
      expect(screen.getByTestId('collapse-icon-test-node')).toBeInTheDocument();
      expect(screen.queryByTestId('expand-icon-test-node')).not.toBeInTheDocument();
    });

    it('should call onExpandChange when expand icon is clicked', () => {
      const onExpandChange = jest.fn();
      render(
        <BaseNode
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={true}
          onExpandChange={onExpandChange}
        />,
      );

      const expandIcon = screen.getByTestId('expand-icon-test-node');
      fireEvent.click(expandIcon);

      expect(onExpandChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Draggable Controls', () => {
    it('should show drag icon when isDraggable is true', () => {
      const { container } = render(<BaseNode title="Title" data-testid="test-node" isDraggable={true} />);
      const dragHandler = container.querySelector('[data-drag-handler]');
      expect(dragHandler).toBeInTheDocument();
    });

    it('should not show drag icon when isDraggable is false', () => {
      const { container } = render(<BaseNode title="Title" data-testid="test-node" isDraggable={false} />);
      const dragHandler = container.querySelector('[data-drag-handler]');
      expect(dragHandler).not.toBeInTheDocument();
    });

    it('should set data-draggable attribute to true when isDraggable is true', () => {
      const { container } = render(<BaseNode title="Title" data-testid="test-node" isDraggable={true} />);
      const section = container.querySelector('[data-draggable="true"]');
      expect(section).toBeInTheDocument();
    });

    it('should set data-draggable attribute to false when isDraggable is false', () => {
      const { container } = render(<BaseNode title="Title" data-testid="test-node" isDraggable={false} />);
      const section = container.querySelector('[data-draggable="false"]');
      expect(section).toBeInTheDocument();
    });
  });

  describe('Field Icons', () => {
    it('should render field icon when iconType is provided', () => {
      render(<BaseNode title="Title" data-testid="test-node" iconType={Types.String} />);
      // FieldIcon component should be rendered - testing via class
      const { container } = render(<BaseNode title="Title" data-testid="test-node" iconType={Types.String} />);
      expect(container.querySelector('.node__spacer')).toBeInTheDocument();
    });

    it('should render collection icon when isCollectionField is true', () => {
      render(<BaseNode title="Title" data-testid="test-node" isCollectionField={true} />);
      expect(screen.getByTestId('collection-field-icon')).toBeInTheDocument();
    });

    it('should not render collection icon when isCollectionField is false', () => {
      render(<BaseNode title="Title" data-testid="test-node" isCollectionField={false} />);
      expect(screen.queryByTestId('collection-field-icon')).not.toBeInTheDocument();
    });

    it('should render attribute icon when isAttributeField is true', () => {
      render(<BaseNode title="Title" data-testid="test-node" isAttributeField={true} />);
      expect(screen.getByTestId('attribute-field-icon')).toBeInTheDocument();
    });

    it('should not render attribute icon when isAttributeField is false', () => {
      render(<BaseNode title="Title" data-testid="test-node" isAttributeField={false} />);
      expect(screen.queryByTestId('attribute-field-icon')).not.toBeInTheDocument();
    });
  });

  describe('Combined States', () => {
    it('should render all icons when all flags are true', () => {
      const { container } = render(
        <BaseNode
          title="Title"
          data-testid="test-node"
          isExpandable={true}
          isExpanded={true}
          isDraggable={true}
          iconType={Types.String}
          isCollectionField={true}
          isAttributeField={true}
          onExpandChange={() => {}}
        />,
      );

      expect(screen.getByTestId('expand-icon-test-node')).toBeInTheDocument();
      expect(container.querySelector('[data-drag-handler]')).toBeInTheDocument();
      expect(screen.getByTestId('collection-field-icon')).toBeInTheDocument();
      expect(screen.getByTestId('attribute-field-icon')).toBeInTheDocument();
    });

    it('should render minimal node when no optional props provided', () => {
      const { container } = render(<BaseNode title="Title" data-testid="test-node" />);

      expect(screen.queryByTestId('expand-icon-test-node')).not.toBeInTheDocument();
      expect(screen.queryByTestId('collapse-icon-test-node')).not.toBeInTheDocument();
      expect(container.querySelector('[data-drag-handler]')).not.toBeInTheDocument();
      expect(screen.queryByTestId('collection-field-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('attribute-field-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });
});
