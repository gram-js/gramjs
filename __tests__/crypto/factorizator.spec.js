const Factorizator = require("../../gramjs/crypto/Factorizator");

describe("calcKey function", () => {
  test("it should return 0x20a13b25e1726bfc", () => {
    const input = BigInt(
      "325672672642762197972197217945794795197912791579174576454600704764276407047277"
    );
    const { p, q } = Factorizator.factorize(input);
    const outP = BigInt(19);
    const outQ = BigInt(
      "17140666981198010419589327260304989220942778504167082971294773934961916160383"
    );
    expect([p, q]).toEqual([outP, outQ]);
  });
});
