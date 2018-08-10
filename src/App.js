/**
 * TODO:
 *  * Toolbar shouldn't close on clicks
 *      Need to calculate a new SelectionState after changes
 *      (find the new focusOffset based on the content)
 *  * Use a static toolbar on mobile
 *  * Support numbers
 *  * Undo/redo needs to group style changes with the text modifications
 */

import 'sanitize.css';
import 'draft-js-inline-toolbar-plugin/lib/plugin.css';
import 'draft-js/dist/Draft.css';
import styles from './App.module.css';
import React, { Component } from 'react';
import runes from 'runes';
import { getSelectionText } from 'draftjs-utils';
import Editor from 'draft-js-plugins-editor';
import cx from 'classnames';
import { Modifier, EditorState, RichUtils } from 'draft-js';
import { InlineToolbar, inlineToolbarPlugin } from './Toolbar';
import Buttons from './Buttons';
import Header from './Header';

const MIN_LOWER = 'a'.charCodeAt(0);
const MAX_LOWER = 'z'.charCodeAt(0);
const MIN_UPPER = 'A'.charCodeAt(0);
const MAX_UPPER = 'Z'.charCodeAt(0);

const APPENDERS = {
  UNDERLINE: '̲'
};

const SURROGATE = 0xd835;
const COMBINED_TRANSFORMS = {
  BOLDITALIC: {
    modifier: [0xddf5, 0xddfb]
  }
};

const TRANSFORMS = {
  DOUBLE: {
    exclusive: true,
    modifier: [0xdcf1, 0xdcf7]
  },
  SCRIPT: {
    exclusive: true,
    modifier: [0xdc55, 0xdc5b]
  },
  CODE: {
    exclusive: true,
    modifier: [0xde29, 0xde2f]
  },
  FRAKTUR: {
    exclusive: true,
    modifier: [0xdcbd, 0xdcc3]
  },
  BOLD: {
    exclusive: false,
    modifier: [0xdd8d, 0xdd93]
  },
  ITALIC: {
    exclusive: false,
    modifier: [0xddc1, 0xddc7]
  }
};

const STYLE_MAP = {
  BOLD: {},
  UNDERLINE: {},
  ITALIC: {},
  CODE: {},
  DOUBLE: {},
  SCRIPT: {},
  FRAKTUR: {}
};

function isLower(code) {
  return code >= MIN_LOWER && code <= MAX_LOWER;
}

function isCapital(code) {
  return code >= MIN_UPPER && code <= MAX_UPPER;
}

function filterStyles(oldStyles, newStyles) {
  const exclusive = newStyles.find(s => {
    const transform = TRANSFORMS[s];
    return transform && transform.exclusive;
  });

  if (exclusive) {
    const oldTransforms = oldStyles.filter(s => TRANSFORMS[s]);
    return newStyles.subtract(oldTransforms);
  }

  return newStyles;
}

function combineStyles(styles) {
  const combined = styles
    .filter(style => TRANSFORMS[style])
    .sort()
    .join('');
  const appenders = styles.map(style => APPENDERS[style]).filter(a => a);
  const transforms =
    COMBINED_TRANSFORMS[combined] ||
    styles.map(s => TRANSFORMS[s]).filter(t => t);
  return appenders.concat(transforms);
}

function applyTransform(transform, text) {
  const { modifier } = transform;
  return runes(text)
    .map(char => {
      const code = char.charCodeAt(0);
      if (isCapital(code) || isLower(code)) {
        const mod = isCapital(code) ? modifier[1] : modifier[0];
        return String.fromCharCode(SURROGATE, mod + code);
      }

      return char;
    })
    .join('');
}

function applyAppender(appendChar, text) {
  return runes(text).reduce((str, char) => str + char + appendChar, '');
}

function removeTransform(transform, text) {
  const { modifier } = transform;
  return runes(text)
    .map(char => {
      if (char.charCodeAt(0) !== SURROGATE) {
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
  if (typeof style === 'string') {
    return applyAppender(style, text);
  }

  return applyTransform(style, text);
}

function removeStyle(style, text) {
  if (typeof style === 'string') {
    return removeAppender(style, text);
  }

  return removeTransform(style, text);
}

class App extends Component {
  state = {
    editorState: EditorState.createEmpty()
  };

  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return 'handled';
    }

    return 'not-handled';
  };

  handleBeforeInput = (str, editorState) => {
    const style = editorState.getCurrentInlineStyle();
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const styledText = combineStyles(style).reduce(
      (text, style) => applyStyle(style, text),
      str
    );

    const newState = EditorState.push(
      editorState,
      Modifier.replaceText(content, selection, styledText, style),
      'insert-characters'
    );

    this.onChange(newState);
    return 'handled';
  };

  onChange = editorState => {
    const currentContent = this.state.editorState.getCurrentContent();
    const currentStyle = this.state.editorState.getCurrentInlineStyle();
    const rawStyle = editorState.getCurrentInlineStyle();
    const newContent = editorState.getCurrentContent();
    const lastChange = editorState.getLastChangeType();
    if (
      currentContent === newContent ||
      lastChange !== 'change-inline-style' ||
      currentStyle === rawStyle
    ) {
      return this.setState({ editorState });
    }

    const newStyle = filterStyles(currentStyle, rawStyle);
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const currentText = getSelectionText(editorState);
    const rawText = combineStyles(currentStyle).reduce(
      (text, style) => removeStyle(style, text),
      currentText
    );

    const styledText = combineStyles(newStyle).reduce(
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

  componentDidMount() {
    this.refs.editor.focus();
  }

  render() {
    const { editorState } = this.state;
    const plainText = editorState.getCurrentContent().getPlainText();
    return (
      <div className={styles.content}>
        <Header />
        <p className={cx(styles.paragraph, { [styles.faded]: plainText })}>
          Format text using unicode characters. Paste anywhere that accepts
          plain text.
        </p>
        <Editor
          ref="editor"
          placeholder="Write, highlight, and style away."
          editorState={editorState}
          handleKeyCommand={this.handleKeyCommand}
          handleBeforeInput={this.handleBeforeInput}
          onChange={this.onChange}
          plugins={[inlineToolbarPlugin]}
          customStyleMap={STYLE_MAP}
        />
        <InlineToolbar />
        <Buttons text={plainText} />
      </div>
    );
  }
}

export default App;
