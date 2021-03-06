import {ContentState, EditorState, Modifier, SelectionState} from 'draft-js';
import {KeyboardEvent} from 'react';

import {getContentSelectionAmbient, setBlockDepth} from '../@utils';

const AUTO_INDENT_WHITESPACES_REGEX = /(?:^|\n)([\t ]+).*$/;

const EOL = '\n';

interface MultilineOptions {
  autoIndent?: boolean;
}

/**
 * `true` | `MultilineOptions`:
 *   - return to enter new line, two continuous EOL leads to block split.
 *   - ctrl to enter new line, ignore continuous EOL splitting.
 * `false`
 *   - ctrl to enter new line.
 */
const MULTILINE_BLOCK_TYPE_TO_DEFAULT_MAP = new Map<
  string,
  boolean | MultilineOptions
>([
  ['blockquote', true],
  ['code-block', {autoIndent: true}],
  ['unordered-list-item', false],
  ['ordered-list-item', false],
  ['checkable-list-item', false],
  ['unstyled', false],
]);

export function handleMultilineBlockReturn(
  event: KeyboardEvent,
  editorState: EditorState,
): EditorState {
  let {
    content,
    selection,
    leftOffset,
    leftBlockKey,
    leftBlock,
    leftText,
    rightText,
  } = getContentSelectionAmbient(editorState);

  let leftBlockType = leftBlock.getType();

  let multilineOptions = MULTILINE_BLOCK_TYPE_TO_DEFAULT_MAP.get(leftBlockType);

  if (multilineOptions === undefined) {
    return editorState;
  }

  let {autoIndent = false} =
    typeof multilineOptions === 'object' ? multilineOptions : {};

  if (event.shiftKey) {
    insertEOL();
  } else if (multilineOptions) {
    insertEOL();
    processContinuousEOL();
  } else {
    processEmptyBlockDowngrading();
  }

  return editorState;

  function insertEOL(): void {
    let textToInsert = EOL;

    if (autoIndent) {
      let groups = AUTO_INDENT_WHITESPACES_REGEX.exec(leftText);

      if (groups) {
        textToInsert += groups[1];
      }
    }

    content = Modifier.replaceText(content, selection, textToInsert);

    editorState = EditorState.push(editorState, content, 'insert-characters');

    // re-render hack: it seems that Draft.js will not render changes from like
    // '\n' to '\n\n', use `forceSelection` to force re-rendering.
    editorState = EditorState.forceSelection(
      editorState,
      content.getSelectionAfter(),
    );
  }

  function processContinuousEOL(): void {
    if (!leftText.endsWith(EOL)) {
      return;
    }

    // left splitting range contains the last 2 EOL
    let continuousEOLRange = SelectionState.createEmpty(leftBlockKey).merge({
      anchorOffset: leftOffset - EOL.length,
      focusOffset: leftOffset + EOL.length,
    }) as SelectionState;

    content = Modifier.splitBlock(content, continuousEOLRange);

    // following left block will be the downgraded empty block

    let followingLeftBlockKey = content.getKeyAfter(leftBlockKey);
    let followingLeftBlockRange = SelectionState.createEmpty(
      followingLeftBlockKey,
    );

    if (rightText) {
      if (rightText.startsWith(EOL)) {
        // remove preceding EOL

        let precedingEOLRange = SelectionState.createEmpty(
          followingLeftBlockKey,
        ).merge({
          anchorOffset: 0,
          focusOffset: EOL.length,
        }) as SelectionState;

        content = Modifier.removeRange(content, precedingEOLRange, 'backward');
      }

      content = Modifier.splitBlock(content, followingLeftBlockRange);
    }

    content = Modifier.setBlockType(
      content,
      followingLeftBlockRange,
      'unstyled',
    );

    content = content.merge({
      selectionAfter: followingLeftBlockRange.merge({hasFocus: true}),
    }) as ContentState;

    editorState = EditorState.push(editorState, content, 'split-block');
  }

  function processEmptyBlockDowngrading(): void {
    if (leftText || rightText || leftBlockType === 'unstyled') {
      return;
    }

    let leftBlockDepth = leftBlock.getDepth();

    let nextLeftBlockType: string;
    let nextLeftBlockDepth: number;

    if (leftBlockDepth) {
      nextLeftBlockType = leftBlockType;
      nextLeftBlockDepth = leftBlockDepth - 1;
    } else {
      nextLeftBlockType = 'unstyled';
      nextLeftBlockDepth = 0;
    }

    let leftBlockRange = SelectionState.createEmpty(leftBlockKey);

    content = Modifier.setBlockType(content, leftBlockRange, nextLeftBlockType);

    content = setBlockDepth(content, leftBlockKey, nextLeftBlockDepth);

    content = content.merge({
      selectionAfter: leftBlockRange.merge({hasFocus: true}),
    }) as ContentState;

    editorState = EditorState.push(editorState, content, 'change-block-type');
  }
}
