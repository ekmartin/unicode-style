import React from 'react';
import toolbarStyles from './Toolbar.module.css';
import buttonStyles from './Button.module.css';
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
  children: createSpan('𝒮')
});

const inlineToolbarPlugin = createInlineToolbarPlugin({
  structure: [
    BoldButton,
    ItalicButton,
    UnderlineButton,
    Separator,
    CodeButton,
    ScriptButton,
    DoubleButton
  ],
  theme: { buttonStyles, toolbarStyles }
});

const { InlineToolbar } = inlineToolbarPlugin;
export { InlineToolbar, inlineToolbarPlugin };
