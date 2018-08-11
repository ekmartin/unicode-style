// @flow
/* eslint-disable import/no-webpack-loader-syntax */
import styles from './Buttons.module.css';
// $FlowFixMe
import CopyIcon from '-!svg-react-loader!./copy.svg';
// $FlowFixMe
import TweetIcon from '-!svg-react-loader!./twitter.svg';
// $FlowFixMe
import GitHubIcon from '-!svg-react-loader!./github.svg';
import * as React from 'react';

const TWEET_URL = 'https://twitter.com/intent/tweet';

type Props = {
  text: string
};

export default class Buttons extends React.Component<Props> {
  onCopy = () => {
    const element = document.createElement('textarea');
    element.value = this.props.text;
    element.setAttribute('readonly', '');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    const { body } = document;
    if (!body) {
      throw new Error('No document');
    }

    body.appendChild(element);
    element.select();
    document.execCommand('copy');
    body.removeChild(element);
  };

  render() {
    const encoded = encodeURIComponent(this.props.text);
    const url = `${TWEET_URL}?text=${encoded}`;
    return (
      <div className={styles.buttons}>
        <div className={styles.actions}>
          <button onClick={this.onCopy} className={styles.copy}>
            <CopyIcon />
            Copy
          </button>
          <a href={url} className={styles.tweet}>
            <TweetIcon />
            Tweet
          </a>
        </div>

        <a
          className={styles.github}
          href="https://github.com/ekmartin/unicode-style"
        >
          <GitHubIcon /> unicode-style
        </a>
      </div>
    );
  }
}
