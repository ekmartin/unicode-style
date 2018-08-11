// @flow
import React from 'react';
import toolbarStyles from './Toolbar.module.css';
import buttonStyles from './ToolbarButton.module.css';
import createInlineToolbarPlugin, {
  Separator
} from 'draft-js-inline-toolbar-plugin';
import {
  createInlineStyleButton,
  BoldButton,
  ItalicButton,
  UnderlineButton,
  CodeButton
} from 'draft-js-buttons';

// Match the height of the existing buttons:
const createSpan = text => (
  <span style={{ lineHeight: '24px', height: 24 }}>{text}</span>
);

const DoubleButton = createInlineStyleButton({
  style: 'DOUBLE',
  children: createSpan('𝔻')
});

const ScriptButton = createInlineStyleButton({
  style: 'SCRIPT',
  children: createSpan('𝓢')
});

const FrakturButton = createInlineStyleButton({
  style: 'FRAKTUR',
  children: createSpan('𝔉')
});

const inlineToolbarPlugin = createInlineToolbarPlugin({
  structure: [
    BoldButton,
    ItalicButton,
    UnderlineButton,
    Separator,
    CodeButton,
    FrakturButton,
    DoubleButton,
    ScriptButton
  ],
  theme: { buttonStyles, toolbarStyles }
});

const { InlineToolbar } = inlineToolbarPlugin;
export { InlineToolbar, inlineToolbarPlugin };
