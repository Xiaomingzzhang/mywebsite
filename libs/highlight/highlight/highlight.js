/*!
  Highlight.js v11.9.0 (git: b7ec4bfafc)
  (c) 2006-2023 undefined and other contributors
  License: BSD-3-Clause
 */
var hljs = (function () {
  'use strict';

  /* eslint-disable no-multi-assign */

  function deepFreeze(obj) {
    if (obj instanceof Map) {
      obj.clear =
        obj.delete =
        obj.set =
          function () {
            throw new Error('map is read-only');
          };
    } else if (obj instanceof Set) {
      obj.add =
        obj.clear =
        obj.delete =
          function () {
            throw new Error('set is read-only');
          };
    }

    // Freeze self
    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach((name) => {
      const prop = obj[name];
      const type = typeof prop;

      // Freeze prop if it is an object or function and also not already frozen
      if ((type === 'object' || type === 'function') && !Object.isFrozen(prop)) {
        deepFreeze(prop);
      }
    });

    return obj;
  }

  /** @typedef {import('highlight.js').CallbackResponse} CallbackResponse */
  /** @typedef {import('highlight.js').CompiledMode} CompiledMode */
  /** @implements CallbackResponse */

  class Response {
    /**
     * @param {CompiledMode} mode
     */
    constructor(mode) {
      // eslint-disable-next-line no-undefined
      if (mode.data === undefined) mode.data = {};

      this.data = mode.data;
      this.isMatchIgnored = false;
    }

    ignoreMatch() {
      this.isMatchIgnored = true;
    }
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeHTML(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * performs a shallow merge of multiple objects into one
   *
   * @template T
   * @param {T} original
   * @param {Record<string,any>[]} objects
   * @returns {T} a single new object
   */
  function inherit$1(original, ...objects) {
    /** @type Record<string,any> */
    const result = Object.create(null);

    for (const key in original) {
      result[key] = original[key];
    }
    objects.forEach(function(obj) {
      for (const key in obj) {
        result[key] = obj[key];
      }
    });
    return /** @type {T} */ (result);
  }

  /**
   * @typedef {object} Renderer
   * @property {(text: string) => void} addText
   * @property {(node: Node) => void} openNode
   * @property {(node: Node) => void} closeNode
   * @property {() => string} value
   */

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean}} Node */
  /** @typedef {{walk: (r: Renderer) => void}} Tree */
  /** */

  const SPAN_CLOSE = '</span>';

  /**
   * Determines if a node needs to be wrapped in <span>
   *
   * @param {Node} node */
  const emitsWrappingTags = (node) => {
    // rarely we can have a sublanguage where language is undefined
    // TODO: track down why
    return !!node.scope;
  };

  /**
   *
   * @param {string} name
   * @param {{prefix:string}} options
   */
  const scopeToCSSClass = (name, { prefix }) => {
    // sub-language
    if (name.startsWith("language:")) {
      return name.replace("language:", "language-");
    }
    // tiered scope: comment.line
    if (name.includes(".")) {
      const pieces = name.split(".");
      return [
        `${prefix}${pieces.shift()}`,
        ...(pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`))
      ].join(" ");
    }
    // simple scope
    return `${prefix}${name}`;
  };

  /** @type {Renderer} */
  class HTMLRenderer {
    /**
     * Creates a new HTMLRenderer
     *
     * @param {Tree} parseTree - the parse tree (must support `walk` API)
     * @param {{classPrefix: string}} options
     */
    constructor(parseTree, options) {
      this.buffer = "";
      this.classPrefix = options.classPrefix;
      parseTree.walk(this);
    }

    /**
     * Adds texts to the output stream
     *
     * @param {string} text */
    addText(text) {
      this.buffer += escapeHTML(text);
    }

    /**
     * Adds a node open to the output stream (if needed)
     *
     * @param {Node} node */
    openNode(node) {
      if (!emitsWrappingTags(node)) return;

      const className = scopeToCSSClass(node.scope,
        { prefix: this.classPrefix });
      this.span(className);
    }

    /**
     * Adds a node close to the output stream (if needed)
     *
     * @param {Node} node */
    closeNode(node) {
      if (!emitsWrappingTags(node)) return;

      this.buffer += SPAN_CLOSE;
    }

    /**
     * returns the accumulated buffer
    */
    value() {
      return this.buffer;
    }

    // helpers

    /**
     * Builds a span element
     *
     * @param {string} className */
    span(className) {
      this.buffer += `<span class="${className}">`;
    }
  }

  /** @typedef {{scope?: string, language?: string, children: Node[]} | string} Node */
  /** @typedef {{scope?: string, language?: string, children: Node[]} } DataNode */
  /** @typedef {import('highlight.js').Emitter} Emitter */
  /**  */

  /** @returns {DataNode} */
  const newNode = (opts = {}) => {
    /** @type DataNode */
    const result = { children: [] };
    Object.assign(result, opts);
    return result;
  };

  class TokenTree {
    constructor() {
      /** @type DataNode */
      this.rootNode = newNode();
      this.stack = [this.rootNode];
    }

    get top() {
      return this.stack[this.stack.length - 1];
    }

    get root() { return this.rootNode; }

    /** @param {Node} node */
    add(node) {
      this.top.children.push(node);
    }

    /** @param {string} scope */
    openNode(scope) {
      /** @type Node */
      const node = newNode({ scope });
      this.add(node);
      this.stack.push(node);
    }

    closeNode() {
      if (this.stack.length > 1) {
        return this.stack.pop();
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    closeAllNodes() {
      while (this.closeNode());
    }

    toJSON() {
      return JSON.stringify(this.rootNode, null, 4);
    }

    /**
     * @typedef { import("./html_renderer").Renderer } Renderer
     * @param {Renderer} builder
     */
    walk(builder) {
      // this does not
      return this.constructor._walk(builder, this.rootNode);
      // this works
      // return TokenTree._walk(builder, this.rootNode);
    }

    /**
     * @param {Renderer} builder
     * @param {Node} node
     */
    static _walk(builder, node) {
      if (typeof node === "string") {
        builder.addText(node);
      } else if (node.children) {
        builder.openNode(node);
        node.children.forEach((child) => this._walk(builder, child));
        builder.closeNode(node);
      }
      return builder;
    }

    /**
     * @param {Node} node
     */
    static _collapse(node) {
      if (typeof node === "string") return;
      if (!node.children) return;

      if (node.children.every(el => typeof el === "string")) {
        // node.text = node.children.join("");
        // delete node.children;
        node.children = [node.children.join("")];
      } else {
        node.children.forEach((child) => {
          TokenTree._collapse(child);
        });
      }
    }
  }

  /**
    Currently this is all private API, but this is the minimal API necessary
    that an Emitter must implement to fully support the parser.

    Minimal interface:

    - addText(text)
    - __addSublanguage(emitter, subLanguageName)
    - startScope(scope)
    - endScope()
    - finalize()
    - toHTML()

  */

  /**
   * @implements {Emitter}
   */
  class TokenTreeEmitter extends TokenTree {
    /**
     * @param {*} options
     */
    constructor(options) {
      super();
      this.options = options;
    }

    /**
     * @param {string} text
     */
    addText(text) {
      if (text === "") { return; }

      this.add(text);
    }

    /** @param {string} scope */
    startScope(scope) {
      this.openNode(scope);
    }

    endScope() {
      this.closeNode();
    }

    /**
     * @param {Emitter & {root: DataNode}} emitter
     * @param {string} name
     */
    __addSublanguage(emitter, name) {
      /** @type DataNode */
      const node = emitter.root;
      if (name) node.scope = `language:${name}`;

      this.add(node);
    }

    toHTML() {
      const renderer = new HTMLRenderer(this, this.options);
      return renderer.value();
    }

    finalize() {
      this.closeAllNodes();
      return true;
    }
  }

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function anyNumberOfTimes(re) {
    return concat('(?:', re, ')*');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function optional(re) {
    return concat('(?:', re, ')?');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  /**
   * @param {RegExp | string} re
   * @returns {number}
   */
  function countMatchGroups(re) {
    return (new RegExp(re.toString() + '|')).exec('').length - 1;
  }

  /**
   * Does lexeme start with a regular expression match at the beginning
   * @param {RegExp} re
   * @param {string} lexeme
   */
  function startsWith(re, lexeme) {
    const match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  // BACKREF_RE matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

  // **INTERNAL** Not intended for outside usage
  // join logically computes regexps.join(separator), but fixes the
  // backreferences so they continue to match.
  // it also places each individual regular expression into it's own
  // match group, keeping track of the sequencing of those match groups
  // is currently an exercise for the caller. :-)
  /**
   * @param {(string | RegExp)[]} regexps
   * @param {{joinWith: string}} opts
   * @returns {string}
   */
  function _rewriteBackreferences(regexps, { joinWith }) {
    let numCaptures = 0;

    return regexps.map((regex) => {
      numCaptures += 1;
      const offset = numCaptures;
      let re = source(regex);
      let out = '';

      while (re.length > 0) {
        const match = BACKREF_RE.exec(re);
        if (!match) {
          out += re;
          break;
        }
        out += re.substring(0, match.index);
        re = re.substring(match.index + match[0].length);
        if (match[0][0] === '\\' && match[1]) {
          // Adjust the backreference.
          out += '\\' + String(Number(match[1]) + offset);
        } else {
          out += match[0];
          if (match[0] === '(') {
            numCaptures++;
          }
        }
      }
      return out;
    }).map(re => `(${re})`).join(joinWith);
  }

  /** @typedef {import('highlight.js').Mode} Mode */
  /** @typedef {import('highlight.js').ModeCallback} ModeCallback */

  // Common regexps
  const MATCH_NOTHING_RE = /\b\B/;
  const IDENT_RE = '[a-zA-Z]\\w*';
  const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  /**
  * @param { Partial<Mode> & {binary?: string | RegExp} } opts
  */
  const SHEBANG = (opts = {}) => {
    const beginShebang = /^#![ ]*\//;
    if (opts.binary) {
      opts.begin = concat(
        beginShebang,
        /.*\b/,
        opts.binary,
        /\b.*/);
    }
    return inherit$1({
      scope: 'meta',
      begin: beginShebang,
      end: /$/,
      relevance: 0,
      /** @type {ModeCallback} */
      "on:begin": (m, resp) => {
        if (m.index !== 0) resp.ignoreMatch();
      }
    }, opts);
  };

  // Common modes
  const BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  const APOS_STRING_MODE = {
    scope: 'string',
    begin: '\'',
    end: '\'',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING_MODE = {
    scope: 'string',
    begin: '"',
    end: '"',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  };
  /**
   * Creates a comment mode
   *
   * @param {string | RegExp} begin
   * @param {string | RegExp} end
   * @param {Mode | {}} [modeOptions]
   * @returns {Partial<Mode>}
   */
  const COMMENT = function(begin, end, modeOptions = {}) {
    const mode = inherit$1(
      {
        scope: 'comment',
        begin,
        end,
        contains: []
      },
      modeOptions
    );
    mode.contains.push({
      scope: 'doctag',
      // hack to avoid the space from being included. the space is necessary to
      // match here to prevent the plain text rule below from gobbling up doctags
      begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
      end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
      excludeBegin: true,
      relevance: 0
    });
    const ENGLISH_WORD = either(
      // list of common 1 and 2 letter words in English
      "I",
      "a",
      "is",
      "so",
      "us",
      "to",
      "at",
      "if",
      "in",
      "it",
      "on",
      // note: this is not an exhaustive list of contractions, just popular ones
      /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
      /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
      /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
    );
    // looking like plain text, more likely to be a comment
    mode.contains.push(
      {
        // TODO: how to include ", (, ) without breaking grammars that use these for
        // comment delimiters?
        // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
        // ---

        // this tries to find sequences of 3 english words in a row (without any
        // "programming" type syntax) this gives us a strong signal that we've
        // TRULY found a comment - vs perhaps scanning with the wrong language.
        // It's possible to find something that LOOKS like the start of the
        // comment - but then if there is no readable text - good chance it is a
        // false match and not a comment.
        //
        // for a visual example please see:
        // https://github.com/highlightjs/highlight.js/issues/2827

        begin: concat(
          /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
          '(',
          ENGLISH_WORD,
          /[.]?[:]?([.][ ]|[ ])/,
          '){3}') // look for 3 words in a row
      }
    );
    return mode;
  };
  const C_LINE_COMMENT_MODE = COMMENT('//', '$');
  const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
  const HASH_COMMENT_MODE = COMMENT('#', '$');
  const NUMBER_MODE = {
    scope: 'number',
    begin: NUMBER_RE,
    relevance: 0
  };
  const C_NUMBER_MODE = {
    scope: 'number',
    begin: C_NUMBER_RE,
    relevance: 0
  };
  const BINARY_NUMBER_MODE = {
    scope: 'number',
    begin: BINARY_NUMBER_RE,
    relevance: 0
  };
  const REGEXP_MODE = {
    scope: "regexp",
    begin: /\/(?=[^/\n]*\/)/,
    end: /\/[gimuy]*/,
    contains: [
      BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [BACKSLASH_ESCAPE]
      }
    ]
  };
  const TITLE_MODE = {
    scope: 'title',
    begin: IDENT_RE,
    relevance: 0
  };
  const UNDERSCORE_TITLE_MODE = {
    scope: 'title',
    begin: UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  const METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  /**
   * Adds end same as begin mechanics to a mode
   *
   * Your mode must include at least a single () match group as that first match
   * group is what is used for comparison
   * @param {Partial<Mode>} mode
   */
  const END_SAME_AS_BEGIN = function(mode) {
    return Object.assign(mode,
      {
        /** @type {ModeCallback} */
        'on:begin': (m, resp) => { resp.data._beginMatch = m[1]; },
        /** @type {ModeCallback} */
        'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); }
      });
  };

  var MODES = /*#__PURE__*/Object.freeze({
    __proto__: null,
    APOS_STRING_MODE: APOS_STRING_MODE,
    BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
    BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
    BINARY_NUMBER_RE: BINARY_NUMBER_RE,
    COMMENT: COMMENT,
    C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
    C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
    C_NUMBER_MODE: C_NUMBER_MODE,
    C_NUMBER_RE: C_NUMBER_RE,
    END_SAME_AS_BEGIN: END_SAME_AS_BEGIN,
    HASH_COMMENT_MODE: HASH_COMMENT_MODE,
    IDENT_RE: IDENT_RE,
    MATCH_NOTHING_RE: MATCH_NOTHING_RE,
    METHOD_GUARD: METHOD_GUARD,
    NUMBER_MODE: NUMBER_MODE,
    NUMBER_RE: NUMBER_RE,
    PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
    QUOTE_STRING_MODE: QUOTE_STRING_MODE,
    REGEXP_MODE: REGEXP_MODE,
    RE_STARTERS_RE: RE_STARTERS_RE,
    SHEBANG: SHEBANG,
    TITLE_MODE: TITLE_MODE,
    UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
    UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE
  });

  /**
  @typedef {import('highlight.js').CallbackResponse} CallbackResponse
  @typedef {import('highlight.js').CompilerExt} CompilerExt
  */

  // Grammar extensions / plugins
  // See: https://github.com/highlightjs/highlight.js/issues/2833

  // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
  // without requiring any underlying changes to the compiler internals.

  // `compileMatch` being the perfect small example of now allowing a grammar
  // author to write `match` when they desire to match a single expression rather
  // than being forced to use `begin`.  The extension then just moves `match` into
  // `begin` when it runs.  Ie, no features have been added, but we've just made
  // the experience of writing (and reading grammars) a little bit nicer.

  // ------

  // TODO: We need negative look-behind support to do this properly
  /**
   * Skip a match if it has a preceding dot
   *
   * This is used for `beginKeywords` to prevent matching expressions such as
   * `bob.keyword.do()`. The mode compiler automatically wires this up as a
   * special _internal_ 'on:begin' callback for modes with `beginKeywords`
   * @param {RegExpMatchArray} match
   * @param {CallbackResponse} response
   */
  function skipIfHasPrecedingDot(match, response) {
    const before = match.input[match.index - 1];
    if (before === ".") {
      response.ignoreMatch();
    }
  }

  /**
   *
   * @type {CompilerExt}
   */
  function scopeClassName(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.className !== undefined) {
      mode.scope = mode.className;
      delete mode.className;
    }
  }

  /**
   * `beginKeywords` syntactic sugar
   * @type {CompilerExt}
   */
  function beginKeywords(mode, parent) {
    if (!parent) return;
    if (!mode.beginKeywords) return;

    // for languages with keywords that include non-word characters checking for
    // a word boundary is not sufficient, so instead we check for a word boundary
    // or whitespace - this does no harm in any case since our keyword engine
    // doesn't allow spaces in keywords anyways and we still check for the boundary
    // first
    mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
    mode.__beforeBegin = skipIfHasPrecedingDot;
    mode.keywords = mode.keywords || mode.beginKeywords;
    delete mode.beginKeywords;

    // prevents double relevance, the keywords themselves provide
    // relevance, the mode doesn't need to double it
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 0;
  }

  /**
   * Allow `illegal` to contain an array of illegal values
   * @type {CompilerExt}
   */
  function compileIllegal(mode, _parent) {
    if (!Array.isArray(mode.illegal)) return;

    mode.illegal = either(...mode.illegal);
  }

  /**
   * `match` to match a single expression for readability
   * @type {CompilerExt}
   */
  function compileMatch(mode, _parent) {
    if (!mode.match) return;
    if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");

    mode.begin = mode.match;
    delete mode.match;
  }

  /**
   * provides the default 1 relevance to all modes
   * @type {CompilerExt}
   */
  function compileRelevance(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 1;
  }

  // allow beforeMatch to act as a "qualifier" for the match
  // the full match begin must be [beforeMatch][begin]
  const beforeMatchExt = (mode, parent) => {
    if (!mode.beforeMatch) return;
    // starts conflicts with endsParent which we need to make sure the child
    // rule is not matched multiple times
    if (mode.starts) throw new Error("beforeMatch cannot be used with starts");

    const originalMode = Object.assign({}, mode);
    Object.keys(mode).forEach((key) => { delete mode[key]; });

    mode.keywords = originalMode.keywords;
    mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
    mode.starts = {
      relevance: 0,
      contains: [
        Object.assign(originalMode, { endsParent: true })
      ]
    };
    mode.relevance = 0;

    delete originalMode.beforeMatch;
  };

  // keywords that should have no default relevance value
  const COMMON_KEYWORDS = [
    'of',
    'and',
    'for',
    'in',
    'not',
    'or',
    'if',
    'then',
    'parent', // common variable name
    'list', // common variable name
    'value' // common variable name
  ];

  const DEFAULT_KEYWORD_SCOPE = "keyword";

  /**
   * Given raw keywords from a language definition, compile them.
   *
   * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
   * @param {boolean} caseInsensitive
   */
  function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
    /** @type {import("highlight.js/private").KeywordDict} */
    const compiledKeywords = Object.create(null);

    // input can be a string of keywords, an array of keywords, or a object with
    // named keys representing scopeName (which can then point to a string or array)
    if (typeof rawKeywords === 'string') {
      compileList(scopeName, rawKeywords.split(" "));
    } else if (Array.isArray(rawKeywords)) {
      compileList(scopeName, rawKeywords);
    } else {
      Object.keys(rawKeywords).forEach(function(scopeName) {
        // collapse all our objects back into the parent object
        Object.assign(
          compiledKeywords,
          compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
        );
      });
    }
    return compiledKeywords;

    // ---

    /**
     * Compiles an individual list of keywords
     *
     * Ex: "for if when while|5"
     *
     * @param {string} scopeName
     * @param {Array<string>} keywordList
     */
    function compileList(scopeName, keywordList) {
      if (caseInsensitive) {
        keywordList = keywordList.map(x => x.toLowerCase());
      }
      keywordList.forEach(function(keyword) {
        const pair = keyword.split('|');
        compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
      });
    }
  }

  /**
   * Returns the proper score for a given keyword
   *
   * Also takes into account comment keywords, which will be scored 0 UNLESS
   * another score has been manually assigned.
   * @param {string} keyword
   * @param {string} [providedScore]
   */
  function scoreForKeyword(keyword, providedScore) {
    // manual scores always win over common keywords
    // so you can force a score of 1 if you really insist
    if (providedScore) {
      return Number(providedScore);
    }

    return commonKeyword(keyword) ? 0 : 1;
  }

  /**
   * Determines if a given keyword is common or not
   *
   * @param {string} keyword */
  function commonKeyword(keyword) {
    return COMMON_KEYWORDS.includes(keyword.toLowerCase());
  }

  /*

  For the reasoning behind this please see:
  https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419

  */

  /**
   * @type {Record<string, boolean>}
   */
  const seenDeprecations = {};

  /**
   * @param {string} message
   */
  const error = (message) => {
    console.error(message);
  };

  /**
   * @param {string} message
   * @param {any} args
   */
  const warn = (message, ...args) => {
    console.log(`WARN: ${message}`, ...args);
  };

  /**
   * @param {string} version
   * @param {string} message
   */
  const deprecated = (version, message) => {
    if (seenDeprecations[`${version}/${message}`]) return;

    console.log(`Deprecated as of ${version}. ${message}`);
    seenDeprecations[`${version}/${message}`] = true;
  };

  /* eslint-disable no-throw-literal */

  /**
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  */

  const MultiClassError = new Error();

  /**
   * Renumbers labeled scope names to account for additional inner match
   * groups that otherwise would break everything.
   *
   * Lets say we 3 match scopes:
   *
   *   { 1 => ..., 2 => ..., 3 => ... }
   *
   * So what we need is a clean match like this:
   *
   *   (a)(b)(c) => [ "a", "b", "c" ]
   *
   * But this falls apart with inner match groups:
   *
   * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
   *
   * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
   * What needs to happen is the numbers are remapped:
   *
   *   { 1 => ..., 2 => ..., 5 => ... }
   *
   * We also need to know that the ONLY groups that should be output
   * are 1, 2, and 5.  This function handles this behavior.
   *
   * @param {CompiledMode} mode
   * @param {Array<RegExp | string>} regexes
   * @param {{key: "beginScope"|"endScope"}} opts
   */
  function remapScopeNames(mode, regexes, { key }) {
    let offset = 0;
    const scopeNames = mode[key];
    /** @type Record<number,boolean> */
    const emit = {};
    /** @type Record<number,string> */
    const positions = {};

    for (let i = 1; i <= regexes.length; i++) {
      positions[i + offset] = scopeNames[i];
      emit[i + offset] = true;
      offset += countMatchGroups(regexes[i - 1]);
    }
    // we use _emit to keep track of which match groups are "top-level" to avoid double
    // output from inside match groups
    mode[key] = positions;
    mode[key]._emit = emit;
    mode[key]._multi = true;
  }

  /**
   * @param {CompiledMode} mode
   */
  function beginMultiClass(mode) {
    if (!Array.isArray(mode.begin)) return;

    if (mode.skip || mode.excludeBegin || mode.returnBegin) {
      error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
      error("beginScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.begin, { key: "beginScope" });
    mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
  }

  /**
   * @param {CompiledMode} mode
   */
  function endMultiClass(mode) {
    if (!Array.isArray(mode.end)) return;

    if (mode.skip || mode.excludeEnd || mode.returnEnd) {
      error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.endScope !== "object" || mode.endScope === null) {
      error("endScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.end, { key: "endScope" });
    mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
  }

  /**
   * this exists only to allow `scope: {}` to be used beside `match:`
   * Otherwise `beginScope` would necessary and that would look weird

    {
      match: [ /def/, /\w+/ ]
      scope: { 1: "keyword" , 2: "title" }
    }

   * @param {CompiledMode} mode
   */
  function scopeSugar(mode) {
    if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
      mode.beginScope = mode.scope;
      delete mode.scope;
    }
  }

  /**
   * @param {CompiledMode} mode
   */
  function MultiClass(mode) {
    scopeSugar(mode);

    if (typeof mode.beginScope === "string") {
      mode.beginScope = { _wrap: mode.beginScope };
    }
    if (typeof mode.endScope === "string") {
      mode.endScope = { _wrap: mode.endScope };
    }

    beginMultiClass(mode);
    endMultiClass(mode);
  }

  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').CompiledLanguage} CompiledLanguage
  */

  // compilation

  /**
   * Compiles a language definition result
   *
   * Given the raw result of a language definition (Language), compiles this so
   * that it is ready for highlighting code.
   * @param {Language} language
   * @returns {CompiledLanguage}
   */
  function compileLanguage(language) {
    /**
     * Builds a regex with the case sensitivity of the current language
     *
     * @param {RegExp | string} value
     * @param {boolean} [global]
     */
    function langRe(value, global) {
      return new RegExp(
        source(value),
        'm'
        + (language.case_insensitive ? 'i' : '')
        + (language.unicodeRegex ? 'u' : '')
        + (global ? 'g' : '')
      );
    }

    /**
      Stores multiple regular expressions and allows you to quickly search for
      them all in a string simultaneously - returning the first match.  It does
      this by creating a huge (a|b|c) regex - each individual item wrapped with ()
      and joined by `|` - using match groups to track position.  When a match is
      found checking which position in the array has content allows us to figure
      out which of the original regexes / match groups triggered the match.

      The match object itself (the result of `Regex.exec`) is returned but also
      enhanced by merging in any meta-data that was registered with the regex.
      This is how we keep track of which mode matched, and what type of rule
      (`illegal`, `begin`, end, etc).
    */
    class MultiRegex {
      constructor() {
        this.matchIndexes = {};
        // @ts-ignore
        this.regexes = [];
        this.matchAt = 1;
        this.position = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        opts.position = this.position++;
        // @ts-ignore
        this.matchIndexes[this.matchAt] = opts;
        this.regexes.push([opts, re]);
        this.matchAt += countMatchGroups(re) + 1;
      }

      compile() {
        if (this.regexes.length === 0) {
          // avoids the need to check length every time exec is called
          // @ts-ignore
          this.exec = () => null;
        }
        const terminators = this.regexes.map(el => el[1]);
        this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true);
        this.lastIndex = 0;
      }

      /** @param {string} s */
      exec(s) {
        this.matcherRe.lastIndex = this.lastIndex;
        const match = this.matcherRe.exec(s);
        if (!match) { return null; }

        // eslint-disable-next-line no-undefined
        const i = match.findIndex((el, i) => i > 0 && el !== undefined);
        // @ts-ignore
        const matchData = this.matchIndexes[i];
        // trim off any earlier non-relevant match groups (ie, the other regex
        // match groups that make up the multi-matcher)
        match.splice(0, i);

        return Object.assign(match, matchData);
      }
    }

    /*
      Created to solve the key deficiently with MultiRegex - there is no way to
      test for multiple matches at a single location.  Why would we need to do
      that?  In the future a more dynamic engine will allow certain matches to be
      ignored.  An example: if we matched say the 3rd regex in a large group but
      decided to ignore it - we'd need to started testing again at the 4th
      regex... but MultiRegex itself gives us no real way to do that.

      So what this class creates MultiRegexs on the fly for whatever search
      position they are needed.

      NOTE: These additional MultiRegex objects are created dynamically.  For most
      grammars most of the time we will never actually need anything more than the
      first MultiRegex - so this shouldn't have too much overhead.

      Say this is our search group, and we match regex3, but wish to ignore it.

        regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

      What we need is a new MultiRegex that only includes the remaining
      possibilities:

        regex4 | regex5                               ' ie, startAt = 3

      This class wraps all that complexity up in a simple API... `startAt` decides
      where in the array of expressions to start doing the matching. It
      auto-increments, so if a match is found at position 2, then startAt will be
      set to 3.  If the end is reached startAt will return to 0.

      MOST of the time the parser will be setting startAt manually to 0.
    */
    class ResumableMultiRegex {
      constructor() {
        // @ts-ignore
        this.rules = [];
        // @ts-ignore
        this.multiRegexes = [];
        this.count = 0;

        this.lastIndex = 0;
        this.regexIndex = 0;
      }

      // @ts-ignore
      getMatcher(index) {
        if (this.multiRegexes[index]) return this.multiRegexes[index];

        const matcher = new MultiRegex();
        this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
        matcher.compile();
        this.multiRegexes[index] = matcher;
        return matcher;
      }

      resumingScanAtSamePosition() {
        return this.regexIndex !== 0;
      }

      considerAll() {
        this.regexIndex = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        this.rules.push([re, opts]);
        if (opts.type === "begin") this.count++;
      }

      /** @param {string} s */
      exec(s) {
        const m = this.getMatcher(this.regexIndex);
        m.lastIndex = this.lastIndex;
        let result = m.exec(s);

        // The following is because we have no easy way to say "resume scanning at the
        // existing position but also skip the current rule ONLY". What happens is
        // all prior rules are also skipped which can result in matching the wrong
        // thing. Example of matching "booger":

        // our matcher is [string, "booger", number]
        //
        // ....booger....

        // if "booger" is ignored then we'd really need a regex to scan from the
        // SAME position for only: [string, number] but ignoring "booger" (if it
        // was the first match), a simple resume would scan ahead who knows how
        // far looking only for "number", ignoring potential string matches (or
        // future "booger" matches that might be valid.)

        // So what we do: We execute two matchers, one resuming at the same
        // position, but the second full matcher starting at the position after:

        //     /--- resume first regex match here (for [number])
        //     |/---- full match here for [string, "booger", number]
        //     vv
        // ....booger....

        // Which ever results in a match first is then used. So this 3-4 step
        // process essentially allows us to say "match at this position, excluding
        // a prior rule that was ignored".
        //
        // 1. Match "booger" first, ignore. Also proves that [string] does non match.
        // 2. Resume matching for [number]
        // 3. Match at index + 1 for [string, "booger", number]
        // 4. If #2 and #3 result in matches, which came first?
        if (this.resumingScanAtSamePosition()) {
          if (result && result.index === this.lastIndex) ; else { // use the second matcher result
            const m2 = this.getMatcher(0);
            m2.lastIndex = this.lastIndex + 1;
            result = m2.exec(s);
          }
        }

        if (result) {
          this.regexIndex += result.position + 1;
          if (this.regexIndex === this.count) {
            // wrap-around to considering all matches again
            this.considerAll();
          }
        }

        return result;
      }
    }

    /**
     * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
     * the content and find matches.
     *
     * @param {CompiledMode} mode
     * @returns {ResumableMultiRegex}
     */
    function buildModeRegex(mode) {
      const mm = new ResumableMultiRegex();

      mode.contains.forEach(term => mm.addRule(term.begin, { rule: term, type: "begin" }));

      if (mode.terminatorEnd) {
        mm.addRule(mode.terminatorEnd, { type: "end" });
      }
      if (mode.illegal) {
        mm.addRule(mode.illegal, { type: "illegal" });
      }

      return mm;
    }

    /** skip vs abort vs ignore
     *
     * @skip   - The mode is still entered and exited normally (and contains rules apply),
     *           but all content is held and added to the parent buffer rather than being
     *           output when the mode ends.  Mostly used with `sublanguage` to build up
     *           a single large buffer than can be parsed by sublanguage.
     *
     *             - The mode begin ands ends normally.
     *             - Content matched is added to the parent mode buffer.
     *             - The parser cursor is moved forward normally.
     *
     * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
     *           never matched) but DOES NOT continue to match subsequent `contains`
     *           modes.  Abort is bad/suboptimal because it can result in modes
     *           farther down not getting applied because an earlier rule eats the
     *           content but then aborts.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is added to the mode buffer.
     *             - The parser cursor is moved forward accordingly.
     *
     * @ignore - Ignores the mode (as if it never matched) and continues to match any
     *           subsequent `contains` modes.  Ignore isn't technically possible with
     *           the current parser implementation.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is ignored.
     *             - The parser cursor is not moved forward.
     */

    /**
     * Compiles an individual mode
     *
     * This can raise an error if the mode contains certain detectable known logic
     * issues.
     * @param {Mode} mode
     * @param {CompiledMode | null} [parent]
     * @returns {CompiledMode | never}
     */
    function compileMode(mode, parent) {
      const cmode = /** @type CompiledMode */ (mode);
      if (mode.isCompiled) return cmode;

      [
        scopeClassName,
        // do this early so compiler extensions generally don't have to worry about
        // the distinction between match/begin
        compileMatch,
        MultiClass,
        beforeMatchExt
      ].forEach(ext => ext(mode, parent));

      language.compilerExtensions.forEach(ext => ext(mode, parent));

      // __beforeBegin is considered private API, internal use only
      mode.__beforeBegin = null;

      [
        beginKeywords,
        // do this later so compiler extensions that come earlier have access to the
        // raw array if they wanted to perhaps manipulate it, etc.
        compileIllegal,
        // default to 1 relevance if not specified
        compileRelevance
      ].forEach(ext => ext(mode, parent));

      mode.isCompiled = true;

      let keywordPattern = null;
      if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
        // we need a copy because keywords might be compiled multiple times
        // so we can't go deleting $pattern from the original on the first
        // pass
        mode.keywords = Object.assign({}, mode.keywords);
        keywordPattern = mode.keywords.$pattern;
        delete mode.keywords.$pattern;
      }
      keywordPattern = keywordPattern || /\w+/;

      if (mode.keywords) {
        mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
      }

      cmode.keywordPatternRe = langRe(keywordPattern, true);

      if (parent) {
        if (!mode.begin) mode.begin = /\B|\b/;
        cmode.beginRe = langRe(cmode.begin);
        if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
        if (mode.end) cmode.endRe = langRe(cmode.end);
        cmode.terminatorEnd = source(cmode.end) || '';
        if (mode.endsWithParent && parent.terminatorEnd) {
          cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
        }
      }
      if (mode.illegal) cmode.illegalRe = langRe(/** @type {RegExp | string} */ (mode.illegal));
      if (!mode.contains) mode.contains = [];

      mode.contains = [].concat(...mode.contains.map(function(c) {
        return expandOrCloneMode(c === 'self' ? mode : c);
      }));
      mode.contains.forEach(function(c) { compileMode(/** @type Mode */ (c), cmode); });

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      cmode.matcher = buildModeRegex(cmode);
      return cmode;
    }

    if (!language.compilerExtensions) language.compilerExtensions = [];

    // self is not valid at the top-level
    if (language.contains && language.contains.includes('self')) {
      throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
    }

    // we need a null object, which inherit will guarantee
    language.classNameAliases = inherit$1(language.classNameAliases || {});

    return compileMode(/** @type Mode */ (language));
  }

  /**
   * Determines if a mode has a dependency on it's parent or not
   *
   * If a mode does have a parent dependency then often we need to clone it if
   * it's used in multiple places so that each copy points to the correct parent,
   * where-as modes without a parent can often safely be re-used at the bottom of
   * a mode chain.
   *
   * @param {Mode | null} mode
   * @returns {boolean} - is there a dependency on the parent?
   * */
  function dependencyOnParent(mode) {
    if (!mode) return false;

    return mode.endsWithParent || dependencyOnParent(mode.starts);
  }

  /**
   * Expands a mode or clones it if necessary
   *
   * This is necessary for modes with parental dependenceis (see notes on
   * `dependencyOnParent`) and for nodes that have `variants` - which must then be
   * exploded into their own individual modes at compile time.
   *
   * @param {Mode} mode
   * @returns {Mode | Mode[]}
   * */
  function expandOrCloneMode(mode) {
    if (mode.variants && !mode.cachedVariants) {
      mode.cachedVariants = mode.variants.map(function(variant) {
        return inherit$1(mode, { variants: null }, variant);
      });
    }

    // EXPAND
    // if we have variants then essentially "replace" the mode with the variants
    // this happens in compileMode, where this function is called from
    if (mode.cachedVariants) {
      return mode.cachedVariants;
    }

    // CLONE
    // if we have dependencies on parents then we need a unique
    // instance of ourselves, so we can be reused with many
    // different parents without issue
    if (dependencyOnParent(mode)) {
      return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
    }

    if (Object.isFrozen(mode)) {
      return inherit$1(mode);
    }

    // no special dependency issues, just return ourselves
    return mode;
  }

  var version = "11.9.0";

  class HTMLInjectionError extends Error {
    constructor(reason, html) {
      super(reason);
      this.name = "HTMLInjectionError";
      this.html = html;
    }
  }

  /*
  Syntax highlighting with language autodetection.
  https://highlightjs.org/
  */



  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').CompiledScope} CompiledScope
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSApi} HLJSApi
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').PluginEvent} PluginEvent
  @typedef {import('highlight.js').HLJSOptions} HLJSOptions
  @typedef {import('highlight.js').LanguageFn} LanguageFn
  @typedef {import('highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
  @typedef {import('highlight.js').BeforeHighlightContext} BeforeHighlightContext
  @typedef {import('highlight.js/private').MatchType} MatchType
  @typedef {import('highlight.js/private').KeywordData} KeywordData
  @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
  @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
  @typedef {import('highlight.js').AutoHighlightResult} AutoHighlightResult
  @typedef {import('highlight.js').HighlightOptions} HighlightOptions
  @typedef {import('highlight.js').HighlightResult} HighlightResult
  */


  const escape = escapeHTML;
  const inherit = inherit$1;
  const NO_MATCH = Symbol("nomatch");
  const MAX_KEYWORD_HITS = 7;

  /**
   * @param {any} hljs - object that is extended (legacy)
   * @returns {HLJSApi}
   */
  const HLJS = function(hljs) {
    // Global internal variables used within the highlight.js library.
    /** @type {Record<string, Language>} */
    const languages = Object.create(null);
    /** @type {Record<string, string>} */
    const aliases = Object.create(null);
    /** @type {HLJSPlugin[]} */
    const plugins = [];

    // safe/production mode - swallows more errors, tries to keep running
    // even if a single syntax or parse hits a fatal error
    let SAFE_MODE = true;
    const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
    /** @type {Language} */
    const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text', contains: [] };

    // Global options used when within external APIs. This is modified when
    // calling the `hljs.configure` function.
    /** @type HLJSOptions */
    let options = {
      ignoreUnescapedHTML: false,
      throwUnescapedHTML: false,
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: 'hljs-',
      cssSelector: 'pre code',
      languages: null,
      // beta configuration options, subject to change, welcome to discuss
      // https://github.com/highlightjs/highlight.js/issues/1086
      __emitter: TokenTreeEmitter
    };

    /* Utility functions */

    /**
     * Tests a language name to see if highlighting should be skipped
     * @param {string} languageName
     */
    function shouldNotHighlight(languageName) {
      return options.noHighlightRe.test(languageName);
    }

    /**
     * @param {HighlightedHTMLElement} block - the HTML element to determine language for
     */
    function blockLanguage(block) {
      let classes = block.className + ' ';

      classes += block.parentNode ? block.parentNode.className : '';

      // language-* takes precedence over non-prefixed class names.
      const match = options.languageDetectRe.exec(classes);
      if (match) {
        const language = getLanguage(match[1]);
        if (!language) {
          warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
          warn("Falling back to no-highlight mode for this block.", block);
        }
        return language ? match[1] : 'no-highlight';
      }

      return classes
        .split(/\s+/)
        .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
    }

    /**
     * Core highlighting function.
     *
     * OLD API
     * highlight(lang, code, ignoreIllegals, continuation)
     *
     * NEW API
     * highlight(code, {lang, ignoreIllegals})
     *
     * @param {string} codeOrLanguageName - the language to use for highlighting
     * @param {string | HighlightOptions} optionsOrCode - the code to highlight
     * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     *
     * @returns {HighlightResult} Result - an object that represents the result
     * @property {string} language - the language name
     * @property {number} relevance - the relevance score
     * @property {string} value - the highlighted HTML code
     * @property {string} code - the original raw code
     * @property {CompiledMode} top - top of the current mode stack
     * @property {boolean} illegal - indicates whether any illegal matches were found
    */
    function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
      let code = "";
      let languageName = "";
      if (typeof optionsOrCode === "object") {
        code = codeOrLanguageName;
        ignoreIllegals = optionsOrCode.ignoreIllegals;
        languageName = optionsOrCode.language;
      } else {
        // old API
        deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
        deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
        languageName = codeOrLanguageName;
        code = optionsOrCode;
      }

      // https://github.com/highlightjs/highlight.js/issues/3149
      // eslint-disable-next-line no-undefined
      if (ignoreIllegals === undefined) { ignoreIllegals = true; }

      /** @type {BeforeHighlightContext} */
      const context = {
        code,
        language: languageName
      };
      // the plugin can change the desired language or the code to be highlighted
      // just be changing the object it was passed
      fire("before:highlight", context);

      // a before plugin can usurp the result completely by providing it's own
      // in which case we don't even need to call highlight
      const result = context.result
        ? context.result
        : _highlight(context.language, context.code, ignoreIllegals);

      result.code = context.code;
      // the plugin can change anything in result to suite it
      fire("after:highlight", result);

      return result;
    }

    /**
     * private highlight that's used internally and does not fire callbacks
     *
     * @param {string} languageName - the language to use for highlighting
     * @param {string} codeToHighlight - the code to highlight
     * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     * @param {CompiledMode?} [continuation] - current continuation mode, if any
     * @returns {HighlightResult} - result of the highlight operation
    */
    function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
      const keywordHits = Object.create(null);

      /**
       * Return keyword data if a match is a keyword
       * @param {CompiledMode} mode - current mode
       * @param {string} matchText - the textual match
       * @returns {KeywordData | false}
       */
      function keywordData(mode, matchText) {
        return mode.keywords[matchText];
      }

      function processKeywords() {
        if (!top.keywords) {
          emitter.addText(modeBuffer);
          return;
        }

        let lastIndex = 0;
        top.keywordPatternRe.lastIndex = 0;
        let match = top.keywordPatternRe.exec(modeBuffer);
        let buf = "";

        while (match) {
          buf += modeBuffer.substring(lastIndex, match.index);
          const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
          const data = keywordData(top, word);
          if (data) {
            const [kind, keywordRelevance] = data;
            emitter.addText(buf);
            buf = "";

            keywordHits[word] = (keywordHits[word] || 0) + 1;
            if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
            if (kind.startsWith("_")) {
              // _ implied for relevance only, do not highlight
              // by applying a class name
              buf += match[0];
            } else {
              const cssClass = language.classNameAliases[kind] || kind;
              emitKeyword(match[0], cssClass);
            }
          } else {
            buf += match[0];
          }
          lastIndex = top.keywordPatternRe.lastIndex;
          match = top.keywordPatternRe.exec(modeBuffer);
        }
        buf += modeBuffer.substring(lastIndex);
        emitter.addText(buf);
      }

      function processSubLanguage() {
        if (modeBuffer === "") return;
        /** @type HighlightResult */
        let result = null;

        if (typeof top.subLanguage === 'string') {
          if (!languages[top.subLanguage]) {
            emitter.addText(modeBuffer);
            return;
          }
          result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
          continuations[top.subLanguage] = /** @type {CompiledMode} */ (result._top);
        } else {
          result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
        }

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Use case in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
          relevance += result.relevance;
        }
        emitter.__addSublanguage(result._emitter, result.language);
      }

      function processBuffer() {
        if (top.subLanguage != null) {
          processSubLanguage();
        } else {
          processKeywords();
        }
        modeBuffer = '';
      }

      /**
       * @param {string} text
       * @param {string} scope
       */
      function emitKeyword(keyword, scope) {
        if (keyword === "") return;

        emitter.startScope(scope);
        emitter.addText(keyword);
        emitter.endScope();
      }

      /**
       * @param {CompiledScope} scope
       * @param {RegExpMatchArray} match
       */
      function emitMultiClass(scope, match) {
        let i = 1;
        const max = match.length - 1;
        while (i <= max) {
          if (!scope._emit[i]) { i++; continue; }
          const klass = language.classNameAliases[scope[i]] || scope[i];
          const text = match[i];
          if (klass) {
            emitKeyword(text, klass);
          } else {
            modeBuffer = text;
            processKeywords();
            modeBuffer = "";
          }
          i++;
        }
      }

      /**
       * @param {CompiledMode} mode - new mode to start
       * @param {RegExpMatchArray} match
       */
      function startNewMode(mode, match) {
        if (mode.scope && typeof mode.scope === "string") {
          emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
        }
        if (mode.beginScope) {
          // beginScope just wraps the begin match itself in a scope
          if (mode.beginScope._wrap) {
            emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
            modeBuffer = "";
          } else if (mode.beginScope._multi) {
            // at this point modeBuffer should just be the match
            emitMultiClass(mode.beginScope, match);
            modeBuffer = "";
          }
        }

        top = Object.create(mode, { parent: { value: top } });
        return top;
      }

      /**
       * @param {CompiledMode } mode - the mode to potentially end
       * @param {RegExpMatchArray} match - the latest match
       * @param {string} matchPlusRemainder - match plus remainder of content
       * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
       */
      function endOfMode(mode, match, matchPlusRemainder) {
        let matched = startsWith(mode.endRe, matchPlusRemainder);

        if (matched) {
          if (mode["on:end"]) {
            const resp = new Response(mode);
            mode["on:end"](match, resp);
            if (resp.isMatchIgnored) matched = false;
          }

          if (matched) {
            while (mode.endsParent && mode.parent) {
              mode = mode.parent;
            }
            return mode;
          }
        }
        // even if on:end fires an `ignore` it's still possible
        // that we might trigger the end node because of a parent mode
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, match, matchPlusRemainder);
        }
      }

      /**
       * Handle matching but then ignoring a sequence of text
       *
       * @param {string} lexeme - string containing full match text
       */
      function doIgnore(lexeme) {
        if (top.matcher.regexIndex === 0) {
          // no more regexes to potentially match here, so we move the cursor forward one
          // space
          modeBuffer += lexeme[0];
          return 1;
        } else {
          // no need to move the cursor, we still have additional regexes to try and
          // match at this very spot
          resumeScanAtSamePosition = true;
          return 0;
        }
      }

      /**
       * Handle the start of a new potential mode match
       *
       * @param {EnhancedMatch} match - the current match
       * @returns {number} how far to advance the parse cursor
       */
      function doBeginMatch(match) {
        const lexeme = match[0];
        const newMode = match.rule;

        const resp = new Response(newMode);
        // first internal before callbacks, then the public ones
        const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
        for (const cb of beforeCallbacks) {
          if (!cb) continue;
          cb(match, resp);
          if (resp.isMatchIgnored) return doIgnore(lexeme);
        }

        if (newMode.skip) {
          modeBuffer += lexeme;
        } else {
          if (newMode.excludeBegin) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (!newMode.returnBegin && !newMode.excludeBegin) {
            modeBuffer = lexeme;
          }
        }
        startNewMode(newMode, match);
        return newMode.returnBegin ? 0 : lexeme.length;
      }

      /**
       * Handle the potential end of mode
       *
       * @param {RegExpMatchArray} match - the current match
       */
      function doEndMatch(match) {
        const lexeme = match[0];
        const matchPlusRemainder = codeToHighlight.substring(match.index);

        const endMode = endOfMode(top, match, matchPlusRemainder);
        if (!endMode) { return NO_MATCH; }

        const origin = top;
        if (top.endScope && top.endScope._wrap) {
          processBuffer();
          emitKeyword(lexeme, top.endScope._wrap);
        } else if (top.endScope && top.endScope._multi) {
          processBuffer();
          emitMultiClass(top.endScope, match);
        } else if (origin.skip) {
          modeBuffer += lexeme;
        } else {
          if (!(origin.returnEnd || origin.excludeEnd)) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (origin.excludeEnd) {
            modeBuffer = lexeme;
          }
        }
        do {
          if (top.scope) {
            emitter.closeNode();
          }
          if (!top.skip && !top.subLanguage) {
            relevance += top.relevance;
          }
          top = top.parent;
        } while (top !== endMode.parent);
        if (endMode.starts) {
          startNewMode(endMode.starts, match);
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }

      function processContinuations() {
        const list = [];
        for (let current = top; current !== language; current = current.parent) {
          if (current.scope) {
            list.unshift(current.scope);
          }
        }
        list.forEach(item => emitter.openNode(item));
      }

      /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
      let lastMatch = {};

      /**
       *  Process an individual match
       *
       * @param {string} textBeforeMatch - text preceding the match (since the last match)
       * @param {EnhancedMatch} [match] - the match itself
       */
      function processLexeme(textBeforeMatch, match) {
        const lexeme = match && match[0];

        // add non-matched text to the current mode buffer
        modeBuffer += textBeforeMatch;

        if (lexeme == null) {
          processBuffer();
          return 0;
        }

        // we've found a 0 width match and we're stuck, so we need to advance
        // this happens when we have badly behaved rules that have optional matchers to the degree that
        // sometimes they can end up matching nothing at all
        // Ref: https://github.com/highlightjs/highlight.js/issues/2140
        if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
          // spit the "skipped" character that our regex choked on back into the output sequence
          modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
          if (!SAFE_MODE) {
            /** @type {AnnotatedError} */
            const err = new Error(`0 width match regex (${languageName})`);
            err.languageName = languageName;
            err.badRule = lastMatch.rule;
            throw err;
          }
          return 1;
        }
        lastMatch = match;

        if (match.type === "begin") {
          return doBeginMatch(match);
        } else if (match.type === "illegal" && !ignoreIllegals) {
          // illegal match, we do not continue processing
          /** @type {AnnotatedError} */
          const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
          err.mode = top;
          throw err;
        } else if (match.type === "end") {
          const processed = doEndMatch(match);
          if (processed !== NO_MATCH) {
            return processed;
          }
        }

        // edge case for when illegal matches $ (end of line) which is technically
        // a 0 width match but not a begin/end match so it's not caught by the
        // first handler (when ignoreIllegals is true)
        if (match.type === "illegal" && lexeme === "") {
          // advance so we aren't stuck in an infinite loop
          return 1;
        }

        // infinite loops are BAD, this is a last ditch catch all. if we have a
        // decent number of iterations yet our index (cursor position in our
        // parsing) still 3x behind our index then something is very wrong
        // so we bail
        if (iterations > 100000 && iterations > match.index * 3) {
          const err = new Error('potential infinite loop, way more iterations than matches');
          throw err;
        }

        /*
        Why might be find ourselves here?  An potential end match that was
        triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
        (this could be because a callback requests the match be ignored, etc)

        This causes no real harm other than stopping a few times too many.
        */

        modeBuffer += lexeme;
        return lexeme.length;
      }

      const language = getLanguage(languageName);
      if (!language) {
        error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
        throw new Error('Unknown language: "' + languageName + '"');
      }

      const md = compileLanguage(language);
      let result = '';
      /** @type {CompiledMode} */
      let top = continuation || md;
      /** @type Record<string,CompiledMode> */
      const continuations = {}; // keep continuations for sub-languages
      const emitter = new options.__emitter(options);
      processContinuations();
      let modeBuffer = '';
      let relevance = 0;
      let index = 0;
      let iterations = 0;
      let resumeScanAtSamePosition = false;

      try {
        if (!language.__emitTokens) {
          top.matcher.considerAll();

          for (;;) {
            iterations++;
            if (resumeScanAtSamePosition) {
              // only regexes not matched previously will now be
              // considered for a potential match
              resumeScanAtSamePosition = false;
            } else {
              top.matcher.considerAll();
            }
            top.matcher.lastIndex = index;

            const match = top.matcher.exec(codeToHighlight);
            // console.log("match", match[0], match.rule && match.rule.begin)

            if (!match) break;

            const beforeMatch = codeToHighlight.substring(index, match.index);
            const processedCount = processLexeme(beforeMatch, match);
            index = match.index + processedCount;
          }
          processLexeme(codeToHighlight.substring(index));
        } else {
          language.__emitTokens(codeToHighlight, emitter);
        }

        emitter.finalize();
        result = emitter.toHTML();

        return {
          language: languageName,
          value: result,
          relevance,
          illegal: false,
          _emitter: emitter,
          _top: top
        };
      } catch (err) {
        if (err.message && err.message.includes('Illegal')) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: true,
            relevance: 0,
            _illegalBy: {
              message: err.message,
              index,
              context: codeToHighlight.slice(index - 100, index + 100),
              mode: err.mode,
              resultSoFar: result
            },
            _emitter: emitter
          };
        } else if (SAFE_MODE) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: false,
            relevance: 0,
            errorRaised: err,
            _emitter: emitter,
            _top: top
          };
        } else {
          throw err;
        }
      }
    }

    /**
     * returns a valid highlight result, without actually doing any actual work,
     * auto highlight starts with this and it's possible for small snippets that
     * auto-detection may not find a better match
     * @param {string} code
     * @returns {HighlightResult}
     */
    function justTextHighlightResult(code) {
      const result = {
        value: escape(code),
        illegal: false,
        relevance: 0,
        _top: PLAINTEXT_LANGUAGE,
        _emitter: new options.__emitter(options)
      };
      result._emitter.addText(code);
      return result;
    }

    /**
    Highlighting with language detection. Accepts a string with the code to
    highlight. Returns an object with the following properties:

    - language (detected language)
    - relevance (int)
    - value (an HTML string with highlighting markup)
    - secondBest (object with the same structure for second-best heuristically
      detected language, may be absent)

      @param {string} code
      @param {Array<string>} [languageSubset]
      @returns {AutoHighlightResult}
    */
    function highlightAuto(code, languageSubset) {
      languageSubset = languageSubset || options.languages || Object.keys(languages);
      const plaintext = justTextHighlightResult(code);

      const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name =>
        _highlight(name, code, false)
      );
      results.unshift(plaintext); // plaintext is always an option

      const sorted = results.sort((a, b) => {
        // sort base on relevance
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;

        // always award the tie to the base language
        // ie if C++ and Arduino are tied, it's more likely to be C++
        if (a.language && b.language) {
          if (getLanguage(a.language).supersetOf === b.language) {
            return 1;
          } else if (getLanguage(b.language).supersetOf === a.language) {
            return -1;
          }
        }

        // otherwise say they are equal, which has the effect of sorting on
        // relevance while preserving the original ordering - which is how ties
        // have historically been settled, ie the language that comes first always
        // wins in the case of a tie
        return 0;
      });

      const [best, secondBest] = sorted;

      /** @type {AutoHighlightResult} */
      const result = best;
      result.secondBest = secondBest;

      return result;
    }

    /**
     * Builds new class name for block given the language name
     *
     * @param {HTMLElement} element
     * @param {string} [currentLang]
     * @param {string} [resultLang]
     */
    function updateClassName(element, currentLang, resultLang) {
      const language = (currentLang && aliases[currentLang]) || resultLang;

      element.classList.add("hljs");
      element.classList.add(`language-${language}`);
    }

    /**
     * Applies highlighting to a DOM node containing code.
     *
     * @param {HighlightedHTMLElement} element - the HTML element to highlight
    */
    function highlightElement(element) {
      /** @type HTMLElement */
      let node = null;
      const language = blockLanguage(element);

      if (shouldNotHighlight(language)) return;

      fire("before:highlightElement",
        { el: element, language });

      if (element.dataset.highlighted) {
        console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
        return;
      }

      // we should be all text, no child nodes (unescaped HTML) - this is possibly
      // an HTML injection attack - it's likely too late if this is already in
      // production (the code has likely already done its damage by the time
      // we're seeing it)... but we yell loudly about this so that hopefully it's
      // more likely to be caught in development before making it to production
      if (element.children.length > 0) {
        if (!options.ignoreUnescapedHTML) {
          console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
          console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
          console.warn("The element with unescaped HTML:");
          console.warn(element);
        }
        if (options.throwUnescapedHTML) {
          const err = new HTMLInjectionError(
            "One of your code blocks includes unescaped HTML.",
            element.innerHTML
          );
          throw err;
        }
      }

      node = element;
      const text = node.textContent;
      const result = language ? highlight(text, { language, ignoreIllegals: true }) : highlightAuto(text);

      element.innerHTML = result.value;
      element.dataset.highlighted = "yes";
      updateClassName(element, language, result.language);
      element.result = {
        language: result.language,
        // TODO: remove with version 11.0
        re: result.relevance,
        relevance: result.relevance
      };
      if (result.secondBest) {
        element.secondBest = {
          language: result.secondBest.language,
          relevance: result.secondBest.relevance
        };
      }

      fire("after:highlightElement", { el: element, result, text });
    }

    /**
     * Updates highlight.js global options with the passed options
     *
     * @param {Partial<HLJSOptions>} userOptions
     */
    function configure(userOptions) {
      options = inherit(options, userOptions);
    }

    // TODO: remove v12, deprecated
    const initHighlighting = () => {
      highlightAll();
      deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
    };

    // TODO: remove v12, deprecated
    function initHighlightingOnLoad() {
      highlightAll();
      deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
    }

    let wantsHighlight = false;

    /**
     * auto-highlights all pre>code elements on the page
     */
    function highlightAll() {
      // if we are called too early in the loading process
      if (document.readyState === "loading") {
        wantsHighlight = true;
        return;
      }

      const blocks = document.querySelectorAll(options.cssSelector);
      blocks.forEach(highlightElement);
    }

    function boot() {
      // if a highlight was requested before DOM was loaded, do now
      if (wantsHighlight) highlightAll();
    }

    // make sure we are in the browser environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('DOMContentLoaded', boot, false);
    }

    /**
     * Register a language grammar module
     *
     * @param {string} languageName
     * @param {LanguageFn} languageDefinition
     */
    function registerLanguage(languageName, languageDefinition) {
      let lang = null;
      try {
        lang = languageDefinition(hljs);
      } catch (error$1) {
        error("Language definition for '{}' could not be registered.".replace("{}", languageName));
        // hard or soft error
        if (!SAFE_MODE) { throw error$1; } else { error(error$1); }
        // languages that have serious errors are replaced with essentially a
        // "plaintext" stand-in so that the code blocks will still get normal
        // css classes applied to them - and one bad language won't break the
        // entire highlighter
        lang = PLAINTEXT_LANGUAGE;
      }
      // give it a temporary name if it doesn't have one in the meta-data
      if (!lang.name) lang.name = languageName;
      languages[languageName] = lang;
      lang.rawDefinition = languageDefinition.bind(null, hljs);

      if (lang.aliases) {
        registerAliases(lang.aliases, { languageName });
      }
    }

    /**
     * Remove a language grammar module
     *
     * @param {string} languageName
     */
    function unregisterLanguage(languageName) {
      delete languages[languageName];
      for (const alias of Object.keys(aliases)) {
        if (aliases[alias] === languageName) {
          delete aliases[alias];
        }
      }
    }

    /**
     * @returns {string[]} List of language internal names
     */
    function listLanguages() {
      return Object.keys(languages);
    }

    /**
     * @param {string} name - name of the language to retrieve
     * @returns {Language | undefined}
     */
    function getLanguage(name) {
      name = (name || '').toLowerCase();
      return languages[name] || languages[aliases[name]];
    }

    /**
     *
     * @param {string|string[]} aliasList - single alias or list of aliases
     * @param {{languageName: string}} opts
     */
    function registerAliases(aliasList, { languageName }) {
      if (typeof aliasList === 'string') {
        aliasList = [aliasList];
      }
      aliasList.forEach(alias => { aliases[alias.toLowerCase()] = languageName; });
    }

    /**
     * Determines if a given language has auto-detection enabled
     * @param {string} name - name of the language
     */
    function autoDetection(name) {
      const lang = getLanguage(name);
      return lang && !lang.disableAutodetect;
    }

    /**
     * Upgrades the old highlightBlock plugins to the new
     * highlightElement API
     * @param {HLJSPlugin} plugin
     */
    function upgradePluginAPI(plugin) {
      // TODO: remove with v12
      if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
        plugin["before:highlightElement"] = (data) => {
          plugin["before:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
      if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
        plugin["after:highlightElement"] = (data) => {
          plugin["after:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function addPlugin(plugin) {
      upgradePluginAPI(plugin);
      plugins.push(plugin);
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function removePlugin(plugin) {
      const index = plugins.indexOf(plugin);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
    }

    /**
     *
     * @param {PluginEvent} event
     * @param {any} args
     */
    function fire(event, args) {
      const cb = event;
      plugins.forEach(function(plugin) {
        if (plugin[cb]) {
          plugin[cb](args);
        }
      });
    }

    /**
     * DEPRECATED
     * @param {HighlightedHTMLElement} el
     */
    function deprecateHighlightBlock(el) {
      deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
      deprecated("10.7.0", "Please use highlightElement now.");

      return highlightElement(el);
    }

    /* Interface definition */
    Object.assign(hljs, {
      highlight,
      highlightAuto,
      highlightAll,
      highlightElement,
      // TODO: Remove with v12 API
      highlightBlock: deprecateHighlightBlock,
      configure,
      initHighlighting,
      initHighlightingOnLoad,
      registerLanguage,
      unregisterLanguage,
      listLanguages,
      getLanguage,
      registerAliases,
      autoDetection,
      inherit,
      addPlugin,
      removePlugin
    });

    hljs.debugMode = function() { SAFE_MODE = false; };
    hljs.safeMode = function() { SAFE_MODE = true; };
    hljs.versionString = version;

    hljs.regex = {
      concat: concat,
      lookahead: lookahead,
      either: either,
      optional: optional,
      anyNumberOfTimes: anyNumberOfTimes
    };

    for (const key in MODES) {
      // @ts-ignore
      if (typeof MODES[key] === "object") {
        // @ts-ignore
        deepFreeze(MODES[key]);
      }
    }

    // merge all the modes/regexes into our main object
    Object.assign(hljs, MODES);

    return hljs;
  };

  // Other names for the variable may break build script
  const highlight = HLJS({});

  // returns a new instance of the highlighter to be used for extensions
  // check https://github.com/wooorm/lowlight/issues/47
  highlight.newInstance = () => HLJS({});

  return highlight;

})();
if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = hljs; }
/*! `mathematica` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const SYSTEM_SYMBOLS = [
    "AASTriangle",
    "AbelianGroup",
    "Abort",
    "AbortKernels",
    "AbortProtect",
    "AbortScheduledTask",
    "Above",
    "Abs",
    "AbsArg",
    "AbsArgPlot",
    "Absolute",
    "AbsoluteCorrelation",
    "AbsoluteCorrelationFunction",
    "AbsoluteCurrentValue",
    "AbsoluteDashing",
    "AbsoluteFileName",
    "AbsoluteOptions",
    "AbsolutePointSize",
    "AbsoluteThickness",
    "AbsoluteTime",
    "AbsoluteTiming",
    "AcceptanceThreshold",
    "AccountingForm",
    "Accumulate",
    "Accuracy",
    "AccuracyGoal",
    "AcousticAbsorbingValue",
    "AcousticImpedanceValue",
    "AcousticNormalVelocityValue",
    "AcousticPDEComponent",
    "AcousticPressureCondition",
    "AcousticRadiationValue",
    "AcousticSoundHardValue",
    "AcousticSoundSoftCondition",
    "ActionDelay",
    "ActionMenu",
    "ActionMenuBox",
    "ActionMenuBoxOptions",
    "Activate",
    "Active",
    "ActiveClassification",
    "ActiveClassificationObject",
    "ActiveItem",
    "ActivePrediction",
    "ActivePredictionObject",
    "ActiveStyle",
    "AcyclicGraphQ",
    "AddOnHelpPath",
    "AddSides",
    "AddTo",
    "AddToSearchIndex",
    "AddUsers",
    "AdjacencyGraph",
    "AdjacencyList",
    "AdjacencyMatrix",
    "AdjacentMeshCells",
    "Adjugate",
    "AdjustmentBox",
    "AdjustmentBoxOptions",
    "AdjustTimeSeriesForecast",
    "AdministrativeDivisionData",
    "AffineHalfSpace",
    "AffineSpace",
    "AffineStateSpaceModel",
    "AffineTransform",
    "After",
    "AggregatedEntityClass",
    "AggregationLayer",
    "AircraftData",
    "AirportData",
    "AirPressureData",
    "AirSoundAttenuation",
    "AirTemperatureData",
    "AiryAi",
    "AiryAiPrime",
    "AiryAiZero",
    "AiryBi",
    "AiryBiPrime",
    "AiryBiZero",
    "AlgebraicIntegerQ",
    "AlgebraicNumber",
    "AlgebraicNumberDenominator",
    "AlgebraicNumberNorm",
    "AlgebraicNumberPolynomial",
    "AlgebraicNumberTrace",
    "AlgebraicRules",
    "AlgebraicRulesData",
    "Algebraics",
    "AlgebraicUnitQ",
    "Alignment",
    "AlignmentMarker",
    "AlignmentPoint",
    "All",
    "AllowAdultContent",
    "AllowChatServices",
    "AllowedCloudExtraParameters",
    "AllowedCloudParameterExtensions",
    "AllowedDimensions",
    "AllowedFrequencyRange",
    "AllowedHeads",
    "AllowGroupClose",
    "AllowIncomplete",
    "AllowInlineCells",
    "AllowKernelInitialization",
    "AllowLooseGrammar",
    "AllowReverseGroupClose",
    "AllowScriptLevelChange",
    "AllowVersionUpdate",
    "AllTrue",
    "Alphabet",
    "AlphabeticOrder",
    "AlphabeticSort",
    "AlphaChannel",
    "AlternateImage",
    "AlternatingFactorial",
    "AlternatingGroup",
    "AlternativeHypothesis",
    "Alternatives",
    "AltitudeMethod",
    "AmbientLight",
    "AmbiguityFunction",
    "AmbiguityList",
    "Analytic",
    "AnatomyData",
    "AnatomyForm",
    "AnatomyPlot3D",
    "AnatomySkinStyle",
    "AnatomyStyling",
    "AnchoredSearch",
    "And",
    "AndersonDarlingTest",
    "AngerJ",
    "AngleBisector",
    "AngleBracket",
    "AnglePath",
    "AnglePath3D",
    "AngleVector",
    "AngularGauge",
    "Animate",
    "AnimatedImage",
    "AnimationCycleOffset",
    "AnimationCycleRepetitions",
    "AnimationDirection",
    "AnimationDisplayTime",
    "AnimationRate",
    "AnimationRepetitions",
    "AnimationRunning",
    "AnimationRunTime",
    "AnimationTimeIndex",
    "AnimationVideo",
    "Animator",
    "AnimatorBox",
    "AnimatorBoxOptions",
    "AnimatorElements",
    "Annotate",
    "Annotation",
    "AnnotationDelete",
    "AnnotationKeys",
    "AnnotationRules",
    "AnnotationValue",
    "Annuity",
    "AnnuityDue",
    "Annulus",
    "AnomalyDetection",
    "AnomalyDetector",
    "AnomalyDetectorFunction",
    "Anonymous",
    "Antialiasing",
    "Antihermitian",
    "AntihermitianMatrixQ",
    "Antisymmetric",
    "AntisymmetricMatrixQ",
    "Antonyms",
    "AnyOrder",
    "AnySubset",
    "AnyTrue",
    "Apart",
    "ApartSquareFree",
    "APIFunction",
    "Appearance",
    "AppearanceElements",
    "AppearanceRules",
    "AppellF1",
    "Append",
    "AppendCheck",
    "AppendLayer",
    "AppendTo",
    "Application",
    "Apply",
    "ApplyReaction",
    "ApplySides",
    "ApplyTo",
    "ArcCos",
    "ArcCosh",
    "ArcCot",
    "ArcCoth",
    "ArcCsc",
    "ArcCsch",
    "ArcCurvature",
    "ARCHProcess",
    "ArcLength",
    "ArcSec",
    "ArcSech",
    "ArcSin",
    "ArcSinDistribution",
    "ArcSinh",
    "ArcTan",
    "ArcTanh",
    "Area",
    "Arg",
    "ArgMax",
    "ArgMin",
    "ArgumentCountQ",
    "ArgumentsOptions",
    "ARIMAProcess",
    "ArithmeticGeometricMean",
    "ARMAProcess",
    "Around",
    "AroundReplace",
    "ARProcess",
    "Array",
    "ArrayComponents",
    "ArrayDepth",
    "ArrayFilter",
    "ArrayFlatten",
    "ArrayMesh",
    "ArrayPad",
    "ArrayPlot",
    "ArrayPlot3D",
    "ArrayQ",
    "ArrayReduce",
    "ArrayResample",
    "ArrayReshape",
    "ArrayRules",
    "Arrays",
    "Arrow",
    "Arrow3DBox",
    "ArrowBox",
    "Arrowheads",
    "ASATriangle",
    "Ask",
    "AskAppend",
    "AskConfirm",
    "AskDisplay",
    "AskedQ",
    "AskedValue",
    "AskFunction",
    "AskState",
    "AskTemplateDisplay",
    "AspectRatio",
    "AspectRatioFixed",
    "Assert",
    "AssessmentFunction",
    "AssessmentResultObject",
    "AssociateTo",
    "Association",
    "AssociationFormat",
    "AssociationMap",
    "AssociationQ",
    "AssociationThread",
    "AssumeDeterministic",
    "Assuming",
    "Assumptions",
    "AstroAngularSeparation",
    "AstroBackground",
    "AstroCenter",
    "AstroDistance",
    "AstroGraphics",
    "AstroGridLines",
    "AstroGridLinesStyle",
    "AstronomicalData",
    "AstroPosition",
    "AstroProjection",
    "AstroRange",
    "AstroRangePadding",
    "AstroReferenceFrame",
    "AstroStyling",
    "AstroZoomLevel",
    "Asymptotic",
    "AsymptoticDSolveValue",
    "AsymptoticEqual",
    "AsymptoticEquivalent",
    "AsymptoticExpectation",
    "AsymptoticGreater",
    "AsymptoticGreaterEqual",
    "AsymptoticIntegrate",
    "AsymptoticLess",
    "AsymptoticLessEqual",
    "AsymptoticOutputTracker",
    "AsymptoticProbability",
    "AsymptoticProduct",
    "AsymptoticRSolveValue",
    "AsymptoticSolve",
    "AsymptoticSum",
    "Asynchronous",
    "AsynchronousTaskObject",
    "AsynchronousTasks",
    "Atom",
    "AtomCoordinates",
    "AtomCount",
    "AtomDiagramCoordinates",
    "AtomLabels",
    "AtomLabelStyle",
    "AtomList",
    "AtomQ",
    "AttachCell",
    "AttachedCell",
    "AttentionLayer",
    "Attributes",
    "Audio",
    "AudioAmplify",
    "AudioAnnotate",
    "AudioAnnotationLookup",
    "AudioBlockMap",
    "AudioCapture",
    "AudioChannelAssignment",
    "AudioChannelCombine",
    "AudioChannelMix",
    "AudioChannels",
    "AudioChannelSeparate",
    "AudioData",
    "AudioDelay",
    "AudioDelete",
    "AudioDevice",
    "AudioDistance",
    "AudioEncoding",
    "AudioFade",
    "AudioFrequencyShift",
    "AudioGenerator",
    "AudioIdentify",
    "AudioInputDevice",
    "AudioInsert",
    "AudioInstanceQ",
    "AudioIntervals",
    "AudioJoin",
    "AudioLabel",
    "AudioLength",
    "AudioLocalMeasurements",
    "AudioLooping",
    "AudioLoudness",
    "AudioMeasurements",
    "AudioNormalize",
    "AudioOutputDevice",
    "AudioOverlay",
    "AudioPad",
    "AudioPan",
    "AudioPartition",
    "AudioPause",
    "AudioPitchShift",
    "AudioPlay",
    "AudioPlot",
    "AudioQ",
    "AudioRecord",
    "AudioReplace",
    "AudioResample",
    "AudioReverb",
    "AudioReverse",
    "AudioSampleRate",
    "AudioSpectralMap",
    "AudioSpectralTransformation",
    "AudioSplit",
    "AudioStop",
    "AudioStream",
    "AudioStreams",
    "AudioTimeStretch",
    "AudioTrackApply",
    "AudioTrackSelection",
    "AudioTrim",
    "AudioType",
    "AugmentedPolyhedron",
    "AugmentedSymmetricPolynomial",
    "Authenticate",
    "Authentication",
    "AuthenticationDialog",
    "AutoAction",
    "Autocomplete",
    "AutocompletionFunction",
    "AutoCopy",
    "AutocorrelationTest",
    "AutoDelete",
    "AutoEvaluateEvents",
    "AutoGeneratedPackage",
    "AutoIndent",
    "AutoIndentSpacings",
    "AutoItalicWords",
    "AutoloadPath",
    "AutoMatch",
    "Automatic",
    "AutomaticImageSize",
    "AutoMultiplicationSymbol",
    "AutoNumberFormatting",
    "AutoOpenNotebooks",
    "AutoOpenPalettes",
    "AutoOperatorRenderings",
    "AutoQuoteCharacters",
    "AutoRefreshed",
    "AutoRemove",
    "AutorunSequencing",
    "AutoScaling",
    "AutoScroll",
    "AutoSpacing",
    "AutoStyleOptions",
    "AutoStyleWords",
    "AutoSubmitting",
    "Axes",
    "AxesEdge",
    "AxesLabel",
    "AxesOrigin",
    "AxesStyle",
    "AxiomaticTheory",
    "Axis",
    "Axis3DBox",
    "Axis3DBoxOptions",
    "AxisBox",
    "AxisBoxOptions",
    "AxisLabel",
    "AxisObject",
    "AxisStyle",
    "BabyMonsterGroupB",
    "Back",
    "BackFaceColor",
    "BackFaceGlowColor",
    "BackFaceOpacity",
    "BackFaceSpecularColor",
    "BackFaceSpecularExponent",
    "BackFaceSurfaceAppearance",
    "BackFaceTexture",
    "Background",
    "BackgroundAppearance",
    "BackgroundTasksSettings",
    "Backslash",
    "Backsubstitution",
    "Backward",
    "Ball",
    "Band",
    "BandpassFilter",
    "BandstopFilter",
    "BarabasiAlbertGraphDistribution",
    "BarChart",
    "BarChart3D",
    "BarcodeImage",
    "BarcodeRecognize",
    "BaringhausHenzeTest",
    "BarLegend",
    "BarlowProschanImportance",
    "BarnesG",
    "BarOrigin",
    "BarSpacing",
    "BartlettHannWindow",
    "BartlettWindow",
    "BaseDecode",
    "BaseEncode",
    "BaseForm",
    "Baseline",
    "BaselinePosition",
    "BaseStyle",
    "BasicRecurrentLayer",
    "BatchNormalizationLayer",
    "BatchSize",
    "BatesDistribution",
    "BattleLemarieWavelet",
    "BayesianMaximization",
    "BayesianMaximizationObject",
    "BayesianMinimization",
    "BayesianMinimizationObject",
    "Because",
    "BeckmannDistribution",
    "Beep",
    "Before",
    "Begin",
    "BeginDialogPacket",
    "BeginPackage",
    "BellB",
    "BellY",
    "Below",
    "BenfordDistribution",
    "BeniniDistribution",
    "BenktanderGibratDistribution",
    "BenktanderWeibullDistribution",
    "BernoulliB",
    "BernoulliDistribution",
    "BernoulliGraphDistribution",
    "BernoulliProcess",
    "BernsteinBasis",
    "BesagL",
    "BesselFilterModel",
    "BesselI",
    "BesselJ",
    "BesselJZero",
    "BesselK",
    "BesselY",
    "BesselYZero",
    "Beta",
    "BetaBinomialDistribution",
    "BetaDistribution",
    "BetaNegativeBinomialDistribution",
    "BetaPrimeDistribution",
    "BetaRegularized",
    "Between",
    "BetweennessCentrality",
    "Beveled",
    "BeveledPolyhedron",
    "BezierCurve",
    "BezierCurve3DBox",
    "BezierCurve3DBoxOptions",
    "BezierCurveBox",
    "BezierCurveBoxOptions",
    "BezierFunction",
    "BilateralFilter",
    "BilateralLaplaceTransform",
    "BilateralZTransform",
    "Binarize",
    "BinaryDeserialize",
    "BinaryDistance",
    "BinaryFormat",
    "BinaryImageQ",
    "BinaryRead",
    "BinaryReadList",
    "BinarySerialize",
    "BinaryWrite",
    "BinCounts",
    "BinLists",
    "BinnedVariogramList",
    "Binomial",
    "BinomialDistribution",
    "BinomialPointProcess",
    "BinomialProcess",
    "BinormalDistribution",
    "BiorthogonalSplineWavelet",
    "BioSequence",
    "BioSequenceBackTranslateList",
    "BioSequenceComplement",
    "BioSequenceInstances",
    "BioSequenceModify",
    "BioSequencePlot",
    "BioSequenceQ",
    "BioSequenceReverseComplement",
    "BioSequenceTranscribe",
    "BioSequenceTranslate",
    "BipartiteGraphQ",
    "BiquadraticFilterModel",
    "BirnbaumImportance",
    "BirnbaumSaundersDistribution",
    "BitAnd",
    "BitClear",
    "BitGet",
    "BitLength",
    "BitNot",
    "BitOr",
    "BitRate",
    "BitSet",
    "BitShiftLeft",
    "BitShiftRight",
    "BitXor",
    "BiweightLocation",
    "BiweightMidvariance",
    "Black",
    "BlackmanHarrisWindow",
    "BlackmanNuttallWindow",
    "BlackmanWindow",
    "Blank",
    "BlankForm",
    "BlankNullSequence",
    "BlankSequence",
    "Blend",
    "Block",
    "BlockchainAddressData",
    "BlockchainBase",
    "BlockchainBlockData",
    "BlockchainContractValue",
    "BlockchainData",
    "BlockchainGet",
    "BlockchainKeyEncode",
    "BlockchainPut",
    "BlockchainTokenData",
    "BlockchainTransaction",
    "BlockchainTransactionData",
    "BlockchainTransactionSign",
    "BlockchainTransactionSubmit",
    "BlockDiagonalMatrix",
    "BlockLowerTriangularMatrix",
    "BlockMap",
    "BlockRandom",
    "BlockUpperTriangularMatrix",
    "BlomqvistBeta",
    "BlomqvistBetaTest",
    "Blue",
    "Blur",
    "Blurring",
    "BodePlot",
    "BohmanWindow",
    "Bold",
    "Bond",
    "BondCount",
    "BondLabels",
    "BondLabelStyle",
    "BondList",
    "BondQ",
    "Bookmarks",
    "Boole",
    "BooleanConsecutiveFunction",
    "BooleanConvert",
    "BooleanCountingFunction",
    "BooleanFunction",
    "BooleanGraph",
    "BooleanMaxterms",
    "BooleanMinimize",
    "BooleanMinterms",
    "BooleanQ",
    "BooleanRegion",
    "Booleans",
    "BooleanStrings",
    "BooleanTable",
    "BooleanVariables",
    "BorderDimensions",
    "BorelTannerDistribution",
    "Bottom",
    "BottomHatTransform",
    "BoundaryDiscretizeGraphics",
    "BoundaryDiscretizeRegion",
    "BoundaryMesh",
    "BoundaryMeshRegion",
    "BoundaryMeshRegionQ",
    "BoundaryStyle",
    "BoundedRegionQ",
    "BoundingRegion",
    "Bounds",
    "Box",
    "BoxBaselineShift",
    "BoxData",
    "BoxDimensions",
    "Boxed",
    "Boxes",
    "BoxForm",
    "BoxFormFormatTypes",
    "BoxFrame",
    "BoxID",
    "BoxMargins",
    "BoxMatrix",
    "BoxObject",
    "BoxRatios",
    "BoxRotation",
    "BoxRotationPoint",
    "BoxStyle",
    "BoxWhiskerChart",
    "Bra",
    "BracketingBar",
    "BraKet",
    "BrayCurtisDistance",
    "BreadthFirstScan",
    "Break",
    "BridgeData",
    "BrightnessEqualize",
    "BroadcastStationData",
    "Brown",
    "BrownForsytheTest",
    "BrownianBridgeProcess",
    "BrowserCategory",
    "BSplineBasis",
    "BSplineCurve",
    "BSplineCurve3DBox",
    "BSplineCurve3DBoxOptions",
    "BSplineCurveBox",
    "BSplineCurveBoxOptions",
    "BSplineFunction",
    "BSplineSurface",
    "BSplineSurface3DBox",
    "BSplineSurface3DBoxOptions",
    "BubbleChart",
    "BubbleChart3D",
    "BubbleScale",
    "BubbleSizes",
    "BuckyballGraph",
    "BuildCompiledComponent",
    "BuildingData",
    "BulletGauge",
    "BusinessDayQ",
    "ButterflyGraph",
    "ButterworthFilterModel",
    "Button",
    "ButtonBar",
    "ButtonBox",
    "ButtonBoxOptions",
    "ButtonCell",
    "ButtonContents",
    "ButtonData",
    "ButtonEvaluator",
    "ButtonExpandable",
    "ButtonFrame",
    "ButtonFunction",
    "ButtonMargins",
    "ButtonMinHeight",
    "ButtonNote",
    "ButtonNotebook",
    "ButtonSource",
    "ButtonStyle",
    "ButtonStyleMenuListing",
    "Byte",
    "ByteArray",
    "ByteArrayFormat",
    "ByteArrayFormatQ",
    "ByteArrayQ",
    "ByteArrayToString",
    "ByteCount",
    "ByteOrdering",
    "C",
    "CachedValue",
    "CacheGraphics",
    "CachePersistence",
    "CalendarConvert",
    "CalendarData",
    "CalendarType",
    "Callout",
    "CalloutMarker",
    "CalloutStyle",
    "CallPacket",
    "CanberraDistance",
    "Cancel",
    "CancelButton",
    "CandlestickChart",
    "CanonicalGraph",
    "CanonicalizePolygon",
    "CanonicalizePolyhedron",
    "CanonicalizeRegion",
    "CanonicalName",
    "CanonicalWarpingCorrespondence",
    "CanonicalWarpingDistance",
    "CantorMesh",
    "CantorStaircase",
    "Canvas",
    "Cap",
    "CapForm",
    "CapitalDifferentialD",
    "Capitalize",
    "CapsuleShape",
    "CaptureRunning",
    "CaputoD",
    "CardinalBSplineBasis",
    "CarlemanLinearize",
    "CarlsonRC",
    "CarlsonRD",
    "CarlsonRE",
    "CarlsonRF",
    "CarlsonRG",
    "CarlsonRJ",
    "CarlsonRK",
    "CarlsonRM",
    "CarmichaelLambda",
    "CaseOrdering",
    "Cases",
    "CaseSensitive",
    "Cashflow",
    "Casoratian",
    "Cast",
    "Catalan",
    "CatalanNumber",
    "Catch",
    "CategoricalDistribution",
    "Catenate",
    "CatenateLayer",
    "CauchyDistribution",
    "CauchyMatrix",
    "CauchyPointProcess",
    "CauchyWindow",
    "CayleyGraph",
    "CDF",
    "CDFDeploy",
    "CDFInformation",
    "CDFWavelet",
    "Ceiling",
    "CelestialSystem",
    "Cell",
    "CellAutoOverwrite",
    "CellBaseline",
    "CellBoundingBox",
    "CellBracketOptions",
    "CellChangeTimes",
    "CellContents",
    "CellContext",
    "CellDingbat",
    "CellDingbatMargin",
    "CellDynamicExpression",
    "CellEditDuplicate",
    "CellElementsBoundingBox",
    "CellElementSpacings",
    "CellEpilog",
    "CellEvaluationDuplicate",
    "CellEvaluationFunction",
    "CellEvaluationLanguage",
    "CellEventActions",
    "CellFrame",
    "CellFrameColor",
    "CellFrameLabelMargins",
    "CellFrameLabels",
    "CellFrameMargins",
    "CellFrameStyle",
    "CellGroup",
    "CellGroupData",
    "CellGrouping",
    "CellGroupingRules",
    "CellHorizontalScrolling",
    "CellID",
    "CellInsertionPointCell",
    "CellLabel",
    "CellLabelAutoDelete",
    "CellLabelMargins",
    "CellLabelPositioning",
    "CellLabelStyle",
    "CellLabelTemplate",
    "CellMargins",
    "CellObject",
    "CellOpen",
    "CellPrint",
    "CellProlog",
    "Cells",
    "CellSize",
    "CellStyle",
    "CellTags",
    "CellTrayPosition",
    "CellTrayWidgets",
    "CellularAutomaton",
    "CensoredDistribution",
    "Censoring",
    "Center",
    "CenterArray",
    "CenterDot",
    "CenteredInterval",
    "CentralFeature",
    "CentralMoment",
    "CentralMomentGeneratingFunction",
    "Cepstrogram",
    "CepstrogramArray",
    "CepstrumArray",
    "CForm",
    "ChampernowneNumber",
    "ChangeOptions",
    "ChannelBase",
    "ChannelBrokerAction",
    "ChannelDatabin",
    "ChannelHistoryLength",
    "ChannelListen",
    "ChannelListener",
    "ChannelListeners",
    "ChannelListenerWait",
    "ChannelObject",
    "ChannelPreSendFunction",
    "ChannelReceiverFunction",
    "ChannelSend",
    "ChannelSubscribers",
    "ChanVeseBinarize",
    "Character",
    "CharacterCounts",
    "CharacterEncoding",
    "CharacterEncodingsPath",
    "CharacteristicFunction",
    "CharacteristicPolynomial",
    "CharacterName",
    "CharacterNormalize",
    "CharacterRange",
    "Characters",
    "ChartBaseStyle",
    "ChartElementData",
    "ChartElementDataFunction",
    "ChartElementFunction",
    "ChartElements",
    "ChartLabels",
    "ChartLayout",
    "ChartLegends",
    "ChartStyle",
    "Chebyshev1FilterModel",
    "Chebyshev2FilterModel",
    "ChebyshevDistance",
    "ChebyshevT",
    "ChebyshevU",
    "Check",
    "CheckAbort",
    "CheckAll",
    "CheckArguments",
    "Checkbox",
    "CheckboxBar",
    "CheckboxBox",
    "CheckboxBoxOptions",
    "ChemicalConvert",
    "ChemicalData",
    "ChemicalFormula",
    "ChemicalInstance",
    "ChemicalReaction",
    "ChessboardDistance",
    "ChiDistribution",
    "ChineseRemainder",
    "ChiSquareDistribution",
    "ChoiceButtons",
    "ChoiceDialog",
    "CholeskyDecomposition",
    "Chop",
    "ChromaticityPlot",
    "ChromaticityPlot3D",
    "ChromaticPolynomial",
    "Circle",
    "CircleBox",
    "CircleDot",
    "CircleMinus",
    "CirclePlus",
    "CirclePoints",
    "CircleThrough",
    "CircleTimes",
    "CirculantGraph",
    "CircularArcThrough",
    "CircularOrthogonalMatrixDistribution",
    "CircularQuaternionMatrixDistribution",
    "CircularRealMatrixDistribution",
    "CircularSymplecticMatrixDistribution",
    "CircularUnitaryMatrixDistribution",
    "Circumsphere",
    "CityData",
    "ClassifierFunction",
    "ClassifierInformation",
    "ClassifierMeasurements",
    "ClassifierMeasurementsObject",
    "Classify",
    "ClassPriors",
    "Clear",
    "ClearAll",
    "ClearAttributes",
    "ClearCookies",
    "ClearPermissions",
    "ClearSystemCache",
    "ClebschGordan",
    "ClickPane",
    "ClickToCopy",
    "ClickToCopyEnabled",
    "Clip",
    "ClipboardNotebook",
    "ClipFill",
    "ClippingStyle",
    "ClipPlanes",
    "ClipPlanesStyle",
    "ClipRange",
    "Clock",
    "ClockGauge",
    "ClockwiseContourIntegral",
    "Close",
    "Closed",
    "CloseKernels",
    "ClosenessCentrality",
    "Closing",
    "ClosingAutoSave",
    "ClosingEvent",
    "CloudAccountData",
    "CloudBase",
    "CloudConnect",
    "CloudConnections",
    "CloudDeploy",
    "CloudDirectory",
    "CloudDisconnect",
    "CloudEvaluate",
    "CloudExport",
    "CloudExpression",
    "CloudExpressions",
    "CloudFunction",
    "CloudGet",
    "CloudImport",
    "CloudLoggingData",
    "CloudObject",
    "CloudObjectInformation",
    "CloudObjectInformationData",
    "CloudObjectNameFormat",
    "CloudObjects",
    "CloudObjectURLType",
    "CloudPublish",
    "CloudPut",
    "CloudRenderingMethod",
    "CloudSave",
    "CloudShare",
    "CloudSubmit",
    "CloudSymbol",
    "CloudUnshare",
    "CloudUserID",
    "ClusterClassify",
    "ClusterDissimilarityFunction",
    "ClusteringComponents",
    "ClusteringMeasurements",
    "ClusteringTree",
    "CMYKColor",
    "Coarse",
    "CodeAssistOptions",
    "Coefficient",
    "CoefficientArrays",
    "CoefficientDomain",
    "CoefficientList",
    "CoefficientRules",
    "CoifletWavelet",
    "Collect",
    "CollinearPoints",
    "Colon",
    "ColonForm",
    "ColorBalance",
    "ColorCombine",
    "ColorConvert",
    "ColorCoverage",
    "ColorData",
    "ColorDataFunction",
    "ColorDetect",
    "ColorDistance",
    "ColorFunction",
    "ColorFunctionBinning",
    "ColorFunctionScaling",
    "Colorize",
    "ColorNegate",
    "ColorOutput",
    "ColorProfileData",
    "ColorQ",
    "ColorQuantize",
    "ColorReplace",
    "ColorRules",
    "ColorSelectorSettings",
    "ColorSeparate",
    "ColorSetter",
    "ColorSetterBox",
    "ColorSetterBoxOptions",
    "ColorSlider",
    "ColorsNear",
    "ColorSpace",
    "ColorToneMapping",
    "Column",
    "ColumnAlignments",
    "ColumnBackgrounds",
    "ColumnForm",
    "ColumnLines",
    "ColumnsEqual",
    "ColumnSpacings",
    "ColumnWidths",
    "CombinatorB",
    "CombinatorC",
    "CombinatorI",
    "CombinatorK",
    "CombinatorS",
    "CombinatorW",
    "CombinatorY",
    "CombinedEntityClass",
    "CombinerFunction",
    "CometData",
    "CommonDefaultFormatTypes",
    "Commonest",
    "CommonestFilter",
    "CommonName",
    "CommonUnits",
    "CommunityBoundaryStyle",
    "CommunityGraphPlot",
    "CommunityLabels",
    "CommunityRegionStyle",
    "CompanyData",
    "CompatibleUnitQ",
    "CompilationOptions",
    "CompilationTarget",
    "Compile",
    "Compiled",
    "CompiledCodeFunction",
    "CompiledComponent",
    "CompiledExpressionDeclaration",
    "CompiledFunction",
    "CompiledLayer",
    "CompilerCallback",
    "CompilerEnvironment",
    "CompilerEnvironmentAppend",
    "CompilerEnvironmentAppendTo",
    "CompilerEnvironmentObject",
    "CompilerOptions",
    "Complement",
    "ComplementedEntityClass",
    "CompleteGraph",
    "CompleteGraphQ",
    "CompleteIntegral",
    "CompleteKaryTree",
    "CompletionsListPacket",
    "Complex",
    "ComplexArrayPlot",
    "ComplexContourPlot",
    "Complexes",
    "ComplexExpand",
    "ComplexInfinity",
    "ComplexityFunction",
    "ComplexListPlot",
    "ComplexPlot",
    "ComplexPlot3D",
    "ComplexRegionPlot",
    "ComplexStreamPlot",
    "ComplexVectorPlot",
    "ComponentMeasurements",
    "ComponentwiseContextMenu",
    "Compose",
    "ComposeList",
    "ComposeSeries",
    "CompositeQ",
    "Composition",
    "CompoundElement",
    "CompoundExpression",
    "CompoundPoissonDistribution",
    "CompoundPoissonProcess",
    "CompoundRenewalProcess",
    "Compress",
    "CompressedData",
    "CompressionLevel",
    "ComputeUncertainty",
    "ConcaveHullMesh",
    "Condition",
    "ConditionalExpression",
    "Conditioned",
    "Cone",
    "ConeBox",
    "ConfidenceLevel",
    "ConfidenceRange",
    "ConfidenceTransform",
    "ConfigurationPath",
    "Confirm",
    "ConfirmAssert",
    "ConfirmBy",
    "ConfirmMatch",
    "ConfirmQuiet",
    "ConformationMethod",
    "ConformAudio",
    "ConformImages",
    "Congruent",
    "ConicGradientFilling",
    "ConicHullRegion",
    "ConicHullRegion3DBox",
    "ConicHullRegion3DBoxOptions",
    "ConicHullRegionBox",
    "ConicHullRegionBoxOptions",
    "ConicOptimization",
    "Conjugate",
    "ConjugateTranspose",
    "Conjunction",
    "Connect",
    "ConnectedComponents",
    "ConnectedGraphComponents",
    "ConnectedGraphQ",
    "ConnectedMeshComponents",
    "ConnectedMoleculeComponents",
    "ConnectedMoleculeQ",
    "ConnectionSettings",
    "ConnectLibraryCallbackFunction",
    "ConnectSystemModelComponents",
    "ConnectSystemModelController",
    "ConnesWindow",
    "ConoverTest",
    "ConservativeConvectionPDETerm",
    "ConsoleMessage",
    "Constant",
    "ConstantArray",
    "ConstantArrayLayer",
    "ConstantImage",
    "ConstantPlusLayer",
    "ConstantRegionQ",
    "Constants",
    "ConstantTimesLayer",
    "ConstellationData",
    "ConstrainedMax",
    "ConstrainedMin",
    "Construct",
    "Containing",
    "ContainsAll",
    "ContainsAny",
    "ContainsExactly",
    "ContainsNone",
    "ContainsOnly",
    "ContentDetectorFunction",
    "ContentFieldOptions",
    "ContentLocationFunction",
    "ContentObject",
    "ContentPadding",
    "ContentsBoundingBox",
    "ContentSelectable",
    "ContentSize",
    "Context",
    "ContextMenu",
    "Contexts",
    "ContextToFileName",
    "Continuation",
    "Continue",
    "ContinuedFraction",
    "ContinuedFractionK",
    "ContinuousAction",
    "ContinuousMarkovProcess",
    "ContinuousTask",
    "ContinuousTimeModelQ",
    "ContinuousWaveletData",
    "ContinuousWaveletTransform",
    "ContourDetect",
    "ContourGraphics",
    "ContourIntegral",
    "ContourLabels",
    "ContourLines",
    "ContourPlot",
    "ContourPlot3D",
    "Contours",
    "ContourShading",
    "ContourSmoothing",
    "ContourStyle",
    "ContraharmonicMean",
    "ContrastiveLossLayer",
    "Control",
    "ControlActive",
    "ControlAlignment",
    "ControlGroupContentsBox",
    "ControllabilityGramian",
    "ControllabilityMatrix",
    "ControllableDecomposition",
    "ControllableModelQ",
    "ControllerDuration",
    "ControllerInformation",
    "ControllerInformationData",
    "ControllerLinking",
    "ControllerManipulate",
    "ControllerMethod",
    "ControllerPath",
    "ControllerState",
    "ControlPlacement",
    "ControlsRendering",
    "ControlType",
    "ConvectionPDETerm",
    "Convergents",
    "ConversionOptions",
    "ConversionRules",
    "ConvertToPostScript",
    "ConvertToPostScriptPacket",
    "ConvexHullMesh",
    "ConvexHullRegion",
    "ConvexOptimization",
    "ConvexPolygonQ",
    "ConvexPolyhedronQ",
    "ConvexRegionQ",
    "ConvolutionLayer",
    "Convolve",
    "ConwayGroupCo1",
    "ConwayGroupCo2",
    "ConwayGroupCo3",
    "CookieFunction",
    "Cookies",
    "CoordinateBoundingBox",
    "CoordinateBoundingBoxArray",
    "CoordinateBounds",
    "CoordinateBoundsArray",
    "CoordinateChartData",
    "CoordinatesToolOptions",
    "CoordinateTransform",
    "CoordinateTransformData",
    "CoplanarPoints",
    "CoprimeQ",
    "Coproduct",
    "CopulaDistribution",
    "Copyable",
    "CopyDatabin",
    "CopyDirectory",
    "CopyFile",
    "CopyFunction",
    "CopyTag",
    "CopyToClipboard",
    "CoreNilpotentDecomposition",
    "CornerFilter",
    "CornerNeighbors",
    "Correlation",
    "CorrelationDistance",
    "CorrelationFunction",
    "CorrelationTest",
    "Cos",
    "Cosh",
    "CoshIntegral",
    "CosineDistance",
    "CosineWindow",
    "CosIntegral",
    "Cot",
    "Coth",
    "CoulombF",
    "CoulombG",
    "CoulombH1",
    "CoulombH2",
    "Count",
    "CountDistinct",
    "CountDistinctBy",
    "CounterAssignments",
    "CounterBox",
    "CounterBoxOptions",
    "CounterClockwiseContourIntegral",
    "CounterEvaluator",
    "CounterFunction",
    "CounterIncrements",
    "CounterStyle",
    "CounterStyleMenuListing",
    "CountRoots",
    "CountryData",
    "Counts",
    "CountsBy",
    "Covariance",
    "CovarianceEstimatorFunction",
    "CovarianceFunction",
    "CoxianDistribution",
    "CoxIngersollRossProcess",
    "CoxModel",
    "CoxModelFit",
    "CramerVonMisesTest",
    "CreateArchive",
    "CreateCellID",
    "CreateChannel",
    "CreateCloudExpression",
    "CreateCompilerEnvironment",
    "CreateDatabin",
    "CreateDataStructure",
    "CreateDataSystemModel",
    "CreateDialog",
    "CreateDirectory",
    "CreateDocument",
    "CreateFile",
    "CreateIntermediateDirectories",
    "CreateLicenseEntitlement",
    "CreateManagedLibraryExpression",
    "CreateNotebook",
    "CreatePacletArchive",
    "CreatePalette",
    "CreatePermissionsGroup",
    "CreateScheduledTask",
    "CreateSearchIndex",
    "CreateSystemModel",
    "CreateTemporary",
    "CreateTypeInstance",
    "CreateUUID",
    "CreateWindow",
    "CriterionFunction",
    "CriticalityFailureImportance",
    "CriticalitySuccessImportance",
    "CriticalSection",
    "Cross",
    "CrossEntropyLossLayer",
    "CrossingCount",
    "CrossingDetect",
    "CrossingPolygon",
    "CrossMatrix",
    "Csc",
    "Csch",
    "CSGRegion",
    "CSGRegionQ",
    "CSGRegionTree",
    "CTCLossLayer",
    "Cube",
    "CubeRoot",
    "Cubics",
    "Cuboid",
    "CuboidBox",
    "CuboidBoxOptions",
    "Cumulant",
    "CumulantGeneratingFunction",
    "CumulativeFeatureImpactPlot",
    "Cup",
    "CupCap",
    "Curl",
    "CurlyDoubleQuote",
    "CurlyQuote",
    "CurrencyConvert",
    "CurrentDate",
    "CurrentImage",
    "CurrentNotebookImage",
    "CurrentScreenImage",
    "CurrentValue",
    "Curry",
    "CurryApplied",
    "CurvatureFlowFilter",
    "CurveClosed",
    "Cyan",
    "CycleGraph",
    "CycleIndexPolynomial",
    "Cycles",
    "CyclicGroup",
    "Cyclotomic",
    "Cylinder",
    "CylinderBox",
    "CylinderBoxOptions",
    "CylindricalDecomposition",
    "CylindricalDecompositionFunction",
    "D",
    "DagumDistribution",
    "DamData",
    "DamerauLevenshteinDistance",
    "DampingFactor",
    "Darker",
    "Dashed",
    "Dashing",
    "DatabaseConnect",
    "DatabaseDisconnect",
    "DatabaseReference",
    "Databin",
    "DatabinAdd",
    "DatabinRemove",
    "Databins",
    "DatabinSubmit",
    "DatabinUpload",
    "DataCompression",
    "DataDistribution",
    "DataRange",
    "DataReversed",
    "Dataset",
    "DatasetDisplayPanel",
    "DatasetTheme",
    "DataStructure",
    "DataStructureQ",
    "Date",
    "DateBounds",
    "Dated",
    "DateDelimiters",
    "DateDifference",
    "DatedUnit",
    "DateFormat",
    "DateFunction",
    "DateGranularity",
    "DateHistogram",
    "DateInterval",
    "DateList",
    "DateListLogPlot",
    "DateListPlot",
    "DateListStepPlot",
    "DateObject",
    "DateObjectQ",
    "DateOverlapsQ",
    "DatePattern",
    "DatePlus",
    "DateRange",
    "DateReduction",
    "DateScale",
    "DateSelect",
    "DateString",
    "DateTicksFormat",
    "DateValue",
    "DateWithinQ",
    "DaubechiesWavelet",
    "DavisDistribution",
    "DawsonF",
    "DayCount",
    "DayCountConvention",
    "DayHemisphere",
    "DaylightQ",
    "DayMatchQ",
    "DayName",
    "DayNightTerminator",
    "DayPlus",
    "DayRange",
    "DayRound",
    "DeBruijnGraph",
    "DeBruijnSequence",
    "Debug",
    "DebugTag",
    "Decapitalize",
    "Decimal",
    "DecimalForm",
    "DeclareCompiledComponent",
    "DeclareKnownSymbols",
    "DeclarePackage",
    "Decompose",
    "DeconvolutionLayer",
    "Decrement",
    "Decrypt",
    "DecryptFile",
    "DedekindEta",
    "DeepSpaceProbeData",
    "Default",
    "Default2DTool",
    "Default3DTool",
    "DefaultAttachedCellStyle",
    "DefaultAxesStyle",
    "DefaultBaseStyle",
    "DefaultBoxStyle",
    "DefaultButton",
    "DefaultColor",
    "DefaultControlPlacement",
    "DefaultDockedCellStyle",
    "DefaultDuplicateCellStyle",
    "DefaultDuration",
    "DefaultElement",
    "DefaultFaceGridsStyle",
    "DefaultFieldHintStyle",
    "DefaultFont",
    "DefaultFontProperties",
    "DefaultFormatType",
    "DefaultFrameStyle",
    "DefaultFrameTicksStyle",
    "DefaultGridLinesStyle",
    "DefaultInlineFormatType",
    "DefaultInputFormatType",
    "DefaultLabelStyle",
    "DefaultMenuStyle",
    "DefaultNaturalLanguage",
    "DefaultNewCellStyle",
    "DefaultNewInlineCellStyle",
    "DefaultNotebook",
    "DefaultOptions",
    "DefaultOutputFormatType",
    "DefaultPrintPrecision",
    "DefaultStyle",
    "DefaultStyleDefinitions",
    "DefaultTextFormatType",
    "DefaultTextInlineFormatType",
    "DefaultTicksStyle",
    "DefaultTooltipStyle",
    "DefaultValue",
    "DefaultValues",
    "Defer",
    "DefineExternal",
    "DefineInputStreamMethod",
    "DefineOutputStreamMethod",
    "DefineResourceFunction",
    "Definition",
    "Degree",
    "DegreeCentrality",
    "DegreeGraphDistribution",
    "DegreeLexicographic",
    "DegreeReverseLexicographic",
    "DEigensystem",
    "DEigenvalues",
    "Deinitialization",
    "Del",
    "DelaunayMesh",
    "Delayed",
    "Deletable",
    "Delete",
    "DeleteAdjacentDuplicates",
    "DeleteAnomalies",
    "DeleteBorderComponents",
    "DeleteCases",
    "DeleteChannel",
    "DeleteCloudExpression",
    "DeleteContents",
    "DeleteDirectory",
    "DeleteDuplicates",
    "DeleteDuplicatesBy",
    "DeleteElements",
    "DeleteFile",
    "DeleteMissing",
    "DeleteObject",
    "DeletePermissionsKey",
    "DeleteSearchIndex",
    "DeleteSmallComponents",
    "DeleteStopwords",
    "DeleteWithContents",
    "DeletionWarning",
    "DelimitedArray",
    "DelimitedSequence",
    "Delimiter",
    "DelimiterAutoMatching",
    "DelimiterFlashTime",
    "DelimiterMatching",
    "Delimiters",
    "DeliveryFunction",
    "Dendrogram",
    "Denominator",
    "DensityGraphics",
    "DensityHistogram",
    "DensityPlot",
    "DensityPlot3D",
    "DependentVariables",
    "Deploy",
    "Deployed",
    "Depth",
    "DepthFirstScan",
    "Derivative",
    "DerivativeFilter",
    "DerivativePDETerm",
    "DerivedKey",
    "DescriptorStateSpace",
    "DesignMatrix",
    "DestroyAfterEvaluation",
    "Det",
    "DeviceClose",
    "DeviceConfigure",
    "DeviceExecute",
    "DeviceExecuteAsynchronous",
    "DeviceObject",
    "DeviceOpen",
    "DeviceOpenQ",
    "DeviceRead",
    "DeviceReadBuffer",
    "DeviceReadLatest",
    "DeviceReadList",
    "DeviceReadTimeSeries",
    "Devices",
    "DeviceStreams",
    "DeviceWrite",
    "DeviceWriteBuffer",
    "DGaussianWavelet",
    "DiacriticalPositioning",
    "Diagonal",
    "DiagonalizableMatrixQ",
    "DiagonalMatrix",
    "DiagonalMatrixQ",
    "Dialog",
    "DialogIndent",
    "DialogInput",
    "DialogLevel",
    "DialogNotebook",
    "DialogProlog",
    "DialogReturn",
    "DialogSymbols",
    "Diamond",
    "DiamondMatrix",
    "DiceDissimilarity",
    "DictionaryLookup",
    "DictionaryWordQ",
    "DifferenceDelta",
    "DifferenceOrder",
    "DifferenceQuotient",
    "DifferenceRoot",
    "DifferenceRootReduce",
    "Differences",
    "DifferentialD",
    "DifferentialRoot",
    "DifferentialRootReduce",
    "DifferentiatorFilter",
    "DiffusionPDETerm",
    "DiggleGatesPointProcess",
    "DiggleGrattonPointProcess",
    "DigitalSignature",
    "DigitBlock",
    "DigitBlockMinimum",
    "DigitCharacter",
    "DigitCount",
    "DigitQ",
    "DihedralAngle",
    "DihedralGroup",
    "Dilation",
    "DimensionalCombinations",
    "DimensionalMeshComponents",
    "DimensionReduce",
    "DimensionReducerFunction",
    "DimensionReduction",
    "Dimensions",
    "DiracComb",
    "DiracDelta",
    "DirectedEdge",
    "DirectedEdges",
    "DirectedGraph",
    "DirectedGraphQ",
    "DirectedInfinity",
    "Direction",
    "DirectionalLight",
    "Directive",
    "Directory",
    "DirectoryName",
    "DirectoryQ",
    "DirectoryStack",
    "DirichletBeta",
    "DirichletCharacter",
    "DirichletCondition",
    "DirichletConvolve",
    "DirichletDistribution",
    "DirichletEta",
    "DirichletL",
    "DirichletLambda",
    "DirichletTransform",
    "DirichletWindow",
    "DisableConsolePrintPacket",
    "DisableFormatting",
    "DiscreteAsymptotic",
    "DiscreteChirpZTransform",
    "DiscreteConvolve",
    "DiscreteDelta",
    "DiscreteHadamardTransform",
    "DiscreteIndicator",
    "DiscreteInputOutputModel",
    "DiscreteLimit",
    "DiscreteLQEstimatorGains",
    "DiscreteLQRegulatorGains",
    "DiscreteLyapunovSolve",
    "DiscreteMarkovProcess",
    "DiscreteMaxLimit",
    "DiscreteMinLimit",
    "DiscretePlot",
    "DiscretePlot3D",
    "DiscreteRatio",
    "DiscreteRiccatiSolve",
    "DiscreteShift",
    "DiscreteTimeModelQ",
    "DiscreteUniformDistribution",
    "DiscreteVariables",
    "DiscreteWaveletData",
    "DiscreteWaveletPacketTransform",
    "DiscreteWaveletTransform",
    "DiscretizeGraphics",
    "DiscretizeRegion",
    "Discriminant",
    "DisjointQ",
    "Disjunction",
    "Disk",
    "DiskBox",
    "DiskBoxOptions",
    "DiskMatrix",
    "DiskSegment",
    "Dispatch",
    "DispatchQ",
    "DispersionEstimatorFunction",
    "Display",
    "DisplayAllSteps",
    "DisplayEndPacket",
    "DisplayForm",
    "DisplayFunction",
    "DisplayPacket",
    "DisplayRules",
    "DisplayString",
    "DisplayTemporary",
    "DisplayWith",
    "DisplayWithRef",
    "DisplayWithVariable",
    "DistanceFunction",
    "DistanceMatrix",
    "DistanceTransform",
    "Distribute",
    "Distributed",
    "DistributedContexts",
    "DistributeDefinitions",
    "DistributionChart",
    "DistributionDomain",
    "DistributionFitTest",
    "DistributionParameterAssumptions",
    "DistributionParameterQ",
    "Dithering",
    "Div",
    "Divergence",
    "Divide",
    "DivideBy",
    "Dividers",
    "DivideSides",
    "Divisible",
    "Divisors",
    "DivisorSigma",
    "DivisorSum",
    "DMSList",
    "DMSString",
    "Do",
    "DockedCell",
    "DockedCells",
    "DocumentGenerator",
    "DocumentGeneratorInformation",
    "DocumentGeneratorInformationData",
    "DocumentGenerators",
    "DocumentNotebook",
    "DocumentWeightingRules",
    "Dodecahedron",
    "DomainRegistrationInformation",
    "DominantColors",
    "DominatorTreeGraph",
    "DominatorVertexList",
    "DOSTextFormat",
    "Dot",
    "DotDashed",
    "DotEqual",
    "DotLayer",
    "DotPlusLayer",
    "Dotted",
    "DoubleBracketingBar",
    "DoubleContourIntegral",
    "DoubleDownArrow",
    "DoubleLeftArrow",
    "DoubleLeftRightArrow",
    "DoubleLeftTee",
    "DoubleLongLeftArrow",
    "DoubleLongLeftRightArrow",
    "DoubleLongRightArrow",
    "DoubleRightArrow",
    "DoubleRightTee",
    "DoubleUpArrow",
    "DoubleUpDownArrow",
    "DoubleVerticalBar",
    "DoublyInfinite",
    "Down",
    "DownArrow",
    "DownArrowBar",
    "DownArrowUpArrow",
    "DownLeftRightVector",
    "DownLeftTeeVector",
    "DownLeftVector",
    "DownLeftVectorBar",
    "DownRightTeeVector",
    "DownRightVector",
    "DownRightVectorBar",
    "Downsample",
    "DownTee",
    "DownTeeArrow",
    "DownValues",
    "DownValuesFunction",
    "DragAndDrop",
    "DrawBackFaces",
    "DrawEdges",
    "DrawFrontFaces",
    "DrawHighlighted",
    "DrazinInverse",
    "Drop",
    "DropoutLayer",
    "DropShadowing",
    "DSolve",
    "DSolveChangeVariables",
    "DSolveValue",
    "Dt",
    "DualLinearProgramming",
    "DualPlanarGraph",
    "DualPolyhedron",
    "DualSystemsModel",
    "DumpGet",
    "DumpSave",
    "DuplicateFreeQ",
    "Duration",
    "Dynamic",
    "DynamicBox",
    "DynamicBoxOptions",
    "DynamicEvaluationTimeout",
    "DynamicGeoGraphics",
    "DynamicImage",
    "DynamicLocation",
    "DynamicModule",
    "DynamicModuleBox",
    "DynamicModuleBoxOptions",
    "DynamicModuleParent",
    "DynamicModuleValues",
    "DynamicName",
    "DynamicNamespace",
    "DynamicReference",
    "DynamicSetting",
    "DynamicUpdating",
    "DynamicWrapper",
    "DynamicWrapperBox",
    "DynamicWrapperBoxOptions",
    "E",
    "EarthImpactData",
    "EarthquakeData",
    "EccentricityCentrality",
    "Echo",
    "EchoEvaluation",
    "EchoFunction",
    "EchoLabel",
    "EchoTiming",
    "EclipseType",
    "EdgeAdd",
    "EdgeBetweennessCentrality",
    "EdgeCapacity",
    "EdgeCapForm",
    "EdgeChromaticNumber",
    "EdgeColor",
    "EdgeConnectivity",
    "EdgeContract",
    "EdgeCost",
    "EdgeCount",
    "EdgeCoverQ",
    "EdgeCycleMatrix",
    "EdgeDashing",
    "EdgeDelete",
    "EdgeDetect",
    "EdgeForm",
    "EdgeIndex",
    "EdgeJoinForm",
    "EdgeLabeling",
    "EdgeLabels",
    "EdgeLabelStyle",
    "EdgeList",
    "EdgeOpacity",
    "EdgeQ",
    "EdgeRenderingFunction",
    "EdgeRules",
    "EdgeShapeFunction",
    "EdgeStyle",
    "EdgeTaggedGraph",
    "EdgeTaggedGraphQ",
    "EdgeTags",
    "EdgeThickness",
    "EdgeTransitiveGraphQ",
    "EdgeValueRange",
    "EdgeValueSizes",
    "EdgeWeight",
    "EdgeWeightedGraphQ",
    "Editable",
    "EditButtonSettings",
    "EditCellTagsSettings",
    "EditDistance",
    "EffectiveInterest",
    "Eigensystem",
    "Eigenvalues",
    "EigenvectorCentrality",
    "Eigenvectors",
    "Element",
    "ElementData",
    "ElementwiseLayer",
    "ElidedForms",
    "Eliminate",
    "EliminationOrder",
    "Ellipsoid",
    "EllipticE",
    "EllipticExp",
    "EllipticExpPrime",
    "EllipticF",
    "EllipticFilterModel",
    "EllipticK",
    "EllipticLog",
    "EllipticNomeQ",
    "EllipticPi",
    "EllipticReducedHalfPeriods",
    "EllipticTheta",
    "EllipticThetaPrime",
    "EmbedCode",
    "EmbeddedHTML",
    "EmbeddedService",
    "EmbeddedSQLEntityClass",
    "EmbeddedSQLExpression",
    "EmbeddingLayer",
    "EmbeddingObject",
    "EmitSound",
    "EmphasizeSyntaxErrors",
    "EmpiricalDistribution",
    "Empty",
    "EmptyGraphQ",
    "EmptyRegion",
    "EmptySpaceF",
    "EnableConsolePrintPacket",
    "Enabled",
    "Enclose",
    "Encode",
    "Encrypt",
    "EncryptedObject",
    "EncryptFile",
    "End",
    "EndAdd",
    "EndDialogPacket",
    "EndOfBuffer",
    "EndOfFile",
    "EndOfLine",
    "EndOfString",
    "EndPackage",
    "EngineEnvironment",
    "EngineeringForm",
    "Enter",
    "EnterExpressionPacket",
    "EnterTextPacket",
    "Entity",
    "EntityClass",
    "EntityClassList",
    "EntityCopies",
    "EntityFunction",
    "EntityGroup",
    "EntityInstance",
    "EntityList",
    "EntityPrefetch",
    "EntityProperties",
    "EntityProperty",
    "EntityPropertyClass",
    "EntityRegister",
    "EntityStore",
    "EntityStores",
    "EntityTypeName",
    "EntityUnregister",
    "EntityValue",
    "Entropy",
    "EntropyFilter",
    "Environment",
    "Epilog",
    "EpilogFunction",
    "Equal",
    "EqualColumns",
    "EqualRows",
    "EqualTilde",
    "EqualTo",
    "EquatedTo",
    "Equilibrium",
    "EquirippleFilterKernel",
    "Equivalent",
    "Erf",
    "Erfc",
    "Erfi",
    "ErlangB",
    "ErlangC",
    "ErlangDistribution",
    "Erosion",
    "ErrorBox",
    "ErrorBoxOptions",
    "ErrorNorm",
    "ErrorPacket",
    "ErrorsDialogSettings",
    "EscapeRadius",
    "EstimatedBackground",
    "EstimatedDistribution",
    "EstimatedPointNormals",
    "EstimatedPointProcess",
    "EstimatedProcess",
    "EstimatedVariogramModel",
    "EstimatorGains",
    "EstimatorRegulator",
    "EuclideanDistance",
    "EulerAngles",
    "EulerCharacteristic",
    "EulerE",
    "EulerGamma",
    "EulerianGraphQ",
    "EulerMatrix",
    "EulerPhi",
    "Evaluatable",
    "Evaluate",
    "Evaluated",
    "EvaluatePacket",
    "EvaluateScheduledTask",
    "EvaluationBox",
    "EvaluationCell",
    "EvaluationCompletionAction",
    "EvaluationData",
    "EvaluationElements",
    "EvaluationEnvironment",
    "EvaluationMode",
    "EvaluationMonitor",
    "EvaluationNotebook",
    "EvaluationObject",
    "EvaluationOrder",
    "EvaluationPrivileges",
    "EvaluationRateLimit",
    "Evaluator",
    "EvaluatorNames",
    "EvenQ",
    "EventData",
    "EventEvaluator",
    "EventHandler",
    "EventHandlerTag",
    "EventLabels",
    "EventSeries",
    "ExactBlackmanWindow",
    "ExactNumberQ",
    "ExactRootIsolation",
    "ExampleData",
    "Except",
    "ExcludedContexts",
    "ExcludedForms",
    "ExcludedLines",
    "ExcludedPhysicalQuantities",
    "ExcludePods",
    "Exclusions",
    "ExclusionsStyle",
    "Exists",
    "Exit",
    "ExitDialog",
    "ExoplanetData",
    "Exp",
    "Expand",
    "ExpandAll",
    "ExpandDenominator",
    "ExpandFileName",
    "ExpandNumerator",
    "Expectation",
    "ExpectationE",
    "ExpectedValue",
    "ExpGammaDistribution",
    "ExpIntegralE",
    "ExpIntegralEi",
    "ExpirationDate",
    "Exponent",
    "ExponentFunction",
    "ExponentialDistribution",
    "ExponentialFamily",
    "ExponentialGeneratingFunction",
    "ExponentialMovingAverage",
    "ExponentialPowerDistribution",
    "ExponentPosition",
    "ExponentStep",
    "Export",
    "ExportAutoReplacements",
    "ExportByteArray",
    "ExportForm",
    "ExportPacket",
    "ExportString",
    "Expression",
    "ExpressionCell",
    "ExpressionGraph",
    "ExpressionPacket",
    "ExpressionTree",
    "ExpressionUUID",
    "ExpToTrig",
    "ExtendedEntityClass",
    "ExtendedGCD",
    "Extension",
    "ExtentElementFunction",
    "ExtentMarkers",
    "ExtentSize",
    "ExternalBundle",
    "ExternalCall",
    "ExternalDataCharacterEncoding",
    "ExternalEvaluate",
    "ExternalFunction",
    "ExternalFunctionName",
    "ExternalIdentifier",
    "ExternalObject",
    "ExternalOptions",
    "ExternalSessionObject",
    "ExternalSessions",
    "ExternalStorageBase",
    "ExternalStorageDownload",
    "ExternalStorageGet",
    "ExternalStorageObject",
    "ExternalStoragePut",
    "ExternalStorageUpload",
    "ExternalTypeSignature",
    "ExternalValue",
    "Extract",
    "ExtractArchive",
    "ExtractLayer",
    "ExtractPacletArchive",
    "ExtremeValueDistribution",
    "FaceAlign",
    "FaceForm",
    "FaceGrids",
    "FaceGridsStyle",
    "FaceRecognize",
    "FacialFeatures",
    "Factor",
    "FactorComplete",
    "Factorial",
    "Factorial2",
    "FactorialMoment",
    "FactorialMomentGeneratingFunction",
    "FactorialPower",
    "FactorInteger",
    "FactorList",
    "FactorSquareFree",
    "FactorSquareFreeList",
    "FactorTerms",
    "FactorTermsList",
    "Fail",
    "Failure",
    "FailureAction",
    "FailureDistribution",
    "FailureQ",
    "False",
    "FareySequence",
    "FARIMAProcess",
    "FeatureDistance",
    "FeatureExtract",
    "FeatureExtraction",
    "FeatureExtractor",
    "FeatureExtractorFunction",
    "FeatureImpactPlot",
    "FeatureNames",
    "FeatureNearest",
    "FeatureSpacePlot",
    "FeatureSpacePlot3D",
    "FeatureTypes",
    "FeatureValueDependencyPlot",
    "FeatureValueImpactPlot",
    "FEDisableConsolePrintPacket",
    "FeedbackLinearize",
    "FeedbackSector",
    "FeedbackSectorStyle",
    "FeedbackType",
    "FEEnableConsolePrintPacket",
    "FetalGrowthData",
    "Fibonacci",
    "Fibonorial",
    "FieldCompletionFunction",
    "FieldHint",
    "FieldHintStyle",
    "FieldMasked",
    "FieldSize",
    "File",
    "FileBaseName",
    "FileByteCount",
    "FileConvert",
    "FileDate",
    "FileExistsQ",
    "FileExtension",
    "FileFormat",
    "FileFormatProperties",
    "FileFormatQ",
    "FileHandler",
    "FileHash",
    "FileInformation",
    "FileName",
    "FileNameDepth",
    "FileNameDialogSettings",
    "FileNameDrop",
    "FileNameForms",
    "FileNameJoin",
    "FileNames",
    "FileNameSetter",
    "FileNameSplit",
    "FileNameTake",
    "FileNameToFormatList",
    "FilePrint",
    "FileSize",
    "FileSystemMap",
    "FileSystemScan",
    "FileSystemTree",
    "FileTemplate",
    "FileTemplateApply",
    "FileType",
    "FilledCurve",
    "FilledCurveBox",
    "FilledCurveBoxOptions",
    "FilledTorus",
    "FillForm",
    "Filling",
    "FillingStyle",
    "FillingTransform",
    "FilteredEntityClass",
    "FilterRules",
    "FinancialBond",
    "FinancialData",
    "FinancialDerivative",
    "FinancialIndicator",
    "Find",
    "FindAnomalies",
    "FindArgMax",
    "FindArgMin",
    "FindChannels",
    "FindClique",
    "FindClusters",
    "FindCookies",
    "FindCurvePath",
    "FindCycle",
    "FindDevices",
    "FindDistribution",
    "FindDistributionParameters",
    "FindDivisions",
    "FindEdgeColoring",
    "FindEdgeCover",
    "FindEdgeCut",
    "FindEdgeIndependentPaths",
    "FindEquationalProof",
    "FindEulerianCycle",
    "FindExternalEvaluators",
    "FindFaces",
    "FindFile",
    "FindFit",
    "FindFormula",
    "FindFundamentalCycles",
    "FindGeneratingFunction",
    "FindGeoLocation",
    "FindGeometricConjectures",
    "FindGeometricTransform",
    "FindGraphCommunities",
    "FindGraphIsomorphism",
    "FindGraphPartition",
    "FindHamiltonianCycle",
    "FindHamiltonianPath",
    "FindHiddenMarkovStates",
    "FindImageText",
    "FindIndependentEdgeSet",
    "FindIndependentVertexSet",
    "FindInstance",
    "FindIntegerNullVector",
    "FindIsomers",
    "FindIsomorphicSubgraph",
    "FindKClan",
    "FindKClique",
    "FindKClub",
    "FindKPlex",
    "FindLibrary",
    "FindLinearRecurrence",
    "FindList",
    "FindMatchingColor",
    "FindMaximum",
    "FindMaximumCut",
    "FindMaximumFlow",
    "FindMaxValue",
    "FindMeshDefects",
    "FindMinimum",
    "FindMinimumCostFlow",
    "FindMinimumCut",
    "FindMinValue",
    "FindMoleculeSubstructure",
    "FindPath",
    "FindPeaks",
    "FindPermutation",
    "FindPlanarColoring",
    "FindPointProcessParameters",
    "FindPostmanTour",
    "FindProcessParameters",
    "FindRegionTransform",
    "FindRepeat",
    "FindRoot",
    "FindSequenceFunction",
    "FindSettings",
    "FindShortestPath",
    "FindShortestTour",
    "FindSpanningTree",
    "FindSubgraphIsomorphism",
    "FindSystemModelEquilibrium",
    "FindTextualAnswer",
    "FindThreshold",
    "FindTransientRepeat",
    "FindVertexColoring",
    "FindVertexCover",
    "FindVertexCut",
    "FindVertexIndependentPaths",
    "Fine",
    "FinishDynamic",
    "FiniteAbelianGroupCount",
    "FiniteGroupCount",
    "FiniteGroupData",
    "First",
    "FirstCase",
    "FirstPassageTimeDistribution",
    "FirstPosition",
    "FischerGroupFi22",
    "FischerGroupFi23",
    "FischerGroupFi24Prime",
    "FisherHypergeometricDistribution",
    "FisherRatioTest",
    "FisherZDistribution",
    "Fit",
    "FitAll",
    "FitRegularization",
    "FittedModel",
    "FixedOrder",
    "FixedPoint",
    "FixedPointList",
    "FlashSelection",
    "Flat",
    "FlatShading",
    "Flatten",
    "FlattenAt",
    "FlattenLayer",
    "FlatTopWindow",
    "FlightData",
    "FlipView",
    "Floor",
    "FlowPolynomial",
    "Fold",
    "FoldList",
    "FoldPair",
    "FoldPairList",
    "FoldWhile",
    "FoldWhileList",
    "FollowRedirects",
    "Font",
    "FontColor",
    "FontFamily",
    "FontForm",
    "FontName",
    "FontOpacity",
    "FontPostScriptName",
    "FontProperties",
    "FontReencoding",
    "FontSize",
    "FontSlant",
    "FontSubstitutions",
    "FontTracking",
    "FontVariations",
    "FontWeight",
    "For",
    "ForAll",
    "ForAllType",
    "ForceVersionInstall",
    "Format",
    "FormatRules",
    "FormatType",
    "FormatTypeAutoConvert",
    "FormatValues",
    "FormBox",
    "FormBoxOptions",
    "FormControl",
    "FormFunction",
    "FormLayoutFunction",
    "FormObject",
    "FormPage",
    "FormProtectionMethod",
    "FormTheme",
    "FormulaData",
    "FormulaLookup",
    "FortranForm",
    "Forward",
    "ForwardBackward",
    "ForwardCloudCredentials",
    "Fourier",
    "FourierCoefficient",
    "FourierCosCoefficient",
    "FourierCosSeries",
    "FourierCosTransform",
    "FourierDCT",
    "FourierDCTFilter",
    "FourierDCTMatrix",
    "FourierDST",
    "FourierDSTMatrix",
    "FourierMatrix",
    "FourierParameters",
    "FourierSequenceTransform",
    "FourierSeries",
    "FourierSinCoefficient",
    "FourierSinSeries",
    "FourierSinTransform",
    "FourierTransform",
    "FourierTrigSeries",
    "FoxH",
    "FoxHReduce",
    "FractionalBrownianMotionProcess",
    "FractionalD",
    "FractionalGaussianNoiseProcess",
    "FractionalPart",
    "FractionBox",
    "FractionBoxOptions",
    "FractionLine",
    "Frame",
    "FrameBox",
    "FrameBoxOptions",
    "Framed",
    "FrameInset",
    "FrameLabel",
    "Frameless",
    "FrameListVideo",
    "FrameMargins",
    "FrameRate",
    "FrameStyle",
    "FrameTicks",
    "FrameTicksStyle",
    "FRatioDistribution",
    "FrechetDistribution",
    "FreeQ",
    "FrenetSerretSystem",
    "FrequencySamplingFilterKernel",
    "FresnelC",
    "FresnelF",
    "FresnelG",
    "FresnelS",
    "Friday",
    "FrobeniusNumber",
    "FrobeniusSolve",
    "FromAbsoluteTime",
    "FromCharacterCode",
    "FromCoefficientRules",
    "FromContinuedFraction",
    "FromDate",
    "FromDateString",
    "FromDigits",
    "FromDMS",
    "FromEntity",
    "FromJulianDate",
    "FromLetterNumber",
    "FromPolarCoordinates",
    "FromRawPointer",
    "FromRomanNumeral",
    "FromSphericalCoordinates",
    "FromUnixTime",
    "Front",
    "FrontEndDynamicExpression",
    "FrontEndEventActions",
    "FrontEndExecute",
    "FrontEndObject",
    "FrontEndResource",
    "FrontEndResourceString",
    "FrontEndStackSize",
    "FrontEndToken",
    "FrontEndTokenExecute",
    "FrontEndValueCache",
    "FrontEndVersion",
    "FrontFaceColor",
    "FrontFaceGlowColor",
    "FrontFaceOpacity",
    "FrontFaceSpecularColor",
    "FrontFaceSpecularExponent",
    "FrontFaceSurfaceAppearance",
    "FrontFaceTexture",
    "Full",
    "FullAxes",
    "FullDefinition",
    "FullForm",
    "FullGraphics",
    "FullInformationOutputRegulator",
    "FullOptions",
    "FullRegion",
    "FullSimplify",
    "Function",
    "FunctionAnalytic",
    "FunctionBijective",
    "FunctionCompile",
    "FunctionCompileExport",
    "FunctionCompileExportByteArray",
    "FunctionCompileExportLibrary",
    "FunctionCompileExportString",
    "FunctionContinuous",
    "FunctionConvexity",
    "FunctionDeclaration",
    "FunctionDiscontinuities",
    "FunctionDomain",
    "FunctionExpand",
    "FunctionInjective",
    "FunctionInterpolation",
    "FunctionLayer",
    "FunctionMeromorphic",
    "FunctionMonotonicity",
    "FunctionPeriod",
    "FunctionPoles",
    "FunctionRange",
    "FunctionSign",
    "FunctionSingularities",
    "FunctionSpace",
    "FunctionSurjective",
    "FussellVeselyImportance",
    "GaborFilter",
    "GaborMatrix",
    "GaborWavelet",
    "GainMargins",
    "GainPhaseMargins",
    "GalaxyData",
    "GalleryView",
    "Gamma",
    "GammaDistribution",
    "GammaRegularized",
    "GapPenalty",
    "GARCHProcess",
    "GatedRecurrentLayer",
    "Gather",
    "GatherBy",
    "GaugeFaceElementFunction",
    "GaugeFaceStyle",
    "GaugeFrameElementFunction",
    "GaugeFrameSize",
    "GaugeFrameStyle",
    "GaugeLabels",
    "GaugeMarkers",
    "GaugeStyle",
    "GaussianFilter",
    "GaussianIntegers",
    "GaussianMatrix",
    "GaussianOrthogonalMatrixDistribution",
    "GaussianSymplecticMatrixDistribution",
    "GaussianUnitaryMatrixDistribution",
    "GaussianWindow",
    "GCD",
    "GegenbauerC",
    "General",
    "GeneralizedLinearModelFit",
    "GenerateAsymmetricKeyPair",
    "GenerateConditions",
    "GeneratedAssetFormat",
    "GeneratedAssetLocation",
    "GeneratedCell",
    "GeneratedCellStyles",
    "GeneratedDocumentBinding",
    "GenerateDerivedKey",
    "GenerateDigitalSignature",
    "GenerateDocument",
    "GeneratedParameters",
    "GeneratedQuantityMagnitudes",
    "GenerateFileSignature",
    "GenerateHTTPResponse",
    "GenerateSecuredAuthenticationKey",
    "GenerateSymmetricKey",
    "GeneratingFunction",
    "GeneratorDescription",
    "GeneratorHistoryLength",
    "GeneratorOutputType",
    "Generic",
    "GenericCylindricalDecomposition",
    "GenomeData",
    "GenomeLookup",
    "GeoAntipode",
    "GeoArea",
    "GeoArraySize",
    "GeoBackground",
    "GeoBoundary",
    "GeoBoundingBox",
    "GeoBounds",
    "GeoBoundsRegion",
    "GeoBoundsRegionBoundary",
    "GeoBubbleChart",
    "GeoCenter",
    "GeoCircle",
    "GeoContourPlot",
    "GeoDensityPlot",
    "GeodesicClosing",
    "GeodesicDilation",
    "GeodesicErosion",
    "GeodesicOpening",
    "GeodesicPolyhedron",
    "GeoDestination",
    "GeodesyData",
    "GeoDirection",
    "GeoDisk",
    "GeoDisplacement",
    "GeoDistance",
    "GeoDistanceList",
    "GeoElevationData",
    "GeoEntities",
    "GeoGraphics",
    "GeoGraphPlot",
    "GeoGraphValuePlot",
    "GeogravityModelData",
    "GeoGridDirectionDifference",
    "GeoGridLines",
    "GeoGridLinesStyle",
    "GeoGridPosition",
    "GeoGridRange",
    "GeoGridRangePadding",
    "GeoGridUnitArea",
    "GeoGridUnitDistance",
    "GeoGridVector",
    "GeoGroup",
    "GeoHemisphere",
    "GeoHemisphereBoundary",
    "GeoHistogram",
    "GeoIdentify",
    "GeoImage",
    "GeoLabels",
    "GeoLength",
    "GeoListPlot",
    "GeoLocation",
    "GeologicalPeriodData",
    "GeomagneticModelData",
    "GeoMarker",
    "GeometricAssertion",
    "GeometricBrownianMotionProcess",
    "GeometricDistribution",
    "GeometricMean",
    "GeometricMeanFilter",
    "GeometricOptimization",
    "GeometricScene",
    "GeometricStep",
    "GeometricStylingRules",
    "GeometricTest",
    "GeometricTransformation",
    "GeometricTransformation3DBox",
    "GeometricTransformation3DBoxOptions",
    "GeometricTransformationBox",
    "GeometricTransformationBoxOptions",
    "GeoModel",
    "GeoNearest",
    "GeoOrientationData",
    "GeoPath",
    "GeoPolygon",
    "GeoPosition",
    "GeoPositionENU",
    "GeoPositionXYZ",
    "GeoProjection",
    "GeoProjectionData",
    "GeoRange",
    "GeoRangePadding",
    "GeoRegionValuePlot",
    "GeoResolution",
    "GeoScaleBar",
    "GeoServer",
    "GeoSmoothHistogram",
    "GeoStreamPlot",
    "GeoStyling",
    "GeoStylingImageFunction",
    "GeoVariant",
    "GeoVector",
    "GeoVectorENU",
    "GeoVectorPlot",
    "GeoVectorXYZ",
    "GeoVisibleRegion",
    "GeoVisibleRegionBoundary",
    "GeoWithinQ",
    "GeoZoomLevel",
    "GestureHandler",
    "GestureHandlerTag",
    "Get",
    "GetContext",
    "GetEnvironment",
    "GetFileName",
    "GetLinebreakInformationPacket",
    "GibbsPointProcess",
    "Glaisher",
    "GlobalClusteringCoefficient",
    "GlobalPreferences",
    "GlobalSession",
    "Glow",
    "GoldenAngle",
    "GoldenRatio",
    "GompertzMakehamDistribution",
    "GoochShading",
    "GoodmanKruskalGamma",
    "GoodmanKruskalGammaTest",
    "Goto",
    "GouraudShading",
    "Grad",
    "Gradient",
    "GradientFilter",
    "GradientFittedMesh",
    "GradientOrientationFilter",
    "GrammarApply",
    "GrammarRules",
    "GrammarToken",
    "Graph",
    "Graph3D",
    "GraphAssortativity",
    "GraphAutomorphismGroup",
    "GraphCenter",
    "GraphComplement",
    "GraphData",
    "GraphDensity",
    "GraphDiameter",
    "GraphDifference",
    "GraphDisjointUnion",
    "GraphDistance",
    "GraphDistanceMatrix",
    "GraphEmbedding",
    "GraphHighlight",
    "GraphHighlightStyle",
    "GraphHub",
    "Graphics",
    "Graphics3D",
    "Graphics3DBox",
    "Graphics3DBoxOptions",
    "GraphicsArray",
    "GraphicsBaseline",
    "GraphicsBox",
    "GraphicsBoxOptions",
    "GraphicsColor",
    "GraphicsColumn",
    "GraphicsComplex",
    "GraphicsComplex3DBox",
    "GraphicsComplex3DBoxOptions",
    "GraphicsComplexBox",
    "GraphicsComplexBoxOptions",
    "GraphicsContents",
    "GraphicsData",
    "GraphicsGrid",
    "GraphicsGridBox",
    "GraphicsGroup",
    "GraphicsGroup3DBox",
    "GraphicsGroup3DBoxOptions",
    "GraphicsGroupBox",
    "GraphicsGroupBoxOptions",
    "GraphicsGrouping",
    "GraphicsHighlightColor",
    "GraphicsRow",
    "GraphicsSpacing",
    "GraphicsStyle",
    "GraphIntersection",
    "GraphJoin",
    "GraphLayerLabels",
    "GraphLayers",
    "GraphLayerStyle",
    "GraphLayout",
    "GraphLinkEfficiency",
    "GraphPeriphery",
    "GraphPlot",
    "GraphPlot3D",
    "GraphPower",
    "GraphProduct",
    "GraphPropertyDistribution",
    "GraphQ",
    "GraphRadius",
    "GraphReciprocity",
    "GraphRoot",
    "GraphStyle",
    "GraphSum",
    "GraphTree",
    "GraphUnion",
    "Gray",
    "GrayLevel",
    "Greater",
    "GreaterEqual",
    "GreaterEqualLess",
    "GreaterEqualThan",
    "GreaterFullEqual",
    "GreaterGreater",
    "GreaterLess",
    "GreaterSlantEqual",
    "GreaterThan",
    "GreaterTilde",
    "GreekStyle",
    "Green",
    "GreenFunction",
    "Grid",
    "GridBaseline",
    "GridBox",
    "GridBoxAlignment",
    "GridBoxBackground",
    "GridBoxDividers",
    "GridBoxFrame",
    "GridBoxItemSize",
    "GridBoxItemStyle",
    "GridBoxOptions",
    "GridBoxSpacings",
    "GridCreationSettings",
    "GridDefaultElement",
    "GridElementStyleOptions",
    "GridFrame",
    "GridFrameMargins",
    "GridGraph",
    "GridLines",
    "GridLinesStyle",
    "GridVideo",
    "GroebnerBasis",
    "GroupActionBase",
    "GroupBy",
    "GroupCentralizer",
    "GroupElementFromWord",
    "GroupElementPosition",
    "GroupElementQ",
    "GroupElements",
    "GroupElementToWord",
    "GroupGenerators",
    "Groupings",
    "GroupMultiplicationTable",
    "GroupOpenerColor",
    "GroupOpenerInsideFrame",
    "GroupOrbits",
    "GroupOrder",
    "GroupPageBreakWithin",
    "GroupSetwiseStabilizer",
    "GroupStabilizer",
    "GroupStabilizerChain",
    "GroupTogetherGrouping",
    "GroupTogetherNestedGrouping",
    "GrowCutComponents",
    "Gudermannian",
    "GuidedFilter",
    "GumbelDistribution",
    "HaarWavelet",
    "HadamardMatrix",
    "HalfLine",
    "HalfNormalDistribution",
    "HalfPlane",
    "HalfSpace",
    "HalftoneShading",
    "HamiltonianGraphQ",
    "HammingDistance",
    "HammingWindow",
    "HandlerFunctions",
    "HandlerFunctionsKeys",
    "HankelH1",
    "HankelH2",
    "HankelMatrix",
    "HankelTransform",
    "HannPoissonWindow",
    "HannWindow",
    "HaradaNortonGroupHN",
    "HararyGraph",
    "HardcorePointProcess",
    "HarmonicMean",
    "HarmonicMeanFilter",
    "HarmonicNumber",
    "Hash",
    "HatchFilling",
    "HatchShading",
    "Haversine",
    "HazardFunction",
    "Head",
    "HeadCompose",
    "HeaderAlignment",
    "HeaderBackground",
    "HeaderDisplayFunction",
    "HeaderLines",
    "Headers",
    "HeaderSize",
    "HeaderStyle",
    "Heads",
    "HeatFluxValue",
    "HeatInsulationValue",
    "HeatOutflowValue",
    "HeatRadiationValue",
    "HeatSymmetryValue",
    "HeatTemperatureCondition",
    "HeatTransferPDEComponent",
    "HeatTransferValue",
    "HeavisideLambda",
    "HeavisidePi",
    "HeavisideTheta",
    "HeldGroupHe",
    "HeldPart",
    "HelmholtzPDEComponent",
    "HelpBrowserLookup",
    "HelpBrowserNotebook",
    "HelpBrowserSettings",
    "HelpViewerSettings",
    "Here",
    "HermiteDecomposition",
    "HermiteH",
    "Hermitian",
    "HermitianMatrixQ",
    "HessenbergDecomposition",
    "Hessian",
    "HeunB",
    "HeunBPrime",
    "HeunC",
    "HeunCPrime",
    "HeunD",
    "HeunDPrime",
    "HeunG",
    "HeunGPrime",
    "HeunT",
    "HeunTPrime",
    "HexadecimalCharacter",
    "Hexahedron",
    "HexahedronBox",
    "HexahedronBoxOptions",
    "HiddenItems",
    "HiddenMarkovProcess",
    "HiddenSurface",
    "Highlighted",
    "HighlightGraph",
    "HighlightImage",
    "HighlightMesh",
    "HighlightString",
    "HighpassFilter",
    "HigmanSimsGroupHS",
    "HilbertCurve",
    "HilbertFilter",
    "HilbertMatrix",
    "Histogram",
    "Histogram3D",
    "HistogramDistribution",
    "HistogramList",
    "HistogramPointDensity",
    "HistogramTransform",
    "HistogramTransformInterpolation",
    "HistoricalPeriodData",
    "HitMissTransform",
    "HITSCentrality",
    "HjorthDistribution",
    "HodgeDual",
    "HoeffdingD",
    "HoeffdingDTest",
    "Hold",
    "HoldAll",
    "HoldAllComplete",
    "HoldComplete",
    "HoldFirst",
    "HoldForm",
    "HoldPattern",
    "HoldRest",
    "HolidayCalendar",
    "HomeDirectory",
    "HomePage",
    "Horizontal",
    "HorizontalForm",
    "HorizontalGauge",
    "HorizontalScrollPosition",
    "HornerForm",
    "HostLookup",
    "HotellingTSquareDistribution",
    "HoytDistribution",
    "HTMLSave",
    "HTTPErrorResponse",
    "HTTPRedirect",
    "HTTPRequest",
    "HTTPRequestData",
    "HTTPResponse",
    "Hue",
    "HumanGrowthData",
    "HumpDownHump",
    "HumpEqual",
    "HurwitzLerchPhi",
    "HurwitzZeta",
    "HyperbolicDistribution",
    "HypercubeGraph",
    "HyperexponentialDistribution",
    "Hyperfactorial",
    "Hypergeometric0F1",
    "Hypergeometric0F1Regularized",
    "Hypergeometric1F1",
    "Hypergeometric1F1Regularized",
    "Hypergeometric2F1",
    "Hypergeometric2F1Regularized",
    "HypergeometricDistribution",
    "HypergeometricPFQ",
    "HypergeometricPFQRegularized",
    "HypergeometricU",
    "Hyperlink",
    "HyperlinkAction",
    "HyperlinkCreationSettings",
    "Hyperplane",
    "Hyphenation",
    "HyphenationOptions",
    "HypoexponentialDistribution",
    "HypothesisTestData",
    "I",
    "IconData",
    "Iconize",
    "IconizedObject",
    "IconRules",
    "Icosahedron",
    "Identity",
    "IdentityMatrix",
    "If",
    "IfCompiled",
    "IgnoreCase",
    "IgnoreDiacritics",
    "IgnoreIsotopes",
    "IgnorePunctuation",
    "IgnoreSpellCheck",
    "IgnoreStereochemistry",
    "IgnoringInactive",
    "Im",
    "Image",
    "Image3D",
    "Image3DProjection",
    "Image3DSlices",
    "ImageAccumulate",
    "ImageAdd",
    "ImageAdjust",
    "ImageAlign",
    "ImageApply",
    "ImageApplyIndexed",
    "ImageAspectRatio",
    "ImageAssemble",
    "ImageAugmentationLayer",
    "ImageBoundingBoxes",
    "ImageCache",
    "ImageCacheValid",
    "ImageCapture",
    "ImageCaptureFunction",
    "ImageCases",
    "ImageChannels",
    "ImageClip",
    "ImageCollage",
    "ImageColorSpace",
    "ImageCompose",
    "ImageContainsQ",
    "ImageContents",
    "ImageConvolve",
    "ImageCooccurrence",
    "ImageCorners",
    "ImageCorrelate",
    "ImageCorrespondingPoints",
    "ImageCrop",
    "ImageData",
    "ImageDeconvolve",
    "ImageDemosaic",
    "ImageDifference",
    "ImageDimensions",
    "ImageDisplacements",
    "ImageDistance",
    "ImageEditMode",
    "ImageEffect",
    "ImageExposureCombine",
    "ImageFeatureTrack",
    "ImageFileApply",
    "ImageFileFilter",
    "ImageFileScan",
    "ImageFilter",
    "ImageFocusCombine",
    "ImageForestingComponents",
    "ImageFormattingWidth",
    "ImageForwardTransformation",
    "ImageGraphics",
    "ImageHistogram",
    "ImageIdentify",
    "ImageInstanceQ",
    "ImageKeypoints",
    "ImageLabels",
    "ImageLegends",
    "ImageLevels",
    "ImageLines",
    "ImageMargins",
    "ImageMarker",
    "ImageMarkers",
    "ImageMeasurements",
    "ImageMesh",
    "ImageMultiply",
    "ImageOffset",
    "ImagePad",
    "ImagePadding",
    "ImagePartition",
    "ImagePeriodogram",
    "ImagePerspectiveTransformation",
    "ImagePosition",
    "ImagePreviewFunction",
    "ImagePyramid",
    "ImagePyramidApply",
    "ImageQ",
    "ImageRangeCache",
    "ImageRecolor",
    "ImageReflect",
    "ImageRegion",
    "ImageResize",
    "ImageResolution",
    "ImageRestyle",
    "ImageRotate",
    "ImageRotated",
    "ImageSaliencyFilter",
    "ImageScaled",
    "ImageScan",
    "ImageSize",
    "ImageSizeAction",
    "ImageSizeCache",
    "ImageSizeMultipliers",
    "ImageSizeRaw",
    "ImageStitch",
    "ImageSubtract",
    "ImageTake",
    "ImageTransformation",
    "ImageTrim",
    "ImageType",
    "ImageValue",
    "ImageValuePositions",
    "ImageVectorscopePlot",
    "ImageWaveformPlot",
    "ImagingDevice",
    "ImplicitD",
    "ImplicitRegion",
    "Implies",
    "Import",
    "ImportAutoReplacements",
    "ImportByteArray",
    "ImportedObject",
    "ImportOptions",
    "ImportString",
    "ImprovementImportance",
    "In",
    "Inactivate",
    "Inactive",
    "InactiveStyle",
    "IncidenceGraph",
    "IncidenceList",
    "IncidenceMatrix",
    "IncludeAromaticBonds",
    "IncludeConstantBasis",
    "IncludedContexts",
    "IncludeDefinitions",
    "IncludeDirectories",
    "IncludeFileExtension",
    "IncludeGeneratorTasks",
    "IncludeHydrogens",
    "IncludeInflections",
    "IncludeMetaInformation",
    "IncludePods",
    "IncludeQuantities",
    "IncludeRelatedTables",
    "IncludeSingularSolutions",
    "IncludeSingularTerm",
    "IncludeWindowTimes",
    "Increment",
    "IndefiniteMatrixQ",
    "Indent",
    "IndentingNewlineSpacings",
    "IndentMaxFraction",
    "IndependenceTest",
    "IndependentEdgeSetQ",
    "IndependentPhysicalQuantity",
    "IndependentUnit",
    "IndependentUnitDimension",
    "IndependentVertexSetQ",
    "Indeterminate",
    "IndeterminateThreshold",
    "IndexCreationOptions",
    "Indexed",
    "IndexEdgeTaggedGraph",
    "IndexGraph",
    "IndexTag",
    "Inequality",
    "InertEvaluate",
    "InertExpression",
    "InexactNumberQ",
    "InexactNumbers",
    "InfiniteFuture",
    "InfiniteLine",
    "InfiniteLineThrough",
    "InfinitePast",
    "InfinitePlane",
    "Infinity",
    "Infix",
    "InflationAdjust",
    "InflationMethod",
    "Information",
    "InformationData",
    "InformationDataGrid",
    "Inherited",
    "InheritScope",
    "InhomogeneousPoissonPointProcess",
    "InhomogeneousPoissonProcess",
    "InitialEvaluationHistory",
    "Initialization",
    "InitializationCell",
    "InitializationCellEvaluation",
    "InitializationCellWarning",
    "InitializationObject",
    "InitializationObjects",
    "InitializationValue",
    "Initialize",
    "InitialSeeding",
    "InlineCounterAssignments",
    "InlineCounterIncrements",
    "InlineRules",
    "Inner",
    "InnerPolygon",
    "InnerPolyhedron",
    "Inpaint",
    "Input",
    "InputAliases",
    "InputAssumptions",
    "InputAutoReplacements",
    "InputField",
    "InputFieldBox",
    "InputFieldBoxOptions",
    "InputForm",
    "InputGrouping",
    "InputNamePacket",
    "InputNotebook",
    "InputPacket",
    "InputPorts",
    "InputSettings",
    "InputStream",
    "InputString",
    "InputStringPacket",
    "InputToBoxFormPacket",
    "Insert",
    "InsertionFunction",
    "InsertionPointObject",
    "InsertLinebreaks",
    "InsertResults",
    "Inset",
    "Inset3DBox",
    "Inset3DBoxOptions",
    "InsetBox",
    "InsetBoxOptions",
    "Insphere",
    "Install",
    "InstallService",
    "InstanceNormalizationLayer",
    "InString",
    "Integer",
    "IntegerDigits",
    "IntegerExponent",
    "IntegerLength",
    "IntegerName",
    "IntegerPart",
    "IntegerPartitions",
    "IntegerQ",
    "IntegerReverse",
    "Integers",
    "IntegerString",
    "Integral",
    "Integrate",
    "IntegrateChangeVariables",
    "Interactive",
    "InteractiveTradingChart",
    "InterfaceSwitched",
    "Interlaced",
    "Interleaving",
    "InternallyBalancedDecomposition",
    "InterpolatingFunction",
    "InterpolatingPolynomial",
    "Interpolation",
    "InterpolationOrder",
    "InterpolationPoints",
    "InterpolationPrecision",
    "Interpretation",
    "InterpretationBox",
    "InterpretationBoxOptions",
    "InterpretationFunction",
    "Interpreter",
    "InterpretTemplate",
    "InterquartileRange",
    "Interrupt",
    "InterruptSettings",
    "IntersectedEntityClass",
    "IntersectingQ",
    "Intersection",
    "Interval",
    "IntervalIntersection",
    "IntervalMarkers",
    "IntervalMarkersStyle",
    "IntervalMemberQ",
    "IntervalSlider",
    "IntervalUnion",
    "Into",
    "Inverse",
    "InverseBetaRegularized",
    "InverseBilateralLaplaceTransform",
    "InverseBilateralZTransform",
    "InverseCDF",
    "InverseChiSquareDistribution",
    "InverseContinuousWaveletTransform",
    "InverseDistanceTransform",
    "InverseEllipticNomeQ",
    "InverseErf",
    "InverseErfc",
    "InverseFourier",
    "InverseFourierCosTransform",
    "InverseFourierSequenceTransform",
    "InverseFourierSinTransform",
    "InverseFourierTransform",
    "InverseFunction",
    "InverseFunctions",
    "InverseGammaDistribution",
    "InverseGammaRegularized",
    "InverseGaussianDistribution",
    "InverseGudermannian",
    "InverseHankelTransform",
    "InverseHaversine",
    "InverseImagePyramid",
    "InverseJacobiCD",
    "InverseJacobiCN",
    "InverseJacobiCS",
    "InverseJacobiDC",
    "InverseJacobiDN",
    "InverseJacobiDS",
    "InverseJacobiNC",
    "InverseJacobiND",
    "InverseJacobiNS",
    "InverseJacobiSC",
    "InverseJacobiSD",
    "InverseJacobiSN",
    "InverseLaplaceTransform",
    "InverseMellinTransform",
    "InversePermutation",
    "InverseRadon",
    "InverseRadonTransform",
    "InverseSeries",
    "InverseShortTimeFourier",
    "InverseSpectrogram",
    "InverseSurvivalFunction",
    "InverseTransformedRegion",
    "InverseWaveletTransform",
    "InverseWeierstrassP",
    "InverseWishartMatrixDistribution",
    "InverseZTransform",
    "Invisible",
    "InvisibleApplication",
    "InvisibleTimes",
    "IPAddress",
    "IrreduciblePolynomialQ",
    "IslandData",
    "IsolatingInterval",
    "IsomorphicGraphQ",
    "IsomorphicSubgraphQ",
    "IsotopeData",
    "Italic",
    "Item",
    "ItemAspectRatio",
    "ItemBox",
    "ItemBoxOptions",
    "ItemDisplayFunction",
    "ItemSize",
    "ItemStyle",
    "ItoProcess",
    "JaccardDissimilarity",
    "JacobiAmplitude",
    "Jacobian",
    "JacobiCD",
    "JacobiCN",
    "JacobiCS",
    "JacobiDC",
    "JacobiDN",
    "JacobiDS",
    "JacobiEpsilon",
    "JacobiNC",
    "JacobiND",
    "JacobiNS",
    "JacobiP",
    "JacobiSC",
    "JacobiSD",
    "JacobiSN",
    "JacobiSymbol",
    "JacobiZeta",
    "JacobiZN",
    "JankoGroupJ1",
    "JankoGroupJ2",
    "JankoGroupJ3",
    "JankoGroupJ4",
    "JarqueBeraALMTest",
    "JohnsonDistribution",
    "Join",
    "JoinAcross",
    "Joined",
    "JoinedCurve",
    "JoinedCurveBox",
    "JoinedCurveBoxOptions",
    "JoinForm",
    "JordanDecomposition",
    "JordanModelDecomposition",
    "JulianDate",
    "JuliaSetBoettcher",
    "JuliaSetIterationCount",
    "JuliaSetPlot",
    "JuliaSetPoints",
    "K",
    "KagiChart",
    "KaiserBesselWindow",
    "KaiserWindow",
    "KalmanEstimator",
    "KalmanFilter",
    "KarhunenLoeveDecomposition",
    "KaryTree",
    "KatzCentrality",
    "KCoreComponents",
    "KDistribution",
    "KEdgeConnectedComponents",
    "KEdgeConnectedGraphQ",
    "KeepExistingVersion",
    "KelvinBei",
    "KelvinBer",
    "KelvinKei",
    "KelvinKer",
    "KendallTau",
    "KendallTauTest",
    "KernelConfiguration",
    "KernelExecute",
    "KernelFunction",
    "KernelMixtureDistribution",
    "KernelObject",
    "Kernels",
    "Ket",
    "Key",
    "KeyCollisionFunction",
    "KeyComplement",
    "KeyDrop",
    "KeyDropFrom",
    "KeyExistsQ",
    "KeyFreeQ",
    "KeyIntersection",
    "KeyMap",
    "KeyMemberQ",
    "KeypointStrength",
    "Keys",
    "KeySelect",
    "KeySort",
    "KeySortBy",
    "KeyTake",
    "KeyUnion",
    "KeyValueMap",
    "KeyValuePattern",
    "Khinchin",
    "KillProcess",
    "KirchhoffGraph",
    "KirchhoffMatrix",
    "KleinInvariantJ",
    "KnapsackSolve",
    "KnightTourGraph",
    "KnotData",
    "KnownUnitQ",
    "KochCurve",
    "KolmogorovSmirnovTest",
    "KroneckerDelta",
    "KroneckerModelDecomposition",
    "KroneckerProduct",
    "KroneckerSymbol",
    "KuiperTest",
    "KumaraswamyDistribution",
    "Kurtosis",
    "KuwaharaFilter",
    "KVertexConnectedComponents",
    "KVertexConnectedGraphQ",
    "LABColor",
    "Label",
    "Labeled",
    "LabeledSlider",
    "LabelingFunction",
    "LabelingSize",
    "LabelStyle",
    "LabelVisibility",
    "LaguerreL",
    "LakeData",
    "LambdaComponents",
    "LambertW",
    "LameC",
    "LameCPrime",
    "LameEigenvalueA",
    "LameEigenvalueB",
    "LameS",
    "LameSPrime",
    "LaminaData",
    "LanczosWindow",
    "LandauDistribution",
    "Language",
    "LanguageCategory",
    "LanguageData",
    "LanguageIdentify",
    "LanguageOptions",
    "LaplaceDistribution",
    "LaplaceTransform",
    "Laplacian",
    "LaplacianFilter",
    "LaplacianGaussianFilter",
    "LaplacianPDETerm",
    "Large",
    "Larger",
    "Last",
    "Latitude",
    "LatitudeLongitude",
    "LatticeData",
    "LatticeReduce",
    "Launch",
    "LaunchKernels",
    "LayeredGraphPlot",
    "LayeredGraphPlot3D",
    "LayerSizeFunction",
    "LayoutInformation",
    "LCHColor",
    "LCM",
    "LeaderSize",
    "LeafCount",
    "LeapVariant",
    "LeapYearQ",
    "LearnDistribution",
    "LearnedDistribution",
    "LearningRate",
    "LearningRateMultipliers",
    "LeastSquares",
    "LeastSquaresFilterKernel",
    "Left",
    "LeftArrow",
    "LeftArrowBar",
    "LeftArrowRightArrow",
    "LeftDownTeeVector",
    "LeftDownVector",
    "LeftDownVectorBar",
    "LeftRightArrow",
    "LeftRightVector",
    "LeftTee",
    "LeftTeeArrow",
    "LeftTeeVector",
    "LeftTriangle",
    "LeftTriangleBar",
    "LeftTriangleEqual",
    "LeftUpDownVector",
    "LeftUpTeeVector",
    "LeftUpVector",
    "LeftUpVectorBar",
    "LeftVector",
    "LeftVectorBar",
    "LegendAppearance",
    "Legended",
    "LegendFunction",
    "LegendLabel",
    "LegendLayout",
    "LegendMargins",
    "LegendMarkers",
    "LegendMarkerSize",
    "LegendreP",
    "LegendreQ",
    "LegendreType",
    "Length",
    "LengthWhile",
    "LerchPhi",
    "Less",
    "LessEqual",
    "LessEqualGreater",
    "LessEqualThan",
    "LessFullEqual",
    "LessGreater",
    "LessLess",
    "LessSlantEqual",
    "LessThan",
    "LessTilde",
    "LetterCharacter",
    "LetterCounts",
    "LetterNumber",
    "LetterQ",
    "Level",
    "LeveneTest",
    "LeviCivitaTensor",
    "LevyDistribution",
    "Lexicographic",
    "LexicographicOrder",
    "LexicographicSort",
    "LibraryDataType",
    "LibraryFunction",
    "LibraryFunctionDeclaration",
    "LibraryFunctionError",
    "LibraryFunctionInformation",
    "LibraryFunctionLoad",
    "LibraryFunctionUnload",
    "LibraryLoad",
    "LibraryUnload",
    "LicenseEntitlementObject",
    "LicenseEntitlements",
    "LicenseID",
    "LicensingSettings",
    "LiftingFilterData",
    "LiftingWaveletTransform",
    "LightBlue",
    "LightBrown",
    "LightCyan",
    "Lighter",
    "LightGray",
    "LightGreen",
    "Lighting",
    "LightingAngle",
    "LightMagenta",
    "LightOrange",
    "LightPink",
    "LightPurple",
    "LightRed",
    "LightSources",
    "LightYellow",
    "Likelihood",
    "Limit",
    "LimitsPositioning",
    "LimitsPositioningTokens",
    "LindleyDistribution",
    "Line",
    "Line3DBox",
    "Line3DBoxOptions",
    "LinearFilter",
    "LinearFractionalOptimization",
    "LinearFractionalTransform",
    "LinearGradientFilling",
    "LinearGradientImage",
    "LinearizingTransformationData",
    "LinearLayer",
    "LinearModelFit",
    "LinearOffsetFunction",
    "LinearOptimization",
    "LinearProgramming",
    "LinearRecurrence",
    "LinearSolve",
    "LinearSolveFunction",
    "LineBox",
    "LineBoxOptions",
    "LineBreak",
    "LinebreakAdjustments",
    "LineBreakChart",
    "LinebreakSemicolonWeighting",
    "LineBreakWithin",
    "LineColor",
    "LineGraph",
    "LineIndent",
    "LineIndentMaxFraction",
    "LineIntegralConvolutionPlot",
    "LineIntegralConvolutionScale",
    "LineLegend",
    "LineOpacity",
    "LineSpacing",
    "LineWrapParts",
    "LinkActivate",
    "LinkClose",
    "LinkConnect",
    "LinkConnectedQ",
    "LinkCreate",
    "LinkError",
    "LinkFlush",
    "LinkFunction",
    "LinkHost",
    "LinkInterrupt",
    "LinkLaunch",
    "LinkMode",
    "LinkObject",
    "LinkOpen",
    "LinkOptions",
    "LinkPatterns",
    "LinkProtocol",
    "LinkRankCentrality",
    "LinkRead",
    "LinkReadHeld",
    "LinkReadyQ",
    "Links",
    "LinkService",
    "LinkWrite",
    "LinkWriteHeld",
    "LiouvilleLambda",
    "List",
    "Listable",
    "ListAnimate",
    "ListContourPlot",
    "ListContourPlot3D",
    "ListConvolve",
    "ListCorrelate",
    "ListCurvePathPlot",
    "ListDeconvolve",
    "ListDensityPlot",
    "ListDensityPlot3D",
    "Listen",
    "ListFormat",
    "ListFourierSequenceTransform",
    "ListInterpolation",
    "ListLineIntegralConvolutionPlot",
    "ListLinePlot",
    "ListLinePlot3D",
    "ListLogLinearPlot",
    "ListLogLogPlot",
    "ListLogPlot",
    "ListPicker",
    "ListPickerBox",
    "ListPickerBoxBackground",
    "ListPickerBoxOptions",
    "ListPlay",
    "ListPlot",
    "ListPlot3D",
    "ListPointPlot3D",
    "ListPolarPlot",
    "ListQ",
    "ListSliceContourPlot3D",
    "ListSliceDensityPlot3D",
    "ListSliceVectorPlot3D",
    "ListStepPlot",
    "ListStreamDensityPlot",
    "ListStreamPlot",
    "ListStreamPlot3D",
    "ListSurfacePlot3D",
    "ListVectorDensityPlot",
    "ListVectorDisplacementPlot",
    "ListVectorDisplacementPlot3D",
    "ListVectorPlot",
    "ListVectorPlot3D",
    "ListZTransform",
    "Literal",
    "LiteralSearch",
    "LiteralType",
    "LoadCompiledComponent",
    "LocalAdaptiveBinarize",
    "LocalCache",
    "LocalClusteringCoefficient",
    "LocalEvaluate",
    "LocalizeDefinitions",
    "LocalizeVariables",
    "LocalObject",
    "LocalObjects",
    "LocalResponseNormalizationLayer",
    "LocalSubmit",
    "LocalSymbol",
    "LocalTime",
    "LocalTimeZone",
    "LocationEquivalenceTest",
    "LocationTest",
    "Locator",
    "LocatorAutoCreate",
    "LocatorBox",
    "LocatorBoxOptions",
    "LocatorCentering",
    "LocatorPane",
    "LocatorPaneBox",
    "LocatorPaneBoxOptions",
    "LocatorRegion",
    "Locked",
    "Log",
    "Log10",
    "Log2",
    "LogBarnesG",
    "LogGamma",
    "LogGammaDistribution",
    "LogicalExpand",
    "LogIntegral",
    "LogisticDistribution",
    "LogisticSigmoid",
    "LogitModelFit",
    "LogLikelihood",
    "LogLinearPlot",
    "LogLogisticDistribution",
    "LogLogPlot",
    "LogMultinormalDistribution",
    "LogNormalDistribution",
    "LogPlot",
    "LogRankTest",
    "LogSeriesDistribution",
    "LongEqual",
    "Longest",
    "LongestCommonSequence",
    "LongestCommonSequencePositions",
    "LongestCommonSubsequence",
    "LongestCommonSubsequencePositions",
    "LongestMatch",
    "LongestOrderedSequence",
    "LongForm",
    "Longitude",
    "LongLeftArrow",
    "LongLeftRightArrow",
    "LongRightArrow",
    "LongShortTermMemoryLayer",
    "Lookup",
    "Loopback",
    "LoopFreeGraphQ",
    "Looping",
    "LossFunction",
    "LowerCaseQ",
    "LowerLeftArrow",
    "LowerRightArrow",
    "LowerTriangularize",
    "LowerTriangularMatrix",
    "LowerTriangularMatrixQ",
    "LowpassFilter",
    "LQEstimatorGains",
    "LQGRegulator",
    "LQOutputRegulatorGains",
    "LQRegulatorGains",
    "LUBackSubstitution",
    "LucasL",
    "LuccioSamiComponents",
    "LUDecomposition",
    "LunarEclipse",
    "LUVColor",
    "LyapunovSolve",
    "LyonsGroupLy",
    "MachineID",
    "MachineName",
    "MachineNumberQ",
    "MachinePrecision",
    "MacintoshSystemPageSetup",
    "Magenta",
    "Magnification",
    "Magnify",
    "MailAddressValidation",
    "MailExecute",
    "MailFolder",
    "MailItem",
    "MailReceiverFunction",
    "MailResponseFunction",
    "MailSearch",
    "MailServerConnect",
    "MailServerConnection",
    "MailSettings",
    "MainSolve",
    "MaintainDynamicCaches",
    "Majority",
    "MakeBoxes",
    "MakeExpression",
    "MakeRules",
    "ManagedLibraryExpressionID",
    "ManagedLibraryExpressionQ",
    "MandelbrotSetBoettcher",
    "MandelbrotSetDistance",
    "MandelbrotSetIterationCount",
    "MandelbrotSetMemberQ",
    "MandelbrotSetPlot",
    "MangoldtLambda",
    "ManhattanDistance",
    "Manipulate",
    "Manipulator",
    "MannedSpaceMissionData",
    "MannWhitneyTest",
    "MantissaExponent",
    "Manual",
    "Map",
    "MapAll",
    "MapApply",
    "MapAt",
    "MapIndexed",
    "MAProcess",
    "MapThread",
    "MarchenkoPasturDistribution",
    "MarcumQ",
    "MardiaCombinedTest",
    "MardiaKurtosisTest",
    "MardiaSkewnessTest",
    "MarginalDistribution",
    "MarkovProcessProperties",
    "Masking",
    "MassConcentrationCondition",
    "MassFluxValue",
    "MassImpermeableBoundaryValue",
    "MassOutflowValue",
    "MassSymmetryValue",
    "MassTransferValue",
    "MassTransportPDEComponent",
    "MatchingDissimilarity",
    "MatchLocalNameQ",
    "MatchLocalNames",
    "MatchQ",
    "Material",
    "MaterialShading",
    "MaternPointProcess",
    "MathematicalFunctionData",
    "MathematicaNotation",
    "MathieuC",
    "MathieuCharacteristicA",
    "MathieuCharacteristicB",
    "MathieuCharacteristicExponent",
    "MathieuCPrime",
    "MathieuGroupM11",
    "MathieuGroupM12",
    "MathieuGroupM22",
    "MathieuGroupM23",
    "MathieuGroupM24",
    "MathieuS",
    "MathieuSPrime",
    "MathMLForm",
    "MathMLText",
    "Matrices",
    "MatrixExp",
    "MatrixForm",
    "MatrixFunction",
    "MatrixLog",
    "MatrixNormalDistribution",
    "MatrixPlot",
    "MatrixPower",
    "MatrixPropertyDistribution",
    "MatrixQ",
    "MatrixRank",
    "MatrixTDistribution",
    "Max",
    "MaxBend",
    "MaxCellMeasure",
    "MaxColorDistance",
    "MaxDate",
    "MaxDetect",
    "MaxDisplayedChildren",
    "MaxDuration",
    "MaxExtraBandwidths",
    "MaxExtraConditions",
    "MaxFeatureDisplacement",
    "MaxFeatures",
    "MaxFilter",
    "MaximalBy",
    "Maximize",
    "MaxItems",
    "MaxIterations",
    "MaxLimit",
    "MaxMemoryUsed",
    "MaxMixtureKernels",
    "MaxOverlapFraction",
    "MaxPlotPoints",
    "MaxPoints",
    "MaxRecursion",
    "MaxStableDistribution",
    "MaxStepFraction",
    "MaxSteps",
    "MaxStepSize",
    "MaxTrainingRounds",
    "MaxValue",
    "MaxwellDistribution",
    "MaxWordGap",
    "McLaughlinGroupMcL",
    "Mean",
    "MeanAbsoluteLossLayer",
    "MeanAround",
    "MeanClusteringCoefficient",
    "MeanDegreeConnectivity",
    "MeanDeviation",
    "MeanFilter",
    "MeanGraphDistance",
    "MeanNeighborDegree",
    "MeanPointDensity",
    "MeanShift",
    "MeanShiftFilter",
    "MeanSquaredLossLayer",
    "Median",
    "MedianDeviation",
    "MedianFilter",
    "MedicalTestData",
    "Medium",
    "MeijerG",
    "MeijerGReduce",
    "MeixnerDistribution",
    "MellinConvolve",
    "MellinTransform",
    "MemberQ",
    "MemoryAvailable",
    "MemoryConstrained",
    "MemoryConstraint",
    "MemoryInUse",
    "MengerMesh",
    "Menu",
    "MenuAppearance",
    "MenuCommandKey",
    "MenuEvaluator",
    "MenuItem",
    "MenuList",
    "MenuPacket",
    "MenuSortingValue",
    "MenuStyle",
    "MenuView",
    "Merge",
    "MergeDifferences",
    "MergingFunction",
    "MersennePrimeExponent",
    "MersennePrimeExponentQ",
    "Mesh",
    "MeshCellCentroid",
    "MeshCellCount",
    "MeshCellHighlight",
    "MeshCellIndex",
    "MeshCellLabel",
    "MeshCellMarker",
    "MeshCellMeasure",
    "MeshCellQuality",
    "MeshCells",
    "MeshCellShapeFunction",
    "MeshCellStyle",
    "MeshConnectivityGraph",
    "MeshCoordinates",
    "MeshFunctions",
    "MeshPrimitives",
    "MeshQualityGoal",
    "MeshRange",
    "MeshRefinementFunction",
    "MeshRegion",
    "MeshRegionQ",
    "MeshShading",
    "MeshStyle",
    "Message",
    "MessageDialog",
    "MessageList",
    "MessageName",
    "MessageObject",
    "MessageOptions",
    "MessagePacket",
    "Messages",
    "MessagesNotebook",
    "MetaCharacters",
    "MetaInformation",
    "MeteorShowerData",
    "Method",
    "MethodOptions",
    "MexicanHatWavelet",
    "MeyerWavelet",
    "Midpoint",
    "MIMETypeToFormatList",
    "Min",
    "MinColorDistance",
    "MinDate",
    "MinDetect",
    "MineralData",
    "MinFilter",
    "MinimalBy",
    "MinimalPolynomial",
    "MinimalStateSpaceModel",
    "Minimize",
    "MinimumTimeIncrement",
    "MinIntervalSize",
    "MinkowskiQuestionMark",
    "MinLimit",
    "MinMax",
    "MinorPlanetData",
    "Minors",
    "MinPointSeparation",
    "MinRecursion",
    "MinSize",
    "MinStableDistribution",
    "Minus",
    "MinusPlus",
    "MinValue",
    "Missing",
    "MissingBehavior",
    "MissingDataMethod",
    "MissingDataRules",
    "MissingQ",
    "MissingString",
    "MissingStyle",
    "MissingValuePattern",
    "MissingValueSynthesis",
    "MittagLefflerE",
    "MixedFractionParts",
    "MixedGraphQ",
    "MixedMagnitude",
    "MixedRadix",
    "MixedRadixQuantity",
    "MixedUnit",
    "MixtureDistribution",
    "Mod",
    "Modal",
    "Mode",
    "ModelPredictiveController",
    "Modular",
    "ModularInverse",
    "ModularLambda",
    "Module",
    "Modulus",
    "MoebiusMu",
    "Molecule",
    "MoleculeAlign",
    "MoleculeContainsQ",
    "MoleculeDraw",
    "MoleculeEquivalentQ",
    "MoleculeFreeQ",
    "MoleculeGraph",
    "MoleculeMatchQ",
    "MoleculeMaximumCommonSubstructure",
    "MoleculeModify",
    "MoleculeName",
    "MoleculePattern",
    "MoleculePlot",
    "MoleculePlot3D",
    "MoleculeProperty",
    "MoleculeQ",
    "MoleculeRecognize",
    "MoleculeSubstructureCount",
    "MoleculeValue",
    "Moment",
    "MomentConvert",
    "MomentEvaluate",
    "MomentGeneratingFunction",
    "MomentOfInertia",
    "Monday",
    "Monitor",
    "MonomialList",
    "MonomialOrder",
    "MonsterGroupM",
    "MoonPhase",
    "MoonPosition",
    "MorletWavelet",
    "MorphologicalBinarize",
    "MorphologicalBranchPoints",
    "MorphologicalComponents",
    "MorphologicalEulerNumber",
    "MorphologicalGraph",
    "MorphologicalPerimeter",
    "MorphologicalTransform",
    "MortalityData",
    "Most",
    "MountainData",
    "MouseAnnotation",
    "MouseAppearance",
    "MouseAppearanceTag",
    "MouseButtons",
    "Mouseover",
    "MousePointerNote",
    "MousePosition",
    "MovieData",
    "MovingAverage",
    "MovingMap",
    "MovingMedian",
    "MoyalDistribution",
    "MultiaxisArrangement",
    "Multicolumn",
    "MultiedgeStyle",
    "MultigraphQ",
    "MultilaunchWarning",
    "MultiLetterItalics",
    "MultiLetterStyle",
    "MultilineFunction",
    "Multinomial",
    "MultinomialDistribution",
    "MultinormalDistribution",
    "MultiplicativeOrder",
    "Multiplicity",
    "MultiplySides",
    "MultiscriptBoxOptions",
    "Multiselection",
    "MultivariateHypergeometricDistribution",
    "MultivariatePoissonDistribution",
    "MultivariateTDistribution",
    "N",
    "NakagamiDistribution",
    "NameQ",
    "Names",
    "NamespaceBox",
    "NamespaceBoxOptions",
    "Nand",
    "NArgMax",
    "NArgMin",
    "NBernoulliB",
    "NBodySimulation",
    "NBodySimulationData",
    "NCache",
    "NCaputoD",
    "NDEigensystem",
    "NDEigenvalues",
    "NDSolve",
    "NDSolveValue",
    "Nearest",
    "NearestFunction",
    "NearestMeshCells",
    "NearestNeighborG",
    "NearestNeighborGraph",
    "NearestTo",
    "NebulaData",
    "NeedlemanWunschSimilarity",
    "Needs",
    "Negative",
    "NegativeBinomialDistribution",
    "NegativeDefiniteMatrixQ",
    "NegativeIntegers",
    "NegativelyOrientedPoints",
    "NegativeMultinomialDistribution",
    "NegativeRationals",
    "NegativeReals",
    "NegativeSemidefiniteMatrixQ",
    "NeighborhoodData",
    "NeighborhoodGraph",
    "Nest",
    "NestedGreaterGreater",
    "NestedLessLess",
    "NestedScriptRules",
    "NestGraph",
    "NestList",
    "NestTree",
    "NestWhile",
    "NestWhileList",
    "NetAppend",
    "NetArray",
    "NetArrayLayer",
    "NetBidirectionalOperator",
    "NetChain",
    "NetDecoder",
    "NetDelete",
    "NetDrop",
    "NetEncoder",
    "NetEvaluationMode",
    "NetExternalObject",
    "NetExtract",
    "NetFlatten",
    "NetFoldOperator",
    "NetGANOperator",
    "NetGraph",
    "NetInformation",
    "NetInitialize",
    "NetInsert",
    "NetInsertSharedArrays",
    "NetJoin",
    "NetMapOperator",
    "NetMapThreadOperator",
    "NetMeasurements",
    "NetModel",
    "NetNestOperator",
    "NetPairEmbeddingOperator",
    "NetPort",
    "NetPortGradient",
    "NetPrepend",
    "NetRename",
    "NetReplace",
    "NetReplacePart",
    "NetSharedArray",
    "NetStateObject",
    "NetTake",
    "NetTrain",
    "NetTrainResultsObject",
    "NetUnfold",
    "NetworkPacketCapture",
    "NetworkPacketRecording",
    "NetworkPacketRecordingDuring",
    "NetworkPacketTrace",
    "NeumannValue",
    "NevilleThetaC",
    "NevilleThetaD",
    "NevilleThetaN",
    "NevilleThetaS",
    "NewPrimitiveStyle",
    "NExpectation",
    "Next",
    "NextCell",
    "NextDate",
    "NextPrime",
    "NextScheduledTaskTime",
    "NeymanScottPointProcess",
    "NFractionalD",
    "NHoldAll",
    "NHoldFirst",
    "NHoldRest",
    "NicholsGridLines",
    "NicholsPlot",
    "NightHemisphere",
    "NIntegrate",
    "NMaximize",
    "NMaxValue",
    "NMinimize",
    "NMinValue",
    "NominalScale",
    "NominalVariables",
    "NonAssociative",
    "NoncentralBetaDistribution",
    "NoncentralChiSquareDistribution",
    "NoncentralFRatioDistribution",
    "NoncentralStudentTDistribution",
    "NonCommutativeMultiply",
    "NonConstants",
    "NondimensionalizationTransform",
    "None",
    "NoneTrue",
    "NonlinearModelFit",
    "NonlinearStateSpaceModel",
    "NonlocalMeansFilter",
    "NonNegative",
    "NonNegativeIntegers",
    "NonNegativeRationals",
    "NonNegativeReals",
    "NonPositive",
    "NonPositiveIntegers",
    "NonPositiveRationals",
    "NonPositiveReals",
    "Nor",
    "NorlundB",
    "Norm",
    "Normal",
    "NormalDistribution",
    "NormalGrouping",
    "NormalizationLayer",
    "Normalize",
    "Normalized",
    "NormalizedSquaredEuclideanDistance",
    "NormalMatrixQ",
    "NormalsFunction",
    "NormFunction",
    "Not",
    "NotCongruent",
    "NotCupCap",
    "NotDoubleVerticalBar",
    "Notebook",
    "NotebookApply",
    "NotebookAutoSave",
    "NotebookBrowseDirectory",
    "NotebookClose",
    "NotebookConvertSettings",
    "NotebookCreate",
    "NotebookDefault",
    "NotebookDelete",
    "NotebookDirectory",
    "NotebookDynamicExpression",
    "NotebookEvaluate",
    "NotebookEventActions",
    "NotebookFileName",
    "NotebookFind",
    "NotebookGet",
    "NotebookImport",
    "NotebookInformation",
    "NotebookInterfaceObject",
    "NotebookLocate",
    "NotebookObject",
    "NotebookOpen",
    "NotebookPath",
    "NotebookPrint",
    "NotebookPut",
    "NotebookRead",
    "Notebooks",
    "NotebookSave",
    "NotebookSelection",
    "NotebooksMenu",
    "NotebookTemplate",
    "NotebookWrite",
    "NotElement",
    "NotEqualTilde",
    "NotExists",
    "NotGreater",
    "NotGreaterEqual",
    "NotGreaterFullEqual",
    "NotGreaterGreater",
    "NotGreaterLess",
    "NotGreaterSlantEqual",
    "NotGreaterTilde",
    "Nothing",
    "NotHumpDownHump",
    "NotHumpEqual",
    "NotificationFunction",
    "NotLeftTriangle",
    "NotLeftTriangleBar",
    "NotLeftTriangleEqual",
    "NotLess",
    "NotLessEqual",
    "NotLessFullEqual",
    "NotLessGreater",
    "NotLessLess",
    "NotLessSlantEqual",
    "NotLessTilde",
    "NotNestedGreaterGreater",
    "NotNestedLessLess",
    "NotPrecedes",
    "NotPrecedesEqual",
    "NotPrecedesSlantEqual",
    "NotPrecedesTilde",
    "NotReverseElement",
    "NotRightTriangle",
    "NotRightTriangleBar",
    "NotRightTriangleEqual",
    "NotSquareSubset",
    "NotSquareSubsetEqual",
    "NotSquareSuperset",
    "NotSquareSupersetEqual",
    "NotSubset",
    "NotSubsetEqual",
    "NotSucceeds",
    "NotSucceedsEqual",
    "NotSucceedsSlantEqual",
    "NotSucceedsTilde",
    "NotSuperset",
    "NotSupersetEqual",
    "NotTilde",
    "NotTildeEqual",
    "NotTildeFullEqual",
    "NotTildeTilde",
    "NotVerticalBar",
    "Now",
    "NoWhitespace",
    "NProbability",
    "NProduct",
    "NProductFactors",
    "NRoots",
    "NSolve",
    "NSolveValues",
    "NSum",
    "NSumTerms",
    "NuclearExplosionData",
    "NuclearReactorData",
    "Null",
    "NullRecords",
    "NullSpace",
    "NullWords",
    "Number",
    "NumberCompose",
    "NumberDecompose",
    "NumberDigit",
    "NumberExpand",
    "NumberFieldClassNumber",
    "NumberFieldDiscriminant",
    "NumberFieldFundamentalUnits",
    "NumberFieldIntegralBasis",
    "NumberFieldNormRepresentatives",
    "NumberFieldRegulator",
    "NumberFieldRootsOfUnity",
    "NumberFieldSignature",
    "NumberForm",
    "NumberFormat",
    "NumberLinePlot",
    "NumberMarks",
    "NumberMultiplier",
    "NumberPadding",
    "NumberPoint",
    "NumberQ",
    "NumberSeparator",
    "NumberSigns",
    "NumberString",
    "Numerator",
    "NumeratorDenominator",
    "NumericalOrder",
    "NumericalSort",
    "NumericArray",
    "NumericArrayQ",
    "NumericArrayType",
    "NumericFunction",
    "NumericQ",
    "NuttallWindow",
    "NValues",
    "NyquistGridLines",
    "NyquistPlot",
    "O",
    "ObjectExistsQ",
    "ObservabilityGramian",
    "ObservabilityMatrix",
    "ObservableDecomposition",
    "ObservableModelQ",
    "OceanData",
    "Octahedron",
    "OddQ",
    "Off",
    "Offset",
    "OLEData",
    "On",
    "ONanGroupON",
    "Once",
    "OneIdentity",
    "Opacity",
    "OpacityFunction",
    "OpacityFunctionScaling",
    "Open",
    "OpenAppend",
    "Opener",
    "OpenerBox",
    "OpenerBoxOptions",
    "OpenerView",
    "OpenFunctionInspectorPacket",
    "Opening",
    "OpenRead",
    "OpenSpecialOptions",
    "OpenTemporary",
    "OpenWrite",
    "Operate",
    "OperatingSystem",
    "OperatorApplied",
    "OptimumFlowData",
    "Optional",
    "OptionalElement",
    "OptionInspectorSettings",
    "OptionQ",
    "Options",
    "OptionsPacket",
    "OptionsPattern",
    "OptionValue",
    "OptionValueBox",
    "OptionValueBoxOptions",
    "Or",
    "Orange",
    "Order",
    "OrderDistribution",
    "OrderedQ",
    "Ordering",
    "OrderingBy",
    "OrderingLayer",
    "Orderless",
    "OrderlessPatternSequence",
    "OrdinalScale",
    "OrnsteinUhlenbeckProcess",
    "Orthogonalize",
    "OrthogonalMatrixQ",
    "Out",
    "Outer",
    "OuterPolygon",
    "OuterPolyhedron",
    "OutputAutoOverwrite",
    "OutputControllabilityMatrix",
    "OutputControllableModelQ",
    "OutputForm",
    "OutputFormData",
    "OutputGrouping",
    "OutputMathEditExpression",
    "OutputNamePacket",
    "OutputPorts",
    "OutputResponse",
    "OutputSizeLimit",
    "OutputStream",
    "Over",
    "OverBar",
    "OverDot",
    "Overflow",
    "OverHat",
    "Overlaps",
    "Overlay",
    "OverlayBox",
    "OverlayBoxOptions",
    "OverlayVideo",
    "Overscript",
    "OverscriptBox",
    "OverscriptBoxOptions",
    "OverTilde",
    "OverVector",
    "OverwriteTarget",
    "OwenT",
    "OwnValues",
    "Package",
    "PackingMethod",
    "PackPaclet",
    "PacletDataRebuild",
    "PacletDirectoryAdd",
    "PacletDirectoryLoad",
    "PacletDirectoryRemove",
    "PacletDirectoryUnload",
    "PacletDisable",
    "PacletEnable",
    "PacletFind",
    "PacletFindRemote",
    "PacletInformation",
    "PacletInstall",
    "PacletInstallSubmit",
    "PacletNewerQ",
    "PacletObject",
    "PacletObjectQ",
    "PacletSite",
    "PacletSiteObject",
    "PacletSiteRegister",
    "PacletSites",
    "PacletSiteUnregister",
    "PacletSiteUpdate",
    "PacletSymbol",
    "PacletUninstall",
    "PacletUpdate",
    "PaddedForm",
    "Padding",
    "PaddingLayer",
    "PaddingSize",
    "PadeApproximant",
    "PadLeft",
    "PadRight",
    "PageBreakAbove",
    "PageBreakBelow",
    "PageBreakWithin",
    "PageFooterLines",
    "PageFooters",
    "PageHeaderLines",
    "PageHeaders",
    "PageHeight",
    "PageRankCentrality",
    "PageTheme",
    "PageWidth",
    "Pagination",
    "PairCorrelationG",
    "PairedBarChart",
    "PairedHistogram",
    "PairedSmoothHistogram",
    "PairedTTest",
    "PairedZTest",
    "PaletteNotebook",
    "PalettePath",
    "PalettesMenuSettings",
    "PalindromeQ",
    "Pane",
    "PaneBox",
    "PaneBoxOptions",
    "Panel",
    "PanelBox",
    "PanelBoxOptions",
    "Paneled",
    "PaneSelector",
    "PaneSelectorBox",
    "PaneSelectorBoxOptions",
    "PaperWidth",
    "ParabolicCylinderD",
    "ParagraphIndent",
    "ParagraphSpacing",
    "ParallelArray",
    "ParallelAxisPlot",
    "ParallelCombine",
    "ParallelDo",
    "Parallelepiped",
    "ParallelEvaluate",
    "Parallelization",
    "Parallelize",
    "ParallelKernels",
    "ParallelMap",
    "ParallelNeeds",
    "Parallelogram",
    "ParallelProduct",
    "ParallelSubmit",
    "ParallelSum",
    "ParallelTable",
    "ParallelTry",
    "Parameter",
    "ParameterEstimator",
    "ParameterMixtureDistribution",
    "ParameterVariables",
    "ParametricConvexOptimization",
    "ParametricFunction",
    "ParametricNDSolve",
    "ParametricNDSolveValue",
    "ParametricPlot",
    "ParametricPlot3D",
    "ParametricRampLayer",
    "ParametricRegion",
    "ParentBox",
    "ParentCell",
    "ParentConnect",
    "ParentDirectory",
    "ParentEdgeLabel",
    "ParentEdgeLabelFunction",
    "ParentEdgeLabelStyle",
    "ParentEdgeShapeFunction",
    "ParentEdgeStyle",
    "ParentEdgeStyleFunction",
    "ParentForm",
    "Parenthesize",
    "ParentList",
    "ParentNotebook",
    "ParetoDistribution",
    "ParetoPickandsDistribution",
    "ParkData",
    "Part",
    "PartBehavior",
    "PartialCorrelationFunction",
    "PartialD",
    "ParticleAcceleratorData",
    "ParticleData",
    "Partition",
    "PartitionGranularity",
    "PartitionsP",
    "PartitionsQ",
    "PartLayer",
    "PartOfSpeech",
    "PartProtection",
    "ParzenWindow",
    "PascalDistribution",
    "PassEventsDown",
    "PassEventsUp",
    "Paste",
    "PasteAutoQuoteCharacters",
    "PasteBoxFormInlineCells",
    "PasteButton",
    "Path",
    "PathGraph",
    "PathGraphQ",
    "Pattern",
    "PatternFilling",
    "PatternReaction",
    "PatternSequence",
    "PatternTest",
    "PauliMatrix",
    "PaulWavelet",
    "Pause",
    "PausedTime",
    "PDF",
    "PeakDetect",
    "PeanoCurve",
    "PearsonChiSquareTest",
    "PearsonCorrelationTest",
    "PearsonDistribution",
    "PenttinenPointProcess",
    "PercentForm",
    "PerfectNumber",
    "PerfectNumberQ",
    "PerformanceGoal",
    "Perimeter",
    "PeriodicBoundaryCondition",
    "PeriodicInterpolation",
    "Periodogram",
    "PeriodogramArray",
    "Permanent",
    "Permissions",
    "PermissionsGroup",
    "PermissionsGroupMemberQ",
    "PermissionsGroups",
    "PermissionsKey",
    "PermissionsKeys",
    "PermutationCycles",
    "PermutationCyclesQ",
    "PermutationGroup",
    "PermutationLength",
    "PermutationList",
    "PermutationListQ",
    "PermutationMatrix",
    "PermutationMax",
    "PermutationMin",
    "PermutationOrder",
    "PermutationPower",
    "PermutationProduct",
    "PermutationReplace",
    "Permutations",
    "PermutationSupport",
    "Permute",
    "PeronaMalikFilter",
    "Perpendicular",
    "PerpendicularBisector",
    "PersistenceLocation",
    "PersistenceTime",
    "PersistentObject",
    "PersistentObjects",
    "PersistentSymbol",
    "PersistentValue",
    "PersonData",
    "PERTDistribution",
    "PetersenGraph",
    "PhaseMargins",
    "PhaseRange",
    "PhongShading",
    "PhysicalSystemData",
    "Pi",
    "Pick",
    "PickedElements",
    "PickMode",
    "PIDData",
    "PIDDerivativeFilter",
    "PIDFeedforward",
    "PIDTune",
    "Piecewise",
    "PiecewiseExpand",
    "PieChart",
    "PieChart3D",
    "PillaiTrace",
    "PillaiTraceTest",
    "PingTime",
    "Pink",
    "PitchRecognize",
    "Pivoting",
    "PixelConstrained",
    "PixelValue",
    "PixelValuePositions",
    "Placed",
    "Placeholder",
    "PlaceholderLayer",
    "PlaceholderReplace",
    "Plain",
    "PlanarAngle",
    "PlanarFaceList",
    "PlanarGraph",
    "PlanarGraphQ",
    "PlanckRadiationLaw",
    "PlaneCurveData",
    "PlanetaryMoonData",
    "PlanetData",
    "PlantData",
    "Play",
    "PlaybackSettings",
    "PlayRange",
    "Plot",
    "Plot3D",
    "Plot3Matrix",
    "PlotDivision",
    "PlotJoined",
    "PlotLabel",
    "PlotLabels",
    "PlotLayout",
    "PlotLegends",
    "PlotMarkers",
    "PlotPoints",
    "PlotRange",
    "PlotRangeClipping",
    "PlotRangeClipPlanesStyle",
    "PlotRangePadding",
    "PlotRegion",
    "PlotStyle",
    "PlotTheme",
    "Pluralize",
    "Plus",
    "PlusMinus",
    "Pochhammer",
    "PodStates",
    "PodWidth",
    "Point",
    "Point3DBox",
    "Point3DBoxOptions",
    "PointBox",
    "PointBoxOptions",
    "PointCountDistribution",
    "PointDensity",
    "PointDensityFunction",
    "PointFigureChart",
    "PointLegend",
    "PointLight",
    "PointProcessEstimator",
    "PointProcessFitTest",
    "PointProcessParameterAssumptions",
    "PointProcessParameterQ",
    "PointSize",
    "PointStatisticFunction",
    "PointValuePlot",
    "PoissonConsulDistribution",
    "PoissonDistribution",
    "PoissonPDEComponent",
    "PoissonPointProcess",
    "PoissonProcess",
    "PoissonWindow",
    "PolarAxes",
    "PolarAxesOrigin",
    "PolarGridLines",
    "PolarPlot",
    "PolarTicks",
    "PoleZeroMarkers",
    "PolyaAeppliDistribution",
    "PolyGamma",
    "Polygon",
    "Polygon3DBox",
    "Polygon3DBoxOptions",
    "PolygonalNumber",
    "PolygonAngle",
    "PolygonBox",
    "PolygonBoxOptions",
    "PolygonCoordinates",
    "PolygonDecomposition",
    "PolygonHoleScale",
    "PolygonIntersections",
    "PolygonScale",
    "Polyhedron",
    "PolyhedronAngle",
    "PolyhedronBox",
    "PolyhedronBoxOptions",
    "PolyhedronCoordinates",
    "PolyhedronData",
    "PolyhedronDecomposition",
    "PolyhedronGenus",
    "PolyLog",
    "PolynomialExpressionQ",
    "PolynomialExtendedGCD",
    "PolynomialForm",
    "PolynomialGCD",
    "PolynomialLCM",
    "PolynomialMod",
    "PolynomialQ",
    "PolynomialQuotient",
    "PolynomialQuotientRemainder",
    "PolynomialReduce",
    "PolynomialRemainder",
    "Polynomials",
    "PolynomialSumOfSquaresList",
    "PoolingLayer",
    "PopupMenu",
    "PopupMenuBox",
    "PopupMenuBoxOptions",
    "PopupView",
    "PopupWindow",
    "Position",
    "PositionIndex",
    "PositionLargest",
    "PositionSmallest",
    "Positive",
    "PositiveDefiniteMatrixQ",
    "PositiveIntegers",
    "PositivelyOrientedPoints",
    "PositiveRationals",
    "PositiveReals",
    "PositiveSemidefiniteMatrixQ",
    "PossibleZeroQ",
    "Postfix",
    "PostScript",
    "Power",
    "PowerDistribution",
    "PowerExpand",
    "PowerMod",
    "PowerModList",
    "PowerRange",
    "PowerSpectralDensity",
    "PowersRepresentations",
    "PowerSymmetricPolynomial",
    "Precedence",
    "PrecedenceForm",
    "Precedes",
    "PrecedesEqual",
    "PrecedesSlantEqual",
    "PrecedesTilde",
    "Precision",
    "PrecisionGoal",
    "PreDecrement",
    "Predict",
    "PredictionRoot",
    "PredictorFunction",
    "PredictorInformation",
    "PredictorMeasurements",
    "PredictorMeasurementsObject",
    "PreemptProtect",
    "PreferencesPath",
    "PreferencesSettings",
    "Prefix",
    "PreIncrement",
    "Prepend",
    "PrependLayer",
    "PrependTo",
    "PreprocessingRules",
    "PreserveColor",
    "PreserveImageOptions",
    "Previous",
    "PreviousCell",
    "PreviousDate",
    "PriceGraphDistribution",
    "PrimaryPlaceholder",
    "Prime",
    "PrimeNu",
    "PrimeOmega",
    "PrimePi",
    "PrimePowerQ",
    "PrimeQ",
    "Primes",
    "PrimeZetaP",
    "PrimitivePolynomialQ",
    "PrimitiveRoot",
    "PrimitiveRootList",
    "PrincipalComponents",
    "PrincipalValue",
    "Print",
    "PrintableASCIIQ",
    "PrintAction",
    "PrintForm",
    "PrintingCopies",
    "PrintingOptions",
    "PrintingPageRange",
    "PrintingStartingPageNumber",
    "PrintingStyleEnvironment",
    "Printout3D",
    "Printout3DPreviewer",
    "PrintPrecision",
    "PrintTemporary",
    "Prism",
    "PrismBox",
    "PrismBoxOptions",
    "PrivateCellOptions",
    "PrivateEvaluationOptions",
    "PrivateFontOptions",
    "PrivateFrontEndOptions",
    "PrivateKey",
    "PrivateNotebookOptions",
    "PrivatePaths",
    "Probability",
    "ProbabilityDistribution",
    "ProbabilityPlot",
    "ProbabilityPr",
    "ProbabilityScalePlot",
    "ProbitModelFit",
    "ProcessConnection",
    "ProcessDirectory",
    "ProcessEnvironment",
    "Processes",
    "ProcessEstimator",
    "ProcessInformation",
    "ProcessObject",
    "ProcessParameterAssumptions",
    "ProcessParameterQ",
    "ProcessStateDomain",
    "ProcessStatus",
    "ProcessTimeDomain",
    "Product",
    "ProductDistribution",
    "ProductLog",
    "ProgressIndicator",
    "ProgressIndicatorBox",
    "ProgressIndicatorBoxOptions",
    "ProgressReporting",
    "Projection",
    "Prolog",
    "PromptForm",
    "ProofObject",
    "PropagateAborts",
    "Properties",
    "Property",
    "PropertyList",
    "PropertyValue",
    "Proportion",
    "Proportional",
    "Protect",
    "Protected",
    "ProteinData",
    "Pruning",
    "PseudoInverse",
    "PsychrometricPropertyData",
    "PublicKey",
    "PublisherID",
    "PulsarData",
    "PunctuationCharacter",
    "Purple",
    "Put",
    "PutAppend",
    "Pyramid",
    "PyramidBox",
    "PyramidBoxOptions",
    "QBinomial",
    "QFactorial",
    "QGamma",
    "QHypergeometricPFQ",
    "QnDispersion",
    "QPochhammer",
    "QPolyGamma",
    "QRDecomposition",
    "QuadraticIrrationalQ",
    "QuadraticOptimization",
    "Quantile",
    "QuantilePlot",
    "Quantity",
    "QuantityArray",
    "QuantityDistribution",
    "QuantityForm",
    "QuantityMagnitude",
    "QuantityQ",
    "QuantityUnit",
    "QuantityVariable",
    "QuantityVariableCanonicalUnit",
    "QuantityVariableDimensions",
    "QuantityVariableIdentifier",
    "QuantityVariablePhysicalQuantity",
    "Quartics",
    "QuartileDeviation",
    "Quartiles",
    "QuartileSkewness",
    "Query",
    "QuestionGenerator",
    "QuestionInterface",
    "QuestionObject",
    "QuestionSelector",
    "QueueingNetworkProcess",
    "QueueingProcess",
    "QueueProperties",
    "Quiet",
    "QuietEcho",
    "Quit",
    "Quotient",
    "QuotientRemainder",
    "RadialAxisPlot",
    "RadialGradientFilling",
    "RadialGradientImage",
    "RadialityCentrality",
    "RadicalBox",
    "RadicalBoxOptions",
    "RadioButton",
    "RadioButtonBar",
    "RadioButtonBox",
    "RadioButtonBoxOptions",
    "Radon",
    "RadonTransform",
    "RamanujanTau",
    "RamanujanTauL",
    "RamanujanTauTheta",
    "RamanujanTauZ",
    "Ramp",
    "Random",
    "RandomArrayLayer",
    "RandomChoice",
    "RandomColor",
    "RandomComplex",
    "RandomDate",
    "RandomEntity",
    "RandomFunction",
    "RandomGeneratorState",
    "RandomGeoPosition",
    "RandomGraph",
    "RandomImage",
    "RandomInstance",
    "RandomInteger",
    "RandomPermutation",
    "RandomPoint",
    "RandomPointConfiguration",
    "RandomPolygon",
    "RandomPolyhedron",
    "RandomPrime",
    "RandomReal",
    "RandomSample",
    "RandomSeed",
    "RandomSeeding",
    "RandomTime",
    "RandomTree",
    "RandomVariate",
    "RandomWalkProcess",
    "RandomWord",
    "Range",
    "RangeFilter",
    "RangeSpecification",
    "RankedMax",
    "RankedMin",
    "RarerProbability",
    "Raster",
    "Raster3D",
    "Raster3DBox",
    "Raster3DBoxOptions",
    "RasterArray",
    "RasterBox",
    "RasterBoxOptions",
    "Rasterize",
    "RasterSize",
    "Rational",
    "RationalExpressionQ",
    "RationalFunctions",
    "Rationalize",
    "Rationals",
    "Ratios",
    "RawArray",
    "RawBoxes",
    "RawData",
    "RawMedium",
    "RayleighDistribution",
    "Re",
    "ReactionBalance",
    "ReactionBalancedQ",
    "ReactionPDETerm",
    "Read",
    "ReadByteArray",
    "ReadLine",
    "ReadList",
    "ReadProtected",
    "ReadString",
    "Real",
    "RealAbs",
    "RealBlockDiagonalForm",
    "RealDigits",
    "RealExponent",
    "Reals",
    "RealSign",
    "Reap",
    "RebuildPacletData",
    "RecalibrationFunction",
    "RecognitionPrior",
    "RecognitionThreshold",
    "ReconstructionMesh",
    "Record",
    "RecordLists",
    "RecordSeparators",
    "Rectangle",
    "RectangleBox",
    "RectangleBoxOptions",
    "RectangleChart",
    "RectangleChart3D",
    "RectangularRepeatingElement",
    "RecurrenceFilter",
    "RecurrenceTable",
    "RecurringDigitsForm",
    "Red",
    "Reduce",
    "RefBox",
    "ReferenceLineStyle",
    "ReferenceMarkers",
    "ReferenceMarkerStyle",
    "Refine",
    "ReflectionMatrix",
    "ReflectionTransform",
    "Refresh",
    "RefreshRate",
    "Region",
    "RegionBinarize",
    "RegionBoundary",
    "RegionBoundaryStyle",
    "RegionBounds",
    "RegionCentroid",
    "RegionCongruent",
    "RegionConvert",
    "RegionDifference",
    "RegionDilation",
    "RegionDimension",
    "RegionDisjoint",
    "RegionDistance",
    "RegionDistanceFunction",
    "RegionEmbeddingDimension",
    "RegionEqual",
    "RegionErosion",
    "RegionFillingStyle",
    "RegionFit",
    "RegionFunction",
    "RegionImage",
    "RegionIntersection",
    "RegionMeasure",
    "RegionMember",
    "RegionMemberFunction",
    "RegionMoment",
    "RegionNearest",
    "RegionNearestFunction",
    "RegionPlot",
    "RegionPlot3D",
    "RegionProduct",
    "RegionQ",
    "RegionResize",
    "RegionSimilar",
    "RegionSize",
    "RegionSymmetricDifference",
    "RegionUnion",
    "RegionWithin",
    "RegisterExternalEvaluator",
    "RegularExpression",
    "Regularization",
    "RegularlySampledQ",
    "RegularPolygon",
    "ReIm",
    "ReImLabels",
    "ReImPlot",
    "ReImStyle",
    "Reinstall",
    "RelationalDatabase",
    "RelationGraph",
    "Release",
    "ReleaseHold",
    "ReliabilityDistribution",
    "ReliefImage",
    "ReliefPlot",
    "RemoteAuthorizationCaching",
    "RemoteBatchJobAbort",
    "RemoteBatchJobObject",
    "RemoteBatchJobs",
    "RemoteBatchMapSubmit",
    "RemoteBatchSubmissionEnvironment",
    "RemoteBatchSubmit",
    "RemoteConnect",
    "RemoteConnectionObject",
    "RemoteEvaluate",
    "RemoteFile",
    "RemoteInputFiles",
    "RemoteKernelObject",
    "RemoteProviderSettings",
    "RemoteRun",
    "RemoteRunProcess",
    "RemovalConditions",
    "Remove",
    "RemoveAlphaChannel",
    "RemoveAsynchronousTask",
    "RemoveAudioStream",
    "RemoveBackground",
    "RemoveChannelListener",
    "RemoveChannelSubscribers",
    "Removed",
    "RemoveDiacritics",
    "RemoveInputStreamMethod",
    "RemoveOutputStreamMethod",
    "RemoveProperty",
    "RemoveScheduledTask",
    "RemoveUsers",
    "RemoveVideoStream",
    "RenameDirectory",
    "RenameFile",
    "RenderAll",
    "RenderingOptions",
    "RenewalProcess",
    "RenkoChart",
    "RepairMesh",
    "Repeated",
    "RepeatedNull",
    "RepeatedString",
    "RepeatedTiming",
    "RepeatingElement",
    "Replace",
    "ReplaceAll",
    "ReplaceAt",
    "ReplaceHeldPart",
    "ReplaceImageValue",
    "ReplaceList",
    "ReplacePart",
    "ReplacePixelValue",
    "ReplaceRepeated",
    "ReplicateLayer",
    "RequiredPhysicalQuantities",
    "Resampling",
    "ResamplingAlgorithmData",
    "ResamplingMethod",
    "Rescale",
    "RescalingTransform",
    "ResetDirectory",
    "ResetScheduledTask",
    "ReshapeLayer",
    "Residue",
    "ResidueSum",
    "ResizeLayer",
    "Resolve",
    "ResolveContextAliases",
    "ResourceAcquire",
    "ResourceData",
    "ResourceFunction",
    "ResourceObject",
    "ResourceRegister",
    "ResourceRemove",
    "ResourceSearch",
    "ResourceSubmissionObject",
    "ResourceSubmit",
    "ResourceSystemBase",
    "ResourceSystemPath",
    "ResourceUpdate",
    "ResourceVersion",
    "ResponseForm",
    "Rest",
    "RestartInterval",
    "Restricted",
    "Resultant",
    "ResumePacket",
    "Return",
    "ReturnCreatesNewCell",
    "ReturnEntersInput",
    "ReturnExpressionPacket",
    "ReturnInputFormPacket",
    "ReturnPacket",
    "ReturnReceiptFunction",
    "ReturnTextPacket",
    "Reverse",
    "ReverseApplied",
    "ReverseBiorthogonalSplineWavelet",
    "ReverseElement",
    "ReverseEquilibrium",
    "ReverseGraph",
    "ReverseSort",
    "ReverseSortBy",
    "ReverseUpEquilibrium",
    "RevolutionAxis",
    "RevolutionPlot3D",
    "RGBColor",
    "RiccatiSolve",
    "RiceDistribution",
    "RidgeFilter",
    "RiemannR",
    "RiemannSiegelTheta",
    "RiemannSiegelZ",
    "RiemannXi",
    "Riffle",
    "Right",
    "RightArrow",
    "RightArrowBar",
    "RightArrowLeftArrow",
    "RightComposition",
    "RightCosetRepresentative",
    "RightDownTeeVector",
    "RightDownVector",
    "RightDownVectorBar",
    "RightTee",
    "RightTeeArrow",
    "RightTeeVector",
    "RightTriangle",
    "RightTriangleBar",
    "RightTriangleEqual",
    "RightUpDownVector",
    "RightUpTeeVector",
    "RightUpVector",
    "RightUpVectorBar",
    "RightVector",
    "RightVectorBar",
    "RipleyK",
    "RipleyRassonRegion",
    "RiskAchievementImportance",
    "RiskReductionImportance",
    "RobustConvexOptimization",
    "RogersTanimotoDissimilarity",
    "RollPitchYawAngles",
    "RollPitchYawMatrix",
    "RomanNumeral",
    "Root",
    "RootApproximant",
    "RootIntervals",
    "RootLocusPlot",
    "RootMeanSquare",
    "RootOfUnityQ",
    "RootReduce",
    "Roots",
    "RootSum",
    "RootTree",
    "Rotate",
    "RotateLabel",
    "RotateLeft",
    "RotateRight",
    "RotationAction",
    "RotationBox",
    "RotationBoxOptions",
    "RotationMatrix",
    "RotationTransform",
    "Round",
    "RoundImplies",
    "RoundingRadius",
    "Row",
    "RowAlignments",
    "RowBackgrounds",
    "RowBox",
    "RowHeights",
    "RowLines",
    "RowMinHeight",
    "RowReduce",
    "RowsEqual",
    "RowSpacings",
    "RSolve",
    "RSolveValue",
    "RudinShapiro",
    "RudvalisGroupRu",
    "Rule",
    "RuleCondition",
    "RuleDelayed",
    "RuleForm",
    "RulePlot",
    "RulerUnits",
    "RulesTree",
    "Run",
    "RunProcess",
    "RunScheduledTask",
    "RunThrough",
    "RuntimeAttributes",
    "RuntimeOptions",
    "RussellRaoDissimilarity",
    "SameAs",
    "SameQ",
    "SameTest",
    "SameTestProperties",
    "SampledEntityClass",
    "SampleDepth",
    "SampledSoundFunction",
    "SampledSoundList",
    "SampleRate",
    "SamplingPeriod",
    "SARIMAProcess",
    "SARMAProcess",
    "SASTriangle",
    "SatelliteData",
    "SatisfiabilityCount",
    "SatisfiabilityInstances",
    "SatisfiableQ",
    "Saturday",
    "Save",
    "Saveable",
    "SaveAutoDelete",
    "SaveConnection",
    "SaveDefinitions",
    "SavitzkyGolayMatrix",
    "SawtoothWave",
    "Scale",
    "Scaled",
    "ScaleDivisions",
    "ScaledMousePosition",
    "ScaleOrigin",
    "ScalePadding",
    "ScaleRanges",
    "ScaleRangeStyle",
    "ScalingFunctions",
    "ScalingMatrix",
    "ScalingTransform",
    "Scan",
    "ScheduledTask",
    "ScheduledTaskActiveQ",
    "ScheduledTaskInformation",
    "ScheduledTaskInformationData",
    "ScheduledTaskObject",
    "ScheduledTasks",
    "SchurDecomposition",
    "ScientificForm",
    "ScientificNotationThreshold",
    "ScorerGi",
    "ScorerGiPrime",
    "ScorerHi",
    "ScorerHiPrime",
    "ScreenRectangle",
    "ScreenStyleEnvironment",
    "ScriptBaselineShifts",
    "ScriptForm",
    "ScriptLevel",
    "ScriptMinSize",
    "ScriptRules",
    "ScriptSizeMultipliers",
    "Scrollbars",
    "ScrollingOptions",
    "ScrollPosition",
    "SearchAdjustment",
    "SearchIndexObject",
    "SearchIndices",
    "SearchQueryString",
    "SearchResultObject",
    "Sec",
    "Sech",
    "SechDistribution",
    "SecondOrderConeOptimization",
    "SectionGrouping",
    "SectorChart",
    "SectorChart3D",
    "SectorOrigin",
    "SectorSpacing",
    "SecuredAuthenticationKey",
    "SecuredAuthenticationKeys",
    "SecurityCertificate",
    "SeedRandom",
    "Select",
    "Selectable",
    "SelectComponents",
    "SelectedCells",
    "SelectedNotebook",
    "SelectFirst",
    "Selection",
    "SelectionAnimate",
    "SelectionCell",
    "SelectionCellCreateCell",
    "SelectionCellDefaultStyle",
    "SelectionCellParentStyle",
    "SelectionCreateCell",
    "SelectionDebuggerTag",
    "SelectionEvaluate",
    "SelectionEvaluateCreateCell",
    "SelectionMove",
    "SelectionPlaceholder",
    "SelectWithContents",
    "SelfLoops",
    "SelfLoopStyle",
    "SemanticImport",
    "SemanticImportString",
    "SemanticInterpretation",
    "SemialgebraicComponentInstances",
    "SemidefiniteOptimization",
    "SendMail",
    "SendMessage",
    "Sequence",
    "SequenceAlignment",
    "SequenceAttentionLayer",
    "SequenceCases",
    "SequenceCount",
    "SequenceFold",
    "SequenceFoldList",
    "SequenceForm",
    "SequenceHold",
    "SequenceIndicesLayer",
    "SequenceLastLayer",
    "SequenceMostLayer",
    "SequencePosition",
    "SequencePredict",
    "SequencePredictorFunction",
    "SequenceReplace",
    "SequenceRestLayer",
    "SequenceReverseLayer",
    "SequenceSplit",
    "Series",
    "SeriesCoefficient",
    "SeriesData",
    "SeriesTermGoal",
    "ServiceConnect",
    "ServiceDisconnect",
    "ServiceExecute",
    "ServiceObject",
    "ServiceRequest",
    "ServiceResponse",
    "ServiceSubmit",
    "SessionSubmit",
    "SessionTime",
    "Set",
    "SetAccuracy",
    "SetAlphaChannel",
    "SetAttributes",
    "Setbacks",
    "SetCloudDirectory",
    "SetCookies",
    "SetDelayed",
    "SetDirectory",
    "SetEnvironment",
    "SetFileDate",
    "SetFileFormatProperties",
    "SetOptions",
    "SetOptionsPacket",
    "SetPermissions",
    "SetPrecision",
    "SetProperty",
    "SetSecuredAuthenticationKey",
    "SetSelectedNotebook",
    "SetSharedFunction",
    "SetSharedVariable",
    "SetStreamPosition",
    "SetSystemModel",
    "SetSystemOptions",
    "Setter",
    "SetterBar",
    "SetterBox",
    "SetterBoxOptions",
    "Setting",
    "SetUsers",
    "Shading",
    "Shallow",
    "ShannonWavelet",
    "ShapiroWilkTest",
    "Share",
    "SharingList",
    "Sharpen",
    "ShearingMatrix",
    "ShearingTransform",
    "ShellRegion",
    "ShenCastanMatrix",
    "ShiftedGompertzDistribution",
    "ShiftRegisterSequence",
    "Short",
    "ShortDownArrow",
    "Shortest",
    "ShortestMatch",
    "ShortestPathFunction",
    "ShortLeftArrow",
    "ShortRightArrow",
    "ShortTimeFourier",
    "ShortTimeFourierData",
    "ShortUpArrow",
    "Show",
    "ShowAutoConvert",
    "ShowAutoSpellCheck",
    "ShowAutoStyles",
    "ShowCellBracket",
    "ShowCellLabel",
    "ShowCellTags",
    "ShowClosedCellArea",
    "ShowCodeAssist",
    "ShowContents",
    "ShowControls",
    "ShowCursorTracker",
    "ShowGroupOpenCloseIcon",
    "ShowGroupOpener",
    "ShowInvisibleCharacters",
    "ShowPageBreaks",
    "ShowPredictiveInterface",
    "ShowSelection",
    "ShowShortBoxForm",
    "ShowSpecialCharacters",
    "ShowStringCharacters",
    "ShowSyntaxStyles",
    "ShrinkingDelay",
    "ShrinkWrapBoundingBox",
    "SiderealTime",
    "SiegelTheta",
    "SiegelTukeyTest",
    "SierpinskiCurve",
    "SierpinskiMesh",
    "Sign",
    "Signature",
    "SignedRankTest",
    "SignedRegionDistance",
    "SignificanceLevel",
    "SignPadding",
    "SignTest",
    "SimilarityRules",
    "SimpleGraph",
    "SimpleGraphQ",
    "SimplePolygonQ",
    "SimplePolyhedronQ",
    "Simplex",
    "Simplify",
    "Sin",
    "Sinc",
    "SinghMaddalaDistribution",
    "SingleEvaluation",
    "SingleLetterItalics",
    "SingleLetterStyle",
    "SingularValueDecomposition",
    "SingularValueList",
    "SingularValuePlot",
    "SingularValues",
    "Sinh",
    "SinhIntegral",
    "SinIntegral",
    "SixJSymbol",
    "Skeleton",
    "SkeletonTransform",
    "SkellamDistribution",
    "Skewness",
    "SkewNormalDistribution",
    "SkinStyle",
    "Skip",
    "SliceContourPlot3D",
    "SliceDensityPlot3D",
    "SliceDistribution",
    "SliceVectorPlot3D",
    "Slider",
    "Slider2D",
    "Slider2DBox",
    "Slider2DBoxOptions",
    "SliderBox",
    "SliderBoxOptions",
    "SlideShowVideo",
    "SlideView",
    "Slot",
    "SlotSequence",
    "Small",
    "SmallCircle",
    "Smaller",
    "SmithDecomposition",
    "SmithDelayCompensator",
    "SmithWatermanSimilarity",
    "SmoothDensityHistogram",
    "SmoothHistogram",
    "SmoothHistogram3D",
    "SmoothKernelDistribution",
    "SmoothPointDensity",
    "SnDispersion",
    "Snippet",
    "SnippetsVideo",
    "SnubPolyhedron",
    "SocialMediaData",
    "Socket",
    "SocketConnect",
    "SocketListen",
    "SocketListener",
    "SocketObject",
    "SocketOpen",
    "SocketReadMessage",
    "SocketReadyQ",
    "Sockets",
    "SocketWaitAll",
    "SocketWaitNext",
    "SoftmaxLayer",
    "SokalSneathDissimilarity",
    "SolarEclipse",
    "SolarSystemFeatureData",
    "SolarTime",
    "SolidAngle",
    "SolidBoundaryLoadValue",
    "SolidData",
    "SolidDisplacementCondition",
    "SolidFixedCondition",
    "SolidMechanicsPDEComponent",
    "SolidMechanicsStrain",
    "SolidMechanicsStress",
    "SolidRegionQ",
    "Solve",
    "SolveAlways",
    "SolveDelayed",
    "SolveValues",
    "Sort",
    "SortBy",
    "SortedBy",
    "SortedEntityClass",
    "Sound",
    "SoundAndGraphics",
    "SoundNote",
    "SoundVolume",
    "SourceLink",
    "SourcePDETerm",
    "Sow",
    "Space",
    "SpaceCurveData",
    "SpaceForm",
    "Spacer",
    "Spacings",
    "Span",
    "SpanAdjustments",
    "SpanCharacterRounding",
    "SpanFromAbove",
    "SpanFromBoth",
    "SpanFromLeft",
    "SpanLineThickness",
    "SpanMaxSize",
    "SpanMinSize",
    "SpanningCharacters",
    "SpanSymmetric",
    "SparseArray",
    "SparseArrayQ",
    "SpatialBinnedPointData",
    "SpatialBoundaryCorrection",
    "SpatialEstimate",
    "SpatialEstimatorFunction",
    "SpatialGraphDistribution",
    "SpatialJ",
    "SpatialMedian",
    "SpatialNoiseLevel",
    "SpatialObservationRegionQ",
    "SpatialPointData",
    "SpatialPointSelect",
    "SpatialRandomnessTest",
    "SpatialTransformationLayer",
    "SpatialTrendFunction",
    "Speak",
    "SpeakerMatchQ",
    "SpearmanRankTest",
    "SpearmanRho",
    "SpeciesData",
    "SpecificityGoal",
    "SpectralLineData",
    "Spectrogram",
    "SpectrogramArray",
    "Specularity",
    "SpeechCases",
    "SpeechInterpreter",
    "SpeechRecognize",
    "SpeechSynthesize",
    "SpellingCorrection",
    "SpellingCorrectionList",
    "SpellingDictionaries",
    "SpellingDictionariesPath",
    "SpellingOptions",
    "Sphere",
    "SphereBox",
    "SphereBoxOptions",
    "SpherePoints",
    "SphericalBesselJ",
    "SphericalBesselY",
    "SphericalHankelH1",
    "SphericalHankelH2",
    "SphericalHarmonicY",
    "SphericalPlot3D",
    "SphericalRegion",
    "SphericalShell",
    "SpheroidalEigenvalue",
    "SpheroidalJoiningFactor",
    "SpheroidalPS",
    "SpheroidalPSPrime",
    "SpheroidalQS",
    "SpheroidalQSPrime",
    "SpheroidalRadialFactor",
    "SpheroidalS1",
    "SpheroidalS1Prime",
    "SpheroidalS2",
    "SpheroidalS2Prime",
    "Splice",
    "SplicedDistribution",
    "SplineClosed",
    "SplineDegree",
    "SplineKnots",
    "SplineWeights",
    "Split",
    "SplitBy",
    "SpokenString",
    "SpotLight",
    "Sqrt",
    "SqrtBox",
    "SqrtBoxOptions",
    "Square",
    "SquaredEuclideanDistance",
    "SquareFreeQ",
    "SquareIntersection",
    "SquareMatrixQ",
    "SquareRepeatingElement",
    "SquaresR",
    "SquareSubset",
    "SquareSubsetEqual",
    "SquareSuperset",
    "SquareSupersetEqual",
    "SquareUnion",
    "SquareWave",
    "SSSTriangle",
    "StabilityMargins",
    "StabilityMarginsStyle",
    "StableDistribution",
    "Stack",
    "StackBegin",
    "StackComplete",
    "StackedDateListPlot",
    "StackedListPlot",
    "StackInhibit",
    "StadiumShape",
    "StandardAtmosphereData",
    "StandardDeviation",
    "StandardDeviationFilter",
    "StandardForm",
    "Standardize",
    "Standardized",
    "StandardOceanData",
    "StandbyDistribution",
    "Star",
    "StarClusterData",
    "StarData",
    "StarGraph",
    "StartAsynchronousTask",
    "StartExternalSession",
    "StartingStepSize",
    "StartOfLine",
    "StartOfString",
    "StartProcess",
    "StartScheduledTask",
    "StartupSound",
    "StartWebSession",
    "StateDimensions",
    "StateFeedbackGains",
    "StateOutputEstimator",
    "StateResponse",
    "StateSpaceModel",
    "StateSpaceRealization",
    "StateSpaceTransform",
    "StateTransformationLinearize",
    "StationaryDistribution",
    "StationaryWaveletPacketTransform",
    "StationaryWaveletTransform",
    "StatusArea",
    "StatusCentrality",
    "StepMonitor",
    "StereochemistryElements",
    "StieltjesGamma",
    "StippleShading",
    "StirlingS1",
    "StirlingS2",
    "StopAsynchronousTask",
    "StoppingPowerData",
    "StopScheduledTask",
    "StrataVariables",
    "StratonovichProcess",
    "StraussHardcorePointProcess",
    "StraussPointProcess",
    "StreamColorFunction",
    "StreamColorFunctionScaling",
    "StreamDensityPlot",
    "StreamMarkers",
    "StreamPlot",
    "StreamPlot3D",
    "StreamPoints",
    "StreamPosition",
    "Streams",
    "StreamScale",
    "StreamStyle",
    "StrictInequalities",
    "String",
    "StringBreak",
    "StringByteCount",
    "StringCases",
    "StringContainsQ",
    "StringCount",
    "StringDelete",
    "StringDrop",
    "StringEndsQ",
    "StringExpression",
    "StringExtract",
    "StringForm",
    "StringFormat",
    "StringFormatQ",
    "StringFreeQ",
    "StringInsert",
    "StringJoin",
    "StringLength",
    "StringMatchQ",
    "StringPadLeft",
    "StringPadRight",
    "StringPart",
    "StringPartition",
    "StringPosition",
    "StringQ",
    "StringRepeat",
    "StringReplace",
    "StringReplaceList",
    "StringReplacePart",
    "StringReverse",
    "StringRiffle",
    "StringRotateLeft",
    "StringRotateRight",
    "StringSkeleton",
    "StringSplit",
    "StringStartsQ",
    "StringTake",
    "StringTakeDrop",
    "StringTemplate",
    "StringToByteArray",
    "StringToStream",
    "StringTrim",
    "StripBoxes",
    "StripOnInput",
    "StripStyleOnPaste",
    "StripWrapperBoxes",
    "StrokeForm",
    "Struckthrough",
    "StructuralImportance",
    "StructuredArray",
    "StructuredArrayHeadQ",
    "StructuredSelection",
    "StruveH",
    "StruveL",
    "Stub",
    "StudentTDistribution",
    "Style",
    "StyleBox",
    "StyleBoxAutoDelete",
    "StyleData",
    "StyleDefinitions",
    "StyleForm",
    "StyleHints",
    "StyleKeyMapping",
    "StyleMenuListing",
    "StyleNameDialogSettings",
    "StyleNames",
    "StylePrint",
    "StyleSheetPath",
    "Subdivide",
    "Subfactorial",
    "Subgraph",
    "SubMinus",
    "SubPlus",
    "SubresultantPolynomialRemainders",
    "SubresultantPolynomials",
    "Subresultants",
    "Subscript",
    "SubscriptBox",
    "SubscriptBoxOptions",
    "Subscripted",
    "Subsequences",
    "Subset",
    "SubsetCases",
    "SubsetCount",
    "SubsetEqual",
    "SubsetMap",
    "SubsetPosition",
    "SubsetQ",
    "SubsetReplace",
    "Subsets",
    "SubStar",
    "SubstitutionSystem",
    "Subsuperscript",
    "SubsuperscriptBox",
    "SubsuperscriptBoxOptions",
    "SubtitleEncoding",
    "SubtitleTrackSelection",
    "Subtract",
    "SubtractFrom",
    "SubtractSides",
    "SubValues",
    "Succeeds",
    "SucceedsEqual",
    "SucceedsSlantEqual",
    "SucceedsTilde",
    "Success",
    "SuchThat",
    "Sum",
    "SumConvergence",
    "SummationLayer",
    "Sunday",
    "SunPosition",
    "Sunrise",
    "Sunset",
    "SuperDagger",
    "SuperMinus",
    "SupernovaData",
    "SuperPlus",
    "Superscript",
    "SuperscriptBox",
    "SuperscriptBoxOptions",
    "Superset",
    "SupersetEqual",
    "SuperStar",
    "Surd",
    "SurdForm",
    "SurfaceAppearance",
    "SurfaceArea",
    "SurfaceColor",
    "SurfaceData",
    "SurfaceGraphics",
    "SurvivalDistribution",
    "SurvivalFunction",
    "SurvivalModel",
    "SurvivalModelFit",
    "SuspendPacket",
    "SuzukiDistribution",
    "SuzukiGroupSuz",
    "SwatchLegend",
    "Switch",
    "Symbol",
    "SymbolName",
    "SymletWavelet",
    "Symmetric",
    "SymmetricDifference",
    "SymmetricGroup",
    "SymmetricKey",
    "SymmetricMatrixQ",
    "SymmetricPolynomial",
    "SymmetricReduction",
    "Symmetrize",
    "SymmetrizedArray",
    "SymmetrizedArrayRules",
    "SymmetrizedDependentComponents",
    "SymmetrizedIndependentComponents",
    "SymmetrizedReplacePart",
    "SynchronousInitialization",
    "SynchronousUpdating",
    "Synonyms",
    "Syntax",
    "SyntaxForm",
    "SyntaxInformation",
    "SyntaxLength",
    "SyntaxPacket",
    "SyntaxQ",
    "SynthesizeMissingValues",
    "SystemCredential",
    "SystemCredentialData",
    "SystemCredentialKey",
    "SystemCredentialKeys",
    "SystemCredentialStoreObject",
    "SystemDialogInput",
    "SystemException",
    "SystemGet",
    "SystemHelpPath",
    "SystemInformation",
    "SystemInformationData",
    "SystemInstall",
    "SystemModel",
    "SystemModeler",
    "SystemModelExamples",
    "SystemModelLinearize",
    "SystemModelMeasurements",
    "SystemModelParametricSimulate",
    "SystemModelPlot",
    "SystemModelProgressReporting",
    "SystemModelReliability",
    "SystemModels",
    "SystemModelSimulate",
    "SystemModelSimulateSensitivity",
    "SystemModelSimulationData",
    "SystemOpen",
    "SystemOptions",
    "SystemProcessData",
    "SystemProcesses",
    "SystemsConnectionsModel",
    "SystemsModelControllerData",
    "SystemsModelDelay",
    "SystemsModelDelayApproximate",
    "SystemsModelDelete",
    "SystemsModelDimensions",
    "SystemsModelExtract",
    "SystemsModelFeedbackConnect",
    "SystemsModelLabels",
    "SystemsModelLinearity",
    "SystemsModelMerge",
    "SystemsModelOrder",
    "SystemsModelParallelConnect",
    "SystemsModelSeriesConnect",
    "SystemsModelStateFeedbackConnect",
    "SystemsModelVectorRelativeOrders",
    "SystemStub",
    "SystemTest",
    "Tab",
    "TabFilling",
    "Table",
    "TableAlignments",
    "TableDepth",
    "TableDirections",
    "TableForm",
    "TableHeadings",
    "TableSpacing",
    "TableView",
    "TableViewBox",
    "TableViewBoxAlignment",
    "TableViewBoxBackground",
    "TableViewBoxHeaders",
    "TableViewBoxItemSize",
    "TableViewBoxItemStyle",
    "TableViewBoxOptions",
    "TabSpacings",
    "TabView",
    "TabViewBox",
    "TabViewBoxOptions",
    "TagBox",
    "TagBoxNote",
    "TagBoxOptions",
    "TaggingRules",
    "TagSet",
    "TagSetDelayed",
    "TagStyle",
    "TagUnset",
    "Take",
    "TakeDrop",
    "TakeLargest",
    "TakeLargestBy",
    "TakeList",
    "TakeSmallest",
    "TakeSmallestBy",
    "TakeWhile",
    "Tally",
    "Tan",
    "Tanh",
    "TargetDevice",
    "TargetFunctions",
    "TargetSystem",
    "TargetUnits",
    "TaskAbort",
    "TaskExecute",
    "TaskObject",
    "TaskRemove",
    "TaskResume",
    "Tasks",
    "TaskSuspend",
    "TaskWait",
    "TautologyQ",
    "TelegraphProcess",
    "TemplateApply",
    "TemplateArgBox",
    "TemplateBox",
    "TemplateBoxOptions",
    "TemplateEvaluate",
    "TemplateExpression",
    "TemplateIf",
    "TemplateObject",
    "TemplateSequence",
    "TemplateSlot",
    "TemplateSlotSequence",
    "TemplateUnevaluated",
    "TemplateVerbatim",
    "TemplateWith",
    "TemporalData",
    "TemporalRegularity",
    "Temporary",
    "TemporaryVariable",
    "TensorContract",
    "TensorDimensions",
    "TensorExpand",
    "TensorProduct",
    "TensorQ",
    "TensorRank",
    "TensorReduce",
    "TensorSymmetry",
    "TensorTranspose",
    "TensorWedge",
    "TerminatedEvaluation",
    "TernaryListPlot",
    "TernaryPlotCorners",
    "TestID",
    "TestReport",
    "TestReportObject",
    "TestResultObject",
    "Tetrahedron",
    "TetrahedronBox",
    "TetrahedronBoxOptions",
    "TeXForm",
    "TeXSave",
    "Text",
    "Text3DBox",
    "Text3DBoxOptions",
    "TextAlignment",
    "TextBand",
    "TextBoundingBox",
    "TextBox",
    "TextCases",
    "TextCell",
    "TextClipboardType",
    "TextContents",
    "TextData",
    "TextElement",
    "TextForm",
    "TextGrid",
    "TextJustification",
    "TextLine",
    "TextPacket",
    "TextParagraph",
    "TextPosition",
    "TextRecognize",
    "TextSearch",
    "TextSearchReport",
    "TextSentences",
    "TextString",
    "TextStructure",
    "TextStyle",
    "TextTranslation",
    "Texture",
    "TextureCoordinateFunction",
    "TextureCoordinateScaling",
    "TextWords",
    "Therefore",
    "ThermodynamicData",
    "ThermometerGauge",
    "Thick",
    "Thickness",
    "Thin",
    "Thinning",
    "ThisLink",
    "ThomasPointProcess",
    "ThompsonGroupTh",
    "Thread",
    "Threaded",
    "ThreadingLayer",
    "ThreeJSymbol",
    "Threshold",
    "Through",
    "Throw",
    "ThueMorse",
    "Thumbnail",
    "Thursday",
    "TickDirection",
    "TickLabelOrientation",
    "TickLabelPositioning",
    "TickLabels",
    "TickLengths",
    "TickPositions",
    "Ticks",
    "TicksStyle",
    "TideData",
    "Tilde",
    "TildeEqual",
    "TildeFullEqual",
    "TildeTilde",
    "TimeConstrained",
    "TimeConstraint",
    "TimeDirection",
    "TimeFormat",
    "TimeGoal",
    "TimelinePlot",
    "TimeObject",
    "TimeObjectQ",
    "TimeRemaining",
    "Times",
    "TimesBy",
    "TimeSeries",
    "TimeSeriesAggregate",
    "TimeSeriesForecast",
    "TimeSeriesInsert",
    "TimeSeriesInvertibility",
    "TimeSeriesMap",
    "TimeSeriesMapThread",
    "TimeSeriesModel",
    "TimeSeriesModelFit",
    "TimeSeriesResample",
    "TimeSeriesRescale",
    "TimeSeriesShift",
    "TimeSeriesThread",
    "TimeSeriesWindow",
    "TimeSystem",
    "TimeSystemConvert",
    "TimeUsed",
    "TimeValue",
    "TimeWarpingCorrespondence",
    "TimeWarpingDistance",
    "TimeZone",
    "TimeZoneConvert",
    "TimeZoneOffset",
    "Timing",
    "Tiny",
    "TitleGrouping",
    "TitsGroupT",
    "ToBoxes",
    "ToCharacterCode",
    "ToColor",
    "ToContinuousTimeModel",
    "ToDate",
    "Today",
    "ToDiscreteTimeModel",
    "ToEntity",
    "ToeplitzMatrix",
    "ToExpression",
    "ToFileName",
    "Together",
    "Toggle",
    "ToggleFalse",
    "Toggler",
    "TogglerBar",
    "TogglerBox",
    "TogglerBoxOptions",
    "ToHeldExpression",
    "ToInvertibleTimeSeries",
    "TokenWords",
    "Tolerance",
    "ToLowerCase",
    "Tomorrow",
    "ToNumberField",
    "TooBig",
    "Tooltip",
    "TooltipBox",
    "TooltipBoxOptions",
    "TooltipDelay",
    "TooltipStyle",
    "ToonShading",
    "Top",
    "TopHatTransform",
    "ToPolarCoordinates",
    "TopologicalSort",
    "ToRadicals",
    "ToRawPointer",
    "ToRules",
    "Torus",
    "TorusGraph",
    "ToSphericalCoordinates",
    "ToString",
    "Total",
    "TotalHeight",
    "TotalLayer",
    "TotalVariationFilter",
    "TotalWidth",
    "TouchPosition",
    "TouchscreenAutoZoom",
    "TouchscreenControlPlacement",
    "ToUpperCase",
    "TourVideo",
    "Tr",
    "Trace",
    "TraceAbove",
    "TraceAction",
    "TraceBackward",
    "TraceDepth",
    "TraceDialog",
    "TraceForward",
    "TraceInternal",
    "TraceLevel",
    "TraceOff",
    "TraceOn",
    "TraceOriginal",
    "TracePrint",
    "TraceScan",
    "TrackCellChangeTimes",
    "TrackedSymbols",
    "TrackingFunction",
    "TracyWidomDistribution",
    "TradingChart",
    "TraditionalForm",
    "TraditionalFunctionNotation",
    "TraditionalNotation",
    "TraditionalOrder",
    "TrainImageContentDetector",
    "TrainingProgressCheckpointing",
    "TrainingProgressFunction",
    "TrainingProgressMeasurements",
    "TrainingProgressReporting",
    "TrainingStoppingCriterion",
    "TrainingUpdateSchedule",
    "TrainTextContentDetector",
    "TransferFunctionCancel",
    "TransferFunctionExpand",
    "TransferFunctionFactor",
    "TransferFunctionModel",
    "TransferFunctionPoles",
    "TransferFunctionTransform",
    "TransferFunctionZeros",
    "TransformationClass",
    "TransformationFunction",
    "TransformationFunctions",
    "TransformationMatrix",
    "TransformedDistribution",
    "TransformedField",
    "TransformedProcess",
    "TransformedRegion",
    "TransitionDirection",
    "TransitionDuration",
    "TransitionEffect",
    "TransitiveClosureGraph",
    "TransitiveReductionGraph",
    "Translate",
    "TranslationOptions",
    "TranslationTransform",
    "Transliterate",
    "Transparent",
    "TransparentColor",
    "Transpose",
    "TransposeLayer",
    "TrapEnterKey",
    "TrapSelection",
    "TravelDirections",
    "TravelDirectionsData",
    "TravelDistance",
    "TravelDistanceList",
    "TravelMethod",
    "TravelTime",
    "Tree",
    "TreeCases",
    "TreeChildren",
    "TreeCount",
    "TreeData",
    "TreeDelete",
    "TreeDepth",
    "TreeElementCoordinates",
    "TreeElementLabel",
    "TreeElementLabelFunction",
    "TreeElementLabelStyle",
    "TreeElementShape",
    "TreeElementShapeFunction",
    "TreeElementSize",
    "TreeElementSizeFunction",
    "TreeElementStyle",
    "TreeElementStyleFunction",
    "TreeExpression",
    "TreeExtract",
    "TreeFold",
    "TreeForm",
    "TreeGraph",
    "TreeGraphQ",
    "TreeInsert",
    "TreeLayout",
    "TreeLeafCount",
    "TreeLeafQ",
    "TreeLeaves",
    "TreeLevel",
    "TreeMap",
    "TreeMapAt",
    "TreeOutline",
    "TreePlot",
    "TreePosition",
    "TreeQ",
    "TreeReplacePart",
    "TreeRules",
    "TreeScan",
    "TreeSelect",
    "TreeSize",
    "TreeTraversalOrder",
    "TrendStyle",
    "Triangle",
    "TriangleCenter",
    "TriangleConstruct",
    "TriangleMeasurement",
    "TriangleWave",
    "TriangularDistribution",
    "TriangulateMesh",
    "Trig",
    "TrigExpand",
    "TrigFactor",
    "TrigFactorList",
    "Trigger",
    "TrigReduce",
    "TrigToExp",
    "TrimmedMean",
    "TrimmedVariance",
    "TropicalStormData",
    "True",
    "TrueQ",
    "TruncatedDistribution",
    "TruncatedPolyhedron",
    "TsallisQExponentialDistribution",
    "TsallisQGaussianDistribution",
    "TTest",
    "Tube",
    "TubeBezierCurveBox",
    "TubeBezierCurveBoxOptions",
    "TubeBox",
    "TubeBoxOptions",
    "TubeBSplineCurveBox",
    "TubeBSplineCurveBoxOptions",
    "Tuesday",
    "TukeyLambdaDistribution",
    "TukeyWindow",
    "TunnelData",
    "Tuples",
    "TuranGraph",
    "TuringMachine",
    "TuttePolynomial",
    "TwoWayRule",
    "Typed",
    "TypeDeclaration",
    "TypeEvaluate",
    "TypeHint",
    "TypeOf",
    "TypeSpecifier",
    "UnateQ",
    "Uncompress",
    "UnconstrainedParameters",
    "Undefined",
    "UnderBar",
    "Underflow",
    "Underlined",
    "Underoverscript",
    "UnderoverscriptBox",
    "UnderoverscriptBoxOptions",
    "Underscript",
    "UnderscriptBox",
    "UnderscriptBoxOptions",
    "UnderseaFeatureData",
    "UndirectedEdge",
    "UndirectedGraph",
    "UndirectedGraphQ",
    "UndoOptions",
    "UndoTrackedVariables",
    "Unequal",
    "UnequalTo",
    "Unevaluated",
    "UniformDistribution",
    "UniformGraphDistribution",
    "UniformPolyhedron",
    "UniformSumDistribution",
    "Uninstall",
    "Union",
    "UnionedEntityClass",
    "UnionPlus",
    "Unique",
    "UniqueElements",
    "UnitaryMatrixQ",
    "UnitBox",
    "UnitConvert",
    "UnitDimensions",
    "Unitize",
    "UnitRootTest",
    "UnitSimplify",
    "UnitStep",
    "UnitSystem",
    "UnitTriangle",
    "UnitVector",
    "UnitVectorLayer",
    "UnityDimensions",
    "UniverseModelData",
    "UniversityData",
    "UnixTime",
    "UnlabeledTree",
    "UnmanageObject",
    "Unprotect",
    "UnregisterExternalEvaluator",
    "UnsameQ",
    "UnsavedVariables",
    "Unset",
    "UnsetShared",
    "Until",
    "UntrackedVariables",
    "Up",
    "UpArrow",
    "UpArrowBar",
    "UpArrowDownArrow",
    "Update",
    "UpdateDynamicObjects",
    "UpdateDynamicObjectsSynchronous",
    "UpdateInterval",
    "UpdatePacletSites",
    "UpdateSearchIndex",
    "UpDownArrow",
    "UpEquilibrium",
    "UpperCaseQ",
    "UpperLeftArrow",
    "UpperRightArrow",
    "UpperTriangularize",
    "UpperTriangularMatrix",
    "UpperTriangularMatrixQ",
    "Upsample",
    "UpSet",
    "UpSetDelayed",
    "UpTee",
    "UpTeeArrow",
    "UpTo",
    "UpValues",
    "URL",
    "URLBuild",
    "URLDecode",
    "URLDispatcher",
    "URLDownload",
    "URLDownloadSubmit",
    "URLEncode",
    "URLExecute",
    "URLExpand",
    "URLFetch",
    "URLFetchAsynchronous",
    "URLParse",
    "URLQueryDecode",
    "URLQueryEncode",
    "URLRead",
    "URLResponseTime",
    "URLSave",
    "URLSaveAsynchronous",
    "URLShorten",
    "URLSubmit",
    "UseEmbeddedLibrary",
    "UseGraphicsRange",
    "UserDefinedWavelet",
    "Using",
    "UsingFrontEnd",
    "UtilityFunction",
    "V2Get",
    "ValenceErrorHandling",
    "ValenceFilling",
    "ValidationLength",
    "ValidationSet",
    "ValueBox",
    "ValueBoxOptions",
    "ValueDimensions",
    "ValueForm",
    "ValuePreprocessingFunction",
    "ValueQ",
    "Values",
    "ValuesData",
    "VandermondeMatrix",
    "Variables",
    "Variance",
    "VarianceEquivalenceTest",
    "VarianceEstimatorFunction",
    "VarianceGammaDistribution",
    "VarianceGammaPointProcess",
    "VarianceTest",
    "VariogramFunction",
    "VariogramModel",
    "VectorAngle",
    "VectorAround",
    "VectorAspectRatio",
    "VectorColorFunction",
    "VectorColorFunctionScaling",
    "VectorDensityPlot",
    "VectorDisplacementPlot",
    "VectorDisplacementPlot3D",
    "VectorGlyphData",
    "VectorGreater",
    "VectorGreaterEqual",
    "VectorLess",
    "VectorLessEqual",
    "VectorMarkers",
    "VectorPlot",
    "VectorPlot3D",
    "VectorPoints",
    "VectorQ",
    "VectorRange",
    "Vectors",
    "VectorScale",
    "VectorScaling",
    "VectorSizes",
    "VectorStyle",
    "Vee",
    "Verbatim",
    "Verbose",
    "VerificationTest",
    "VerifyConvergence",
    "VerifyDerivedKey",
    "VerifyDigitalSignature",
    "VerifyFileSignature",
    "VerifyInterpretation",
    "VerifySecurityCertificates",
    "VerifySolutions",
    "VerifyTestAssumptions",
    "VersionedPreferences",
    "VertexAdd",
    "VertexCapacity",
    "VertexChromaticNumber",
    "VertexColors",
    "VertexComponent",
    "VertexConnectivity",
    "VertexContract",
    "VertexCoordinateRules",
    "VertexCoordinates",
    "VertexCorrelationSimilarity",
    "VertexCosineSimilarity",
    "VertexCount",
    "VertexCoverQ",
    "VertexDataCoordinates",
    "VertexDegree",
    "VertexDelete",
    "VertexDiceSimilarity",
    "VertexEccentricity",
    "VertexInComponent",
    "VertexInComponentGraph",
    "VertexInDegree",
    "VertexIndex",
    "VertexJaccardSimilarity",
    "VertexLabeling",
    "VertexLabels",
    "VertexLabelStyle",
    "VertexList",
    "VertexNormals",
    "VertexOutComponent",
    "VertexOutComponentGraph",
    "VertexOutDegree",
    "VertexQ",
    "VertexRenderingFunction",
    "VertexReplace",
    "VertexShape",
    "VertexShapeFunction",
    "VertexSize",
    "VertexStyle",
    "VertexTextureCoordinates",
    "VertexTransitiveGraphQ",
    "VertexWeight",
    "VertexWeightedGraphQ",
    "Vertical",
    "VerticalBar",
    "VerticalForm",
    "VerticalGauge",
    "VerticalSeparator",
    "VerticalSlider",
    "VerticalTilde",
    "Video",
    "VideoCapture",
    "VideoCombine",
    "VideoDelete",
    "VideoEncoding",
    "VideoExtractFrames",
    "VideoFrameList",
    "VideoFrameMap",
    "VideoGenerator",
    "VideoInsert",
    "VideoIntervals",
    "VideoJoin",
    "VideoMap",
    "VideoMapList",
    "VideoMapTimeSeries",
    "VideoPadding",
    "VideoPause",
    "VideoPlay",
    "VideoQ",
    "VideoRecord",
    "VideoReplace",
    "VideoScreenCapture",
    "VideoSplit",
    "VideoStop",
    "VideoStream",
    "VideoStreams",
    "VideoTimeStretch",
    "VideoTrackSelection",
    "VideoTranscode",
    "VideoTransparency",
    "VideoTrim",
    "ViewAngle",
    "ViewCenter",
    "ViewMatrix",
    "ViewPoint",
    "ViewPointSelectorSettings",
    "ViewPort",
    "ViewProjection",
    "ViewRange",
    "ViewVector",
    "ViewVertical",
    "VirtualGroupData",
    "Visible",
    "VisibleCell",
    "VoiceStyleData",
    "VoigtDistribution",
    "VolcanoData",
    "Volume",
    "VonMisesDistribution",
    "VoronoiMesh",
    "WaitAll",
    "WaitAsynchronousTask",
    "WaitNext",
    "WaitUntil",
    "WakebyDistribution",
    "WalleniusHypergeometricDistribution",
    "WaringYuleDistribution",
    "WarpingCorrespondence",
    "WarpingDistance",
    "WatershedComponents",
    "WatsonUSquareTest",
    "WattsStrogatzGraphDistribution",
    "WaveletBestBasis",
    "WaveletFilterCoefficients",
    "WaveletImagePlot",
    "WaveletListPlot",
    "WaveletMapIndexed",
    "WaveletMatrixPlot",
    "WaveletPhi",
    "WaveletPsi",
    "WaveletScale",
    "WaveletScalogram",
    "WaveletThreshold",
    "WavePDEComponent",
    "WeaklyConnectedComponents",
    "WeaklyConnectedGraphComponents",
    "WeaklyConnectedGraphQ",
    "WeakStationarity",
    "WeatherData",
    "WeatherForecastData",
    "WebAudioSearch",
    "WebColumn",
    "WebElementObject",
    "WeberE",
    "WebExecute",
    "WebImage",
    "WebImageSearch",
    "WebItem",
    "WebPageMetaInformation",
    "WebRow",
    "WebSearch",
    "WebSessionObject",
    "WebSessions",
    "WebWindowObject",
    "Wedge",
    "Wednesday",
    "WeibullDistribution",
    "WeierstrassE1",
    "WeierstrassE2",
    "WeierstrassE3",
    "WeierstrassEta1",
    "WeierstrassEta2",
    "WeierstrassEta3",
    "WeierstrassHalfPeriods",
    "WeierstrassHalfPeriodW1",
    "WeierstrassHalfPeriodW2",
    "WeierstrassHalfPeriodW3",
    "WeierstrassInvariantG2",
    "WeierstrassInvariantG3",
    "WeierstrassInvariants",
    "WeierstrassP",
    "WeierstrassPPrime",
    "WeierstrassSigma",
    "WeierstrassZeta",
    "WeightedAdjacencyGraph",
    "WeightedAdjacencyMatrix",
    "WeightedData",
    "WeightedGraphQ",
    "Weights",
    "WelchWindow",
    "WheelGraph",
    "WhenEvent",
    "Which",
    "While",
    "White",
    "WhiteNoiseProcess",
    "WhitePoint",
    "Whitespace",
    "WhitespaceCharacter",
    "WhittakerM",
    "WhittakerW",
    "WholeCellGroupOpener",
    "WienerFilter",
    "WienerProcess",
    "WignerD",
    "WignerSemicircleDistribution",
    "WikidataData",
    "WikidataSearch",
    "WikipediaData",
    "WikipediaSearch",
    "WilksW",
    "WilksWTest",
    "WindDirectionData",
    "WindingCount",
    "WindingPolygon",
    "WindowClickSelect",
    "WindowElements",
    "WindowFloating",
    "WindowFrame",
    "WindowFrameElements",
    "WindowMargins",
    "WindowMovable",
    "WindowOpacity",
    "WindowPersistentStyles",
    "WindowSelected",
    "WindowSize",
    "WindowStatusArea",
    "WindowTitle",
    "WindowToolbars",
    "WindowWidth",
    "WindSpeedData",
    "WindVectorData",
    "WinsorizedMean",
    "WinsorizedVariance",
    "WishartMatrixDistribution",
    "With",
    "WithCleanup",
    "WithLock",
    "WolframAlpha",
    "WolframAlphaDate",
    "WolframAlphaQuantity",
    "WolframAlphaResult",
    "WolframCloudSettings",
    "WolframLanguageData",
    "Word",
    "WordBoundary",
    "WordCharacter",
    "WordCloud",
    "WordCount",
    "WordCounts",
    "WordData",
    "WordDefinition",
    "WordFrequency",
    "WordFrequencyData",
    "WordList",
    "WordOrientation",
    "WordSearch",
    "WordSelectionFunction",
    "WordSeparators",
    "WordSpacings",
    "WordStem",
    "WordTranslation",
    "WorkingPrecision",
    "WrapAround",
    "Write",
    "WriteLine",
    "WriteString",
    "Wronskian",
    "XMLElement",
    "XMLObject",
    "XMLTemplate",
    "Xnor",
    "Xor",
    "XYZColor",
    "Yellow",
    "Yesterday",
    "YuleDissimilarity",
    "ZernikeR",
    "ZeroSymmetric",
    "ZeroTest",
    "ZeroWidthTimes",
    "Zeta",
    "ZetaZero",
    "ZIPCodeData",
    "ZipfDistribution",
    "ZoomCenter",
    "ZoomFactor",
    "ZTest",
    "ZTransform",
    "$Aborted",
    "$ActivationGroupID",
    "$ActivationKey",
    "$ActivationUserRegistered",
    "$AddOnsDirectory",
    "$AllowDataUpdates",
    "$AllowExternalChannelFunctions",
    "$AllowInternet",
    "$AssertFunction",
    "$Assumptions",
    "$AsynchronousTask",
    "$AudioDecoders",
    "$AudioEncoders",
    "$AudioInputDevices",
    "$AudioOutputDevices",
    "$BaseDirectory",
    "$BasePacletsDirectory",
    "$BatchInput",
    "$BatchOutput",
    "$BlockchainBase",
    "$BoxForms",
    "$ByteOrdering",
    "$CacheBaseDirectory",
    "$Canceled",
    "$ChannelBase",
    "$CharacterEncoding",
    "$CharacterEncodings",
    "$CloudAccountName",
    "$CloudBase",
    "$CloudConnected",
    "$CloudConnection",
    "$CloudCreditsAvailable",
    "$CloudEvaluation",
    "$CloudExpressionBase",
    "$CloudObjectNameFormat",
    "$CloudObjectURLType",
    "$CloudRootDirectory",
    "$CloudSymbolBase",
    "$CloudUserID",
    "$CloudUserUUID",
    "$CloudVersion",
    "$CloudVersionNumber",
    "$CloudWolframEngineVersionNumber",
    "$CommandLine",
    "$CompilationTarget",
    "$CompilerEnvironment",
    "$ConditionHold",
    "$ConfiguredKernels",
    "$Context",
    "$ContextAliases",
    "$ContextPath",
    "$ControlActiveSetting",
    "$Cookies",
    "$CookieStore",
    "$CreationDate",
    "$CryptographicEllipticCurveNames",
    "$CurrentLink",
    "$CurrentTask",
    "$CurrentWebSession",
    "$DataStructures",
    "$DateStringFormat",
    "$DefaultAudioInputDevice",
    "$DefaultAudioOutputDevice",
    "$DefaultFont",
    "$DefaultFrontEnd",
    "$DefaultImagingDevice",
    "$DefaultKernels",
    "$DefaultLocalBase",
    "$DefaultLocalKernel",
    "$DefaultMailbox",
    "$DefaultNetworkInterface",
    "$DefaultPath",
    "$DefaultProxyRules",
    "$DefaultRemoteBatchSubmissionEnvironment",
    "$DefaultRemoteKernel",
    "$DefaultSystemCredentialStore",
    "$Display",
    "$DisplayFunction",
    "$DistributedContexts",
    "$DynamicEvaluation",
    "$Echo",
    "$EmbedCodeEnvironments",
    "$EmbeddableServices",
    "$EntityStores",
    "$Epilog",
    "$EvaluationCloudBase",
    "$EvaluationCloudObject",
    "$EvaluationEnvironment",
    "$ExportFormats",
    "$ExternalIdentifierTypes",
    "$ExternalStorageBase",
    "$Failed",
    "$FinancialDataSource",
    "$FontFamilies",
    "$FormatType",
    "$FrontEnd",
    "$FrontEndSession",
    "$GeneratedAssetLocation",
    "$GeoEntityTypes",
    "$GeoLocation",
    "$GeoLocationCity",
    "$GeoLocationCountry",
    "$GeoLocationPrecision",
    "$GeoLocationSource",
    "$HistoryLength",
    "$HomeDirectory",
    "$HTMLExportRules",
    "$HTTPCookies",
    "$HTTPRequest",
    "$IgnoreEOF",
    "$ImageFormattingWidth",
    "$ImageResolution",
    "$ImagingDevice",
    "$ImagingDevices",
    "$ImportFormats",
    "$IncomingMailSettings",
    "$InitialDirectory",
    "$Initialization",
    "$InitializationContexts",
    "$Input",
    "$InputFileName",
    "$InputStreamMethods",
    "$Inspector",
    "$InstallationDate",
    "$InstallationDirectory",
    "$InterfaceEnvironment",
    "$InterpreterTypes",
    "$IterationLimit",
    "$KernelCount",
    "$KernelID",
    "$Language",
    "$LaunchDirectory",
    "$LibraryPath",
    "$LicenseExpirationDate",
    "$LicenseID",
    "$LicenseProcesses",
    "$LicenseServer",
    "$LicenseSubprocesses",
    "$LicenseType",
    "$Line",
    "$Linked",
    "$LinkSupported",
    "$LoadedFiles",
    "$LocalBase",
    "$LocalSymbolBase",
    "$MachineAddresses",
    "$MachineDomain",
    "$MachineDomains",
    "$MachineEpsilon",
    "$MachineID",
    "$MachineName",
    "$MachinePrecision",
    "$MachineType",
    "$MaxDisplayedChildren",
    "$MaxExtraPrecision",
    "$MaxLicenseProcesses",
    "$MaxLicenseSubprocesses",
    "$MaxMachineNumber",
    "$MaxNumber",
    "$MaxPiecewiseCases",
    "$MaxPrecision",
    "$MaxRootDegree",
    "$MessageGroups",
    "$MessageList",
    "$MessagePrePrint",
    "$Messages",
    "$MinMachineNumber",
    "$MinNumber",
    "$MinorReleaseNumber",
    "$MinPrecision",
    "$MobilePhone",
    "$ModuleNumber",
    "$NetworkConnected",
    "$NetworkInterfaces",
    "$NetworkLicense",
    "$NewMessage",
    "$NewSymbol",
    "$NotebookInlineStorageLimit",
    "$Notebooks",
    "$NoValue",
    "$NumberMarks",
    "$Off",
    "$OperatingSystem",
    "$Output",
    "$OutputForms",
    "$OutputSizeLimit",
    "$OutputStreamMethods",
    "$Packages",
    "$ParentLink",
    "$ParentProcessID",
    "$PasswordFile",
    "$PatchLevelID",
    "$Path",
    "$PathnameSeparator",
    "$PerformanceGoal",
    "$Permissions",
    "$PermissionsGroupBase",
    "$PersistenceBase",
    "$PersistencePath",
    "$PipeSupported",
    "$PlotTheme",
    "$Post",
    "$Pre",
    "$PreferencesDirectory",
    "$PreInitialization",
    "$PrePrint",
    "$PreRead",
    "$PrintForms",
    "$PrintLiteral",
    "$Printout3DPreviewer",
    "$ProcessID",
    "$ProcessorCount",
    "$ProcessorType",
    "$ProductInformation",
    "$ProgramName",
    "$ProgressReporting",
    "$PublisherID",
    "$RandomGeneratorState",
    "$RandomState",
    "$RecursionLimit",
    "$RegisteredDeviceClasses",
    "$RegisteredUserName",
    "$ReleaseNumber",
    "$RequesterAddress",
    "$RequesterCloudUserID",
    "$RequesterCloudUserUUID",
    "$RequesterWolframID",
    "$RequesterWolframUUID",
    "$ResourceSystemBase",
    "$ResourceSystemPath",
    "$RootDirectory",
    "$ScheduledTask",
    "$ScriptCommandLine",
    "$ScriptInputString",
    "$SecuredAuthenticationKeyTokens",
    "$ServiceCreditsAvailable",
    "$Services",
    "$SessionID",
    "$SetParentLink",
    "$SharedFunctions",
    "$SharedVariables",
    "$SoundDisplay",
    "$SoundDisplayFunction",
    "$SourceLink",
    "$SSHAuthentication",
    "$SubtitleDecoders",
    "$SubtitleEncoders",
    "$SummaryBoxDataSizeLimit",
    "$SuppressInputFormHeads",
    "$SynchronousEvaluation",
    "$SyntaxHandler",
    "$System",
    "$SystemCharacterEncoding",
    "$SystemCredentialStore",
    "$SystemID",
    "$SystemMemory",
    "$SystemShell",
    "$SystemTimeZone",
    "$SystemWordLength",
    "$TargetSystems",
    "$TemplatePath",
    "$TemporaryDirectory",
    "$TemporaryPrefix",
    "$TestFileName",
    "$TextStyle",
    "$TimedOut",
    "$TimeUnit",
    "$TimeZone",
    "$TimeZoneEntity",
    "$TopDirectory",
    "$TraceOff",
    "$TraceOn",
    "$TracePattern",
    "$TracePostAction",
    "$TracePreAction",
    "$UnitSystem",
    "$Urgent",
    "$UserAddOnsDirectory",
    "$UserAgentLanguages",
    "$UserAgentMachine",
    "$UserAgentName",
    "$UserAgentOperatingSystem",
    "$UserAgentString",
    "$UserAgentVersion",
    "$UserBaseDirectory",
    "$UserBasePacletsDirectory",
    "$UserDocumentsDirectory",
    "$Username",
    "$UserName",
    "$UserURLBase",
    "$Version",
    "$VersionNumber",
    "$VideoDecoders",
    "$VideoEncoders",
    "$VoiceStyles",
    "$WolframDocumentsDirectory",
    "$WolframID",
    "$WolframUUID"
  ];

  /*
  Language: Wolfram Language
  Description: The Wolfram Language is the programming language used in Wolfram Mathematica, a modern technical computing system spanning most areas of technical computing.
  Authors: Patrick Scheibe <patrick@halirutan.de>, Robert Jacobson <robertjacobson@acm.org>
  Website: https://www.wolfram.com/mathematica/
  Category: scientific
  */


  /** @type LanguageFn */
  function mathematica(hljs) {
    const regex = hljs.regex;
    /*
    This rather scary looking matching of Mathematica numbers is carefully explained by Robert Jacobson here:
    https://wltools.github.io/LanguageSpec/Specification/Syntax/Number-representations/
     */
    const BASE_RE = /([2-9]|[1-2]\d|[3][0-5])\^\^/;
    const BASE_DIGITS_RE = /(\w*\.\w+|\w+\.\w*|\w+)/;
    const NUMBER_RE = /(\d*\.\d+|\d+\.\d*|\d+)/;
    const BASE_NUMBER_RE = regex.either(regex.concat(BASE_RE, BASE_DIGITS_RE), NUMBER_RE);

    const ACCURACY_RE = /``[+-]?(\d*\.\d+|\d+\.\d*|\d+)/;
    const PRECISION_RE = /`([+-]?(\d*\.\d+|\d+\.\d*|\d+))?/;
    const APPROXIMATE_NUMBER_RE = regex.either(ACCURACY_RE, PRECISION_RE);

    const SCIENTIFIC_NOTATION_RE = /\*\^[+-]?\d+/;

    const MATHEMATICA_NUMBER_RE = regex.concat(
      BASE_NUMBER_RE,
      regex.optional(APPROXIMATE_NUMBER_RE),
      regex.optional(SCIENTIFIC_NOTATION_RE)
    );

    const NUMBERS = {
      className: 'number',
      relevance: 0,
      begin: MATHEMATICA_NUMBER_RE
    };

    const SYMBOL_RE = /[a-zA-Z$][a-zA-Z0-9$]*/;
    const SYSTEM_SYMBOLS_SET = new Set(SYSTEM_SYMBOLS);
    /** @type {Mode} */
    const SYMBOLS = { variants: [
      {
        className: 'builtin-symbol',
        begin: SYMBOL_RE,
        // for performance out of fear of regex.either(...Mathematica.SYSTEM_SYMBOLS)
        "on:begin": (match, response) => {
          if (!SYSTEM_SYMBOLS_SET.has(match[0])) response.ignoreMatch();
        }
      },
      {
        className: 'symbol',
        relevance: 0,
        begin: SYMBOL_RE
      }
    ] };

    const NAMED_CHARACTER = {
      className: 'named-character',
      begin: /\\\[[$a-zA-Z][$a-zA-Z0-9]+\]/
    };

    const OPERATORS = {
      className: 'operator',
      relevance: 0,
      begin: /[+\-*/,;.:@~=><&|_`'^?!%]+/
    };
    const PATTERNS = {
      className: 'pattern',
      relevance: 0,
      begin: /([a-zA-Z$][a-zA-Z0-9$]*)?_+([a-zA-Z$][a-zA-Z0-9$]*)?/
    };

    const SLOTS = {
      className: 'slot',
      relevance: 0,
      begin: /#[a-zA-Z$][a-zA-Z0-9$]*|#+[0-9]?/
    };

    const BRACES = {
      className: 'brace',
      relevance: 0,
      begin: /[[\](){}]/
    };

    const MESSAGES = {
      className: 'message-name',
      relevance: 0,
      begin: regex.concat("::", SYMBOL_RE)
    };

    return {
      name: 'Mathematica',
      aliases: [
        'mma',
        'wl'
      ],
      classNameAliases: {
        brace: 'punctuation',
        pattern: 'type',
        slot: 'type',
        symbol: 'variable',
        'named-character': 'variable',
        'builtin-symbol': 'built_in',
        'message-name': 'string'
      },
      contains: [
        hljs.COMMENT(/\(\*/, /\*\)/, { contains: [ 'self' ] }),
        PATTERNS,
        SLOTS,
        MESSAGES,
        SYMBOLS,
        NAMED_CHARACTER,
        hljs.QUOTE_STRING_MODE,
        NUMBERS,
        OPERATORS,
        BRACES
      ]
    };
  }

  return mathematica;

})();

    hljs.registerLanguage('mathematica', hljsGrammar);
  })();