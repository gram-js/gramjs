/// <reference types="node" />
import type { DateLike } from "../define";
declare const snakeToCamelCase: (name: string) => string;
declare const variableSnakeToCamelCase: (str: string) => string;
declare const CORE_TYPES: Set<number>;
declare const fromLine: (line: string, isFunction: boolean) => any;
declare function buildArgConfig(name: string, argType: string): any;
declare const parseTl: (content: string, layer: string, methods?: any[], ignoreIds?: Set<number>) => Generator<any, void, unknown>;
declare const findAll: (regex: RegExp, str: string, matches?: any) => any;
export declare function serializeBytes(data: Buffer | string | any): Buffer;
export declare function serializeDate(dt: DateLike | Date): Buffer;
export { findAll, parseTl, buildArgConfig, fromLine, CORE_TYPES, snakeToCamelCase, variableSnakeToCamelCase, };
