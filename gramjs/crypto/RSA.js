const NodeRSA = require('node-rsa');
const {TLObject} = require("../tl/tlobject");
const struct = require("python-struct");
const Helpers = require("../utils/Helpers");
let _serverKeys = {};

/**
 * Gets the arbitrary-length byte array corresponding to the given integer
 * @param integer {number,BigInt}
 * @param signed {boolean}
 * @returns {Buffer}
 */
function getByteArray(integer, signed = false) {

    let bits = integer.toString(2).length;
    let byteLength = Math.floor((bits + 8 - 1) / 8);
    let f;
    f = Helpers.readBufferFromBigInt(BigInt(integer), byteLength, false, signed);
    return f;
}

function _computeFingerprint(key) {
    let buf = Helpers.readBigIntFromBuffer(key.keyPair.n.toBuffer(), false);
    let nArray = getByteArray(buf);

    let n = TLObject.serializeBytes(nArray);
    let e = TLObject.serializeBytes(getByteArray(key.keyPair.e));
//Telegram uses the last 8 bytes as the fingerprint
    let sh = Helpers.sha1(Buffer.concat([n, e]));
    return Helpers.readBigIntFromBuffer(sh.slice(-8), true, true);
}

function addKey(pub) {
    let key = new NodeRSA(pub);
    _serverKeys[_computeFingerprint(key)] = key;

}


function encrypt(fingerprint, data) {
    let key = _serverKeys[fingerprint];
    if (!key) {
        return undefined;
    }
    let buf = Helpers.readBigIntFromBuffer(key.keyPair.n.toBuffer(), false);
    let rand = Helpers.generateRandomBytes(235 - data.length);
    rand = Buffer.from(
        "66a6f809e0dfd71d9dbbc2d6b5fe5fc0be9f5b2b0f2f85688843eea6b2c6d51329750f020c8de27a0a911b07d2a46600493d1abb7caf24" +
        "01ccd815d7de7c5ea830cdf6cce8bff12f77db589f233bce436b644c3415f16d073335fdadfe313c603485b3274e8fcd148fd1a5e18bd2" +
        "4b3e983df94d58b61c150333ab8d614101e7a904dc38af3a3b29e73d62", "hex");

    let toEncrypt = Buffer.concat([Helpers.sha1(data), data, rand]);
    let payload = Helpers.readBigIntFromBuffer(toEncrypt, false);
    let encrypted = Helpers.modExp(payload, BigInt(key.keyPair.e),
        buf);
    let block = Helpers.readBufferFromBigInt(encrypted, 256, false);
    return block;
}

let publicKeys = [
    `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAwVACPi9w23mF3tBkdZz+zwrzKOaaQdr01vAbU4E1pvkfj4sqDsm6
lyDONS789sVoD/xCS9Y0hkkC3gtL1tSfTlgCMOOul9lcixlEKzwKENj1Yz/s7daS
an9tqw3bfUV/nqgbhGX81v/+7RFAEd+RwFnK7a+XYl9sluzHRyVVaTTveB2GazTw
Efzk2DWgkBluml8OREmvfraX3bkHZJTKX4EQSjBbbdJ2ZXIsRrYOXfaA+xayEGB+
8hdlLmAjbCVfaigxX0CDqWeR1yFL9kwd9P0NsZRPsmoqVwMbMu7mStFai6aIhc3n
Slv8kg9qv1m6XHVQY3PnEw+QQtqSIXklHwIDAQAB
-----END RSA PUBLIC KEY-----`,

    `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAxq7aeLAqJR20tkQQMfRn+ocfrtMlJsQ2Uksfs7Xcoo77jAid0bRt
ksiVmT2HEIJUlRxfABoPBV8wY9zRTUMaMA654pUX41mhyVN+XoerGxFvrs9dF1Ru
vCHbI02dM2ppPvyytvvMoefRoL5BTcpAihFgm5xCaakgsJ/tH5oVl74CdhQw8J5L
xI/K++KJBUyZ26Uba1632cOiq05JBUW0Z2vWIOk4BLysk7+U9z+SxynKiZR3/xdi
XvFKk01R3BHV+GUKM2RYazpS/P8v7eyKhAbKxOdRcFpHLlVwfjyM1VlDQrEZxsMp
NTLYXb6Sce1Uov0YtNx5wEowlREH1WOTlwIDAQAB
-----END RSA PUBLIC KEY-----`,

    `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAsQZnSWVZNfClk29RcDTJQ76n8zZaiTGuUsi8sUhW8AS4PSbPKDm+
DyJgdHDWdIF3HBzl7DHeFrILuqTs0vfS7Pa2NW8nUBwiaYQmPtwEa4n7bTmBVGsB
1700/tz8wQWOLUlL2nMv+BPlDhxq4kmJCyJfgrIrHlX8sGPcPA4Y6Rwo0MSqYn3s
g1Pu5gOKlaT9HKmE6wn5Sut6IiBjWozrRQ6n5h2RXNtO7O2qCDqjgB2vBxhV7B+z
hRbLbCmW0tYMDsvPpX5M8fsO05svN+lKtCAuz1leFns8piZpptpSCFn7bWxiA9/f
x5x17D7pfah3Sy2pA+NDXyzSlGcKdaUmwQIDAQAB
-----END RSA PUBLIC KEY-----`,

    `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAwqjFW0pi4reKGbkc9pK83Eunwj/k0G8ZTioMMPbZmW99GivMibwa
xDM9RDWabEMyUtGoQC2ZcDeLWRK3W8jMP6dnEKAlvLkDLfC4fXYHzFO5KHEqF06i
qAqBdmI1iBGdQv/OQCBcbXIWCGDY2AsiqLhlGQfPOI7/vvKc188rTriocgUtoTUc
/n/sIUzkgwTqRyvWYynWARWzQg0I9olLBBC2q5RQJJlnYXZwyTL3y9tdb7zOHkks
WV9IMQmZmyZh/N7sMbGWQpt4NMchGpPGeJ2e5gHBjDnlIf2p1yZOYeUYrdbwcS0t
UiggS4UeE8TzIuXFQxw7fzEIlmhIaq3FnwIDAQAB
-----END RSA PUBLIC KEY-----`
];
for (let pub of publicKeys) {
    addKey(pub);
}


module.exports = {encrypt};