import bigInt from "big-integer";
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

    test("it should parse tg://user?id mention with numeric id as MessageEntityMentionName", () => {
      const [text, entities] = HTMLParser.parse(
        'Hello <a href="tg://user?id=123456789">name</a>'
      );
      expect(text).toEqual("Hello name");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityMentionName);
      const mention = entities[0] as types.MessageEntityMentionName;
      expect(mention.userId.toString()).toEqual("123456789");
      expect(mention.offset).toEqual(6);
      expect(mention.length).toEqual(4);
    });

    test("it should parse tg://user?id mention with very large numeric id (long)", () => {
      const bigId = "12345678901234567890";
      const [text, entities] = HTMLParser.parse(
        `<a href="tg://user?id=${bigId}">u</a>`
      );
      expect(text).toEqual("u");
      expect(entities[0]).toBeInstanceOf(types.MessageEntityMentionName);
      const mention = entities[0] as types.MessageEntityMentionName;
      expect(mention.userId.toString()).toEqual(bigId);
    });

    test("it should ignore extra query params after the mention id", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=42&foo=bar">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityMentionName);
      expect(
        (entities[0] as types.MessageEntityMentionName).userId.toString()
      ).toEqual("42");
    });

    test("it should parse tg://user?id mention with negative numeric id (channel/group)", () => {
      const [text, entities] = HTMLParser.parse(
        '<a href="tg://user?id=-1001234567890">channel</a>'
      );
      expect(text).toEqual("channel");
      expect(entities[0]).toBeInstanceOf(types.MessageEntityMentionName);
      const mention = entities[0] as types.MessageEntityMentionName;
      expect(mention.userId.toString()).toEqual("-1001234567890");
    });

    test("it should map alphanumeric mention id to TextUrl with @-prefixed username", () => {
      const [text, entities] = HTMLParser.parse(
        '<a href="tg://user?id=alice">alice</a>'
      );
      expect(text).toEqual("alice");
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      const fallback = entities[0] as types.MessageEntityTextUrl;
      expect(fallback.url).toEqual("@alice");
      expect(fallback.offset).toEqual(0);
      expect(fallback.length).toEqual(5);
    });

    test("it should not double the @ when the alphanumeric id already starts with one", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=@alice">alice</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "@alice"
      );
    });

    test("it should strip extra query params from alphanumeric mention id too", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=alice&foo=bar">alice</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "@alice"
      );
    });

    test("it should parse mention containing nested formatting", () => {
      const [text, entities] = HTMLParser.parse(
        '<a href="tg://user?id=42"><strong>name</strong></a>'
      );
      expect(text).toEqual("name");
      expect(entities.length).toEqual(2);
      const bold = entities.find(
        (e) => e instanceof types.MessageEntityBold
      ) as types.MessageEntityBold;
      const mention = entities.find(
        (e) => e instanceof types.MessageEntityMentionName
      ) as types.MessageEntityMentionName;
      expect(bold).toBeDefined();
      expect(mention).toBeDefined();
      expect(mention.userId.toString()).toEqual("42");
      expect(mention.offset).toEqual(0);
      expect(mention.length).toEqual(4);
      expect(bold.offset).toEqual(0);
      expect(bold.length).toEqual(4);
    });

    test("it should fall back to TextUrl when the mention id is empty", () => {
      const [, entities] = HTMLParser.parse('<a href="tg://user?id=">x</a>');
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id="
      );
    });

    test("it should preserve original URL when alphanumeric id is too short to be a username", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=ab">ab</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=ab"
      );
    });

    test("it should preserve original URL when alphanumeric id is too long to be a username", () => {
      const longId = "a".repeat(33);
      const [, entities] = HTMLParser.parse(
        `<a href="tg://user?id=${longId}">x</a>`
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        `tg://user?id=${longId}`
      );
    });

    test("it should preserve original URL when alphanumeric id has no letter or number", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=______">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=______"
      );
    });

    test("it should preserve original URL on double @ in alphanumeric id", () => {
      const [, entities] = HTMLParser.parse(
        '<a href="tg://user?id=@@alice">x</a>'
      );
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=@@alice"
      );
    });

    test("it should preserve original URL on lone @", () => {
      const [, entities] = HTMLParser.parse('<a href="tg://user?id=@">x</a>');
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=@"
      );
    });

    test("it should preserve original URL on lone minus sign", () => {
      const [, entities] = HTMLParser.parse('<a href="tg://user?id=-">x</a>');
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "tg://user?id=-"
      );
    });

    test.each([
      ["+123", "tg://user?id=+123"],
      ["1e5", "tg://user?id=1e5"],
      [" 42 ", "tg://user?id= 42 "],
    ])(
      "it should not accept non-canonical numeric form %s as a mention",
      (_id, fullUrl) => {
        const [, entities] = HTMLParser.parse(`<a href="${fullUrl}">x</a>`);
        expect(entities[0]).not.toBeInstanceOf(
          types.MessageEntityMentionName
        );
      }
    );
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

  describe("mention round-trip", () => {
    test("entities → unparse → parse should preserve MessageEntityMentionName", () => {
      const original = [
        new types.MessageEntityMentionName({
          offset: 0,
          length: 4,
          userId: bigInt("123456789"),
        }),
      ];
      const html = HTMLParser.unparse("name", original);
      expect(html).toEqual('<a href="tg://user?id=123456789">name</a>');
      const [text, parsed] = HTMLParser.parse(html);
      expect(text).toEqual("name");
      expect(parsed.length).toEqual(1);
      expect(parsed[0]).toBeInstanceOf(types.MessageEntityMentionName);
      const mention = parsed[0] as types.MessageEntityMentionName;
      expect(mention.userId.toString()).toEqual("123456789");
      expect(mention.offset).toEqual(0);
      expect(mention.length).toEqual(4);
    });

    test("entities → unparse → parse should preserve a negative MessageEntityMentionName id", () => {
      const original = [
        new types.MessageEntityMentionName({
          offset: 0,
          length: 7,
          userId: bigInt("-1001234567890"),
        }),
      ];
      const html = HTMLParser.unparse("channel", original);
      expect(html).toEqual(
        '<a href="tg://user?id=-1001234567890">channel</a>'
      );
      const [text, parsed] = HTMLParser.parse(html);
      expect(text).toEqual("channel");
      expect(parsed[0]).toBeInstanceOf(types.MessageEntityMentionName);
      expect(
        (parsed[0] as types.MessageEntityMentionName).userId.toString()
      ).toEqual("-1001234567890");
    });
  });
});
