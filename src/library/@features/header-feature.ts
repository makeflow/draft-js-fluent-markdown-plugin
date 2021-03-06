import {Feature} from '../@feature';
import {
  characterListContainsEntityAlike,
  testCharacterListConsistency,
} from '../@utils';

import {createAutoBlockFeature} from './@auto-block-feature';
import {AUTO_BLOCK_TYPE_BLACKLIST} from './@auto-block-type-blacklist';

const HEADER_REGEX = /^(#{1,6}) $/;

const HEADER_TYPES = [
  'header-one',
  'header-two',
  'header-three',
  'header-four',
  'header-five',
  'header-six',
];

export function createHeaderFeature(): Feature {
  return createAutoBlockFeature({
    matcher(input, {leftText}) {
      let groups = HEADER_REGEX.exec(leftText + input);

      if (!groups) {
        return undefined;
      }

      let [, hashes] = groups;

      let type = HEADER_TYPES[hashes.length - 1];

      return {
        type,
        autoBlockTypeBlacklist: AUTO_BLOCK_TYPE_BLACKLIST,
      };
    },
    compatibilityTester(list) {
      return (
        testCharacterListConsistency(list) &&
        !characterListContainsEntityAlike(list)
      );
    },
  });
}
