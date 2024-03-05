import bigInt from "big-integer";
export declare class Factorizator {
    /**
     * Calculates the greatest common divisor
     * @param a {BigInteger}
     * @param b {BigInteger}
     * @returns {BigInteger}
     */
    static gcd(a: bigInt.BigInteger, b: bigInt.BigInteger): bigInt.BigInteger;
    /**
     * Factorizes the given number and returns both the divisor and the number divided by the divisor
     * @param pq {BigInteger}
     * @returns {{p: *, q: *}}
     */
    static factorize(pq: bigInt.BigInteger): {
        p: bigInt.BigInteger;
        q: bigInt.BigInteger;
    };
}
