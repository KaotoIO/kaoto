import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { HTMLFieldProps, connectField } from 'uniforms';
import { ExpressionEditor } from './ExpressionEditor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExpressionFieldProps = HTMLFieldProps<any, HTMLDivElement>;

const ExpressionFieldComponent = (props: ExpressionFieldProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const title = (props.field as any).title;
  const description = title ? `Configure expression for "${title}" parameter` : 'Configure expression';

  return wrapField(
    { ...props, description: description },
    <ExpressionEditor expressionModel={props.value} onChangeExpressionModel={props.onChange} />,
  );
};
export const ExpressionField = connectField(ExpressionFieldComponent);
