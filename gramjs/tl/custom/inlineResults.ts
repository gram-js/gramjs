import {TelegramClient} from "../../client/TelegramClient";
import {EntityLike} from "../../define";
import {Api} from "../api";
import TypeBotResults = Api.messages.TypeBotResults;


export class InlineResults<InlineResult> extends Array<InlineResult> {
    private result: TypeBotResults;
    private queryId: Api.long;
    private cacheTime: Api.int;
    private _validUntil: number;
    private users: Api.TypeUser[];
    private gallery: boolean;
    private nextOffset: string | undefined;
    private switchPm: Api.TypeInlineBotSwitchPM | undefined;

    constructor(client: TelegramClient, original: TypeBotResults, entity?: EntityLike) {
        super();
        this.result = original;
        this.queryId = original.queryId;
        this.cacheTime = original.cacheTime;
        this._validUntil = ((new Date()).getTime() / 1000) + this.cacheTime;
        this.users = original.users;
        this.gallery = Boolean(original.gallery);
        this.nextOffset = original.nextOffset;
        this.switchPm = original.switchPm;
    }
    resultsValid(){
        return ((new Date()).getTime() / 1000) < this._validUntil;
    }
}

