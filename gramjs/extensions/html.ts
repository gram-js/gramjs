import { Parser } from "htmlparser2";
import { Handler } from "htmlparser2/lib/Parser";
import { Api } from "../tl";
import { helpers } from "../index";

class HTMLToTelegramParser implements Handler {
    text: string;
    entities: Api.TypeMessageEntity[];
    private readonly _buildingEntities: Map<string, Api.TypeMessageEntity>;
    private readonly _openTags: string[];
    private readonly _openTagsMeta: (string | undefined)[];

    constructor() {
        this.text = "";
        this.entities = [];
        this._buildingEntities = new Map<string, Api.TypeMessageEntity>();
        this._openTags = [];
        this._openTagsMeta = [];
    }

    onopentag(
        name: string,
        attributes: {
            [s: string]: string;
        }
    ) {
        /*
         * This fires when a new tag is opened.
         *
         * If you don't need an aggregated `attributes` object,
         * have a look at the `onopentagname` and `onattribute` events.
         */
        this._openTags.unshift(name);
        this._openTagsMeta.unshift(undefined);
        let EntityType;
        const args: any = {};
        if (name == "strong" || name == "b") {
            EntityType = Api.MessageEntityBold;
        } else if (name == "spoiler") {
            EntityType = Api.MessageEntitySpoiler;
        } else if (name == "em" || name == "i") {
            EntityType = Api.MessageEntityItalic;
        } else if (name == "u") {
            EntityType = Api.MessageEntityUnderline;
        } else if (name == "del" || name == "s") {
            EntityType = Api.MessageEntityStrike;
        } else if (name == "blockquote") {
            EntityType = Api.MessageEntityBlockquote;
            if (attributes.expandable !== undefined) {
                args.collapsed = true;
            }
        } else if (name == "code") {
            const pre = this._buildingEntities.get("pre");
            if (pre && pre instanceof Api.MessageEntityPre) {
                try {
                    pre.language = attributes.class.slice(
                        "language-".length,
                        attributes.class.length
                    );
                } catch (e) {
                    // no language block
                }
            } else {
                EntityType = Api.MessageEntityCode;
            }
        } else if (name == "pre") {
            EntityType = Api.MessageEntityPre;
            args["language"] = "";
        } else if (name == "a") {
            let url: string | undefined = attributes.href;
            if (!url) {
                return;
            }
            if (url.startsWith("mailto:")) {
                url = url.slice("mailto:".length, url.length);
                EntityType = Api.MessageEntityEmail;
            } else {
                EntityType = Api.MessageEntityTextUrl;
                args["url"] = url;
                url = undefined;
            }
            this._openTagsMeta.shift();
            this._openTagsMeta.unshift(url);
        } else if (name == "tg-emoji") {
            EntityType = Api.MessageEntityCustomEmoji;
            args["documentId"] = attributes["emoji-id"];
        }
        if (EntityType && !this._buildingEntities.has(name)) {
            this._buildingEntities.set(
                name,
                new EntityType({
                    offset: this.text.length,
                    length: 0,
                    ...args,
                })
            );
        }
    }

    ontext(text: string) {
        const previousTag = this._openTags.length > 0 ? this._openTags[0] : "";
        if (previousTag == "a") {
            const url = this._openTagsMeta[0];
            if (url) {
                text = url;
            }
        }
        for (let [tag, entity] of this._buildingEntities) {
            entity.length += text.length;
        }
        this.text += text;
    }

    onclosetag(tagname: string) {
        this._openTagsMeta.shift();
        this._openTags.shift();
        const entity = this._buildingEntities.get(tagname);
        if (entity) {
            this._buildingEntities.delete(tagname);
            this.entities.push(entity);
        }
    }

    onattribute(
        name: string,
        value: string,
        quote?: string | undefined | null
    ): void {}

    oncdataend(): void {}

    oncdatastart(): void {}

    oncomment(data: string): void {}

    oncommentend(): void {}

    onend(): void {}

    onerror(error: Error): void {}

    onopentagname(name: string): void {}

    onparserinit(parser: Parser): void {}

    onprocessinginstruction(name: string, data: string): void {}

    onreset(): void {}
}

export class HTMLParser {
    static parse(html: string): [string, Api.TypeMessageEntity[]] {
        if (!html) {
            return [html, []];
        }
        const handler = new HTMLToTelegramParser();
        const parser = new Parser(handler);
        parser.write(html);
        parser.end();
        const text = helpers.stripText(handler.text, handler.entities);
        return [text, handler.entities];
    }

    static unparse(
        text: string,
        entities: Api.TypeMessageEntity[] | undefined,
        _offset: number = 0,
        _length?: number
    ): string {
        if (!text || !entities || !entities.length) {
            return text;
        }
        if (_length == undefined) {
            _length = text.length;
        }
        const html = [];
        let lastOffset = 0;
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.offset >= _offset + _length) {
                break;
            }
            let relativeOffset = entity.offset - _offset;
            if (relativeOffset > lastOffset) {
                html.push(text.slice(lastOffset, relativeOffset));
            } else if (relativeOffset < lastOffset) {
                continue;
            }
            let skipEntity = false;
            let length = entity.length;
            let entityText = this.unparse(
                text.slice(relativeOffset, relativeOffset + length),
                entities.slice(i + 1, entities.length),
                entity.offset,
                length
            );
            if (entity instanceof Api.MessageEntityBold) {
                html.push(`<strong>${entityText}</strong>`);
            } else if (entity instanceof Api.MessageEntitySpoiler) {
                html.push(`<spoiler>${entityText}</spoiler>`);
            } else if (entity instanceof Api.MessageEntityItalic) {
                html.push(`<em>${entityText}</em>`);
            } else if (entity instanceof Api.MessageEntityCode) {
                html.push(`<code>${entityText}</code>`);
            } else if (entity instanceof Api.MessageEntityUnderline) {
                html.push(`<u>${entityText}</u>`);
            } else if (entity instanceof Api.MessageEntityStrike) {
                html.push(`<del>${entityText}</del>`);
            } else if (entity instanceof Api.MessageEntityBlockquote) {
                html.push(`<blockquote>${entityText}</blockquote>`);
            } else if (entity instanceof Api.MessageEntityPre) {
                if (entity.language) {
                    html.push(
                        `<pre><code class="language-${entity.language}">${entityText}</code></pre>`
                    );
                } else {
                    html.push(`<pre>${entityText}</pre>`);
                }
            } else if (entity instanceof Api.MessageEntityEmail) {
                html.push(`<a href="mailto:${entityText}">${entityText}</a>`);
            } else if (entity instanceof Api.MessageEntityUrl) {
                html.push(`<a href="${entityText}">${entityText}</a>`);
            } else if (entity instanceof Api.MessageEntityTextUrl) {
                html.push(`<a href="${entity.url}">${entityText}</a>`);
            } else if (entity instanceof Api.MessageEntityMentionName) {
                html.push(
                    `<a href="tg://user?id=${entity.userId}">${entityText}</a>`
                );
            } else if (entity instanceof Api.MessageEntityCustomEmoji) {
                html.push(
                    `<tg-emoji emoji-id="${entity.documentId}">${entityText}</tg-emoji>`
                );
            } else {
                skipEntity = true;
            }
            lastOffset = relativeOffset + (skipEntity ? 0 : length);
        }
        html.push(text.slice(lastOffset, text.length));
        return html.join("");
    }
}
