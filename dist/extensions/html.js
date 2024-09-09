"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLParser = void 0;
const htmlparser2_1 = require("htmlparser2");
const tl_1 = require("../tl");
const index_1 = require("../index");
class HTMLToTelegramParser {
    constructor() {
        this.text = "";
        this.entities = [];
        this._buildingEntities = new Map();
        this._openTags = [];
        this._openTagsMeta = [];
    }
    onopentag(name, attributes) {
        /*
         * This fires when a new tag is opened.
         *
         * If you don't need an aggregated `attributes` object,
         * have a look at the `onopentagname` and `onattribute` events.
         */
        this._openTags.unshift(name);
        this._openTagsMeta.unshift(undefined);
        let EntityType;
        const args = {};
        if (name == "strong" || name == "b") {
            EntityType = tl_1.Api.MessageEntityBold;
        }
        else if (name == "spoiler") {
            EntityType = tl_1.Api.MessageEntitySpoiler;
        }
        else if (name == "em" || name == "i") {
            EntityType = tl_1.Api.MessageEntityItalic;
        }
        else if (name == "u") {
            EntityType = tl_1.Api.MessageEntityUnderline;
        }
        else if (name == "del" || name == "s") {
            EntityType = tl_1.Api.MessageEntityStrike;
        }
        else if (name == "blockquote") {
            EntityType = tl_1.Api.MessageEntityBlockquote;
        }
        else if (name == "code") {
            const pre = this._buildingEntities.get("pre");
            if (pre && pre instanceof tl_1.Api.MessageEntityPre) {
                try {
                    pre.language = attributes.class.slice("language-".length, attributes.class.length);
                }
                catch (e) {
                    // no language block
                }
            }
            else {
                EntityType = tl_1.Api.MessageEntityCode;
            }
        }
        else if (name == "pre") {
            EntityType = tl_1.Api.MessageEntityPre;
            args["language"] = "";
        }
        else if (name == "a") {
            let url = attributes.href;
            if (!url) {
                return;
            }
            if (url.startsWith("mailto:")) {
                url = url.slice("mailto:".length, url.length);
                EntityType = tl_1.Api.MessageEntityEmail;
            }
            else {
                EntityType = tl_1.Api.MessageEntityTextUrl;
                args["url"] = url;
                url = undefined;
            }
            this._openTagsMeta.shift();
            this._openTagsMeta.unshift(url);
        }
        else if (name == "tg-emoji") {
            EntityType = tl_1.Api.MessageEntityCustomEmoji;
            args["documentId"] = attributes["emoji-id"];
        }
        if (EntityType && !this._buildingEntities.has(name)) {
            this._buildingEntities.set(name, new EntityType(Object.assign({ offset: this.text.length, length: 0 }, args)));
        }
    }
    ontext(text) {
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
    onclosetag(tagname) {
        this._openTagsMeta.shift();
        this._openTags.shift();
        const entity = this._buildingEntities.get(tagname);
        if (entity) {
            this._buildingEntities.delete(tagname);
            this.entities.push(entity);
        }
    }
    onattribute(name, value, quote) { }
    oncdataend() { }
    oncdatastart() { }
    oncomment(data) { }
    oncommentend() { }
    onend() { }
    onerror(error) { }
    onopentagname(name) { }
    onparserinit(parser) { }
    onprocessinginstruction(name, data) { }
    onreset() { }
}
class HTMLParser {
    static parse(html) {
        if (!html) {
            return [html, []];
        }
        const handler = new HTMLToTelegramParser();
        const parser = new htmlparser2_1.Parser(handler);
        parser.write(html);
        parser.end();
        const text = index_1.helpers.stripText(handler.text, handler.entities);
        return [text, handler.entities];
    }
    static unparse(text, entities, _offset = 0, _length) {
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
            }
            else if (relativeOffset < lastOffset) {
                continue;
            }
            let skipEntity = false;
            let length = entity.length;
            let entityText = this.unparse(text.slice(relativeOffset, relativeOffset + length), entities.slice(i + 1, entities.length), entity.offset, length);
            if (entity instanceof tl_1.Api.MessageEntityBold) {
                html.push(`<strong>${entityText}</strong>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntitySpoiler) {
                html.push(`<spoiler>${entityText}</spoiler>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityItalic) {
                html.push(`<em>${entityText}</em>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityCode) {
                html.push(`<code>${entityText}</code>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityUnderline) {
                html.push(`<u>${entityText}</u>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityStrike) {
                html.push(`<del>${entityText}</del>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityBlockquote) {
                html.push(`<blockquote>${entityText}</blockquote>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityPre) {
                if (entity.language) {
                    html.push(`<pre><code class="language-${entity.language}">${entityText}</code></pre>`);
                }
                else {
                    html.push(`<pre>${entityText}</pre>`);
                }
            }
            else if (entity instanceof tl_1.Api.MessageEntityEmail) {
                html.push(`<a href="mailto:${entityText}">${entityText}</a>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityUrl) {
                html.push(`<a href="${entityText}">${entityText}</a>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityTextUrl) {
                html.push(`<a href="${entity.url}">${entityText}</a>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityMentionName) {
                html.push(`<a href="tg://user?id=${entity.userId}">${entityText}</a>`);
            }
            else if (entity instanceof tl_1.Api.MessageEntityCustomEmoji) {
                html.push(`<tg-emoji emoji-id="${entity.documentId}">${entityText}</tg-emoji>`);
            }
            else {
                skipEntity = true;
            }
            lastOffset = relativeOffset + (skipEntity ? 0 : length);
        }
        html.push(text.slice(lastOffset, text.length));
        return html.join("");
    }
}
exports.HTMLParser = HTMLParser;
