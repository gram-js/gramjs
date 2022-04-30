const { MarkdownParser } = require("../../gramjs/extensions/Markdown");
const types = require("../../gramjs/tl/types");

describe("MarkdownParser", () => {
  test("it should construct a new MarkdownParser", () => {
    const parser = new MarkdownParser("Hello world");
    expect(parser.text).toEqual("");
    expect(parser.entities).toEqual([]);
  });

  describe(".parse", () => {
    test("it should parse bold entities", () => {
      const parser = new MarkdownParser("Hello **world**");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse italic entities", () => {
      const parser = new MarkdownParser("Hello __world__");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
    });

    test("it should parse code entities", () => {
      const parser = new MarkdownParser("Hello `world`");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
    });

    test("it should parse pre entities", () => {
      const parser = new MarkdownParser("Hello ```world```");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
    });

    test("it should parse strike entities", () => {
      const parser = new MarkdownParser("Hello ~~world~~");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityStrike);
    });

    test("it should parse link entities", () => {
      const parser = new MarkdownParser("Hello [world](https://hello.world)");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello world");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
      expect(entities[0].url).toEqual("https://hello.world");
    });

    test("it should not parse nested entities", () => {
      const parser = new MarkdownParser("Hello **__world__**");
      const [text, entities] = parser.parse();
      expect(text).toEqual("Hello __world__");
      expect(entities.length).toEqual(1);
      expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
    });

    test("it should parse multiple entities", () => {
      const parser = new MarkdownParser("__Hello__ **world**");
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
        "**hello** __hello__ ~~hello~~ `hello` ```hello``` [hello](https://hello.world)";
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
      const text = MarkdownParser.unparse(strippedText, rawEntities);
      expect(text).toEqual(unparsed);
    });
  });
});
