"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Factorizator = void 0;
const big_integer_1 = __importDefault(require("big-integer"));
const Helpers_1 = require("../Helpers");
class Factorizator {
    /**
     * Calculates the greatest common divisor
     * @param a {BigInteger}
     * @param b {BigInteger}
     * @returns {BigInteger}
     */
    static gcd(a, b) {
        while (b.neq(big_integer_1.default.zero)) {
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
    static factorize(pq) {
        if (pq.remainder(2).equals(big_integer_1.default.zero)) {
            return { p: (0, big_integer_1.default)(2), q: pq.divide((0, big_integer_1.default)(2)) };
        }
        let y = big_integer_1.default.randBetween((0, big_integer_1.default)(1), pq.minus(1));
        const c = big_integer_1.default.randBetween((0, big_integer_1.default)(1), pq.minus(1));
        const m = big_integer_1.default.randBetween((0, big_integer_1.default)(1), pq.minus(1));
        let g = big_integer_1.default.one;
        let r = big_integer_1.default.one;
        let q = big_integer_1.default.one;
        let x = big_integer_1.default.zero;
        let ys = big_integer_1.default.zero;
        let k;
        while (g.eq(big_integer_1.default.one)) {
            x = y;
            for (let i = 0; (0, big_integer_1.default)(i).lesser(r); i++) {
                y = (0, Helpers_1.modExp)(y, (0, big_integer_1.default)(2), pq).add(c).remainder(pq);
            }
            k = big_integer_1.default.zero;
            while (k.lesser(r) && g.eq(big_integer_1.default.one)) {
                ys = y;
                const condition = big_integer_1.default.min(m, r.minus(k));
                for (let i = 0; (0, big_integer_1.default)(i).lesser(condition); i++) {
                    y = (0, Helpers_1.modExp)(y, (0, big_integer_1.default)(2), pq).add(c).remainder(pq);
                    q = q.multiply(x.minus(y).abs()).remainder(pq);
                }
                g = Factorizator.gcd(q, pq);
                k = k.add(m);
            }
            r = r.multiply(2);
        }
        if (g.eq(pq)) {
            while (true) {
                ys = (0, Helpers_1.modExp)(ys, (0, big_integer_1.default)(2), pq).add(c).remainder(pq);
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
exports.Factorizator = Factorizator;
