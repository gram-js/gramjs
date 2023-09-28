import { MarkdownV2Parser } from "../../gramjs/extensions/markdownv2";
import { Api as types } from "../../gramjs/tl/api";

describe("MarkdownV2Parser", () => {
  describe(".parse", () => {
    test("it should parse bold entities", () => {
      const [text, entities] = MarkdownV2Parser.parse("Hello *world*");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse italic entities", () => {
      const [text, entities] = MarkdownV2Parser.parse("Hello -world-");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
    });

    test("it should parse code entities", () => {
      const [text, entities] = MarkdownV2Parser.parse("Hello `world`");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
    });

    test("it should parse pre entities", () => {
      const [text, entities] = MarkdownV2Parser.parse("Hello ```world```");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
    });

    test("it should parse strike entities", () => {
      const [text, entities] = MarkdownV2Parser.parse("Hello ~world~");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityStrike);
    });

    test("it should parse link entities", () => {
      const [text, entities] = MarkdownV2Parser.parse(
        "Hello [world](https://hello.world)"
      );
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "https://hello.world"
      );
    });

    test("it should parse custom emoji", () => {
      const [text, entities] = MarkdownV2Parser.parse(
        "![👍](tg://emoji?id=5368324170671202286)"
      );
      expect(text).toEqual("👍");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityCustomEmoji);
      expect(
        (entities[0] as types.MessageEntityCustomEmoji).documentId
      ).toEqual("5368324170671202286");
    });

    test("it should parse multiple entities", () => {
      const [text, entities] = MarkdownV2Parser.parse("-Hello- *world*");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(2);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
      expect(entities[1]).toBeInstanceOf(types.MessageEntityBold);
    });
  });

  describe(".unparse", () => {
    // skipped until MarkDownV2
    test.skip("it should create a markdown string from raw text and entities", () => {
      const unparsed =
        "*hello* -hello- ~hello~ `hello` ```hello``` [hello](https://hello.world)";
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
      const text = MarkdownV2Parser.unparse(strippedText, rawEntities);
      expect(text).toEqual(unparsed);
    });
  });
});
