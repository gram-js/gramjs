const fmtStrings = (...objects) => {
    for (const object of objects) {
        for (const [k, v] of Object.entries(object)) {
            if (['null', 'true', 'false'].includes(v)) {
                object[k] = `<strong>${v}</strong>`;
            } else {
                object[k] = v.replace(
                    /((['"]).*\2)/,
                    (_, g) => `<em>${g}</em>`
                );
            }
        }
    }
};

const KNOWN_NAMED_EXAMPLES = {
    'message,string': "'Hello there!'",
    'expires_at,date': 'datetime.timedelta(minutes=5)',
    'until_date,date': 'datetime.timedelta(days=14)',
    'view_messages,true': 'None',
    'send_messages,true': 'None',
    'limit,int': '100',
    'hash,int': '0',
    'hash,string': "'A4LmkR23G0IGxBE71zZfo1'",
    'min_id,int': '0',
    'max_id,int': '0',
    'min_id,long': '0',
    'max_id,long': '0',
    'add_offset,int': '0',
    'title,string': "'My awesome title'",
    'device_model,string': "'ASUS Laptop'",
    'system_version,string': "'Arch Linux'",
    'app_version,string': "'1.0'",
    'system_lang_code,string': "'en'",
    'lang_pack,string': "''",
    'lang_code,string': "'en'",
    'chat_id,int': '478614198',
    'client_id,long': 'random.randrange(-2**63, 2**63)',
};

const KNOWN_TYPED_EXAMPLES = {
    int128: "int.from_bytes(crypto.randomBytes(16), 'big')",
    bytes: "b'arbitrary\\x7f data \\xfa here'",
    long: '-12398745604826',
    string: "'some string here'",
    int: '42',
    date: 'datetime.datetime(2018, 6, 25)',
    double: '7.13',
    Bool: 'False',
    true: 'True',
    InputChatPhoto: "client.upload_file('/path/to/photo.jpg')",
    InputFile: "client.upload_file('/path/to/file.jpg')",
    InputPeer: "'username'",
};

fmtStrings(KNOWN_NAMED_EXAMPLES, KNOWN_TYPED_EXAMPLES);

const SYNONYMS = {
    InputUser: 'InputPeer',
    InputChannel: 'InputPeer',
    InputDialogPeer: 'InputPeer',
    InputNotifyPeer: 'InputPeer',
    InputMessage: 'int',
};

// These are flags that are cleaner to leave off
const OMITTED_EXAMPLES = [
    'silent',
    'background',
    'clear_draft',
    'reply_to_msg_id',
    'random_id',
    'reply_markup',
    'entities',
    'embed_links',
    'hash',
    'min_id',
    'max_id',
    'add_offset',
    'grouped',
    'broadcast',
    'admins',
    'edit',
    'delete',
];

/**
 * Initializes a new .tl argument
 * :param name: The name of the .tl argument
 * :param argType: The type of the .tl argument
 * :param genericDefinition: Is the argument a generic definition?
 *                           (i.e. {X:Type})
 */
class TLArg {
    constructor(name, argType, genericDefinition) {
        this.name = name === 'self' ? 'is_self' : name;

        // Default values
        this.isVector = false;
        this.isFlag = false;
        this.skipConstructorId = false;
        this.flagIndex = -1;
        this.cls = null;

        // Special case: some types can be inferred, which makes it
        // less annoying to type. Currently the only type that can
        // be inferred is if the name is 'random_id', to which a
        // random ID will be assigned if left as None (the default)
        this.canBeInferred = name === 'random_id';

        // The type can be an indicator that other arguments will be flags
        if (argType === '#') {
            this.flagIndicator = true;
            this.type = null;
            this.isGeneric = false;
        } else {
            this.flagIndicator = false;
            this.isGeneric = argType.startsWith('!');
            // Strip the exclamation mark always to have only the name
            this.type = argType.replace(/^!+/, '');

            // The type may be a flag (flags.IDX?REAL_TYPE)
            // Note that 'flags' is NOT the flags name; this
            // is determined by a previous argument
            // However, we assume that the argument will always be called 'flags'
            const flagMatch = this.type.match(/flags.(\d+)\?([\w<>.]+)/);

            if (flagMatch) {
                this.isFlag = true;
                this.flagIndex = Number(flagMatch[1]);
                // Update the type to match the exact type, not the "flagged" one
                this.type = flagMatch[2];
            }

            // Then check if the type is a Vector<REAL_TYPE>
            const vectorMatch = this.type.match(/[Vv]ector<([\w\d.]+)>/);

            if (vectorMatch) {
                this.isVector = true;

                // If the type's first letter is not uppercase, then
                // it is a constructor and we use (read/write) its ID.
                this.useVectorId = this.type.charAt(0) === 'V';

                // Update the type to match the one inside the vector
                this.type = vectorMatch[1];
            }

            // See use_vector_id. An example of such case is ipPort in
            // help.configSpecial
            if (
                /^[a-z]$/.test(
                    this.type
                        .split('.')
                        .pop()
                        .charAt(0)
                )
            ) {
                this.skipConstructorId = true;
            }

            // The name may contain "date" in it, if this is the case and
            // the type is "int", we can safely assume that this should be
            // treated as a "date" object. Note that this is not a valid
            // Telegram object, but it's easier to work with
            // if (
            //     this.type === 'int' &&
            //     (/(\b|_)([dr]ate|until|since)(\b|_)/.test(name) ||
            //         ['expires', 'expires_at', 'was_online'].includes(name))
            // ) {
            //     this.type = 'date';
            // }
        }

        this.genericDefinition = genericDefinition;
    }

    typeHint() {
        let cls = this.type;

        if (cls.includes('.')) {
            cls = cls.split('.')[1];
        }

        let result = {
            int: 'int',
            long: 'int',
            int128: 'int',
            int256: 'int',
            double: 'float',
            string: 'str',
            date: 'Optional[datetime]', // None date = 0 timestamp
            bytes: 'bytes',
            Bool: 'bool',
            true: 'bool',
        };

        result = result[cls] || `'Type${cls}'`;

        if (this.isVector) {
            result = `List[${result}]`;
        }

        if (this.isFlag && cls !== 'date') {
            result = `Optional[${result}]`;
        }

        return result;
    }

    realType() {
        // Find the real type representation by updating it as required
        let realType = this.flagIndicator ? '#' : this.type;

        if (this.isVector) {
            if (this.useVectorId) {
                realType = `Vector<${realType}>`;
            } else {
                realType = `vector<${realType}>`;
            }
        }

        if (this.isGeneric) {
            realType = `!${realType}`;
        }

        if (this.isFlag) {
            realType = `flags.${this.flagIndex}?${realType}`;
        }

        return realType;
    }

    toString() {
        if (this.genericDefinition) {
            return `{${this.name}:${this.realType()}}`;
        } else {
            return `${this.name}:${this.realType()}`;
        }
    }

    toJson() {
        return {
            name: this.name.replace('is_self', 'self'),
            type: this.realType().replace(/\bdate$/, 'int'),
        };
    }

    asExample(f, indent) {
        if (this.isGeneric) {
            f.write('other_request');
            return;
        }

        let known =
            KNOWN_NAMED_EXAMPLES[`${this.name},${this.type}`] ||
            KNOWN_TYPED_EXAMPLES[this.type] ||
            KNOWN_TYPED_EXAMPLES[SYNONYMS[this.type]];

        if (known) {
            f.write(known);
            return;
        }

        // assert self.omit_example() or self.cls, 'TODO handle ' + str(self)

        // Pick an interesting example if any
        for (const cls of this.cls) {
            if (cls.isGoodExample()) {
                cls.asExample(f, indent || 0);
                return;
            }
        }

        // If no example is good, just pick the first
        this.cls[0].asExample(f, indent || 0);
    }

    omitExample() {
        return (
            this.isFlag ||
            (this.canBeInferred && OMITTED_EXAMPLES.includes(this.name))
        );
    }
}

module.exports = {
    KNOWN_NAMED_EXAMPLES,
    KNOWN_TYPED_EXAMPLES,
    SYNONYMS,
    OMITTED_EXAMPLES,
    TLArg,
};
