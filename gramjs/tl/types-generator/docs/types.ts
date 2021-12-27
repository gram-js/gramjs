import { ParsedParam, ParseResult } from "./../tl-parser/types.ts";

export type test = ExtendedConstructorRepresentation["params"];
export type BaseExtendedObject = {
  params: ExtendedParam[];
  description: string;
  relatedLinks: string[];
} & ParseResult;
export type ExtendedConstructorRepresentation = BaseExtendedObject;

export type PossibleError = {
  code: string;
  type: string;
  description: string;
};

export type ExtendedParam = {
  description: string;
} & ParsedParam;

export type ExtendedMethodRepresentation = {
  possibleErrors: PossibleError[];
  resultDescription: string | null;
} & BaseExtendedObject;

export type ExtendedSchema = {
  constructors: ExtendedConstructorRepresentation[];
  methods: ExtendedMethodRepresentation[];
  layerNumber: number;
};
