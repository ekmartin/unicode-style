/**
 * TODO:
 *  * Keyboard shortcuts
 *  * Support for combined styles (bold + italics etc.)
 *  * Design
 *  * Mobile support
 */

import 'draft-js-inline-toolbar-plugin/lib/plugin.css';
import './App.css';

import React, { Component } from 'react';
import runes from 'runes';
import { getSelectionText } from 'draftjs-utils';
import Editor from 'draft-js-plugins-editor';
import createInlineToolbarPlugin from 'draft-js-inline-toolbar-plugin';
import { Modifier, EditorState } from 'draft-js';

const MIN_LOWER = 'a'.charCodeAt(0);
const MAX_LOWER = 'z'.charCodeAt(0);
const MIN_UPPER = 'A'.charCodeAt(0);
const MAX_UPPER = 'Z'.charCodeAt(0);

const APPENDERS = {
  UNDERLINE: '̲'
};

const TRANSFORMS = {
  BOLD: {
    surrogate: 0xd835,
    modifier: [0xdd8d, 0xdd93]
  },
  ITALIC: {
    surrogate: 0xd835,
    modifier: [0xddc1, 0xddc7]
  }
};

const STYLE_MAP = {
  BOLD: {},
  UNDERLINE: {},
  ITALIC: {}
};

function isLower(code) {
  return code >= MIN_LOWER && code <= MAX_LOWER;
}

function isCapital(code) {
  return code >= MIN_UPPER && code <= MAX_UPPER;
}

function applyTransform(transform, text) {
  const { modifier, surrogate } = transform;
  return runes(text)
    .map(char => {
      const code = char.charCodeAt(0);
      if (isCapital(code) || isLower(code)) {
        const mod = isCapital(code) ? modifier[1] : modifier[0];
        return String.fromCharCode(surrogate, mod + code);
      }

      return char;
    })
    .join('');
}

function applyAppender(appendChar, text) {
  return runes(text).reduce((str, char) => str + char + appendChar, '');
}

function removeTransform(transform, text) {
  const { modifier, surrogate } = transform;
  return runes(text)
    .map(char => {
      if (char.charCodeAt(0) !== surrogate) {
        return char;
      }

      const code = char.charCodeAt(1);
      const [lower, upper] = modifier;
      if (MIN_LOWER + lower <= code && MAX_LOWER + lower >= code) {
        return String.fromCharCode(code - lower);
      } else if (MIN_UPPER + upper <= code && MAX_UPPER + upper >= code) {
        return String.fromCharCode(code - upper);
      }

      return char;
    })
    .join('');
}

function removeAppender(appendChar, text) {
  return text
    .split('')
    .filter(c => c !== appendChar)
    .join('');
}

function applyStyle(style, text) {
  if (TRANSFORMS[style]) {
    return applyTransform(TRANSFORMS[style], text);
  }

  return applyAppender(APPENDERS[style], text);
}

function removeStyle(style, text) {
  if (TRANSFORMS[style]) {
    return removeTransform(TRANSFORMS[style], text);
  }

  return removeAppender(APPENDERS[style], text);
}

const inlineToolbarPlugin = createInlineToolbarPlugin();
const { InlineToolbar } = inlineToolbarPlugin;

class App extends Component {
  state = {
    editorState: EditorState.createEmpty()
  };

  handleBeforeInput = (str, editorState) => {
    const style = editorState.getCurrentInlineStyle();
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const styledText = style.reduce(
      (text, style) => applyStyle(style, text),
      str
    );

    const newState = EditorState.push(
      editorState,
      Modifier.insertText(content, selection, styledText, style),
      'insert-characters'
    );

    this.onChange(newState);
    return 'handled';
  };

  onChange = editorState => {
    const currentContent = this.state.editorState.getCurrentContent();
    const currentStyle = this.state.editorState.getCurrentInlineStyle();
    const newStyle = editorState.getCurrentInlineStyle();
    const newContent = editorState.getCurrentContent();
    const lastChange = editorState.getLastChangeType();
    if (
      currentContent === newContent ||
      lastChange !== 'change-inline-style' ||
      currentStyle === newStyle
    ) {
      return this.setState({ editorState });
    }

    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const currentText = getSelectionText(editorState);
    const rawText = currentStyle.reduce(
      (text, style) => removeStyle(style, text),
      currentText
    );

    const styledText = newStyle.reduce(
      (text, style) => applyStyle(style, text),
      rawText
    );

    const replaced = Modifier.replaceText(
      content,
      selection,
      styledText,
      newStyle
    );

    this.setState({
      editorState: EditorState.push(
        editorState,
        replaced,
        'change-inline-style'
      )
    });
  };

  onClick = () => {
    this.refs.editor.focus();
  };

  componentDidMount() {
    this.refs.editor.focus();
  }

  render() {
    return (
      <div onClick={this.onClick} className="App">
        <div className="Content">
          <h1>unicode.style</h1>
          <Editor
            ref="editor"
            editorState={this.state.editorState}
            beforeInput={this.handleBeforeInput}
            onChange={this.onChange}
            plugins={[inlineToolbarPlugin]}
            customStyleMap={STYLE_MAP}
          />
          <InlineToolbar />
        </div>
      </div>
    );
  }
}

export default App;
