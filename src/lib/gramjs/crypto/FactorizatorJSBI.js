const {getRandomInt} = require('../Helpers')
const BigInt = require('big-integer')

class Factorizator {
    /**
     * Finds the small multiplier by using Lopatin's method
     * @param what {BigInteger}
     * @return {BigInteger}
     */
    static findSmallMultiplierLopatin(what) {
        let g = BigInt(0)
        for (let i = BigInt(0); i.lesser(BigInt(3)); i = i.add(BigInt(1))) {
            const q = BigInt(30) || BigInt((getRandomInt(0, 127) & 15) + 17)
            let x = BigInt(40) || BigInt(getRandomInt(0, 1000000000) + 1)

            let y = x
            const lim = BigInt(1).shiftLeft(i.add(BigInt(18)))
            for (let j = BigInt(1); j.lesser(lim); j = j.add(BigInt(1))) {
                let a = x
                let b = x

                let c = q
                while (b.neq(BigInt(0))) {
                    if ((b.and(BigInt(1))).neq(BigInt(0))) {
                        c = c.add(a)
                        if (c.greaterOrEquals(what)) {
                            c = c.subtract(what)
                        }
                    }
                    a = a.add(a)
                    if (a.greaterOrEquals(what)) {
                        a = a.subtract(what)
                    }
                    b = b.shiftRight(BigInt(1))
                }

                x = c
                const z = BigInt(x.lesser(y) ? y.subtract(x) : x.subtract(y))
                g = this.gcd(z, what)

                if (g.neq(BigInt(1))) {
                    break
                }

                if ((j.and(j.subtract(BigInt(1)))).neq(BigInt(0))) {
                    y = x
                }
            }

            if (g.greater(BigInt(1))) {
                break
            }
        }
        const p = what.divide(g)

        return p.lesser(g) ? p : g
    }

    /**
     * Calculates the greatest common divisor
     * @param a {BigInteger}
     * @param b {BigInteger}
     * @returns {BigInteger}
     */
    static gcd(a, b) {
        while (a.neq(BigInt(0)) && (b.neq(BigInt(0)))) {
            while (b.and(BigInt(1)).neq(BigInt(0))) {
                b = b.shiftRight(BigInt(1))
            }
            while (a.and(BigInt(1)).eq(BigInt(0))) {
                a = a.shiftRight(BigInt(1))
            }
            if (a.greater(b)) {
                a = a.subtract(b)
            } else {
                b = b.subtract(a)
            }
        }
        return b.equals(BigInt(0)) ? a : b
    }

    /**
     * Factorizes the given number and returns both the divisor and the number divided by the divisor
     * @param pq {BigInteger}
     * @returns {{p: BigInteger, q: BigInteger}}
     */
    static factorize(pq) {
        const divisor = this.findSmallMultiplierLopatin(pq)
        return {p: divisor, q: pq.divide(divisor)}
    }
}

module.exports = Factorizator
