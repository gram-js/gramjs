const { crc32 } = require('crc');
const struct = require('python-struct');
const { snakeToCamelCase } = require('../../utils');

// https://github.com/telegramdesktop/tdesktop/blob/4bf66cb6e93f3965b40084771b595e93d0b11bcd/Telegram/SourceFiles/codegen/scheme/codegen_scheme.py#L57-L62
const WHITELISTED_MISMATCHING_IDS = {
    // 0 represents any layer
    0: new Set([
        'channel', // Since layer 77, there seems to be no going back...
        'ipPortSecret',
        'accessPointRule',
        'help.configSimple',
    ]),
};

/**
 * Initializes a new TLObject, given its properties.
 *
 * :param fullname: The fullname of the TL object (namespace.name)
 *                  The namespace can be omitted.
 * :param object_id: The hexadecimal string representing the object ID
 * :param args: The arguments, if any, of the TL object
 * :param result: The result type of the TL object
 * :param is_function: Is the object a function or a type?
 * :param usability: The usability for this method.
 * :param friendly: A tuple (namespace, friendly method name) if known.
 * :param layer: The layer this TLObject belongs to.
 */
class TLObject {
    constructor(
        fullname,
        objectId,
        args,
        result,
        isFunction,
        usability,
        friendly,
        layer
    ) {
        // The name can or not have a namespace
        this.fullname = fullname;

        if (fullname.includes('.')) {
            [this.namespace, this.name] = fullname.split(/\.(.+)/);
            // console.log(fullname.split(/\.(.+)/));
            // const [namespace, ...name] = fullname.split('.');
            // this.namespace = namespace;
            // this.name = name.join('.');
        } else {
            this.namespace = null;
            this.name = fullname;
        }

        this.args = args;
        this.result = result;
        this.isFunction = isFunction;
        this.usability = usability;
        this.friendly = friendly;
        this.id = null;

        if (!objectId) {
            this.id = this.inferId();
        } else {
            this.id = parseInt(objectId, 16);

            const whitelist = new Set([
                ...WHITELISTED_MISMATCHING_IDS[0],
                ...(WHITELISTED_MISMATCHING_IDS[layer] || []),
            ]);

            if (!whitelist.has(this.fullname)) {
                if (this.id !== this.inferId()) {
                    throw new Error(`Invalid inferred ID for ${this.repr()}`);
                }
            }
        }

        this.className = snakeToCamelCase(
            this.name,
            this.isFunction ? 'Request' : ''
        );

        this.realArgs = this.sortedArgs().filter(
            a => !(a.flagIndicator || a.genericDefinition)
        );
    }

    get innermostResult() {
        const index = this.result.indexOf('<');
        return index === -1 ? this.result : this.result.slice(index + 1, -1);
    }

    /**
     * Returns the arguments properly sorted and ready to plug-in
     * into a Python's method header (i.e., flags and those which
     * can be inferred will go last so they can default =None)
     */
    sortedArgs() {
        return this.args.sort(x => x.isFlag || x.canBeInferred);
    }

    repr(ignoreId) {
        let hexId, args;

        if (this.id === null || ignoreId) {
            hexId = '';
        } else {
            hexId = `#${this.id.toString(16).padStart(8, '0')}`;
        }

        if (this.args.length) {
            args = ` ${this.args.map(arg => arg.toString()).join(' ')}`;
        } else {
            args = '';
        }

        return `${this.fullname}${hexId}${args} = ${this.result}`;
    }

    inferId() {
        const representation = this.repr(true)
            .replace(/(:|\?)bytes /g, '$1string ')
            .replace(/</g, ' ')
            .replace(/>|{|}/g, '')
            .replace(/ \w+:flags\.\d+\?true/g, '');

        if (this.fullname === 'inputMediaInvoice') {
            if (this.fullname === 'inputMediaInvoice') {
            }
        }

        return crc32(Buffer.from(representation, 'utf8'));
    }

    toJson() {
        return {
            id: struct.unpack('i', struct.pack('I', this.id))[0].toString(),
            [this.isFunction ? 'method' : 'predicate']: this.fullname,
            param: this.args
                .filter(x => !x.genericDefinition)
                .map(x => x.toJson()),
            type: this.result,
        };
    }

    isGoodExample() {
        return !this.className.endsWith('Empty');
    }

    asExample(f, indent) {
        f.write(this.isFunction ? 'functions' : 'types');

        if (this.namespace) {
            f.write('.');
            f.write(this.namespace);
        }

        f.write('.');
        f.write(this.className);
        f.write('(');

        const args = this.realArgs.filter(arg => !arg.omitExample());

        if (!args.length) {
            f.write(')');
            return;
        }

        f.write('\n');
        indent++;
        let remaining = args.length;

        for (const arg of args) {
            remaining--;
            f.write('    '.repeat(indent));
            f.write(arg.name);
            f.write('=');

            if (arg.isVector) {
                f.write('[');
            }

            arg.asExample(f, indent || 0);

            if (arg.isVector) {
                f.write(']');
            }

            if (remaining) {
                f.write(',');
            }

            f.write('\n');
        }

        indent--;
        f.write('    '.repeat(indent));
        f.write(')');
    }
}

module.exports = {
    TLObject,
};
