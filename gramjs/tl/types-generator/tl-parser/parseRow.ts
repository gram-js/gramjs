import { GenericParams, ParseResult } from "./types.ts";
import { signedHexToInt } from "./utils.ts";
import { crc32 } from "./utils.ts";

const genericPattern = /(\{((\w+):(\w+),?)+\}(\s#\s\[\s?((\w+),?\s?)+\])?)/;
const namePattern = /^([\w\.]+)#([\da-f]+)\s+/;
const typePattern = /=.*;$/;

export function parseRow(row: string): ParseResult {
  const type = extractType(row);
  return {
    name: extractName(row),
    id: extractId(row),
    generic: extractGeneric(row),
    params: extractParams(row),
    type,
    subclassOfId: crc32(type),
  };
}
function extractName(row: string) {
  try {
    return row.match(namePattern)![1];
  } catch (err) {
    throw err;
  }
}
function extractId(row: string) {
  return signedHexToInt(row.match(namePattern)![2]);
}

function extractType(row: string) {
  try {
    const resultOnly = row.match(typePattern)![0];
    return resultOnly.replace(/=|;/g, "").trim();
  } catch (e) {
    console.log(row);
    throw e;
  }
}

function extractParams(row: string) {
  const argsWithResult = removeGeneric(removeName(removeType(row)));
  return argsWithResult
    .split(" ")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => e.replace(/flags.\d+/g, ""))
    .map((e) => e.split(":"))
    .map(([name, type], i) => ({
      name,
      type: type.replace(/^[\?\!]/, ""),
      index: i,
      isOptional: type.startsWith("?"),
    }));
}

function extractGeneric(row: string) {
  const remaining = removeName(row);
  const result: Partial<GenericParams> = {};
  if (remaining.match(genericPattern)) {
    result.genericDescriptor = [];
    const genericString = remaining.match(genericPattern)![1]!;

    const [decleration, argsOrder] = genericString.split("#").map((e) =>
      e.trim()
    );
    for (
      const [_, key, type] of decleration.matchAll(/(\w[\w0-9]*):(\w[\w0-9]*)/g)
    ) {
      result.genericDescriptor.push({ key, type });
    }
    if (argsOrder) {
      result.argsOrder = [...argsOrder.matchAll(/(\w[\w0-9]*)/g)].map((
        e,
      ) => e[0]);
    }
  }
  return result as GenericParams;
}

function removeName(row: string) {
  return row.replace(namePattern, "");
}

function removeGeneric(row: string) {
  return row.replace(genericPattern, "");
}

function removeType(row: string) {
  return row.replace(typePattern, "");
}
