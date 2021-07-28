import type { TelegramClient } from "../..";
import type { EntityLike } from "../../define";
import { Api } from "../api";
import { InlineResult } from "./inlineResult";
import { inspect } from "util";
import { betterConsoleLog } from "../../Helpers";

export class InlineResults extends Array<InlineResult> {
    private result: Api.messages.TypeBotResults;
    private queryId: Api.long;
    private readonly cacheTime: Api.int;
    private readonly _validUntil: number;
    private users: Api.TypeUser[];
    private gallery: boolean;
    private nextOffset: string | undefined;
    private switchPm: Api.TypeInlineBotSwitchPM | undefined;
    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        original: Api.messages.TypeBotResults,
        entity?: EntityLike
    ) {
        super(
            ...original.results.map(
                (res) => new InlineResult(client, res, original.queryId, entity)
            )
        );
        this.result = original;
        this.queryId = original.queryId;
        this.cacheTime = original.cacheTime;
        this._validUntil = new Date().getTime() / 1000 + this.cacheTime;
        this.users = original.users;
        this.gallery = Boolean(original.gallery);
        this.nextOffset = original.nextOffset;
        this.switchPm = original.switchPm;
    }

    resultsValid() {
        return new Date().getTime() / 1000 < this._validUntil;
    }
}
