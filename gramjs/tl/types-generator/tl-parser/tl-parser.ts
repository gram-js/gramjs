import * as R from "https://esm.sh/ramda";
import { ParseResult } from "./types.ts";
import { parseRow } from "./parseRow.ts";

export type SchemaDefinition = {
  constructors: ParseResult[];
  methods: ParseResult[];
  layerNumber: number;
};

export function getSchemaDefinition(schemaContent: string): SchemaDefinition {
  const fileRows = schemaContent.split("\n").filter(Boolean);
  const layerNumber = getLayerNumber(fileRows);

  const { constructors, methods } = getConstructsAndMethodsFromRows(fileRows);

  return {
    constructors: constructors.map((row) => parseRow(row)),
    methods: methods.map((row) => parseRow(row)),
    layerNumber,
  };
}

function getLayerNumber(rows: string[]) {
  return +rows.find(e=>e.match(/LAYER \d+/))!.match(/\d+/)![1];
}

function getConstructsAndMethodsFromRows(rows: string[]) {
  const fileRowsWithoutComments = rows
    .filter((row) => !isComment(row))
    .map((row) => row.trim());

  const [constructsRows, methodRows] = R.splitAt(
    fileRowsWithoutComments.indexOf("---functions---"),
    fileRowsWithoutComments,
  );
  methodRows.shift();
  return {
    constructors: constructsRows,
    methods: methodRows,
  };
}

function isComment(row: string) {
  return row.startsWith("//");
}
