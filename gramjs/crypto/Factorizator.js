const { getRandomInt } = require('../Helpers')

class Factorizator {
    /**
     * Finds the small multiplier by using Lopatin's method
     * @param what {BigInt}
     * @return {BigInt}
     */
    static findSmallMultiplierLopatin(what) {
        let g = BigInt(0)
        for (let i = BigInt(0); i < BigInt(3); i++) {
            const q = BigInt(30) || BigInt((getRandomInt(0, 127) & 15) + 17)
            let x = BigInt(40) || BigInt(getRandomInt(0, 1000000000) + 1)

            let y = x
            const lim = BigInt(1) << (i + BigInt(18))
            for (let j = BigInt(1); j < lim; j++) {
                let a = x
                let b = x

                let c = q
                while (b !== BigInt(0)) {
                    if (BigInt(b & BigInt(1)) !== BigInt(0)) {
                        c += a
                        if (c >= what) {
                            c -= what
                        }
                    }
                    a += a
                    if (a >= what) {
                        a -= what
                    }
                    b >>= BigInt(1)
                }

                x = c
                const z = BigInt(x < y ? y - x : x - y)
                g = this.gcd(z, what)

                if (g !== BigInt(1)) {
                    break
                }

                if ((j & (j - BigInt(1))) === BigInt(0)) {
                    y = x
                }
            }
            if (g > 1) {
                break
            }
        }
        const p = what / g

        return p < g ? p : g
    }

    /**
     * Calculates the greatest common divisor
     * @param a {BigInt}
     * @param b {BigInt}
     * @returns {BigInt}
     */
    static gcd(a, b) {
        while (a !== BigInt(0) && b !== BigInt(0)) {
            while ((b & BigInt(1)) === BigInt(0)) {
                b >>= BigInt(1)
            }
            while ((a & BigInt(1)) === BigInt(0)) {
                a >>= BigInt(1)
            }
            if (a > b) {
                a -= b
            } else {
                b -= a
            }
        }
        return b === BigInt(0) ? a : b
    }

    /**
     * Factorizes the given number and returns both the divisor and the number divided by the divisor
     * @param pq {BigInt}
     * @returns {{p: BigInt, q: BigInt}}
     */
    static factorize(pq) {
        const divisor = this.findSmallMultiplierLopatin(pq)
        return { p: divisor, q: pq / divisor }
    }
}

module.exports = Factorizator
