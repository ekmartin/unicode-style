// @flow
import { Modifier, EditorState, SelectionState } from 'draft-js';
import { getSelectionText } from 'draftjs-utils';
import type { OrderedSet } from 'immutable';
import runes from 'runes';

const MIN_LOWER = 'a'.charCodeAt(0);
const MAX_LOWER = 'z'.charCodeAt(0);
const MIN_UPPER = 'A'.charCodeAt(0);
const MAX_UPPER = 'Z'.charCodeAt(0);

const isLower = code => code >= MIN_LOWER && code <= MAX_LOWER;
const isCapital = code => code >= MIN_UPPER && code <= MAX_UPPER;

// A styled unicode character is built up of
// two UTF-16 code points, where the first is a surrogate.
const SURROGATE = 0xd835;

type Transform = {
  exclusive: boolean,
  modifier: [number, number]
};

type Appender = {
  character: string,
  ignore: Array<string>
};

// Each transform consists of a modifier for lowercase and a modifier for
// uppercase characters. To go from e.g. A to 𝔸, the character code for A, 65,
// is added to the uppercase modifier for DOUBLE, 0xdcf7, and prefixed with a
// unicode surrogate.
const TRANSFORMS = {
  DOUBLE: {
    exclusive: true,
    modifier: [0xdcf1, 0xdcf7]
  },
  SCRIPT: {
    exclusive: true,
    modifier: [0xdc89, 0xdc8f]
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

// Ignore lower hanging characters:
const UNDERLINE_IGNORE = ['g', 'j', 'p', 'q', 'y'];

// Repeat UNDERLINE_IGNORE for all transforms.
function buildUnderlineIgnore() {
  const repeated = UNDERLINE_IGNORE.reduce((total, char) => {
    const permutations = Object.keys(TRANSFORMS).map(key =>
      applyTransform(char, TRANSFORMS[key])
    );

    return total.concat(permutations);
  }, []);

  // Include the regular characters as well:
  return repeated.concat(UNDERLINE_IGNORE);
}

const COMBINED_TRANSFORMS = {
  BOLDITALIC: {
    modifier: [0xddf5, 0xddfb]
  }
};

// To e.g. underline a character, a
// specific unicode character is appended prior to it.
const APPENDERS = {
  UNDERLINE: {
    character: '̲',
    ignore: buildUnderlineIgnore()
  },
  STRIKETHROUGH: {
    character: '̶',
    ignore: []
  }
};

/**
 * Since there's e.g., no unicode character for bold monospace, a few of the
 * styles are marked as exclusive. filterStyles makes sure to remove any
 * existing transforms when an exclusive style is applied. The same goes the
 * other way as well, when a common style is applied while an existing
 * exclusive style is active, the common one takes presedence.
 *
 * Examples:
 * (bold) -> (bold, fraktur) = fraktur
 * (fraktur) -> (bold, fraktur) = bold
 * (underline) -> (underline, fraktur) = (underline, fraktur)
 */
function filterStyles(
  oldStyle: OrderedSet<string>,
  newStyle: OrderedSet<string>
): OrderedSet<string> {
  const oldTransforms = oldStyle.filter(s => TRANSFORMS[s]);
  const newTransforms = newStyle.filter(s => TRANSFORMS[s]);
  // We don't want to filter anything if the only thing that changes is an appender:
  if (oldTransforms.equals(newTransforms)) return newStyle;

  // Otherwise, see whether we have an exclusive transform in the current style set:
  const exclusive = newStyle.find(s => {
    const transform = TRANSFORMS[s];
    return transform && transform.exclusive;
  });

  // And when we do, keep the newest transforms:
  if (exclusive) {
    return newStyle.subtract(oldTransforms);
  }

  return newStyle;
}

/**
 * Turns e.g., BOLD and ITALIC into BOLDITALIC.
 */
function retrieveTransforms(styles: OrderedSet<string>): Array<Transform> {
  const combined = styles
    .filter(style => TRANSFORMS[style])
    .sort()
    .join('');

  if (COMBINED_TRANSFORMS[combined]) {
    return [COMBINED_TRANSFORMS[combined]];
  }

  return styles.map(s => TRANSFORMS[s]).filter(t => t);
}

function retrieveAppenders(styles: OrderedSet<string>): Array<Appender> {
  return styles.map(style => APPENDERS[style]).filter(a => a);
}

/**
 * Applies a transform by building characters using
 * a surrogate and a modifier from TRANSFORMS.
 */
function applyTransform(text: string, transform: Transform): string {
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

/**
 * Styles text using appenders by prepending each
 * character with the given appendChar.
 */
function applyAppender(text: string, appender: Appender): string {
  return runes(text).reduce((str, char) => {
    if (appender.ignore.includes(char)) {
      return str + char;
    }

    return str + char + appender.character;
  }, '');
}

/**
 * Reverts the work done by applyTransform by removing the correct modifier,
 * depending on whether a character is lower- or uppercase.
 */
function removeTransform(text: string, transform: Transform) {
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

/**
 * Removes appended characters, e.g., underline modifiers.
 */
function removeAppender(text: string, appender: Appender): string {
  return text
    .split('')
    .filter(c => c !== appender.character)
    .join('');
}

/**
 * Applies a list of styles to the given characters.
 */
function applyStyles(characters: string, style: OrderedSet<string>): string {
  const transforms = retrieveTransforms(style);
  const appenders = retrieveAppenders(style);
  const styledText = transforms.reduce(applyTransform, characters);
  return appenders.reduce(applyAppender, styledText);
}

/**
 * Removes a list of styles from the given characters.
 */
function removeStyles(characters: string, style: OrderedSet<string>): string {
  const transforms = retrieveTransforms(style);
  const appenders = retrieveAppenders(style);
  const styledText = transforms.reduce(removeTransform, characters);
  return appenders.reduce(removeAppender, styledText);
}

/**
 * Draft.js resets the selection after content changes, but we'd rather
 * maintain it, so that you can apply multiple styles to the same selection in
 * succession. At the same time, abc is not the same as 𝙖𝙗𝙘 (bold) — it has a
 * different size. To maintain the same selection after a style change, we need
 * to calculate the new offsets by taking the size change into consideration.
 */
function buildSelection(
  oldText: string,
  newText: string,
  selection: SelectionState
): SelectionState {
  const diff = newText.length - oldText.length;
  const isBackward = selection.getIsBackward();
  const options = {
    anchorKey: selection.getAnchorKey(),
    focusKey: selection.getFocusKey(),
    isBackward: selection.getIsBackward(),
    hasFocus: true
  };

  // For backwards selections (i.e. selections from right to left), the focus
  // stays the same while the anchor moves slightly to the right:
  if (isBackward) {
    return new SelectionState({
      ...options,
      focusOffset: selection.getFocusOffset(),
      anchorOffset: selection.getAnchorOffset() + diff
    });
  }

  // Whereas for regular selections, we need to move the focus:
  return new SelectionState({
    ...options,
    focusOffset: selection.getFocusOffset() + diff,
    anchorOffset: selection.getAnchorOffset()
  });
}

/**
 * Applies the current inline styles to the newly inserted `characters` by
 * replacing each one with an applicable unicode character
 */
export function styleInsertion(
  editorState: EditorState,
  characters: string
): EditorState {
  const style = editorState.getCurrentInlineStyle();
  const selection = editorState.getSelection();
  const content = editorState.getCurrentContent();
  const styledText = applyStyles(characters, style);

  return EditorState.push(
    editorState,
    Modifier.replaceText(content, selection, styledText, style),
    'insert-characters'
  );
}

/**
 * Applies inline styles by modifying the selected characters to suitable
 * unicode replacements.
 */
export function styleSelection(
  oldEditorState: EditorState,
  editorState: EditorState
): EditorState {
  const currentStyle = oldEditorState.getCurrentInlineStyle();
  const rawStyle = editorState.getCurrentInlineStyle();
  const selection = editorState.getSelection();
  const newStyle = filterStyles(currentStyle, rawStyle);
  const content = editorState.getCurrentContent();
  const currentText = getSelectionText(editorState);

  // To go from e.g. bold to bold and italics, we need to first remove the
  // existing bold styling, before applying both bold and italics together in
  // one pass:
  const rawText = removeStyles(currentText, currentStyle);
  const styledText = applyStyles(rawText, newStyle);

  const replaced = Modifier.replaceText(
    content,
    selection,
    styledText,
    newStyle
  );

  const newState = EditorState.push(
    editorState,
    replaced,
    'change-inline-style'
  );

  // Calculate the new selection and force it, so that it doesn't get
  // collapsed by Draft.js when the content changes:
  const newSelection = buildSelection(currentText, styledText, selection);
  return EditorState.forceSelection(newState, newSelection);
}
