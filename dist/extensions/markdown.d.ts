import { Api } from "../tl";
export declare class MarkdownParser {
    static parse(message: string): [string, Api.TypeMessageEntity[]];
    static unparse(text: string, entities: Api.TypeMessageEntity[] | undefined): string;
}
