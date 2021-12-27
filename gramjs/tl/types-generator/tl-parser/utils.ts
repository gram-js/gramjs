export function signedHexToInt(hex: string) {
  if (hex.length % 2 != 0) {
    hex = "0" + hex;
  }
  let num = parseInt(hex, 16);
  const maxVal = Math.pow(2, hex.length / 2 * 8);
  if (num > maxVal / 2 - 1) {
    num = num - maxVal;
  }
  return num;
}

// Taken from https://stackoverflow.com/questions/18638900/javascript-crc32/18639999#18639999
function makeCRCTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

let crcTable: number[] | undefined = undefined;

export function crc32(buf: Uint8Array | string) {
  if (!crcTable) {
    crcTable = makeCRCTable();
  }
  if (!(buf instanceof Uint8Array)) {
    buf = new TextEncoder().encode(buf);
  }
  let crc = -1;

  for (let index = 0; index < buf.length; index++) {
    const byte = buf[index];
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}
