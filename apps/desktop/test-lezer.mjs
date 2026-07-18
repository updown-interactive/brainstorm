import { markdownLanguage } from '@codemirror/lang-markdown';

const Highlight = {
  defineNodes: [
    {name: "Highlight"},
    {name: "HighlightMark"}
  ],
  parseInline: [{
    name: "Highlight",
    parse(cx, next, pos) {
      if (next !== 61 || cx.char(pos + 1) !== 61) return -1; // '=' is 61
      return cx.addDelimiter({resolve: "Highlight", mark: "HighlightMark"}, pos, pos + 2, true, true);
    },
    after: "Emphasis"
  }]
};

const myParser = markdownLanguage.parser.configure([Highlight]);
const tree = myParser.parse("Text ==highlight== here");
console.log(tree.toString());
