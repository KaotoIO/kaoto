import { render } from '@testing-library/react';
import { Types } from '../../models/datamapper/types';
import { FieldIcon } from './FieldIcon';

describe('FieldIcon', () => {
  it('should render an icon for known types', () => {
    const wrapper = render(<FieldIcon type={Types.String} />);

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should not render anything missing types', () => {
    const wrapper = render(<FieldIcon />);

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it.each([Types.QName, Types.NCName, Types.Item, Types.Element, Types.Node])(
    'should not render anything for special types',
    (type) => {
      const wrapper = render(<FieldIcon type={type} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    },
  );

  describe('numeric types', () => {
    it.each([Types.Integer, Types.PositiveInteger])('should render StringInteger icon for %s', (type) => {
      const wrapper = render(<FieldIcon type={type} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it.each([Types.Float, Types.Double, Types.Decimal, Types.Numeric])(
      'should render CharacterDecimal icon for %s',
      (type) => {
        const wrapper = render(<FieldIcon type={type} />);

        expect(wrapper.asFragment()).toMatchSnapshot();
      },
    );
  });

  describe('date and time types', () => {
    it('should render CalendarHeatMap icon for Date type', () => {
      const wrapper = render(<FieldIcon type={Types.Date} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render Time icon for Time type', () => {
      const wrapper = render(<FieldIcon type={Types.Time} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render EventSchedule icon for DateTime type', () => {
      const wrapper = render(<FieldIcon type={Types.DateTime} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it.each([Types.Duration, Types.DayTimeDuration])('should render Hourglass icon for %s', (type) => {
      const wrapper = render(<FieldIcon type={type} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });
  });

  describe('other types', () => {
    it('should render Boolean icon for Boolean type', () => {
      const wrapper = render(<FieldIcon type={Types.Boolean} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render Object icon for Container type', () => {
      const wrapper = render(<FieldIcon type={Types.Container} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render Array icon for Array type', () => {
      const wrapper = render(<FieldIcon type={Types.Array} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render Document icon for DocumentNode type', () => {
      const wrapper = render(<FieldIcon type={Types.DocumentNode} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render Http icon for AnyURI type', () => {
      const wrapper = render(<FieldIcon type={Types.AnyURI} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it.each([Types.AnyAtomicType, Types.AnyType])('should render Help icon for %s', (type) => {
      const wrapper = render(<FieldIcon type={type} />);

      expect(wrapper.asFragment()).toMatchSnapshot();
    });
  });

  describe('props', () => {
    it('should apply className prop to Icon', () => {
      const wrapper = render(<FieldIcon type={Types.String} className="test-class" />);

      expect(wrapper.container.querySelector('.test-class')).toBeInTheDocument();
    });

    it('should set title attribute with type value', () => {
      const wrapper = render(<FieldIcon type={Types.String} />);

      expect(wrapper.container.querySelector(`[title="${Types.String}"]`)).toBeInTheDocument();
    });
  });
});
