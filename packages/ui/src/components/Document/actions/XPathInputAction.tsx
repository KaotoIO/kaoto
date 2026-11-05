import './XPathInputAction.scss';

import { WarningAlt, WarningFilled } from '@carbon/icons-react';
import {
  ActionListItem,
  Button,
  ButtonVariant,
  InputGroup,
  InputGroupItem,
  List,
  ListItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import {
  FocusEvent,
  FormEvent,
  FunctionComponent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { IExpressionHolder } from '../../../models/datamapper/mapping';
import { ExpressionHolderNodeData, TargetRenderIndex } from '../../../models/datamapper/visualization';
import { MappingService } from '../../../services/mapping/mapping.service';
import { XPathService } from '../../../services/xpath/xpath.service';
import { useDocumentTreeStore } from '../../../store/document-tree.store';

type XPathInputProps = {
  nodeData: ExpressionHolderNodeData;
  mapping: IExpressionHolder;
  onUpdate: () => void;
  /**
   * Called once editing finishes (on blur or Enter), for work that shouldn't run on every keystroke.
   * A blur that follows an Enter commit without a further change doesn't call it again.
   * `isFocusLeavingRow` is `false` on Enter and on a blur to another control of this input's row.
   * It is `true` for any other blur, including one to a part of the page that takes no focus, and
   * the caller must then not pull focus back.
   */
  onCommit?: (isFocusLeavingRow: boolean) => void;
  /** The render index the row was built from, so a request to restore focus waits for the rebuild. */
  renderIndex?: TargetRenderIndex;
};

const isFocusLost = () =>
  document.hasFocus() && (document.activeElement === null || document.activeElement === document.body);

export const XPathInputAction: FunctionComponent<XPathInputProps> = ({
  nodeData,
  mapping,
  onUpdate,
  onCommit,
  renderIndex,
}) => {
  const validationResult = useMemo(() => XPathService.validate(mapping.expression), [mapping.expression]);
  const inputRef = useRef<HTMLInputElement>(null);
  const mappingNodePath = nodeData.mapping?.nodePath.toString() ?? '';

  // Check if this mapping should receive focus from the store
  const shouldFocus = useDocumentTreeStore((state) => state.shouldFocusXPathInput(mappingNodePath));
  const restoreFocusAfter = useDocumentTreeStore((state) => state.xPathInputFocusRestoreAfter);
  const clearFocusRequest = useDocumentTreeStore((state) => state.clearXPathInputFocusRequest);

  // Focus input field when store indicates this mapping should be focused
  useEffect(() => {
    if (!shouldFocus || !inputRef.current) return;
    if (restoreFocusAfter !== null) {
      if ((renderIndex?.generation ?? 0) <= restoreFocusAfter) return;
      if (isFocusLost()) inputRef.current.focus();
    } else {
      inputRef.current.focus();
    }
    clearFocusRequest();
  }, [shouldFocus, restoreFocusAfter, renderIndex, clearFocusRequest]);

  const lastCommittedExpression = useRef<string | undefined>(undefined);
  const commit = useCallback(
    (isFocusLeavingRow: boolean) => {
      if (!onCommit || lastCommittedExpression.current === mapping.expression) return;
      lastCommittedExpression.current = mapping.expression;
      onCommit(isFocusLeavingRow);
    },
    [mapping, onCommit],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const focusTarget = event.relatedTarget;
      const row = event.currentTarget.closest('[role="treeitem"]');
      const isFocusStayingInRow = focusTarget instanceof Node && !!row?.contains(focusTarget);
      commit(!isFocusStayingInRow);
    },
    [commit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) commit(false);
    },
    [commit],
  );

  const handleXPathChange = useCallback(
    (event: FormEvent, value: string) => {
      event.stopPropagation();
      if (mapping) {
        MappingService.updateExpression(mapping, value);
        lastCommittedExpression.current = undefined;
        onUpdate();
      }
    },
    [mapping, onUpdate],
  );

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const errorContent = useMemo(() => {
    return (
      <List>
        {validationResult?.getErrors().map((e) => (
          <ListItem key={e}>{e}</ListItem>
        ))}
        {validationResult?.getWarnings().map((w) => (
          <ListItem key={w}>{w}</ListItem>
        ))}
      </List>
    );
  }, [validationResult]);

  return (
    <ActionListItem key="xpath-input" className="input-group">
      <InputGroup>
        <InputGroupItem className="input-group__text">
          <TextInput
            ref={inputRef}
            data-testid="transformation-xpath-input"
            id="xpath"
            type="text"
            value={mapping.expression}
            onChange={handleXPathChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onMouseMove={stopPropagation}
            onClick={stopPropagation}
          />
        </InputGroupItem>
        {validationResult &&
          (!validationResult.getExprNode() ||
            validationResult.dataMapperErrors.length > 0 ||
            validationResult.hasWarnings()) && (
            <InputGroupItem>
              <Popover bodyContent={errorContent} triggerAction="hover" withFocusTrap={false}>
                <Button
                  data-testid="xpath-input-error-btn"
                  variant={ButtonVariant.link}
                  isDanger={validationResult.hasErrors()}
                  icon={
                    validationResult.hasErrors() ? (
                      <WarningFilled className="input-group__error-icon" />
                    ) : (
                      <WarningAlt className="input-group__warning-icon" />
                    )
                  }
                />
              </Popover>
            </InputGroupItem>
          )}
      </InputGroup>
    </ActionListItem>
  );
};
