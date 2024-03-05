import { Api } from "../tl";
export declare class HTMLParser {
    static parse(html: string): [string, Api.TypeMessageEntity[]];
    static unparse(text: string, entities: Api.TypeMessageEntity[] | undefined, _offset?: number, _length?: number): string;
}
