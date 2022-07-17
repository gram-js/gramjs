import { AbsInlineResult } from "./absInlineResult";

export abstract class AbsInlineResults extends Array<AbsInlineResult> {
    abstract resultsValid(): boolean;
}
