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

    test("it should rewrite tg://user?id=<username> to TextUrl with @-prefixed username", () => {
      const [text, entities] = HTMLParser.parse(
        '<a href="tg://user?id=alice">alice</a>'
      );
      expect(text).toEqual("alice");
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      const e = entities[0] as types.MessageEntityTextUrl;
      expect(e.url).toEqual("@alice");
      expect(e.offset).toEqual(0);
      expect(e.length).toEqual(5);
    });

    test("it should not double the @ when the id already starts with one", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=@alice">alice</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "@alice"
      );
    });

    test("it should strip extra query params from the username", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=alice&foo=bar">alice</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "@alice"
      );
    });

    test("it should keep the original tg://user?id URL when the id is numeric so _parseMessageText can resolve it", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=123456789">name</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=123456789"
      );
    });

    test("it should keep the original URL when the id has a leading minus", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=-1001234567890">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=-1001234567890"
      );
    });

    test("it should preserve the URL when the id is empty", () => {
      const [, entities] = HTMLParser.parse('<a href="tg://user?id=">x</a>');
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id="
      );
    });

    test("it should preserve the URL when the username id is too short", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=ab">ab</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=ab"
      );
    });

    test("it should preserve the URL when the username id is too long", () => {
      const longId = "a".repeat(33);
      const [, entities] = HTMLParser.parse(
        `<a href="tg://user?id=${longId}">x</a>`
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        `tg://user?id=${longId}`
      );
    });

    test("it should preserve the URL when the username id has no letter or number", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=______">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=______"
      );
    });

    test("it should preserve the URL on double @", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=@@alice">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=@@alice"
      );
    });

    test("it should preserve the URL on lone @", () => {
      const [, entities] = HTMLParser.parse('<a href="tg://user?id=@">x</a>');
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=@"
      );
    });

    test("it should keep the original URL when the username is all digits (handled by _parseMessageText)", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=12345">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=12345"
      );
    });

    test("it should rewrite the username href even when it wraps nested formatting", () => {
      const [text, entities] = HTMLParser.parse(
        '<a href="tg://user?id=alice"><strong>name</strong></a>'
      );
      expect(text).toEqual("name");
      expect(entities.length).toEqual(2);
      const bold = entities.find(
        (e) => e instanceof types.MessageEntityBold
      ) as types.MessageEntityBold;
      const link = entities.find(
        (e) => e instanceof types.MessageEntityTextUrl
      ) as types.MessageEntityTextUrl;
      expect(bold).toBeDefined();
      expect(link).toBeDefined();
      expect(link.url).toEqual("@alice");
      expect(link.offset).toEqual(0);
      expect(link.length).toEqual(4);
      expect(bold.offset).toEqual(0);
      expect(bold.length).toEqual(4);
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
