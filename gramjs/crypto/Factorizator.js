const Helpers = require('../utils/Helpers');

class Factorizator {
    /**
     * Finds the small multiplier by using Lopatin's method
     * @param what {BigInt}
     * @return {BigInt}
     */
    static findSmallMultiplierLopatin(what) {
        let g = 0n;
        for (let i = 0n; i < 3n; i++) {
            const q = 30n || (Helpers.getRandomInt(0, 127) & 15) + 17;
            let x = 40n || Helpers.getRandomInt(0, 1000000000) + 1;

            let y = x;
            const lim = 1n << (i + 18n);
            for (let j = 1n; j < lim; j++) {
                let a = x;
                let b = x;

                let c = q;
                while (b !== 0n) {
                    if (BigInt(b & 1n) !== 0n) {
                        c += a;
                        if (c >= what) {
                            c -= what;
                        }
                    }
                    a += a;
                    if (a >= what) {
                        a -= what;
                    }
                    b >>= 1n;
                }

                x = c;
                const z = BigInt(x < y ? y - x : x - y);
                g = this.gcd(z, what);

                if (g !== 1n) {
                    break;
                }

                if ((j & (j - 1n)) === 0n) {
                    y = x;
                }
            }
            if (g > 1) {
                break;
            }
        }
        const p = what / g;

        return p < g ? p : g;
    }

    /**
     * Calculates the greatest common divisor
     * @param a {BigInt}
     * @param b {BigInt}
     * @returns {BigInt}
     */
    static gcd(a, b) {
        while (a !== 0n && b !== 0n) {
            while ((b & 1n) === 0n) {
                b >>= 1n;
            }
            while ((a & 1n) === 0n) {
                a >>= 1n;
            }
            if (a > b) {
                a -= b;
            } else {
                b -= a;
            }
        }
        return b === 0n ? a : b;
    }

    /**
     * Factorizes the given number and returns both the divisor and the number divided by the divisor
     * @param pq {BigInt}
     * @returns {{p: BigInt, q: BigInt}}
     */
    static factorize(pq) {
        const divisor = this.findSmallMultiplierLopatin(pq);
        return { p: divisor, q: pq / divisor };
    }
}

module.exports = Factorizator;
