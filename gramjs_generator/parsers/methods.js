const fs = require('fs');
const csvParse = require('csv-parse/lib/sync');

const Usability = {
    UNKNOWN: 0,
    USER: 1,
    BOT: 2,
    BOTH: 4,
};

class MethodInfo {
    constructor(name, usability, errors, friendly) {
        this.name = name;
        this.errors = errors;
        this.friendly = friendly;

        if (usability.toUpperCase() in Usability) {
            this.usability = Usability[usability.toUpperCase()];
        } else {
            throw new Error(`Usability must be either user, bot, both or unknown, not ${usability}`);
        }
    }
}

/**
 * Parses the input CSV file with columns (method, usability, errors)
 * and yields `MethodInfo` instances as a result.
 */
const parseMethods = function* (csvFile, friendlyCsvFile, errorsDict) {
    const rawToFriendly = {};
    const f1 = csvParse(fs.readFileSync(friendlyCsvFile, { encoding: 'utf-8' }));

    for (const [ns, friendly, rawList] of f1.slice(1)) {
        for (const raw of rawList.split(' ')) {
            rawToFriendly[raw] = [ns, friendly];
        }
    }

    const f2 = csvParse(fs.readFileSync(csvFile, { encoding: 'utf-8' })).slice(1);

    for (let line = 0; line < f2.length; line++) {
        let [method, usability, errors] = f2[line];

        errors = errors
            .split(' ')
            .filter(Boolean)
            .map((x) => {
                if (x && !(x in errorsDict)) {
                    throw new Error(`Method ${method} references unknown errors ${errors}`);
                }

                return errorsDict[x];
            });

        const friendly = rawToFriendly[method];
        delete rawToFriendly[method];
        yield new MethodInfo(method, usability, errors, friendly);
    }
};

module.exports = {
    Usability,
    MethodInfo,
    parseMethods,
};
