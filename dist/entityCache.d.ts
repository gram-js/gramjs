import bigInt from "big-integer";
export declare class EntityCache {
    private cacheMap;
    constructor();
    add(entities: any): void;
    get(item: bigInt.BigInteger | string | undefined): any;
}
