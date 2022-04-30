import bigInt from "big-integer";
import { modExp } from "../Helpers";

export class Factorizator {
    /**
     * Calculates the greatest common divisor
     * @param a {BigInteger}
     * @param b {BigInteger}
     * @returns {BigInteger}
     */
    static gcd(a: bigInt.BigInteger, b: bigInt.BigInteger) {
        while (b.neq(bigInt.zero)) {
            const temp = b;
            b = a.remainder(b);
            a = temp;
        }
        return a;
    }

    /**
     * Factorizes the given number and returns both the divisor and the number divided by the divisor
     * @param pq {BigInteger}
     * @returns {{p: *, q: *}}
     */
    static factorize(pq: bigInt.BigInteger) {
        if (pq.remainder(2).equals(bigInt.zero)) {
            return { p: bigInt(2), q: pq.divide(bigInt(2)) };
        }
        let y = bigInt.randBetween(bigInt(1), pq.minus(1));
        const c = bigInt.randBetween(bigInt(1), pq.minus(1));
        const m = bigInt.randBetween(bigInt(1), pq.minus(1));

        let g = bigInt.one;
        let r = bigInt.one;
        let q = bigInt.one;
        let x = bigInt.zero;
        let ys = bigInt.zero;
        let k;

        while (g.eq(bigInt.one)) {
            x = y;
            for (let i = 0; bigInt(i).lesser(r); i++) {
                y = modExp(y, bigInt(2), pq).add(c).remainder(pq);
            }
            k = bigInt.zero;

            while (k.lesser(r) && g.eq(bigInt.one)) {
                ys = y;
                const condition = bigInt.min(m, r.minus(k));
                for (let i = 0; bigInt(i).lesser(condition); i++) {
                    y = modExp(y, bigInt(2), pq).add(c).remainder(pq);
                    q = q.multiply(x.minus(y).abs()).remainder(pq);
                }
                g = Factorizator.gcd(q, pq);
                k = k.add(m);
            }

            r = r.multiply(2);
        }

        if (g.eq(pq)) {
            while (true) {
                ys = modExp(ys, bigInt(2), pq).add(c).remainder(pq);
                g = Factorizator.gcd(x.minus(ys).abs(), pq);

                if (g.greater(1)) {
                    break;
                }
            }
        }
        const p = g;
        q = pq.divide(g);
        return p < q ? { p: p, q: q } : { p: q, q: p };
    }
}
