import bigInt from "big-integer";
import * as Helpers from "../../gramjs/Helpers";

describe("readBufferFromBigInt 4 bytes function", () => {
  test("it should return 0x0000ff00", () => {
    const input = bigInt("-65537");
    const output = Buffer.from([0xff, 0xff, 0xfe, 0xff]);
    expect(Helpers.readBufferFromBigInt(input, 4, true, true)).toEqual(output);
  });
});
describe("readBufferFromBigInt 8 bytes function", () => {
  test("it should return 0x20a13b25e1726bfc", () => {
    const input = bigInt("-257986242325798624");
    const output = Buffer.from("20a13b25e1726bfc", "hex");
    expect(Helpers.readBufferFromBigInt(input, 8, true, true)).toEqual(output);
  });
  test("it should return 0xe05ec4da1e8d9403", () => {
    const input = bigInt("257986242325798624");
    const output = Buffer.from("e05ec4da1e8d9403", "hex");
    expect(Helpers.readBufferFromBigInt(input, 8, true, false)).toEqual(output);
  });
  test("it should return 0xfc6b72e1253ba120", () => {
    const input = bigInt("-257986242325798624");
    const output = Buffer.from("fc6b72e1253ba120", "hex");
    expect(Helpers.readBufferFromBigInt(input, 8, false, true)).toEqual(output);
  });
  test("it should return 0x03948d1edac45ee0", () => {
    const input = bigInt("257986242325798624");
    const output = Buffer.from("03948d1edac45ee0", "hex");
    expect(Helpers.readBufferFromBigInt(input, 8, false, false)).toEqual(
      output
    );
  });
});

describe("readBufferFromBigInt 16 bytes function", () => {
  test("it should return 0x8416c07962dac053b4346df39e5d97ec", () => {
    const input = bigInt("-25798624232579862436622316998984984956");
    const output = Buffer.from("8416c07962dac053b4346df39e5d97ec", "hex");
    expect(Helpers.readBufferFromBigInt(input, 16, true, true)).toEqual(output);
  });
  test("it should return 0x7ce93f869d253fac4bcb920c61a26813", () => {
    const input = bigInt("25798624232579862436622316998984984956");
    const output = Buffer.from("7ce93f869d253fac4bcb920c61a26813", "hex");
    expect(Helpers.readBufferFromBigInt(input, 16, true, false)).toEqual(
      output
    );
  });
  test("it should return 0xec975d9ef36d34b453c0da6279c01684", () => {
    const input = bigInt("-25798624232579862436622316998984984956");
    const output = Buffer.from("ec975d9ef36d34b453c0da6279c01684", "hex");
    expect(Helpers.readBufferFromBigInt(input, 16, false, true)).toEqual(
      output
    );
  });
  test("it should return 0x1368a2610c92cb4bac3f259d863fe97c", () => {
    const input = bigInt("25798624232579862436622316998984984956");
    const output = Buffer.from("1368a2610c92cb4bac3f259d863fe97c", "hex");
    expect(Helpers.readBufferFromBigInt(input, 16, false, false)).toEqual(
      output
    );
  });
});

describe("readBufferFromBigInt 32 bytes function", () => {
  test("it should return 0x7f113f5e2096936ec90cc4c73cc7bd3c96d20c115bf9ceb05c34232c037ff6c6", () => {
    const input = bigInt(
      "-25798624232579862436622316998984984912345482145214526587420145210501554564737"
    );
    const output = Buffer.from(
      "7f113f5e2096936ec90cc4c73cc7bd3c96d20c115bf9ceb05c34232c037ff6c6",
      "hex"
    );
    expect(Helpers.readBufferFromBigInt(input, 32, true, true)).toEqual(output);
  });
  test("it should return 0x81eec0a1df696c9136f33b38c33842c3692df3eea406314fa3cbdcd3fc800939", () => {
    const input = bigInt(
      "25798624232579862436622316998984984912345482145214526587420145210501554564737"
    );
    const output = Buffer.from(
      "81eec0a1df696c9136f33b38c33842c3692df3eea406314fa3cbdcd3fc800939",
      "hex"
    );
    expect(Helpers.readBufferFromBigInt(input, 32, true, false)).toEqual(
      output
    );
  });
  test("it should return 0xc6f67f032c23345cb0cef95b110cd2963cbdc73cc7c40cc96e9396205e3f117f", () => {
    const input = bigInt(
      "-25798624232579862436622316998984984912345482145214526587420145210501554564737"
    );
    const output = Buffer.from(
      "c6f67f032c23345cb0cef95b110cd2963cbdc73cc7c40cc96e9396205e3f117f",
      "hex"
    );
    expect(Helpers.readBufferFromBigInt(input, 32, false, true)).toEqual(
      output
    );
  });
  test("it should return 0x390980fcd3dccba34f3106a4eef32d69c34238c3383bf336916c69dfa1c0ee81", () => {
    const input = bigInt(
      "25798624232579862436622316998984984912345482145214526587420145210501554564737"
    );
    const output = Buffer.from(
      "390980fcd3dccba34f3106a4eef32d69c34238c3383bf336916c69dfa1c0ee81",
      "hex"
    );
    expect(Helpers.readBufferFromBigInt(input, 32, false, false)).toEqual(
      output
    );
  });
});
