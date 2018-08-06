import React, { Component } from 'react';
import 'medium-draft/lib/index.css';
import './App.css';
import { Editor, createEditorState } from 'medium-draft';

class App extends Component {
  state = {
    editorState: createEditorState()
  };

  onChange = editorState => {
    this.setState({ editorState });
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
