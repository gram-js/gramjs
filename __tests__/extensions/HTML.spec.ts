import { HTMLParser } from "../../gramjs/extensions/html";
import { Api as types } from "../../gramjs/tl/api";

describe("HTMLParser", () => {
  describe(".parse", () => {
    test("it should parse bold entities", () => {
      const [text, entities] = HTMLParser.parse("Hello <strong>world</strong>");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse italic entities", () => {
      const [text, entities] = HTMLParser.parse("Hello <em>world</em>");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
    });

    test("it should parse code entities", () => {
      const [text, entities] = HTMLParser.parse("Hello <code>world</code>");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
    });

    test("it should parse pre entities", () => {
      const [text, entities] = HTMLParser.parse("Hello <pre>world</pre>");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
    });

    test("it should parse strike entities", () => {
      const [text, entities] = HTMLParser.parse("Hello <del>world</del>");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityStrike);
    });

    test("it should parse link entities", () => {
      const [text, entities] = HTMLParser.parse(
        'Hello <a href="https://hello.world">world</a>'
      );
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "https://hello.world"
      );
    });

    test("it should parse nested entities", () => {
      const [text, entities] = HTMLParser.parse(
        "Hello <strong><em>world</em></strong>"
      );
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(2);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
      expect(entities[1]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse multiple entities", () => {
      const [text, entities] = HTMLParser.parse(
        "<em>Hello</em> <strong>world</strong>"
      );
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
        new types.MessageEntityPre({ offset: 24, length: 5, language: "" }),
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
