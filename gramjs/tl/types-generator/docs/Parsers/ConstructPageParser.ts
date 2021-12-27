import { ParseResult } from "./../../tl-parser/types.ts";
import { ExtendedConstructorRepresentation } from "../types.ts";
import { HTMLDocument } from "dom_parser";
import { PageParser } from "./PageParser.ts";

export class ConstructorPageParser extends PageParser {
  constructor(
    readonly dom: HTMLDocument,
    construct: ParseResult,
  ) {
    super(dom, construct);
  }

  parse(): ExtendedConstructorRepresentation {
    const mainDescription = this.getMainDescription();
    const parametersDescriptions = this.getParametersDescriptions();
    return {
      ...this.construct,
      description: mainDescription,
      params: this.construct.params.map((p, i) => ({
        ...p,
        description: parametersDescriptions[i],
      })),
      relatedLinks: this.getRelatedPages(),
    };
  }
}
