import {DraftInlineStyle} from 'draft-js';
import * as Immutable from 'immutable';

import {Feature} from '../@feature';
import {
  characterListContainsEntityAlike,
  testCharacterListConsistency,
  unescapeMarkdown,
} from '../@utils';

import {createAutoTransformFeature} from './@auto-transform-feature';

const CODE_REGEX = /* /$code-markdown/ */ /(`)((?:(?!`)(?:\\[!"#$%&'()*+,.\/:;<=>?@^_`{}~\[\]\\\-]|(?!\\).|\\(?![!"#$%&'()*+,.\/:;<=>?@^_`{}~\[\]\\\-])))+)(`)$/;

const CODE_STYLE: DraftInlineStyle = Immutable.OrderedSet(['CODE']);

export function createCodeFeature(): Feature {
  return createAutoTransformFeature({
    matcher(leftText, input) {
      let groups = CODE_REGEX.exec(leftText + input);

      if (!groups) {
        return undefined;
      }

      /* /$code-markdown/ */
      let opening = groups[1];
      let textSource = groups[2];
      let closing = groups[3];

      let {markdownFragments, textFragments} = unescapeMarkdown(textSource);

      return {
        opening,
        closing,
        markdownFragments,
        textFragments,
        style: CODE_STYLE,
      };
    },
    compatibilityTester(opening, content, closing) {
      let list = [...opening, ...content, ...closing];

      return (
        testCharacterListConsistency(list) &&
        !characterListContainsEntityAlike(list)
      );
    },
  });
}
