import bigInt from "big-integer";
import { WriteStream } from "fs";

type ValueOf<T> = T[keyof T];

type LocalPath = string;
type ExternalUrl = string;
type BotFileID = string;

type OutFile =
    | string
    | Buffer
    | WriteStream
    | { write: Function; close?: Function };
type ProgressCallback = (
    total: bigInt.BigInteger,
    downloaded: bigInt.BigInteger
) => void;

type DateLike = number;
