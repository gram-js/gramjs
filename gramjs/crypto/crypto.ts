import {default as AES} from '@cryptography/aes';
import {i2ab, ab2i} from './converters';
import {getWords} from './words';

export class Counter {
    _counter: Buffer;

    constructor(initialValue: any) {
        this._counter = Buffer.from(initialValue)

    }

    increment() {
        for (let i = 15; i >= 0; i--) {
            if (this._counter[i] === 255) {
                this._counter[i] = 0
            } else {
                this._counter[i]++;
                break
            }
        }
    }
}

export class CTR {
    private _counter: Counter;
    private _remainingCounter?: Buffer;
    private _remainingCounterIndex: number;
    private _aes: AES;

    constructor(key: Buffer, counter: any) {

        if (!(counter instanceof Counter)) {
            counter = new Counter(counter)
        }

        this._counter = counter;

        this._remainingCounter = undefined;
        this._remainingCounterIndex = 16;

        this._aes = new AES(getWords(key))
    }

    update(plainText: any) {
        return this.encrypt(plainText)
    }

    encrypt(plainText: any) {
        const encrypted = Buffer.from(plainText);

        for (let i = 0; i < encrypted.length; i++) {
            if (this._remainingCounterIndex === 16) {
                this._remainingCounter = Buffer.from(i2ab(this._aes.encrypt(ab2i(this._counter._counter))));
                this._remainingCounterIndex = 0;
                this._counter.increment()
            }
            if (this._remainingCounter) {
                encrypted[i] ^= this._remainingCounter[this._remainingCounterIndex++]
            }
        }

        return encrypted
    }
}

// endregion
export function createDecipheriv(algorithm: string, key: Buffer, iv: Buffer) {
    if (algorithm.includes('ECB')) {
        throw new Error('Not supported')
    } else {
        return new CTR(key, iv)
    }
}

export function createCipheriv(algorithm: string, key: Buffer, iv: Buffer) {
    if (algorithm.includes('ECB')) {
        throw new Error('Not supported')
    } else {
        return new CTR(key, iv)
    }
}

export function randomBytes(count: Buffer) {
    const bytes = new Uint8Array(count);
    crypto.getRandomValues(bytes);
    return bytes
}

export class Hash {
    private algorithm: string;
    private data?: Uint8Array;

    constructor(algorithm: string) {
        this.algorithm = algorithm

    }

    update(data: Buffer) {
        //We shouldn't be needing new Uint8Array but it doesn't
        //work without it
        this.data = new Uint8Array(data)
    }

    async digest() {
        if (this.data) {
            if (this.algorithm === 'sha1') {
                return Buffer.from(await self.crypto.subtle.digest('SHA-1', this.data))
            } else if (this.algorithm === 'sha256') {
                return Buffer.from(await self.crypto.subtle.digest('SHA-256', this.data))
            }
        }

    }
}

export async function pbkdf2(password:any, salt:any, iterations:any) {
    const passwordKey = await crypto.subtle.importKey('raw', password,
        {name: 'PBKDF2'}, false, ['deriveBits']);
    return Buffer.from(await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        hash: 'SHA-512', salt, iterations,
    }, passwordKey, 512))
}

export function createHash(algorithm:string) {
    return new Hash(algorithm)
}
