import { Api } from "../tl";
import { HTMLParser } from "./html";

const escapeHtmlAll = (s: string): string =>
    s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// HTML-escape only `&` and `<` (not `>`, since blockquote detection still
// needs literal `>` at line start; not `"`, which is harmless in text content).
const escapeHtmlText = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function processBlockquotes(text: string): string {
    const lines = text.split("\n");
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
        if (lines[i].startsWith(">")) {
            const block: string[] = [];
            while (i < lines.length && lines[i].startsWith(">")) {
                block.push(lines[i].slice(1));
                i++;
            }
            const lastIdx = block.length - 1;
            let expandable = false;
            if (block[lastIdx].endsWith("||")) {
                expandable = true;
                block[lastIdx] = block[lastIdx].slice(0, -2);
            }
            const tag = expandable ? "<blockquote expandable>" : "<blockquote>";
            out.push(`${tag}${block.join("\n")}</blockquote>`);
        } else {
            out.push(lines[i]);
            i++;
        }
    }
    return out.join("\n");
}

/**
 * Convert a Telegram MarkdownV2-formatted string to its HTML equivalent
 * (the dialect understood by {@link HTMLParser}, which is also valid
 * Telegram Bot API HTML).
 *
 * Implements the spec at https://core.telegram.org/bots/api#markdownv2-style:
 *   - Span markup: `*bold*`, `_italic_`, `__underline__`, `~strike~`,
 *     `||spoiler||`.
 *   - Inline `\`code\`` and ` ```pre``` ` (optionally
 *     ` ```language\nbody``` `).
 *   - Inline link `[label](url)` and custom emoji
 *     `![label](tg://emoji?id=N)`.
 *   - Blockquotes (`>line`); the last line ending in `||` marks the
 *     blockquote as expandable.
 *   - Backslash escapes: `\X` for any X is treated as the literal X. Inside
 *     pre/code only `\\` and `` \` `` apply; inside a link/emoji `(URL)` only
 *     `\\` and `\)` apply.
 *
 * Plain-text `&` and `<` are HTML-escaped so the output is safe to feed to
 * any HTML parser.
 */
export function markdownV2ToHtml(message: string): string {
    // Sanitize: strip raw NUL / SOH from the input. We use these two
    // control characters internally as placeholder delimiters; if they
    // appeared verbatim in user content the regexes in stages 5/6 could
    // splice in arbitrary protected HTML or look up undefined indices.
    // Telegram messages disallow these control chars anyway.
    message = message.replace(/[\u0000\u0001]/g, "");

    // Stage 1 — Extract protected regions (pre, code, links, custom emoji)
    // up front. Inside these, only their own escape rules apply, and outer
    // markup must NOT re-process them. Each region is converted to its final
    // HTML, HTML-escaped where necessary, and stored behind a placeholder
    // that survives stages 2-5 unchanged.
    const protectedHtml: string[] = [];
    const protect = (html: string): string => {
        const idx = protectedHtml.push(html) - 1;
        return `\u0000${idx}\u0000`;
    };

    let processed = "";
    let i = 0;
    while (i < message.length) {
        const c = message[i];

        // Backslash escape: keep both characters verbatim so stage 2 can
        // mask them away from the markup regexes.
        if (c === "\\" && i + 1 < message.length) {
            processed += message.slice(i, i + 2);
            i += 2;
            continue;
        }

        // Pre block: ```[language\n]body```
        if (message.startsWith("```", i)) {
            let j = i + 3;
            while (j < message.length) {
                if (message[j] === "\\" && j + 1 < message.length) {
                    j += 2;
                    continue;
                }
                if (message.startsWith("```", j)) break;
                j++;
            }
            if (j < message.length) {
                let body = message.slice(i + 3, j);
                let language = "";
                const nlIdx = body.indexOf("\n");
                if (nlIdx > 0) {
                    const candidate = body.slice(0, nlIdx);
                    // Accept any non-empty first line that contains no
                    // whitespace as the language tag (covers c++, c#,
                    // objective-c++, asp.net, etc.). If the first line
                    // contains a space/tab, treat it as content.
                    if (/^\S+$/.test(candidate)) {
                        language = candidate;
                        body = body.slice(nlIdx + 1);
                    }
                }
                body = body.replace(/\\([`\\])/g, "$1");
                const html = language
                    ? `<pre><code class="language-${escapeHtmlAll(
                          language
                      )}">${escapeHtmlAll(body)}</code></pre>`
                    : `<pre>${escapeHtmlAll(body)}</pre>`;
                processed += protect(html);
                i = j + 3;
                continue;
            }
        }

        // Inline code: `body`
        if (c === "`") {
            let j = i + 1;
            while (j < message.length) {
                if (message[j] === "\\" && j + 1 < message.length) {
                    j += 2;
                    continue;
                }
                if (message[j] === "`") break;
                j++;
            }
            if (j < message.length && message[j] === "`") {
                let body = message.slice(i + 1, j);
                body = body.replace(/\\([`\\])/g, "$1");
                processed += protect(`<code>${escapeHtmlAll(body)}</code>`);
                i = j + 1;
                continue;
            }
        }

        // Link [label](url) or custom emoji ![label](tg://emoji?id=N).
        // The label is left exposed so subsequent markup/unescape stages
        // still apply to it; only the surrounding tag is protected.
        if (c === "[" || (c === "!" && message[i + 1] === "[")) {
            const isEmoji = c === "!";
            const labelStart = i + (isEmoji ? 2 : 1);

            let labelEnd = labelStart;
            while (labelEnd < message.length) {
                if (
                    message[labelEnd] === "\\" &&
                    labelEnd + 1 < message.length
                ) {
                    labelEnd += 2;
                    continue;
                }
                if (message[labelEnd] === "]") break;
                labelEnd++;
            }

            if (
                labelEnd < message.length &&
                message[labelEnd] === "]" &&
                message[labelEnd + 1] === "("
            ) {
                let urlEnd = labelEnd + 2;
                let urlBody = "";
                while (urlEnd < message.length) {
                    if (
                        message[urlEnd] === "\\" &&
                        urlEnd + 1 < message.length
                    ) {
                        const next = message[urlEnd + 1];
                        if (next === ")" || next === "\\") {
                            urlBody += next;
                            urlEnd += 2;
                            continue;
                        }
                    }
                    if (message[urlEnd] === ")") break;
                    urlBody += message[urlEnd];
                    urlEnd++;
                }
                if (urlEnd < message.length && message[urlEnd] === ")") {
                    const label = message.slice(labelStart, labelEnd);
                    if (isEmoji) {
                        // Accept any tg://emoji URL with an `id=N`
                        // parameter (other query params allowed).
                        const m = urlBody.match(
                            /^tg:\/\/emoji\?(?:[^&]*&)*id=(\d+)(?:&|$)/
                        );
                        if (m) {
                            const open = protect(
                                `<tg-emoji emoji-id="${escapeHtmlAll(
                                    m[1]
                                )}">`
                            );
                            const close = protect(`</tg-emoji>`);
                            processed += open + label + close;
                            i = urlEnd + 1;
                            continue;
                        }
                        // Not a recognized emoji URL — emit `!` literal and
                        // let the next iteration parse `[...](...)` as a
                        // regular link.
                        processed += "!";
                        i += 1;
                        continue;
                    }
                    const open = protect(
                        `<a href="${escapeHtmlAll(urlBody)}">`
                    );
                    const close = protect(`</a>`);
                    processed += open + label + close;
                    i = urlEnd + 1;
                    continue;
                }
            }
        }

        processed += c;
        i++;
    }

    // Stage 2 — Mask backslash-escapes FIRST (before HTML-escaping). Each
    // \X is replaced with a placeholder containing only control characters,
    // so the markup regexes in stage 3 cannot consume the escaped char as a
    // delimiter. Stage 5 will substitute the bare char back. Masking must
    // happen before stage 2.5's HTML escape so that an escaped `<` is
    // captured as `<` (not as `&` from `&lt;`).
    const maskedEscapes: string[] = [];
    processed = processed.replace(/\\([\s\S])/g, (_match, ch) => {
        const idx = maskedEscapes.push(ch) - 1;
        return `\u0001${idx}\u0001`;
    });

    // Stage 2.5 — HTML-escape user content. Placeholders for protected
    // regions and masked escapes contain only NUL/SOH + digits, so they
    // are unaffected. We escape `&` and `<` only: `>` must stay literal so
    // stage 4 can detect line-start blockquote markers, and `"` is harmless
    // in text content.
    processed = escapeHtmlText(processed);

    // Stage 3 — Span-level markup. Order matters: `__` (underline) is
    // resolved before `_` (italic) per the spec's left-to-right greediness
    // for ambiguous `__`.
    processed = processed.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
    processed = processed.replace(/\*([\s\S]+?)\*/g, "<b>$1</b>");
    processed = processed.replace(/_([\s\S]+?)_/g, "<i>$1</i>");
    processed = processed.replace(/~([\s\S]+?)~/g, "<s>$1</s>");
    processed = processed.replace(
        /\|\|([\s\S]+?)\|\|/g,
        "<tg-spoiler>$1</tg-spoiler>"
    );

    // Stage 4 — Blockquotes (line-level). Runs after span markup so inline
    // formatting inside a quoted line is already converted to HTML tags.
    processed = processBlockquotes(processed);

    // Stage 5 — Unmask escapes: each placeholder becomes its bare char,
    // dropping the leading backslash. If the bare char is `<` or `&` we
    // re-escape so HTMLParser still sees it as user content.
    processed = processed.replace(/\u0001(\d+)\u0001/g, (_m, n) => {
        const ch = maskedEscapes[Number(n)];
        if (ch === "<") return "&lt;";
        if (ch === "&") return "&amp;";
        return ch;
    });

    // Stage 6 — Restore protected regions.
    processed = processed.replace(
        /\u0000(\d+)\u0000/g,
        (_m, n) => protectedHtml[Number(n)]
    );

    return processed;
}

/**
 * Convert a Telegram-flavored HTML string back to MarkdownV2 source.
 *
 * Accepts every tag listed in the Telegram Bot API HTML spec
 * (https://core.telegram.org/bots/api#html-style):
 *   - bold: `<b>` / `<strong>`
 *   - italic: `<i>` / `<em>`
 *   - underline: `<u>` / `<ins>`
 *   - strike: `<s>` / `<strike>` / `<del>`
 *   - spoiler: `<tg-spoiler>` / `<span class="tg-spoiler">` / `<spoiler>`
 *     (the last is what {@link HTMLParser.unparse} produces internally)
 *   - code, pre, blockquote (with optional `expandable` attribute),
 *     `<a href>`, `<tg-emoji emoji-id>`
 *
 * This is a best-effort textual transform; it does not yet emit MarkdownV2
 * backslash escapes for special characters in surrounding plain text, so
 * round-tripping plain text containing literal `*_~|...` is not guaranteed.
 */
export function htmlToMarkdownV2(html: string): string {
    let text = html;

    // Pre with optional language (must come before bare <pre>).
    text = text.replace(
        /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g,
        "```$1\n$2```"
    );

    // Pre
    text = text.replace(/<pre>([\s\S]*?)<\/pre>/g, "```$1```");

    // Code
    text = text.replace(/<code>([\s\S]*?)<\/code>/g, "`$1`");

    // Bold
    text = text.replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/g, "*$1*");

    // Italic
    text = text.replace(/<(?:i|em)>([\s\S]*?)<\/(?:i|em)>/g, "_$1_");

    // Underline
    text = text.replace(/<(?:u|ins)>([\s\S]*?)<\/(?:u|ins)>/g, "__$1__");

    // Strike
    text = text.replace(
        /<(?:s|strike|del)>([\s\S]*?)<\/(?:s|strike|del)>/g,
        "~$1~"
    );

    // Spoiler — accept all three spec/internal forms.
    text = text.replace(
        /<tg-spoiler>([\s\S]*?)<\/tg-spoiler>/g,
        "||$1||"
    );
    text = text.replace(
        /<span class="tg-spoiler">([\s\S]*?)<\/span>/g,
        "||$1||"
    );
    text = text.replace(/<spoiler>([\s\S]*?)<\/spoiler>/g, "||$1||");

    // Blockquote — render line-by-line with leading `>` and append `||` to
    // the last line if expandable.
    text = text.replace(
        /<blockquote(\s+expandable(?:="[^"]*")?)?>([\s\S]*?)<\/blockquote>/g,
        (_match, expandable, body) => {
            const lines = String(body).split("\n");
            const quoted = lines.map((l) => `>${l}`).join("\n");
            return expandable ? `${quoted}||` : quoted;
        }
    );

    // Inline URL
    text = text.replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, "[$2]($1)");

    // Custom emoji
    text = text.replace(
        /<tg-emoji emoji-id="(\d+)">([\s\S]*?)<\/tg-emoji>/g,
        "![$2](tg://emoji?id=$1)"
    );

    // Decode the four named HTML entities supported by Telegram's HTML
    // parse mode. Done last so partial entities introduced by earlier
    // substitutions (impossible in practice, but defensive) aren't double-
    // decoded.
    const namedEntities: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
    };
    text = text.replace(
        /&(amp|lt|gt|quot);/g,
        (_m, n: string) => namedEntities[n]
    );

    return text;
}

export class MarkdownV2Parser {
    static parse(message: string): [string, Api.TypeMessageEntity[]] {
        return HTMLParser.parse(markdownV2ToHtml(message));
    }

    static unparse(
        text: string,
        entities: Api.TypeMessageEntity[] | undefined
    ) {
        return htmlToMarkdownV2(HTMLParser.unparse(text, entities));
    }
}
