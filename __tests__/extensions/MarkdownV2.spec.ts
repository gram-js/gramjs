import {
    MarkdownV2Parser,
    markdownV2ToHtml,
    htmlToMarkdownV2,
} from "../../gramjs/extensions/markdownv2";
import { Api as types } from "../../gramjs/tl/api";

describe("MarkdownV2Parser", () => {
    describe(".parse — span markup basics", () => {
        test("bold", () => {
            const [text, entities] = MarkdownV2Parser.parse("Hello *world*");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
        });

        test("italic", () => {
            const [text, entities] = MarkdownV2Parser.parse("Hello _world_");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
        });

        test("underline", () => {
            const [text, entities] = MarkdownV2Parser.parse("Hello __world__");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityUnderline);
        });

        test("strikethrough", () => {
            const [text, entities] = MarkdownV2Parser.parse("Hello ~world~");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityStrike);
        });

        test("spoiler", () => {
            const [text, entities] = MarkdownV2Parser.parse("Hello ||world||");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntitySpoiler);
        });

        test("bold spans multiple words", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("*hello world*");
            expect(text).toEqual("hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0].length).toEqual(11);
        });

        test("italic spans newlines", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("_line1\nline2_");
            expect(text).toEqual("line1\nline2");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
            expect(entities[0].length).toEqual(11);
        });
    });

    describe(".parse — span combinations", () => {
        test("multiple separate spans on one line", () => {
            const [text, entities] = MarkdownV2Parser.parse("_a_ *b*");
            expect(text).toEqual("a b");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
            expect(entities[1]).toBeInstanceOf(types.MessageEntityBold);
        });

        test("five distinct spans in a row", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "*a* _b_ ~c~ ||d|| __e__"
            );
            expect(text).toEqual("a b c d e");
            expect(entities.length).toEqual(5);
            const has = (cls: any) =>
                entities.some((e) => e instanceof cls);
            expect(has(types.MessageEntityBold)).toBe(true);
            expect(has(types.MessageEntityItalic)).toBe(true);
            expect(has(types.MessageEntityStrike)).toBe(true);
            expect(has(types.MessageEntitySpoiler)).toBe(true);
            expect(has(types.MessageEntityUnderline)).toBe(true);
        });

        test("italic nested inside bold", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "*hello _world_ end*"
            );
            expect(text).toEqual("hello world end");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityItalic);
            expect(entities[1]).toBeInstanceOf(types.MessageEntityBold);
            expect(entities[0].offset).toEqual(6);
            expect(entities[0].length).toEqual(5);
            expect(entities[1].offset).toEqual(0);
            expect(entities[1].length).toEqual(15);
        });

        test("bold nested inside underline", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "__hello *bold* end__"
            );
            expect(text).toEqual("hello bold end");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
            expect(entities[1]).toBeInstanceOf(types.MessageEntityUnderline);
            expect(entities[0].offset).toEqual(6);
            expect(entities[0].length).toEqual(4);
            expect(entities[1].offset).toEqual(0);
            expect(entities[1].length).toEqual(14);
        });
    });

    describe(".parse — inline code", () => {
        test("basic code", () => {
            const [text, entities] = MarkdownV2Parser.parse("Hello `world`");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
        });

        test("code with markup chars stays literal", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("`*not bold*`");
            expect(text).toEqual("*not bold*");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
        });

        test("code with escaped backtick", () => {
            const [text, entities] = MarkdownV2Parser.parse("`a\\`b`");
            expect(text).toEqual("a`b");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
        });

        test("code with escaped backslash", () => {
            const [text, entities] = MarkdownV2Parser.parse("`a\\\\b`");
            expect(text).toEqual("a\\b");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
        });

        test("code preserves backslash before non-special char", () => {
            // Inside code, only \\ and \` are escapes. \X for any other X
            // stays as a literal backslash followed by X.
            const [text, entities] = MarkdownV2Parser.parse("`a\\bc`");
            expect(text).toEqual("a\\bc");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
        });

        test("code with HTML special chars renders as literal text", () => {
            const [text, entities] =
                MarkdownV2Parser.parse('`a < b & "c"`');
            expect(text).toEqual('a < b & "c"');
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityCode);
        });
    });

    describe(".parse — pre block", () => {
        test("basic pre", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("Hello ```world```");
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
        });

        test("pre with language tag", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```python\nfoo```");
            expect(text).toEqual("foo");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
            expect((entities[0] as types.MessageEntityPre).language).toEqual(
                "python"
            );
        });

        test("pre with non-identifier first line keeps it as content", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```hello world\nfoo```");
            expect(text).toEqual("hello world\nfoo");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
            expect((entities[0] as types.MessageEntityPre).language).toEqual(
                ""
            );
        });

        test("pre with backslash-escaped backtick inside", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```a\\`b```");
            expect(text).toEqual("a`b");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
        });

        test("pre preserves markup chars literally", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```*not bold*```");
            expect(text).toEqual("*not bold*");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
        });

        test("pre with HTML special chars", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```<script>&```");
            expect(text).toEqual("<script>&");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
        });
    });

    describe(".parse — links and mentions", () => {
        test("basic inline URL", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "Hello [world](https://hello.world)"
            );
            expect(text).toEqual("Hello world");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
            expect(
                (entities[0] as types.MessageEntityTextUrl).url
            ).toEqual("https://hello.world");
        });

        test("URL with escaped close-paren", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "[hi](http://x.y/foo\\))"
            );
            expect(text).toEqual("hi");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
            expect(
                (entities[0] as types.MessageEntityTextUrl).url
            ).toEqual("http://x.y/foo)");
        });

        test("URL with escaped backslash", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "[hi](http://x.y/foo\\\\bar)"
            );
            expect(text).toEqual("hi");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
            expect(
                (entities[0] as types.MessageEntityTextUrl).url
            ).toEqual("http://x.y/foo\\bar");
        });

        test("URL keeps backslash before non-special char literal", () => {
            // Inside (URL), only \\ and \) are escapes. \. stays literal.
            const [text, entities] = MarkdownV2Parser.parse(
                "[hi](http://x.y/foo\\.bar)"
            );
            expect(text).toEqual("hi");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
            expect(
                (entities[0] as types.MessageEntityTextUrl).url
            ).toEqual("http://x.y/foo\\.bar");
        });

        test("link with markup inside label", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "[*bold*](http://x.y)"
            );
            expect(text).toEqual("bold");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
            expect(entities[1]).toBeInstanceOf(types.MessageEntityTextUrl);
        });

        test("user mention emits TextUrl with tg://user URL", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "[name](tg://user?id=12345)"
            );
            expect(text).toEqual("name");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
            expect(
                (entities[0] as types.MessageEntityTextUrl).url
            ).toEqual("tg://user?id=12345");
        });

        test("malformed link without close-paren stays literal", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("[hi](no-close");
            expect(text).toEqual("[hi](no-close");
            expect(entities.length).toEqual(0);
        });
    });

    describe(".parse — custom emoji", () => {
        test("basic custom emoji", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "![👍](tg://emoji?id=5368324170671202286)"
            );
            expect(text).toEqual("👍");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityCustomEmoji
            );
            expect(
                (entities[0] as types.MessageEntityCustomEmoji).documentId
            ).toEqual("5368324170671202286");
        });

        test("non-emoji bang-link parses as literal `!` then a link", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "![hi](http://x.y)"
            );
            expect(text).toEqual("!hi");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityTextUrl);
            expect(entities[0].offset).toEqual(1);
            expect(entities[0].length).toEqual(2);
        });

        test("custom emoji with markup inside label", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "![*emoji*](tg://emoji?id=123)"
            );
            expect(text).toEqual("emoji");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
            expect(entities[1]).toBeInstanceOf(
                types.MessageEntityCustomEmoji
            );
        });
    });

    describe(".parse — blockquotes", () => {
        test("single-line blockquote", () => {
            const [text, entities] = MarkdownV2Parser.parse(">hello");
            expect(text).toEqual("hello");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
            expect(
                (entities[0] as types.MessageEntityBlockquote).collapsed
            ).toBeFalsy();
        });

        test("multi-line blockquote", () => {
            const [text, entities] =
                MarkdownV2Parser.parse(">hello\n>world");
            expect(text).toEqual("hello\nworld");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
        });

        test("blockquote with markup inside", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                ">this is *bold*"
            );
            expect(text).toEqual("this is bold");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
            expect(entities[1]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
        });

        test("> mid-line is literal, not a blockquote", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("Hello >world");
            expect(text).toEqual("Hello >world");
            expect(entities.length).toEqual(0);
        });

        test("two blockquote groups separated by a plain line", () => {
            const [text, entities] =
                MarkdownV2Parser.parse(">a\nplain\n>b");
            expect(text).toEqual("a\nplain\nb");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
            expect(entities[1]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
        });

        test("escaped > at line start is NOT a blockquote", () => {
            const [text, entities] = MarkdownV2Parser.parse("\\>line");
            expect(text).toEqual(">line");
            expect(entities.length).toEqual(0);
        });

        test("blockquote starting with span markup", () => {
            const [text, entities] =
                MarkdownV2Parser.parse(">*bold*");
            expect(text).toEqual("bold");
            expect(entities.length).toEqual(2);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityBold);
            expect(entities[1]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
        });
    });

    describe(".parse — expandable blockquotes", () => {
        test("single-line expandable blockquote", () => {
            const [text, entities] = MarkdownV2Parser.parse(">hello||");
            expect(text).toEqual("hello");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
            expect(
                (entities[0] as types.MessageEntityBlockquote).collapsed
            ).toEqual(true);
        });

        test("multi-line expandable blockquote", () => {
            const [text, entities] =
                MarkdownV2Parser.parse(">hello\n>world||");
            expect(text).toEqual("hello\nworld");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
            expect(
                (entities[0] as types.MessageEntityBlockquote).collapsed
            ).toEqual(true);
        });

        test("expandable blockquote with spoiler inside is unambiguous", () => {
            // ||spoil|| matches first as spoiler; the trailing || becomes
            // the expandable marker.
            const [text, entities] = MarkdownV2Parser.parse(
                ">hi ||spoil|| more||"
            );
            expect(text).toEqual("hi spoil more");
            expect(entities.length).toEqual(2);
            const has = (cls: any) =>
                entities.some((e) => e instanceof cls);
            expect(has(types.MessageEntitySpoiler)).toBe(true);
            expect(has(types.MessageEntityBlockquote)).toBe(true);
            const blockquote = entities.find(
                (e) => e instanceof types.MessageEntityBlockquote
            ) as types.MessageEntityBlockquote;
            expect(blockquote.collapsed).toEqual(true);
        });
    });

    describe(".parse — backslash escapes", () => {
        test("unescapes spec-listed special chars", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "1\\.5 \\(approx\\) \\#1\\!"
            );
            expect(text).toEqual("1.5 (approx) #1!");
            expect(entities.length).toEqual(0);
        });

        test("escapes block markup detection for *, _, ~, |, __", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "\\*not bold\\* \\_not italic\\_ \\~not strike\\~ \\|\\|not spoiler\\|\\|"
            );
            expect(text).toEqual(
                "*not bold* _not italic_ ~not strike~ ||not spoiler||"
            );
            expect(entities.length).toEqual(0);
        });

        test("escape backslash with backslash", () => {
            const [text, entities] = MarkdownV2Parser.parse("\\\\");
            expect(text).toEqual("\\");
            expect(entities.length).toEqual(0);
        });

        test("trailing lone backslash stays literal", () => {
            const [text, entities] = MarkdownV2Parser.parse("hello\\");
            expect(text).toEqual("hello\\");
            expect(entities.length).toEqual(0);
        });

        test("escape of non-special char yields the bare char", () => {
            // Spec: any character with code 1..126 can be backslash-escaped.
            const [text, entities] = MarkdownV2Parser.parse("\\a\\b\\c");
            expect(text).toEqual("abc");
            expect(entities.length).toEqual(0);
        });

        test("escape inside pre is restricted to backslash and backtick", () => {
            // \* inside ``` stays as \* (not unescaped to *).
            const [text, entities] = MarkdownV2Parser.parse("```\\*x```");
            expect(text).toEqual("\\*x");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
        });

        test("escape inside link URL is restricted to backslash and close-paren", () => {
            // \. inside (URL) stays as \. (not unescaped to .).
            const [text, entities] = MarkdownV2Parser.parse(
                "[hi](http://x.y/\\.foo)"
            );
            expect(text).toEqual("hi");
            expect(entities.length).toEqual(1);
            expect(
                (entities[0] as types.MessageEntityTextUrl).url
            ).toEqual("http://x.y/\\.foo");
        });

        test("escaped < and & in plain text round-trip as literal chars", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("\\<\\&");
            expect(text).toEqual("<&");
            expect(entities.length).toEqual(0);
        });
    });

    describe(".parse — HTML chars in plain text", () => {
        test("literal < is rendered as text, not interpreted as HTML", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("a < b & c");
            expect(text).toEqual("a < b & c");
            expect(entities.length).toEqual(0);
        });

        test("literal HTML-looking content in plain text", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("<b>not bold</b>");
            expect(text).toEqual("<b>not bold</b>");
            expect(entities.length).toEqual(0);
        });
    });

    describe(".parse — edge cases", () => {
        test("empty input", () => {
            const [text, entities] = MarkdownV2Parser.parse("");
            expect(text).toEqual("");
            expect(entities.length).toEqual(0);
        });

        test("plain text with no markup", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("hello world");
            expect(text).toEqual("hello world");
            expect(entities.length).toEqual(0);
        });

        test("lone delimiter chars stay literal", () => {
            const [text, entities] = MarkdownV2Parser.parse("* _ ~ |");
            expect(text).toEqual("* _ ~ |");
            expect(entities.length).toEqual(0);
        });

        test("malformed code with no closing backtick stays literal", () => {
            const [text, entities] = MarkdownV2Parser.parse("`code");
            expect(text).toEqual("`code");
            expect(entities.length).toEqual(0);
        });

        test("input with literal NUL/SOH does not corrupt placeholders", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("a\u0000b\u0001c");
            // NUL/SOH are stripped to avoid clashing with internal
            // placeholder markers; surviving content is unaffected.
            expect(text).toEqual("abc");
            expect(entities.length).toEqual(0);
        });

        test("ambiguous ___text___ produces both italic and underline", () => {
            // Per spec this construct is ambiguous; users are advised to
            // write `___italic underline_**__` instead. Our parser yields
            // both an underline and an italic spanning the text.
            const [text, entities] =
                MarkdownV2Parser.parse("___text___");
            expect(text).toEqual("text");
            expect(entities.length).toEqual(2);
            const has = (cls: any) =>
                entities.some((e) => e instanceof cls);
            expect(has(types.MessageEntityItalic)).toBe(true);
            expect(has(types.MessageEntityUnderline)).toBe(true);
        });

        test("lone >|| produces an empty expandable blockquote", () => {
            const [text, entities] = MarkdownV2Parser.parse(">||");
            expect(text).toEqual("");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityBlockquote
            );
            expect(
                (entities[0] as types.MessageEntityBlockquote).collapsed
            ).toEqual(true);
        });

        test("pre with c++ as language", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```c++\nfoo```");
            expect(text).toEqual("foo");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(types.MessageEntityPre);
            expect((entities[0] as types.MessageEntityPre).language).toEqual(
                "c++"
            );
        });

        test("pre with c# as language", () => {
            const [text, entities] =
                MarkdownV2Parser.parse("```c#\nfoo```");
            expect(text).toEqual("foo");
            expect((entities[0] as types.MessageEntityPre).language).toEqual(
                "c#"
            );
        });

        test("custom emoji URL with extra query params", () => {
            const [text, entities] = MarkdownV2Parser.parse(
                "![👍](tg://emoji?v=1&id=42)"
            );
            expect(text).toEqual("👍");
            expect(entities.length).toEqual(1);
            expect(entities[0]).toBeInstanceOf(
                types.MessageEntityCustomEmoji
            );
            expect(
                (entities[0] as types.MessageEntityCustomEmoji).documentId
            ).toEqual("42");
        });
    });
});

describe("markdownV2ToHtml — standalone function", () => {
    test("converts bold to <b>", () => {
        expect(markdownV2ToHtml("*hi*")).toEqual("<b>hi</b>");
    });

    test("converts italic to <i>", () => {
        expect(markdownV2ToHtml("_hi_")).toEqual("<i>hi</i>");
    });

    test("converts underline to <u>", () => {
        expect(markdownV2ToHtml("__hi__")).toEqual("<u>hi</u>");
    });

    test("converts strike to <s>", () => {
        expect(markdownV2ToHtml("~hi~")).toEqual("<s>hi</s>");
    });

    test("converts spoiler to <tg-spoiler>", () => {
        expect(markdownV2ToHtml("||hi||")).toEqual(
            "<tg-spoiler>hi</tg-spoiler>"
        );
    });

    test("converts blockquote", () => {
        expect(markdownV2ToHtml(">hi")).toEqual(
            "<blockquote>hi</blockquote>"
        );
    });

    test("converts expandable blockquote", () => {
        expect(markdownV2ToHtml(">hi||")).toEqual(
            "<blockquote expandable>hi</blockquote>"
        );
    });

    test("converts inline code", () => {
        expect(markdownV2ToHtml("`x`")).toEqual("<code>x</code>");
    });

    test("converts pre block", () => {
        expect(markdownV2ToHtml("```x```")).toEqual("<pre>x</pre>");
    });

    test("converts pre with language", () => {
        expect(markdownV2ToHtml("```py\nfoo```")).toEqual(
            '<pre><code class="language-py">foo</code></pre>'
        );
    });

    test("converts inline link", () => {
        expect(markdownV2ToHtml("[hi](http://x.y)")).toEqual(
            '<a href="http://x.y">hi</a>'
        );
    });

    test("converts custom emoji", () => {
        expect(
            markdownV2ToHtml("![👍](tg://emoji?id=42)")
        ).toEqual('<tg-emoji emoji-id="42">👍</tg-emoji>');
    });

    test("strips backslash escapes from plain text", () => {
        expect(markdownV2ToHtml("1\\.5")).toEqual("1.5");
    });

    test("HTML-escapes plain-text < and &", () => {
        expect(markdownV2ToHtml("a < b & c")).toEqual(
            "a &lt; b &amp; c"
        );
    });

    test("HTML-escapes pre body", () => {
        expect(markdownV2ToHtml("```<x>```")).toEqual(
            "<pre>&lt;x&gt;</pre>"
        );
    });

    test("empty input → empty output", () => {
        expect(markdownV2ToHtml("")).toEqual("");
    });
});

describe("htmlToMarkdownV2 — standalone function", () => {
    test("converts <b> and <strong>", () => {
        expect(htmlToMarkdownV2("<b>hi</b>")).toEqual("*hi*");
        expect(htmlToMarkdownV2("<strong>hi</strong>")).toEqual("*hi*");
    });

    test("converts <i> and <em>", () => {
        expect(htmlToMarkdownV2("<i>hi</i>")).toEqual("_hi_");
        expect(htmlToMarkdownV2("<em>hi</em>")).toEqual("_hi_");
    });

    test("converts <u> and <ins>", () => {
        expect(htmlToMarkdownV2("<u>hi</u>")).toEqual("__hi__");
        expect(htmlToMarkdownV2("<ins>hi</ins>")).toEqual("__hi__");
    });

    test("converts <s>, <strike>, <del>", () => {
        expect(htmlToMarkdownV2("<s>hi</s>")).toEqual("~hi~");
        expect(htmlToMarkdownV2("<strike>hi</strike>")).toEqual("~hi~");
        expect(htmlToMarkdownV2("<del>hi</del>")).toEqual("~hi~");
    });

    test("converts spoiler in three forms", () => {
        expect(htmlToMarkdownV2("<tg-spoiler>x</tg-spoiler>")).toEqual(
            "||x||"
        );
        expect(
            htmlToMarkdownV2('<span class="tg-spoiler">x</span>')
        ).toEqual("||x||");
        expect(htmlToMarkdownV2("<spoiler>x</spoiler>")).toEqual("||x||");
    });

    test("converts inline code", () => {
        expect(htmlToMarkdownV2("<code>x</code>")).toEqual("`x`");
    });

    test("converts pre with language", () => {
        expect(
            htmlToMarkdownV2(
                '<pre><code class="language-py">foo</code></pre>'
            )
        ).toEqual("```py\nfoo```");
    });

    test("converts pre without language", () => {
        expect(htmlToMarkdownV2("<pre>foo</pre>")).toEqual("```foo```");
    });

    test("converts inline link", () => {
        expect(
            htmlToMarkdownV2('<a href="http://x.y">hi</a>')
        ).toEqual("[hi](http://x.y)");
    });

    test("converts blockquote", () => {
        expect(
            htmlToMarkdownV2("<blockquote>line1\nline2</blockquote>")
        ).toEqual(">line1\n>line2");
    });

    test("converts expandable blockquote", () => {
        expect(
            htmlToMarkdownV2(
                "<blockquote expandable>hi</blockquote>"
            )
        ).toEqual(">hi||");
        expect(
            htmlToMarkdownV2(
                '<blockquote expandable="">hi</blockquote>'
            )
        ).toEqual(">hi||");
    });

    test("converts custom emoji", () => {
        expect(
            htmlToMarkdownV2(
                '<tg-emoji emoji-id="42">👍</tg-emoji>'
            )
        ).toEqual("![👍](tg://emoji?id=42)");
    });

    test("decodes named HTML entities in tag content", () => {
        expect(htmlToMarkdownV2("<b>a &amp; b</b>")).toEqual("*a & b*");
        expect(htmlToMarkdownV2("a &lt; b &gt; c")).toEqual("a < b > c");
        expect(htmlToMarkdownV2("&quot;hi&quot;")).toEqual('"hi"');
    });
});

describe("MarkdownV2 round-trip via .parse and .unparse", () => {
    const cases: Array<{ name: string; md: string }> = [
        { name: "bold", md: "*hi*" },
        { name: "italic", md: "_hi_" },
        { name: "underline", md: "__hi__" },
        { name: "strike", md: "~hi~" },
        { name: "spoiler", md: "||hi||" },
        { name: "code", md: "`x`" },
        { name: "pre", md: "```foo```" },
        { name: "pre with language", md: "```py\nfoo```" },
        { name: "inline link", md: "[hi](http://x.y)" },
        { name: "blockquote", md: ">hi" },
    ];

    for (const c of cases) {
        test(`round-trips ${c.name}`, () => {
            const [text, entities] = MarkdownV2Parser.parse(c.md);
            const back = MarkdownV2Parser.unparse(text, entities);
            const [text2, entities2] = MarkdownV2Parser.parse(back);
            expect(text2).toEqual(text);
            expect(entities2.length).toEqual(entities.length);
            for (let i = 0; i < entities.length; i++) {
                expect(entities2[i].constructor).toBe(
                    entities[i].constructor
                );
            }
        });
    }

    test("expandable blockquote round-trips with collapsed flag preserved", () => {
        const [text, entities] = MarkdownV2Parser.parse(">hi||");
        const back = MarkdownV2Parser.unparse(text, entities);
        const [text2, entities2] = MarkdownV2Parser.parse(back);
        expect(text2).toEqual(text);
        expect(entities2.length).toEqual(1);
        expect(entities2[0]).toBeInstanceOf(types.MessageEntityBlockquote);
        expect(
            (entities2[0] as types.MessageEntityBlockquote).collapsed
        ).toEqual(true);
    });
});
