"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDigest = exports.computeCheck = void 0;
const tl_1 = require("./tl");
const Helpers_1 = require("./Helpers");
const big_integer_1 = __importDefault(require("big-integer"));
const CryptoFile_1 = __importDefault(require("./CryptoFile"));
const SIZE_FOR_HASH = 256;
/**
 *
 *
 * @param prime{BigInteger}
 * @param g{BigInteger}
 */
/*
We don't support changing passwords yet
function checkPrimeAndGoodCheck(prime, g) {
    console.error('Unsupported function `checkPrimeAndGoodCheck` call. Arguments:', prime, g)

    const goodPrimeBitsCount = 2048
    if (prime < 0 || prime.bitLength() !== goodPrimeBitsCount) {
        throw new Error(`bad prime count ${prime.bitLength()},expected ${goodPrimeBitsCount}`)
    }
    // TODO this is kinda slow
    if (Factorizator.factorize(prime)[0] !== 1) {
        throw new Error('give "prime" is not prime')
    }
    if (g.eq(bigInt(2))) {
        if ((prime.remainder(bigInt(8))).neq(bigInt(7))) {
            throw new Error(`bad g ${g}, mod8 ${prime % 8}`)
        }
    } else if (g.eq(bigInt(3))) {
        if ((prime.remainder(bigInt(3))).neq(bigInt(2))) {
            throw new Error(`bad g ${g}, mod3 ${prime % 3}`)
        }
        // eslint-disable-next-line no-empty
    } else if (g.eq(bigInt(4))) {

    } else if (g.eq(bigInt(5))) {
        if (!([ bigInt(1), bigInt(4) ].includes(prime.remainder(bigInt(5))))) {
            throw new Error(`bad g ${g}, mod8 ${prime % 5}`)
        }
    } else if (g.eq(bigInt(6))) {
        if (!([ bigInt(19), bigInt(23) ].includes(prime.remainder(bigInt(24))))) {
            throw new Error(`bad g ${g}, mod8 ${prime % 24}`)
        }
    } else if (g.eq(bigInt(7))) {
        if (!([ bigInt(3), bigInt(5), bigInt(6) ].includes(prime.remainder(bigInt(7))))) {
            throw new Error(`bad g ${g}, mod8 ${prime % 7}`)
        }
    } else {
        throw new Error(`bad g ${g}`)
    }
    const primeSub1Div2 = (prime.subtract(bigInt(1))).divide(bigInt(2))
    if (Factorizator.factorize(primeSub1Div2)[0] !== 1) {
        throw new Error('(prime - 1) // 2 is not prime')
    }
}
*/
/**
 *
 * @param primeBytes{Buffer}
 * @param g{number}
 */
function checkPrimeAndGood(primeBytes, g) {
    const goodPrime = Buffer.from([
        0xc7, 0x1c, 0xae, 0xb9, 0xc6, 0xb1, 0xc9, 0x04, 0x8e, 0x6c, 0x52, 0x2f,
        0x70, 0xf1, 0x3f, 0x73, 0x98, 0x0d, 0x40, 0x23, 0x8e, 0x3e, 0x21, 0xc1,
        0x49, 0x34, 0xd0, 0x37, 0x56, 0x3d, 0x93, 0x0f, 0x48, 0x19, 0x8a, 0x0a,
        0xa7, 0xc1, 0x40, 0x58, 0x22, 0x94, 0x93, 0xd2, 0x25, 0x30, 0xf4, 0xdb,
        0xfa, 0x33, 0x6f, 0x6e, 0x0a, 0xc9, 0x25, 0x13, 0x95, 0x43, 0xae, 0xd4,
        0x4c, 0xce, 0x7c, 0x37, 0x20, 0xfd, 0x51, 0xf6, 0x94, 0x58, 0x70, 0x5a,
        0xc6, 0x8c, 0xd4, 0xfe, 0x6b, 0x6b, 0x13, 0xab, 0xdc, 0x97, 0x46, 0x51,
        0x29, 0x69, 0x32, 0x84, 0x54, 0xf1, 0x8f, 0xaf, 0x8c, 0x59, 0x5f, 0x64,
        0x24, 0x77, 0xfe, 0x96, 0xbb, 0x2a, 0x94, 0x1d, 0x5b, 0xcd, 0x1d, 0x4a,
        0xc8, 0xcc, 0x49, 0x88, 0x07, 0x08, 0xfa, 0x9b, 0x37, 0x8e, 0x3c, 0x4f,
        0x3a, 0x90, 0x60, 0xbe, 0xe6, 0x7c, 0xf9, 0xa4, 0xa4, 0xa6, 0x95, 0x81,
        0x10, 0x51, 0x90, 0x7e, 0x16, 0x27, 0x53, 0xb5, 0x6b, 0x0f, 0x6b, 0x41,
        0x0d, 0xba, 0x74, 0xd8, 0xa8, 0x4b, 0x2a, 0x14, 0xb3, 0x14, 0x4e, 0x0e,
        0xf1, 0x28, 0x47, 0x54, 0xfd, 0x17, 0xed, 0x95, 0x0d, 0x59, 0x65, 0xb4,
        0xb9, 0xdd, 0x46, 0x58, 0x2d, 0xb1, 0x17, 0x8d, 0x16, 0x9c, 0x6b, 0xc4,
        0x65, 0xb0, 0xd6, 0xff, 0x9c, 0xa3, 0x92, 0x8f, 0xef, 0x5b, 0x9a, 0xe4,
        0xe4, 0x18, 0xfc, 0x15, 0xe8, 0x3e, 0xbe, 0xa0, 0xf8, 0x7f, 0xa9, 0xff,
        0x5e, 0xed, 0x70, 0x05, 0x0d, 0xed, 0x28, 0x49, 0xf4, 0x7b, 0xf9, 0x59,
        0xd9, 0x56, 0x85, 0x0c, 0xe9, 0x29, 0x85, 0x1f, 0x0d, 0x81, 0x15, 0xf6,
        0x35, 0xb1, 0x05, 0xee, 0x2e, 0x4e, 0x15, 0xd0, 0x4b, 0x24, 0x54, 0xbf,
        0x6f, 0x4f, 0xad, 0xf0, 0x34, 0xb1, 0x04, 0x03, 0x11, 0x9c, 0xd8, 0xe3,
        0xb9, 0x2f, 0xcc, 0x5b,
    ]);
    if (goodPrime.equals(primeBytes)) {
        if ([3, 4, 5, 7].includes(g)) {
            return; // It's good
        }
    }
    throw new Error("Changing passwords unsupported");
    //checkPrimeAndGoodCheck(readBigIntFromBuffer(primeBytes, false), g)
}
/**
 *
 * @param number{BigInteger}
 * @param p{BigInteger}
 * @returns {boolean}
 */
function isGoodLarge(number, p) {
    return number.greater((0, big_integer_1.default)(0)) && p.subtract(number).greater((0, big_integer_1.default)(0));
}
/**
 *
 * @param number {Buffer}
 * @returns {Buffer}
 */
function numBytesForHash(number) {
    return Buffer.concat([Buffer.alloc(SIZE_FOR_HASH - number.length), number]);
}
/**
 *
 * @param g {bigInt}
 * @returns {Buffer}
 */
function bigNumForHash(g) {
    return (0, Helpers_1.readBufferFromBigInt)(g, SIZE_FOR_HASH, false);
}
/**
 *
 * @param modexp {BigInteger}
 * @param prime {BigInteger}
 * @returns {Boolean}
 */
function isGoodModExpFirst(modexp, prime) {
    const diff = prime.subtract(modexp);
    const minDiffBitsCount = 2048 - 64;
    const maxModExpSize = 256;
    return !(diff.lesser((0, big_integer_1.default)(0)) ||
        diff.bitLength().toJSNumber() < minDiffBitsCount ||
        modexp.bitLength().toJSNumber() < minDiffBitsCount ||
        Math.floor((modexp.bitLength().toJSNumber() + 7) / 8) > maxModExpSize);
}
function xor(a, b) {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
        a[i] = a[i] ^ b[i];
    }
    return a;
}
/**
 *
 * @param password{Buffer}
 * @param salt{Buffer}
 * @param iterations{number}
 * @returns {*}
 */
function pbkdf2sha512(password, salt, iterations) {
    return CryptoFile_1.default.pbkdf2Sync(password, salt, iterations, 64, "sha512");
}
/**
 *
 * @param algo {constructors.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow}
 * @param password
 * @returns {Buffer|*}
 */
async function computeHash(algo, password) {
    const hash1 = await (0, Helpers_1.sha256)(Buffer.concat([algo.salt1, Buffer.from(password, "utf-8"), algo.salt1]));
    const hash2 = await (0, Helpers_1.sha256)(Buffer.concat([algo.salt2, hash1, algo.salt2]));
    const hash3 = await pbkdf2sha512(hash2, algo.salt1, 100000);
    return (0, Helpers_1.sha256)(Buffer.concat([algo.salt2, hash3, algo.salt2]));
}
/**
 *
 * @param algo {constructors.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow}
 * @param password
 */
async function computeDigest(algo, password) {
    try {
        checkPrimeAndGood(algo.p, algo.g);
    }
    catch (e) {
        throw new Error("bad p/g in password");
    }
    const value = (0, Helpers_1.modExp)((0, big_integer_1.default)(algo.g), (0, Helpers_1.readBigIntFromBuffer)(await computeHash(algo, password), false), (0, Helpers_1.readBigIntFromBuffer)(algo.p, false));
    return bigNumForHash(value);
}
exports.computeDigest = computeDigest;
/**
 *
 * @param request {constructors.account.Password}
 * @param password {string}
 */
async function computeCheck(request, password) {
    const algo = request.currentAlgo;
    if (!(algo instanceof
        tl_1.Api.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow)) {
        throw new Error(`Unsupported password algorithm ${algo === null || algo === void 0 ? void 0 : algo.className}`);
    }
    const srp_B = request.srp_B;
    const srpId = request.srpId;
    if (!srp_B || !srpId) {
        throw new Error(`Undefined srp_b  ${request}`);
    }
    const pwHash = await computeHash(algo, password);
    const p = (0, Helpers_1.readBigIntFromBuffer)(algo.p, false);
    const g = algo.g;
    const B = (0, Helpers_1.readBigIntFromBuffer)(srp_B, false);
    try {
        checkPrimeAndGood(algo.p, g);
    }
    catch (e) {
        throw new Error("bad /g in password");
    }
    if (!isGoodLarge(B, p)) {
        throw new Error("bad b in check");
    }
    const x = (0, Helpers_1.readBigIntFromBuffer)(pwHash, false);
    const pForHash = numBytesForHash(algo.p);
    const gForHash = bigNumForHash((0, big_integer_1.default)(g));
    const bForHash = numBytesForHash(srp_B);
    const gX = (0, Helpers_1.modExp)((0, big_integer_1.default)(g), x, p);
    const k = (0, Helpers_1.readBigIntFromBuffer)(await (0, Helpers_1.sha256)(Buffer.concat([pForHash, gForHash])), false);
    const kgX = (0, Helpers_1.bigIntMod)(k.multiply(gX), p);
    const generateAndCheckRandom = async () => {
        const randomSize = 256;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const random = (0, Helpers_1.generateRandomBytes)(randomSize);
            const a = (0, Helpers_1.readBigIntFromBuffer)(random, false);
            const A = (0, Helpers_1.modExp)((0, big_integer_1.default)(g), a, p);
            if (isGoodModExpFirst(A, p)) {
                const aForHash = bigNumForHash(A);
                const u = (0, Helpers_1.readBigIntFromBuffer)(await (0, Helpers_1.sha256)(Buffer.concat([aForHash, bForHash])), false);
                if (u.greater((0, big_integer_1.default)(0))) {
                    return {
                        a: a,
                        aForHash: aForHash,
                        u: u,
                    };
                }
            }
        }
    };
    const { a, aForHash, u } = await generateAndCheckRandom();
    const gB = (0, Helpers_1.bigIntMod)(B.subtract(kgX), p);
    if (!isGoodModExpFirst(gB, p)) {
        throw new Error("bad gB");
    }
    const ux = u.multiply(x);
    const aUx = a.add(ux);
    const S = (0, Helpers_1.modExp)(gB, aUx, p);
    const [K, pSha, gSha, salt1Sha, salt2Sha] = await Promise.all([
        (0, Helpers_1.sha256)(bigNumForHash(S)),
        (0, Helpers_1.sha256)(pForHash),
        (0, Helpers_1.sha256)(gForHash),
        (0, Helpers_1.sha256)(algo.salt1),
        (0, Helpers_1.sha256)(algo.salt2),
    ]);
    const M1 = await (0, Helpers_1.sha256)(Buffer.concat([
        xor(pSha, gSha),
        salt1Sha,
        salt2Sha,
        aForHash,
        bForHash,
        K,
    ]));
    return new tl_1.Api.InputCheckPasswordSRP({
        srpId: srpId,
        A: Buffer.from(aForHash),
        M1: M1,
    });
}
exports.computeCheck = computeCheck;
