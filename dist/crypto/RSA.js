"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = exports._serverKeys = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const Helpers_1 = require("../Helpers");
const PUBLIC_KEYS = [
    {
        fingerprint: (0, big_integer_1.default)("-3414540481677951611"),
        n: (0, big_integer_1.default)("2937959817066933702298617714945612856538843112005886376816255642404751219133084745514657634448776440866" +
            "1701890505066208632169112269581063774293102577308490531282748465986139880977280302242772832972539403531" +
            "3160108704012876427630091361567343395380424193887227773571344877461690935390938502512438971889287359033" +
            "8945177273024525306296338410881284207988753897636046529094613963869149149606209957083647645485599631919" +
            "2747663615955633778034897140982517446405334423701359108810182097749467210509584293428076654573384828809" +
            "574217079944388301239431309115013843331317877374435868468779972014486325557807783825502498215169806323"),
        e: 65537,
    },
    {
        fingerprint: (0, big_integer_1.default)("-5595554452916591101"),
        n: (0, big_integer_1.default)("2534288944884041556497168959071347320689884775908477905258202659454602246385394058588521595116849196570822" +
            "26493991806038180742006204637761354248846321625124031637930839216416315647409595294193595958529411668489405859523" +
            "37613333022396096584117954892216031229237302943701877588456738335398602461675225081791820393153757504952636234951" +
            "32323782003654358104782690612092797248736680529211579223142368426126233039432475078545094258975175539015664775146" +
            "07193514399690599495696153028090507215003302390050778898553239175099482557220816446894421272976054225797071426466" +
            "60768825302832201908302295573257427896031830742328565032949"),
        e: 65537,
    },
];
exports._serverKeys = new Map();
PUBLIC_KEYS.forEach((_a) => {
    var { fingerprint } = _a, keyInfo = __rest(_a, ["fingerprint"]);
    exports._serverKeys.set(fingerprint.toString(), keyInfo);
});
/**
 * Encrypts the given data known the fingerprint to be used
 * in the way Telegram requires us to do so (sha1(data) + data + padding)

 * @param fingerprint the fingerprint of the RSA key.
 * @param data the data to be encrypted.
 * @returns {Buffer|*|undefined} the cipher text, or undefined if no key matching this fingerprint is found.
 */
async function encrypt(fingerprint, data) {
    const key = exports._serverKeys.get(fingerprint.toString());
    if (!key) {
        return undefined;
    }
    // len(sha1.digest) is always 20, so we're left with 255 - 20 - x padding
    const rand = (0, Helpers_1.generateRandomBytes)(235 - data.length);
    const toEncrypt = Buffer.concat([await (0, Helpers_1.sha1)(data), data, rand]);
    // rsa module rsa.encrypt adds 11 bits for padding which we don't want
    // rsa module uses rsa.transform.bytes2int(to_encrypt), easier way:
    const payload = (0, Helpers_1.readBigIntFromBuffer)(toEncrypt, false);
    const encrypted = (0, Helpers_1.modExp)(payload, (0, big_integer_1.default)(key.e), key.n);
    // rsa module uses transform.int2bytes(encrypted, keylength), easier:
    return (0, Helpers_1.readBufferFromBigInt)(encrypted, 256, false);
}
exports.encrypt = encrypt;
