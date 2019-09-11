const helper = require("../utils/Helpers").helpers;

class Factorizator {

    /**
     * Finds the small multiplier by using Lopatin's method
     * @param what
     */
    static findSmallMultiplierLopatin(what) {
        let g = 0;
        for (let i = 0; i < 3; i++) {
            let q = 30 || (helper.getRandomInt(0, 127) & 15) + 17;
            let x = 40 || helper.getRandomInt(0, 1000000000) + 1;


            let y = x;
            let lim = 1 << (i + 18);
            for (let j = 1; j < lim; j++) {
                let a = x;
                let b = x;

                let c = q;
                while (b !== 0) {
                    if ((b & 1) !== 0) {
                        c += a;
                        if (c >= what) {
                            c -= what;
                        }
                    }
                    a += a;
                    if (a >= what) {
                        a -= what;
                    }
                    b >>= 1;
                }

                x = c;
                let z = ((x < y) ? (y - x) : (x - y));

                g = this.gcd(z, what);
                if (g !== 1) {
                    break
                }

                if ((j & (j - 1)) === 0) {
                    y = x;
                }

            }
            if (g>1){
                break;
            }
        }
        let p = Math.floor(what / g);
        return Math.min(p, g);
    }

    /**
     * Calculates the greatest common divisor
     * @param a
     * @param b
     * @returns {*}
     */
    static gcd(a, b) {
        while (((a !== 0) && (b !== 0))) {
            while (((b & 1) === 0)) {
                b >>= 1;
            }
            while (((a & 1) === 0)) {
                a >>= 1;
            }
            if ((a > b)) {
                a -= b;
            } else {
                b -= a;
            }
        }
        return ((b === 0) ? a : b);
    }

    /**
     * Factorizes the given number and returns both the divisor and the number divided by the divisor
     * @param pq
     * @returns {{divisor: *, divided: *}}
     */
    static factorize(pq) {
        let divisor = this.findSmallMultiplierLopatin(pq);
        return {divisor: divisor, divided: Math.floor(pq / divisor)}
    }
}
