const fs = require('fs')
const path = require('path')
const util = require('util')

class DocsWriter {
    /**
     * Utility class used to write the HTML files used on the documentation.
     *
     * Initializes the writer to the specified output file,
     * creating the parent directories when used if required.
     */
    constructor(filename, typeToPath) {
        this.filename = filename
        this._parent = path.join(this.filename, '..')
        this.handle = null
        this.title = ''

        // Should be set before calling adding items to the menu
        this.menuSeparatorTag = null

        // Utility functions
        this.typeToPath = (t) => this._rel(typeToPath(t))

        // Control signals
        this.menuBegan = false
        this.tableColumns = 0
        this.tableColumnsLeft = null
        this.writeCopyScript = false
        this._script = ''
    }

    /**
     * Get the relative path for the given path from the current
     * file by working around https://bugs.python.org/issue20012.
     */
    _rel(path_) {
        return path
            .relative(this._parent, path_)
            .replace(new RegExp(`\\${path.sep}`, 'g'), '/')
    }

    /**
     * Writes the head part for the generated document,
     * with the given title and CSS
     */
    // High level writing
    writeHead(title, cssPath, defaultCss) {
        this.title = title
        this.write(
            `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link id="style" href="${this._rel(
        cssPath
    )}/docs.dark.css" rel="stylesheet">
    <script>
    document.getElementById("style").href = "${this._rel(cssPath)}/docs."
        + (localStorage.getItem("theme") || "${defaultCss}")
        + ".css";
    </script>
    <link href="https://fonts.googleapis.com/css?family=Nunito|Source+Code+Pro"
          rel="stylesheet">
</head>
<body>
<div id="main_div">`
        )
    }

    /**
     * Sets the menu separator.
     * Must be called before adding entries to the menu
     */
    setMenuSeparator(img) {
        if (img) {
            this.menuSeparatorTag = `<img src="${this._rel(img)}" alt="/" />`
        } else {
            this.menuSeparatorTag = null
        }
    }

    /**
     * Adds a menu entry, will create it if it doesn't exist yet
     */
    addMenu(name, link) {
        if (this.menuBegan) {
            if (this.menuSeparatorTag) {
                this.write(this.menuSeparatorTag)
            }
        } else {
            // First time, create the menu tag
            this.write('<ul class="horizontal">')
            this.menuBegan = true
        }

        this.write('<li>')

        if (link) {
            this.write(`<a href="${this._rel(link)}">`)
        }

        // Write the real menu entry text
        this.write(name)

        if (link) {
            this.write('</a>')
        }

        this.write('</li>')
    }

    /**
     * Ends an opened menu
     */
    endMenu() {
        if (!this.menuBegan) {
            throw new Error('No menu had been started in the first place.')
        }

        this.write('</ul>')
    }

    /**
     * Writes a title header in the document body,
     * with an optional depth level
     */
    writeTitle(title, level, id) {
        level = level || 1

        if (id) {
            this.write(`<h${level} id="${id}">${title}</h${level}>`)
        } else {
            this.write(`<h${level}>${title}</h${level}>`)
        }
    }

    /**
     * Writes the code for the given 'tlobject' properly
     * formatted with hyperlinks
     */
    writeCode(tlobject) {
        this.write(
            `<pre>---${tlobject.isFunction ? 'functions' : 'types'}---\n`
        )

        // Write the function or type and its ID
        if (tlobject.namespace) {
            this.write(tlobject.namespace)
            this.write('.')
        }

        this.write(
            `${tlobject.name}#${tlobject.id.toString(16).padStart(8, '0')}`
        )

        // Write all the arguments (or do nothing if there's none)
        for (const arg of tlobject.args) {
            this.write(' ')
            const addLink = !arg.genericDefinition && !arg.isGeneric

            // "Opening" modifiers
            if (arg.genericDefinition) {
                this.write('{')
            }

            // Argument name
            this.write(arg.name)
            this.write(':')

            // "Opening" modifiers
            if (arg.isFlag) {
                this.write(`flags.${arg.flagIndex}?`)
            }

            if (arg.isGeneric) {
                this.write('!')
            }

            if (arg.isVector) {
                this.write(
                    `<a href="${this.typeToPath('vector')}">Vector</a>&lt;`
                )
            }

            // Argument type
            if (arg.type) {
                if (addLink) {
                    this.write(`<a href="${this.typeToPath(arg.type)}">`)
                }

                this.write(arg.type)

                if (addLink) {
                    this.write('</a>')
                }
            } else {
                this.write('#')
            }

            // "Closing" modifiers
            if (arg.isVector) {
                this.write('&gt;')
            }

            if (arg.genericDefinition) {
                this.write('}')
            }
        }

        // Now write the resulting type (result from a function/type)
        this.write(' = ')
        const [genericName] = tlobject.args
            .filter((arg) => arg.genericDefinition)
            .map((arg) => arg.name)

        if (tlobject.result === genericName) {
            // Generic results cannot have any link
            this.write(tlobject.result)
        } else {
            if (/^vector</i.test(tlobject.result)) {
                // Notice that we don't simply make up the "Vector" part,
                // because some requests (as of now, only FutureSalts),
                // use a lower type name for it (see #81)
                let [vector, inner] = tlobject.result.split('<')
                inner = inner.replace(/>+$/, '')

                this.write(
                    `<a href="${this.typeToPath(vector)}">${vector}</a>&lt;`
                )
                this.write(
                    `<a href="${this.typeToPath(inner)}">${inner}</a>&gt;`
                )
            } else {
                this.write(
                    `<a href="${this.typeToPath(tlobject.result)}">${
                        tlobject.result
                    }</a>`
                )
            }
        }

        this.write('</pre>')
    }

    /**
     * Begins a table with the given 'column_count', required to automatically
     * create the right amount of columns when adding items to the rows
     */
    beginTable(columnCount) {
        this.tableColumns = columnCount
        this.tableColumnsLeft = 0
        this.write('<table>')
    }

    /**
     * This will create a new row, or add text to the next column
     * of the previously created, incomplete row, closing it if complete
     */
    addRow(text, link, bold, align) {
        if (!this.tableColumnsLeft) {
            // Starting a new row
            this.write('<tr>')
            this.tableColumnsLeft = this.tableColumns
        }

        this.write('<td')

        if (align) {
            this.write(` style="text-align: ${align}"`)
        }

        this.write('>')

        if (bold) {
            this.write('<b>')
        }

        if (link) {
            this.write(`<a href="${this._rel(link)}">`)
        }

        // Finally write the real table data, the given text
        this.write(text)

        if (link) {
            this.write('</a>')
        }

        if (bold) {
            this.write('</b>')
        }

        this.write('</td>')

        this.tableColumnsLeft -= 1
        if (!this.tableColumnsLeft) {
            this.write('</tr>')
        }
    }

    endTable() {
        if (this.tableColumnsLeft) {
            this.write('</tr>')
        }

        this.write('</table>')
    }

    /**
     * Writes a paragraph of text
     */
    writeText(text) {
        this.write(`<p>${text}</p>`)
    }

    /**
     * Writes a button with 'text' which can be used
     * to copy 'textToCopy' to clipboard when it's clicked.
     */
    writeCopyButton(text, textToCopy) {
        this.writeCopyScript = true
        this.write(
            `<button onclick="cp('${textToCopy.replace(
                /'/g,
                '\\\''
            )}');">${text}</button>`
        )
    }

    addScript(src, path) {
        if (path) {
            this._script += `<script src="${this._rel(path)}"></script>`
        } else if (src) {
            this._script += `<script>${src}</script>`
        }
    }

    /**
     * Ends the whole document. This should be called the last
     */
    endBody() {
        if (this.writeCopyScript) {
            this.write(
                '<textarea id="c" class="invisible"></textarea>' +
                    '<script>' +
                    'function cp(t){' +
                    'var c=document.getElementById("c");' +
                    'c.value=t;' +
                    'c.select();' +
                    'try{document.execCommand("copy")}' +
                    'catch(e){}}' +
                    '</script>'
            )
        }

        this.write(`</div>${this._script}</body></html>`)
    }

    /**
     * Wrapper around handle.write
     */
    // "Low" level writing
    write(s, ...args) {
        if (args.length) {
            fs.appendFileSync(this.handle, util.format(s, ...args))
        } else {
            fs.appendFileSync(this.handle, s)
        }
    }

    open() {
        // Sanity check
        const parent = path.join(this.filename, '..')
        fs.mkdirSync(parent, { recursive: true })

        this.handle = fs.openSync(this.filename, 'w')

        return this
    }

    close() {
        fs.closeSync(this.handle)
    }
}

module.exports = {
    DocsWriter,
}
