import { MTProtoState } from "../../gramjs/network/MTProtoState";

describe("calcKey function", () => {
  test(
    "it should return 0x93355e3f1f50529b6fb93eaf97f29b69c16345f53621e9d45cd9a11ddfbebac9 and" +
      " 11e94363ad7145222e2fbac4aaa27f01a6d832fb8115e89395bc43e23f868e47",
    async () => {
      const authKey = Buffer.from(
        "bbf38532a79cd64363b490b3bc5e258adfc1d1a67ef3c6d322caac603f90a15215b609" +
          "0ccb2226b477b24eb3412757d078d53c72b81864d1376ff20eb405a591781726495407628d8d611e37ecd6e23c605b57c5" +
          "3b40270bac7e7de0312a5deb3a1a16e65808b944fcf700d3788da10074d5c088e9e6aca119320d7f07c16d7e3c9fd48e9d" +
          "3f50ccc5276a30002d9919831bf783c368ce4b3e6f25f95875ec9315523cfcaa3ee50b1e40e5552cee2e16eec86b46308c" +
          "97f808d58f249479bb0ee1b7b08cf7f0fc047fbe38df6083558494e732dbf26d16b1538c22d361bf31d3dc4f2b2cb115b3" +
          "bfac1ec45c960e0854221cf484533025fa679a9b7a8ae11a00",
        "hex"
      );
      const msgKey = Buffer.from("00f285b0bf254b5242e075bf87806c51", "hex");
      const aesKey = Buffer.from(
        "93355e3f1f50529b6fb93eaf97f29b69c16345f53621e9d45cd9a11ddfbebac9",
        "hex"
      );
      const aesIv = Buffer.from(
        "11e94363ad7145222e2fbac4aaa27f01a6d832fb8115e89395bc43e23f868e47",
        "hex"
      );
      const { key, iv } = await new MTProtoState()._calcKey(
        authKey,
        msgKey,
        false
      );

      expect([aesKey, aesIv]).toEqual([key, iv]);
    }
  );
});
