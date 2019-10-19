const fs = require('fs')
const path = require('path')
const glob = require('glob')

class TempWorkDir {
    /**
     * Switches the working directory to be the one on which this file lives.
     */
    constructor(dir) {
        this.original = null
        this.dir = dir || path.join(__filename, '..')
    }

    open() {
        this.original = __dirname
        fs.mkdirSync(this.dir, { recursive: true })
        process.chdir(this.dir)
        return this
    }

    close() {
        process.chdir(this.original)
    }
}

const GENERATOR_DIR = './gramjs_generator'
const LIBRARY_DIR = './gramjs'

const ERRORS_IN = `${GENERATOR_DIR}/data/errors.csv`
const ERRORS_OUT = `${LIBRARY_DIR}/errors/RPCErrorList.js`

const METHODS_IN = `${GENERATOR_DIR}/data/methods.csv`

// Which raw API methods are covered by *friendly* methods in the client?
const FRIENDLY_IN = `${GENERATOR_DIR}/data/friendly.csv`

const TLOBJECT_IN_TLS = glob.sync(`${GENERATOR_DIR}/data/*.tl`)
const TLOBJECT_OUT = `${LIBRARY_DIR}/tl`
const IMPORT_DEPTH = 2

const DOCS_IN_RES = `../${GENERATOR_DIR}/data/html`
const DOCS_OUT = `./docs`

const generate = (which, action = 'gen') => {
    const {
        parseErrors,
        parseMethods,
        parseTl,
        findLayer,
    } = require('./gramjs_generator/parsers')

    const {
        generateErrors,
        generateTLObjects,
        generateDocs,
        cleanTLObjects,
    } = require('./gramjs_generator/generators')

    const [layer] = TLOBJECT_IN_TLS.map(findLayer).filter(Boolean)
    const errors = [...parseErrors(ERRORS_IN)]
    const methods = [
        ...parseMethods(
            METHODS_IN,
            FRIENDLY_IN,
            errors.reduce((errors, error) => {
                errors[error.stringCode] = error
                return errors
            }, {})
        ),
    ]

    const tlobjects = TLOBJECT_IN_TLS.reduce(
        (files, file) => [...files, ...parseTl(file, layer, methods)],
        []
    )

    if (!which || which.length === 0) {
        which.push('tl', 'errors')
    }

    const clean = action === 'clean'
    action = clean ? 'Cleaning' : 'Generating'

    if (which.includes('all')) {
        which.splice(which.indexOf('all'), 1)

        for (const x of ['tl', 'errors', 'docs']) {
            if (!which.includes(x)) {
                which.push(x)
            }
        }
    }

    if (which.includes('tl')) {
        which.splice(which.indexOf('tl'), 1)
        console.log(action, 'TLObjects...')

        if (clean) {
            cleanTLObjects(TLOBJECT_OUT)
        } else {
            generateTLObjects(tlobjects, layer, IMPORT_DEPTH, TLOBJECT_OUT)
        }
    }

    if (which.includes('errors')) {
        which.splice(which.indexOf('errors'), 1)
        console.log(action, 'RPCErrors...')

        if (clean) {
            if (fs.statSync(ERRORS_OUT).isFile()) {
                fs.unlinkSync(ERRORS_OUT)
            }
        } else {
            const file = fs.createWriteStream(ERRORS_OUT)
            generateErrors(errors, file)
        }
    }

    if (which.includes('docs')) {
        which.splice(which.indexOf('docs'), 1)
        console.log(action, 'documentation...')

        if (clean) {
            if (fs.statSync(DOCS_OUT)) {
                fs.rmdirSync(DOCS_OUT)
            }
        } else {
            const tmp = new TempWorkDir(DOCS_OUT).open()
            generateDocs(tlobjects, methods, layer, DOCS_IN_RES)
            tmp.close()
        }
    }

    if (which.includes('json')) {
        which.splice(which.indexOf('json'), 1)
        console.log(action, 'JSON schema...')

        const jsonFiles = TLOBJECT_IN_TLS.map(
            (x) => x.slice(0, x.lastIndexOf('.')) + '.json'
        )

        if (clean) {
            for (const file of jsonFiles) {
                if (fs.statSync(file).isFile()) {
                    fs.unlinkSync(file)
                }
            }
        } else {
            const genJson = (fin, fout) => {
                const meths = []
                const constructors = []

                for (const tl of parseTl(fin, layer)) {
                    if (tl.isFunction) {
                        meths.push(tl.toJson())
                    } else {
                        constructors.push(tl.toJson())
                    }
                }

                const what = { constructors, methods }
                fs.writeFileSync(fout, JSON.stringify(what, null, 2))
            }

            for (let i = 0; i < TLOBJECT_IN_TLS.length; i++) {
                const fin = TLOBJECT_IN_TLS[i]
                const fout = jsonFiles[i]
                genJson(fin, fout)
            }
        }
    }

    if (which.length) {
        console.log('The following items were not understood:', which)
        console.log('  Consider using only "tl", "errors" and/or "docs".')
        console.log(
            '  Using only "clean" will clean them. "all" to act on all.'
        )
        console.log('  For instance "gen tl errors".')
    }
}

const { argv } = process
if (argv.length > 2 && argv[2] === 'gen') {
    generate(argv.slice(3))
}
