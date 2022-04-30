import { isNode } from "./platform";

const crypto = require(isNode ? "crypto" : "./crypto/crypto");

export default crypto;
