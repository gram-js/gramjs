/* eslint-disable no-extend-native */
/* eslint-disable no-case-declarations, no-fallthrough */
const Scanner = require('./Scanner')
const {
    MessageEntityBold, MessageEntityItalic, MessageEntityCode,
    MessageEntityPre, MessageEntityEmail, MessageEntityTextUrl,
    MessageEntityUnderline, MessageEntityStrike, MessageEntityBlockquote,
} = require('../tl/types')

class HTMLParser extends Scanner {
    constructor(str) {
        super(str)
        this.text = ''
        this.entities = []
        this._buildingEntities = {}
        this._openTags = []
        this._openTagsMeta = []
    }

    parse() {
        while (!this.eof()) {
            switch (this.peek(1)) {
            case '<':
                this.consume(1)
                if (this.peek(1) === '/') {
                    // Closing tag
                    this.consume(1)
                    const tag = this.scanUntil('>').trim()

                    // Consume the closing bracket
                    this.consume(1)

                    this.handleEndTag(tag)
                } else {
                    // Opening tag
                    let tag = this.scanUntil('>').trim()
                    let attrs

                    // Consume the closing bracket
                    this.consume(1);

                    [tag, ...attrs] = tag.split(/\s+/)
                    attrs = attrs
                        // Split on `=`
                        .map(a => a.split('='))
                        // Take non key/value items and make them `true`
                        .map(a => a.length === 1 ? a.concat([true]) : a)
                        // Remove quotes if they exist
                        .map(a => {
                            const attr = a[1].replace(/^('|")|('|")$/g, '')
                            return [a[0], attr]
                        })
                        .reduce((p, c) => {
                            p[c[0]] = c[1]
                            return p
                        }, {})

                    this.handleStartTag(tag, attrs)
                }
                break
            default:
                if (this.eof()) {
                    break
                }
                this.handleData(this.chr)
                this.pos += 1
            }
        }

        return [this.text, this.entities]
    }

    static unparse(text, entities, _offset = 0, _length = null) {
        if (!_length) {
            _length = text.length
        }

        const html = []
        let lastOffset = 0

        for (const [i, entity] of entities.entries()) {
            if (entity.offset > _offset + _length) {
                break
            }

            const relativeOffset = entity.offset - _offset
            if (relativeOffset > lastOffset) {
                html.push(text.substring(lastOffset, relativeOffset))
            } else if (relativeOffset < lastOffset) {
                continue
            }

            let skipEntity = false
            let length = entity.length

            while ((relativeOffset < _length) &&
                   ('\ud800' <= text.substring(relativeOffset, length)) &&
                   (text.substring(relativeOffset, length) <= '\udfff')) {
                length += 1
            }

            const entityText = this.unparse(
                text.substring(relativeOffset, relativeOffset + length),
                entities.slice(i + 1, entities.length),
                entity.offset,
                length,
            )

            const entityType = entity.constructor.name

            switch (entityType) {
            case 'MessageEntityBold':
                html.push(`<strong>${entityText}</strong>`)
                break
            case 'MessageEntityItalic':
                html.push(`<em>${entityText}</em>`)
                break
            case 'MessageEntityCode':
                html.push(`<code>${entityText}</code>`)
                break
            case 'MessageEntityUnderline':
                html.push(`<u>${entityText}</u>`)
                break
            case 'MessageEntityStrike':
                html.push(`<del>${entityText}</del>`)
                break
            case 'MessageEntityBlockquote':
                html.push(`<blockquote>${entityText}</blockquote>`)
                break
            case 'MessageEntityPre':
                if (entity.language) {
                    html.push(`<pre>
                      <code class="language-${entity.language}">
                        ${entityText}
                      </code>
                    </pre>`)
                } else {
                    html.push(`<pre>${entityText}</pre>`)
                }
                break
            case 'MessageEntityEmail':
                html.push(`<a href="mailto:${entityText}">${entityText}</a>`)
                break
            case 'MessageEntityUrl':
                html.push(`<a href="${entityText}">${entityText}</a>`)
                break
            case 'MessageEntityTextUrl':
                html.push(`<a href="${entity.url}">${entityText}</a>`)
                break
            case 'MessageEntityMentionName':
                html.push(`<a href="tg://user?id=${entity.userId}">${entityText}</a>`)
                break
            default:
                skipEntity = true
            }

            lastOffset = relativeOffset + (skipEntity ? 0 : length)
        }

        while ((lastOffset < _length) &&
               ('\ud800' <= text.substring(lastOffset)) &&
               (text.substring(lastOffset) <= '\udfff')) {
            lastOffset += 1
        }

        html.push(text.substring(lastOffset, text.length))
        return html.join('')
    }

    handleStartTag(tag, attrs = {}) {
        this._openTags.unshift(tag)
        this._openTagsMeta.unshift(null)

        let EntityType
        const args = {}

        switch (tag) {
        case 'b':
        case 'strong':
            EntityType = MessageEntityBold
            break
        case 'i':
        case 'em':
            EntityType = MessageEntityItalic
            break
        case 'u':
            EntityType = MessageEntityUnderline
            break
        case 's':
        case 'del':
            EntityType = MessageEntityStrike
            break
        case 'blockquote':
            EntityType = MessageEntityBlockquote
            break
        case 'code':
            // If we're in the middle of a <pre> tag, this <code> tag is
            // probably intended for syntax highlighting.
            //
            // Syntax highlighting is set with
            //     <code class='language-...'>codeblock</code>
            // inside <pre> tags
            const pre = this._buildingEntities['pre']
            const language = attrs['class'] ? attrs['class'].match(/language-(\S+)/)[1] : null
            if (pre && language) {
                pre.language = language
            } else {
                EntityType = MessageEntityCode
            }
            break
        case 'pre':
            EntityType = MessageEntityPre
            args['language'] = ''
            break
        case 'a':
            let url = attrs['href']
            if (!url) {
                return
            }

            if (url.indexOf('mailto:') === 0) {
                EntityType = MessageEntityEmail
            } else {
                EntityType = MessageEntityTextUrl
                args['url'] = url
                url = null
            }

            this._openTagsMeta.shift()
            this._openTagsMeta.unshift(url)
            break
        default:
            // Do nothing
        }

        if (EntityType && !(tag in this._buildingEntities)) {
            this._buildingEntities[tag] = new EntityType({
                offset: this.text.length,
                // The length will be determined when closing the tag.
                length: 0,
                ...args,
            })
        }
    }

    handleData(text) {
        for (const [, entity] of Object.entries(this._buildingEntities)) {
            entity.length += text.length
        }

        this.text += text
    }

    handleEndTag(tag) {
        this._openTags.shift()
        this._openTagsMeta.shift()

        const entity = this._buildingEntities[tag]
        if (entity) {
            delete this._buildingEntities[tag]
            this.entities.push(entity)
        }
    }
}

const parse = str => {
    const parser = new HTMLParser(str)
    return parser.parse()
}

const unparse = HTMLParser.unparse

module.exports = {
    HTMLParser,
    parse,
    unparse,
}
