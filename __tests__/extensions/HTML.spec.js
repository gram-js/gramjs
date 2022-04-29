const { HTMLParser } = require("../../gramjs/extensions/HTML");
const types = require("../../gramjs/tl/types");

describe("HTMLParser", () => {
  test("it should construct a new HTMLParser", () => {
    const parser = new HTMLParser("Hello world");
    expect(parser.text).toEqual("");
    expect(parser.entities).toEqual([]);
  });

  describe(".parse", () => {
    test("it should parse bold entities", () => {
      const parser = new HTMLParser("Hello <strong>world</strong>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse italic entities", () => {
      const parser = new HTMLParser("Hello <em>world</em>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
    });

    test("it should parse code entities", () => {
      const parser = new HTMLParser("Hello <code>world</code>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
    });

    test("it should parse pre entities", () => {
      const parser = new HTMLParser("Hello <pre>world</pre>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
    });

    test("it should parse strike entities", () => {
      const parser = new HTMLParser("Hello <del>world</del>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityStrike);
    });

    test("it should parse link entities", () => {
      const parser = new HTMLParser(
        'Hello <a href="https://hello.world">world</a>'
      );
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect(entities[0].url).toEqual("https://hello.world");
    });

    test("it should parse nested entities", () => {
      const parser = new HTMLParser("Hello <strong><em>world</em></strong>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(2);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
      expect(entities[1]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse multiple entities", () => {
      const parser = new HTMLParser("<em>Hello</em> <strong>world</strong>");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(2);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
      expect(entities[1]).toBeInstanceOf(types.MessageEntityBold);
    });
  });

  describe(".unparse", () => {
    test("it should create a markdown string from raw text and entities", () => {
      const unparsed =
        '<strong>hello</strong> <em>hello</em> <del>hello</del> <code>hello</code> <pre>hello</pre> <a href="https://hello.world">hello</a>';
      const strippedText = "hello hello hello hello hello hello";
      const rawEntities = [
        new types.MessageEntityBold({ offset: 0, length: 5 }),
        new types.MessageEntityItalic({ offset: 6, length: 5 }),
        new types.MessageEntityStrike({ offset: 12, length: 5 }),
        new types.MessageEntityCode({ offset: 18, length: 5 }),
        new types.MessageEntityPre({ offset: 24, length: 5 }),
        new types.MessageEntityTextUrl({
          offset: 30,
          length: 5,
          url: "https://hello.world",
        }),
      ];
      const text = HTMLParser.unparse(strippedText, rawEntities);
      expect(text).toEqual(unparsed);
    });

    test("it should unparse nested entities", () => {
      const unparsed = "<strong><em>Hello world</em></strong>";
      const strippedText = "Hello world";
      const rawEntities = [
        new types.MessageEntityBold({ offset: 0, length: 11 }),
        new types.MessageEntityItalic({ offset: 0, length: 11 }),
      ];
      const text = HTMLParser.unparse(strippedText, rawEntities);
      expect(text).toEqual(unparsed);
    });
  });
});
