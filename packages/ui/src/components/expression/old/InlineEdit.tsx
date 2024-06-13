import { FormEvent, FunctionComponent, useCallback, useState } from 'react';
import { Button, Form, TextInput } from '@patternfly/react-core';
import { CheckIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';

type InlineEditProps = {
  value: string | number;
  onSave: (value: string | number) => void;
};

export const InlineEdit: FunctionComponent<InlineEditProps> = ({ value, onSave }) => {
  const [text, setText] = useState<string | number>(value);
  const [tempText, setTempText] = useState<string | number>(value);
  const [editing, setEditing] = useState<boolean>(false);

  const handleTextChange = useCallback((_event: FormEvent, value: string) => {
    setTempText(value);
  }, []);

  const handleEditing = useCallback(() => {
    setEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    setText(tempText);
    onSave(tempText);
    setEditing(false);
  }, [onSave, tempText]);

  const handleCancel = useCallback(() => {
    setTempText(text);
    setEditing(false);
  }, [text]);

  return editing ? (
    <Form className="pf-v5-c-inline-edit pf-m-inline-editable">
      <div className="pf-v5-c-inline-edit__group">
        <div className="pf-v5-c-inline-edit__input">
          <span className="pf-v5-c-form-control">
            <TextInput type="text" value={tempText} aria-label="Editable text input" onChange={handleTextChange} />
          </span>
        </div>
        <div className="pf-v5-c-inline-edit__group pf-m-action-group pf-m-icon-group">
          <div className="pf-v5-c-inline-edit__action pf-m-valid">
            <Button
              className="pf-v5-c-button pf-m-plain"
              type="button"
              aria-label="Save edits"
              onClick={handleSave}
              icon={<CheckIcon />}
            ></Button>
          </div>
          <div className="pf-v5-c-inline-edit__action">
            <Button
              className="pf-v5-c-button pf-m-plain"
              type="button"
              aria-label="Cancel edits"
              onClick={handleCancel}
              icon={<TimesIcon />}
            ></Button>
          </div>
        </div>
      </div>
    </Form>
  ) : (
    <Form className="pf-v5-c-inline-edit">
      <div className="pf-v5-c-inline-edit__group">
        <div className="pf-v5-c-inline-edit__value" id="single-editable-example-label">
          {text}
        </div>
        <div className="pf-v5-c-inline-edit__action pf-m-enable-editable">
          <Button
            className="pf-v5-c-button pf-m-plain"
            type="button"
            id="single-editable-example-edit-button"
            aria-label="Edit"
            aria-labelledby="single-editable-example-edit-button single-editable-example-label"
            onClick={handleEditing}
            icon={<PencilAltIcon />}
          ></Button>
        </div>
      </div>
    </Form>
  );
};
