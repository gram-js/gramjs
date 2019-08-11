/*Generates a random long integer (8 bytes), which is optionally signed*/
function generateRandomLong() {
    let buf = Buffer.from(generateRandomBytes(8),); // 0x12345678 = 305419896
    return (buf.readUInt32BE(0));
}

/*Generates a random bytes array*/
function generateRandomBytes(count) {

    const crypto = require('crypto');

    return crypto.randomBytes(count);

}

function loadSettings(path = "../api/settings") {
    let settings = {};
    let left, right, value_pair;
    const fs = require("fs");

    let data = fs.readFileSync(path, 'utf-8');


    for (let line of data.toString().split('\n')) {
        value_pair = line.split("=");
        if (value_pair.length !== 2) {
            break;
        }
        left = value_pair[0].replace(/ \r?\n|\r/g, '');
        right = value_pair[1].replace(/ \r?\n|\r/g, '');
        if (!isNaN(right)) {
            settings[left] = Number.parseInt(right);
        } else {
            settings[left] = right;
        }
    }


    return settings;



}

/*Calculate the key based on Telegram guidelines, specifying whether it's the client or not*/

function calcKey(shared_key, msg_key, client) {
   let x = client !== null ? 0 : 8;
    let iv, key, sha1a, sha1b, sha1c, sha1d;
    sha1a = sha1((msg_key + shared_key.slice(x, (x + 32))));
    sha1b = sha1(((shared_key.slice((x + 32), (x + 48)) + msg_key) + shared_key.slice((x + 48), (x + 64))));
    sha1c = sha1((shared_key.slice((x + 64), (x + 96)) + msg_key));
    sha1d = sha1((msg_key + shared_key.slice((x + 96), (x + 128))));
    key = ((sha1a.slice(0, 8) + sha1b.slice(8, 20)) + sha1c.slice(4, 16));
    iv = (((sha1a.slice(8, 20) + sha1b.slice(0, 8)) + sha1c.slice(16, 20)) + sha1d.slice(0, 8));
    return [key, iv];


}

function calcMsgKey(data) {
    return sha1(data).slice(4, 20);


}

function generateKeyDataFromNonces() {
    let hash1, hash2, hash3;
    /*hash1 = sha1(bytes((new_nonce + server_nonce)));
    hash2 = sha1(bytes((server_nonce + new_nonce)));
    hash3 = sha1(bytes((new_nonce + new_nonce)));
*/

}
/*Calculates the SHA1 digest for the given data*/
function sha1(data) {
    const crypto = require('crypto')
        , shasum = crypto.createHash('sha1');
    shasum.update(data);
    console.log(shasum.digest());

}
sha1("test");