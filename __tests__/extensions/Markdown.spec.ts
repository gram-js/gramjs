import { MarkdownParser } from "../../gramjs/extensions/markdown";
import { Api as types } from "../../gramjs/tl/api";

describe("MarkdownParser", () => {
  describe(".parse", () => {
    test("it should parse bold entities", () => {
      const [text, entities] = MarkdownParser.parse("Hello **world**");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse italic entities", () => {
      const [text, entities] = MarkdownParser.parse("Hello __world__");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
    });

    test("it should parse code entities", () => {
      const [text, entities] = MarkdownParser.parse("Hello `world`");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
    });
    // skipped until MarkDownV2
    test.skip("it should parse pre entities", () => {
      const [text, entities] = MarkdownParser.parse("Hello ```world```");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
    });

    test("it should parse strike entities", () => {
      const [text, entities] = MarkdownParser.parse("Hello ~~world~~");
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityStrike);
    });

    // skipped until MarkDownV2
    test.skip("it should parse link entities", () => {
      const [text, entities] = MarkdownParser.parse(
        "Hello [world](https://hello.world)"
      );
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect((entities[0] as types.MessageEntityTextUrl).url).toEqual(
        "https://hello.world"
      );
    });

    // skipped until MarkDownV2
    test.skip("it should not parse nested entities", () => {
      const [text, entities] = MarkdownParser.parse("Hello **__world__**");
      expect(text).toEqual("Hello __world__");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse multiple entities", () => {
      const [text, entities] = MarkdownParser.parse("__Hello__ **world**");
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
        "**hello** __hello__ ~~hello~~ `hello` ```hello``` [hello](https://hello.world)";
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
      const text = MarkdownParser.unparse(strippedText, rawEntities);
      expect(text).toEqual(unparsed);
    });
  });
});
