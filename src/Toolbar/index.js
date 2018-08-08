import toolbarStyles from './Toolbar.module.css';
import buttonStyles from './Button.module.css';
import createInlineToolbarPlugin from 'draft-js-inline-toolbar-plugin';
import {
  createInlineStyleButton,
  BoldButton,
  ItalicButton,
  UnderlineButton,
  CodeButton
} from 'draft-js-buttons';

const DoubleButton = createInlineStyleButton({
  style: 'DOUBLE',
  children: '𝔻'
});

const inlineToolbarPlugin = createInlineToolbarPlugin({
  structure: [
    BoldButton,
    ItalicButton,
    UnderlineButton,
    CodeButton,
    DoubleButton
  ],
  theme: { buttonStyles, toolbarStyles }
});

const { InlineToolbar } = inlineToolbarPlugin;
export { InlineToolbar, inlineToolbarPlugin };
