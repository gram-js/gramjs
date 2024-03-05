"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownV2Parser = void 0;
const html_1 = require("./html");
class MarkdownV2Parser {
    static parse(message) {
        // Bold
        message = message.replace(/\*(.*?)\*/g, "<b>$1</b>");
        // underline
        message = message.replace(/__(.*?)__/g, "<u>$1</u>");
        // strikethrough
        message = message.replace(/~(.*?)~/g, "<s>$1</s>");
        // italic
        message = message.replace(/-(.*?)-/g, "<i>$1</i>");
        // pre
        message = message.replace(/```(.*?)```/g, "<pre>$1</pre>");
        // code
        message = message.replace(/`(.*?)`/g, "<code>$1</code>");
        // Spoiler
        message = message.replace(/\|\|(.*?)\|\|/g, "<spoiler>$1</spoiler>");
        // Inline URL
        message = message.replace(/(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        // Emoji
        message = message.replace(/!\[([^\]]+)\]\(tg:\/\/emoji\?id=(\d+)\)/g, '<tg-emoji emoji-id="$2">$1</tg-emoji>');
        return html_1.HTMLParser.parse(message);
    }
    static unparse(text, entities) {
        text = html_1.HTMLParser.unparse(text, entities);
        // Bold
        text = text.replace(/<b>(.*?)<\/b>/g, "*$1*");
        // Underline
        text = text.replace(/<u>(.*?)<\/u>/g, "__$1__");
        // Code
        text = text.replace(/<code>(.*?)<\/code>/g, "`$1`");
        // Pre
        text = text.replace(/<pre>(.*?)<\/pre>/g, "```$1```");
        // strikethrough
        text = text.replace(/<s>(.*?)<\/s>/g, "~$1~");
        // Italic
        text = text.replace(/<i>(.*?)<\/i>/g, "-$1-");
        // Spoiler
        text = text.replace(/<spoiler>(.*?)<\/spoiler>/g, "||$1||");
        // Inline URL
        text = text.replace(/<a href="([^"]+)">([^<]+)<\/a>/g, "[$2]($1)");
        // Emoji
        text = text.replace(/<tg-emoji emoji-id="(\d+)">([^<]+)<\/tg-emoji>/g, "![$2](tg://emoji?id=$1)");
        return text;
    }
}
exports.MarkdownV2Parser = MarkdownV2Parser;
