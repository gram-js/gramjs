const util = require('util')

/**
 * This class should be used to build .py source files
 */
class SourceBuilder {
    constructor(stream, indentSize) {
        this.currentIndent = 0
        this.onNewLine = false
        this.indentSize = indentSize || 4
        this.stream = stream

        // Was a new line added automatically before? If so, avoid it
        this.autoAddedLine = false
    }

    /**
     * Indents the current source code line
     * by the current indentation level
     */
    indent() {
        this.write(' '.repeat(Math.abs(this.currentIndent * this.indentSize)))
    }

    /**
     * Writes a string into the source code,
     * applying indentation if required
     */
    write(string, ...args) {
        if (this.onNewLine) {
            this.onNewLine = false // We're not on a new line anymore

            // If the string was not empty, indent; Else probably a new line
            if (string.trim()) {
                this.indent()
            }
        }

        if (args.length) {
            this.stream.write(util.format(string, ...args))
        } else {
            this.stream.write(string)
        }
    }

    /**
     * Writes a string into the source code _and_ appends a new line,
     * applying indentation if required
     */
    writeln(string, ...args) {
        this.write(`${string || ''}\n`, ...args)
        this.onNewLine = true

        // If we're writing a block, increment indent for the next time
        if (string && string.endsWith('{')) {
            this.currentIndent++
        }

        // Clear state after the user adds a new line
        this.autoAddedLine = false
    }

    /**
     * Ends an indentation block, leaving an empty line afterwards
     */
    endBlock(semiColon = false) {
        this.currentIndent--

        // If we did not add a new line automatically yet, now it's the time!
        if (!this.autoAddedLine) {
            this.writeln('}%s', semiColon ? ';' : '')
            this.autoAddedLine = true
        }
    }
}

module.exports = SourceBuilder
