import {DraftInlineStyle} from 'draft-js';
import * as Immutable from 'immutable';

import {Feature} from '../@feature';
import {
  characterListContainsEntity,
  testCharacterListConsistency,
  unescapeMarkdown,
} from '../@utils';

import {createAutoConversionFeature} from './@auto-conversion-feature';

const STRIKETHROUGH_REGEX = /(?:^|[^~])(~{2})((?:\\.|(?!\\|~{2}).)+)(~{2})$/;

const STRIKETHROUGH_STYLE: DraftInlineStyle = Immutable.OrderedSet([
  'STRIKETHROUGH',
]);

export function createStrikethroughFeature(): Feature {
  return createAutoConversionFeature({
    style: STRIKETHROUGH_STYLE,
    matcher(textBeforeOffset) {
      let groups = STRIKETHROUGH_REGEX.exec(textBeforeOffset);

      if (!groups) {
        return undefined;
      }

      let [, opening, markdownSource, closing] = groups;

      let {markdownFragments, textFragments} = unescapeMarkdown(markdownSource);

      return {
        opening,
        closing,
        markdownFragments,
        textFragments,
      };
    },
    compatibilityTester(opening, _content, closing) {
      return (
        testCharacterListConsistency(opening) &&
        testCharacterListConsistency(closing) &&
        !characterListContainsEntity([...opening, ...closing])
      );
    },
  });
}
