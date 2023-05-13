import { IGE } from "../../gramjs/crypto/IGE";
import { CTR } from "../../gramjs/crypto/CTR";

describe("IGE encrypt function", () => {
  test(
    "it should return 4a657a834edc2956ec95b2a42ec8c1f2d1f0a6028ac26fd830ed23855574b4e69dd1a2be2ba18a53a49b879b2" +
      "45e1065e14b6e8ac5ba9b24befaff3209b77b5f",
    () => {
      const plainText = Buffer.from(
        "this should hold a 64 characters long string. only 10 more left."
      );
      const iv = Buffer.from("the iv needs 32 characters long.");
      const key = Buffer.from("the key needs 32 characters long");
      const encrypted = Buffer.from(
        "4a657a834edc2956ec95b2a42ec8c1f2d1f0a6028ac26fd830ed23855574b4e69dd1a2be" +
          "2ba18a53a49b879b245e1065e14b6e8ac5ba9b24befaff3209b77b5f",
        "hex"
      );

      expect(new IGE(key, iv).encryptIge(plainText)).toEqual(encrypted);
    }
  );
});
describe("IGE decrypt function", () => {
  test('it should return "this should hold a 64 characters long string. only 10 more left."', () => {
    const encrypted = Buffer.from(
      "4a657a834edc2956ec95b2a42ec8c1f2d1f0a6028ac26fd830ed23855574b4e69dd1a2be" +
        "2ba18a53a49b879b245e1065e14b6e8ac5ba9b24befaff3209b77b5f",
      "hex"
    );
    const iv = Buffer.from("the iv needs 32 characters long.");
    const key = Buffer.from("the key needs 32 characters long");
    const plainText = Buffer.from(
      "this should hold a 64 characters long string. only 10 more left."
    );
    expect(new IGE(key, iv).decryptIge(encrypted)).toEqual(plainText);
  });
});
describe("CTR encrypt function", () => {
  test(
    "it should return 5f40f14f8b70178f70e8045b44eff5f1b148714f23cd and" +
      " cd0779d148b466935cf573450212451692bc82fccd5b106e53",
    () => {
      const encryptKey = Buffer.from("the key needs 32 characters long");
      const encryptIv = Buffer.from("the iv does not.");
      const encryptor = new CTR(encryptKey, encryptIv);
      const firstData = Buffer.from("this can be any length");
      const firstResult = encryptor.encrypt(firstData);
      const secondData = Buffer.from("this also can be anything");
      const secondResult = encryptor.encrypt(secondData);

      const outputFirst = Buffer.from(
        "5f40f14f8b70178f70e8045b44eff5f1b148714f23cd",
        "hex"
      );
      const outputSecond = Buffer.from(
        "cd0779d148b466935cf573450212451692bc82fccd5b106e53",
        "hex"
      );
      expect([firstResult, secondResult]).toEqual([outputFirst, outputSecond]);
    }
  );
});
