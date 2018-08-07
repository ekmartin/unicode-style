import React, { Component } from 'react';
import runes from 'runes';
import 'medium-draft/lib/index.css';
import './App.css';
import { Modifier, EditorState } from 'draft-js';
import { getSelectionText } from 'draftjs-utils';
import { HANDLED, Editor, createEditorState } from 'medium-draft';

const MIN_LOWER = 'a'.charCodeAt(0);
const MAX_LOWER = 'z'.charCodeAt(0);
const MIN_UPPER = 'A'.charCodeAt(0);
const MAX_UPPER = 'Z'.charCodeAt(0);
const TRANSFORMS = {
  BOLD: {
    surrogate: 0xd835,
    modifier: [0xdd8d, 0xdd93]
  }
};

const STYLE_MAP = {
  BOLD: {},
  UNDERLINE: {},
  ITALICS: {}
};

function isLower(code) {
  return code >= MIN_LOWER && code <= MAX_LOWER;
}

function isCapital(code) {
  return code >= MIN_UPPER && code <= MAX_UPPER;
}

function applyStyle(transform, text) {
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

function removeStyle(transform, text) {
  const { modifier, surrogate } = transform;
  return runes(text)
    .map(char => {
      if (char.charCodeAt(0) !== surrogate) {
        return char;
      }

      const code = char.charCodeAt(1);
      const [lower, upper] = modifier;
      if (MIN_LOWER + lower < code && MAX_LOWER + lower > code) {
        return String.fromCharCode(code - lower);
      } else if (MIN_UPPER + upper < code && MAX_UPPER + upper > code) {
        return String.fromCharCode(code - upper);
      }

      return char;
    })
    .join('');
}

class App extends Component {
  rawState = createEditorState();
  state = {
    editorState: createEditorState()
  };

  handleBeforeInput = (editorState, str, onChange) => {
    const style = editorState.getCurrentInlineStyle();
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const styledText = style.reduce(
      (text, style) => applyStyle(TRANSFORMS[style], text),
      str
    );

    const newState = EditorState.push(
      editorState,
      Modifier.insertText(content, selection, styledText, style),
      'insert-characters'
    );

    onChange(newState);
    return HANDLED;
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
      (text, style) => removeStyle(TRANSFORMS[style], text),
      currentText
    );

    const styledText = newStyle.reduce(
      (text, style) => applyStyle(TRANSFORMS[style], text),
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
          <Editor
            ref="editor"
            editorState={this.state.editorState}
            beforeInput={this.handleBeforeInput}
            onChange={this.onChange}
            sideButtons={[]}
            customStyleMap={STYLE_MAP}
            toolbarConfig={{
              block: [],
              inline: ['BOLD', 'ITALIC', 'UNDERLINE']
            }}
          />
        </div>
      </div>
    );
  }
}

export default App;
