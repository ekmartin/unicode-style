import React, { Component } from 'react';
import 'medium-draft/lib/index.css';
import './App.css';
import { Modifier, EditorState } from 'draft-js';
import { getSelectionText } from 'draftjs-utils';
import { HANDLED, Editor, createEditorState } from 'medium-draft';

const TRANSFORMS = {
  BOLD: {
    surrogate: 0xd835,
    modifier: [0xdd8d, 0xdd93]
  }
};

function isCapital(code) {
  return code >= 65 && code <= 90;
}

function isLower(code) {
  return code >= 97 && code <= 122;
}

function applyStyle(transform, text) {
  const { modifier, surrogate } = transform;
  return text
    .split('')
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
  const { modifier } = transform;
  return text
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (isCapital(code) || isLower(code)) {
        const mod = isCapital(code) ? modifier[1] : modifier[0];
        return String.fromCharCode(mod - code);
      }

      return char;
    })
    .join('');
}

class App extends Component {
  state = {
    editorState: createEditorState()
  };

  handleBeforeInput = (editorState, str, onChange) => {
    const selectionState = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const style = editorState.getCurrentInlineStyle();
    const styledText = style.reduce(
      (text, style) => applyStyle(TRANSFORMS[style], text),
      str
    );

    onChange(
      EditorState.push(
        editorState,
        Modifier.insertText(contentState, selectionState, styledText, style),
        'insert-characters'
      )
    );

    return HANDLED;
  };

  onChange = editorState => {
    const currentContent = this.state.editorState.getCurrentContent();
    const newContent = editorState.getCurrentContent();
    const lastChange = editorState.getLastChangeType();
    if (currentContent === newContent || lastChange !== 'change-inline-style') {
      return this.setState({ editorState });
    }

    const style = editorState.getCurrentInlineStyle();
    const selectionState = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const currentText = getSelectionText(editorState);
    const previousStyle = this.state.editorState.getCurrentInlineStyle();
    const rawText = previousStyle.reduce(
      (text, style) => removeStyle(TRANSFORMS[style], text),
      currentText
    );

    const styledText = style.reduce(
      (text, style) => applyStyle(TRANSFORMS[style], text),
      rawText
    );

    const content = Modifier.replaceText(
      contentState,
      selectionState,
      styledText,
      style
    );

    this.setState({
      editorState: EditorState.push(editorState, content, 'change-inline-style')
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
