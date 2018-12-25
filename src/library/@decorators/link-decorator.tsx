import {DraftDecorator, DraftDecoratorComponentProps} from 'draft-js';
import React, {ComponentType, FunctionComponent, createElement} from 'react';

import {getCharacterEntityType, linkify} from '../@utils';

export interface LinkEntityData {
  href: string;
}

export interface LinkComponentProps {
  href: string;
}

export interface LinkDecoratorOptions {
  component?: ComponentType<LinkComponentProps>;
}

const LinkComponent: FunctionComponent<LinkComponentProps> = ({
  href,
  children,
}) => <a href={href}>{children}</a>;

export function createLinkDecorator({
  component = LinkComponent,
}: LinkDecoratorOptions): DraftDecorator {
  const Link: FunctionComponent<DraftDecoratorComponentProps> = ({
    contentState,
    decoratedText,
    entityKey,
    children,
  }) => {
    let href: string;

    if (entityKey) {
      ({href} = contentState.getEntity(entityKey).getData() as LinkEntityData);
    } else {
      ({url: href} = linkify.match(decoratedText)![0]);
    }

    return createElement(component, {href}, children);
  };

  return {
    component: Link,
    strategy(block, callback, contentState) {
      let entityRanges: [number, number][] = [];

      block.findEntityRanges(
        metadata => getCharacterEntityType(metadata, contentState) === 'LINK',
        (start, end) => {
          entityRanges.push([start, end]);
          callback(start, end);
        },
      );

      let characters = Array.from(block.getText());

      for (let [start, end] of entityRanges) {
        let length = end - start;
        characters.splice(start, end - start, ''.padEnd(length));
      }

      let text = characters.join('');

      let links = linkify.match(text);

      if (links) {
        for (let link of links) {
          callback(link.index, link.lastIndex);
        }
      }
    },
  };
}
