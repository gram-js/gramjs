import { Api } from "../tl";
export declare class MarkdownV2Parser {
    static parse(message: string): [string, Api.TypeMessageEntity[]];
    static unparse(text: string, entities: Api.TypeMessageEntity[] | undefined): string;
}
