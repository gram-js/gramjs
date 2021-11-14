import { ParseResult } from "./../../tl-parser/types.ts";
import { ExtendedMethodRepresentation, PossibleError } from "../types.ts";
import { Element, HTMLDocument } from "dom_parser";
import { PageParser } from "./PageParser.ts";

export class MethodPageParser extends PageParser {
  constructor(
    dom: HTMLDocument,
    method: ParseResult,
  ) {
    super(dom, method);
  }

  private getPossibleErrors(): PossibleError[] {
    const possibleErrors: PossibleError[] = [];
    const titleElement = this.dom.getElementById("possible-errors")
      ?.parentElement;
    if (!titleElement) return [];

    const table = titleElement.nextElementSibling;
    table?.querySelectorAll("tbody>tr").forEach((tr) => {
      const td = (tr as Element).querySelector("td")!;
      const code = td.textContent;
      const type = td.nextElementSibling!.textContent;
      const description =
        td.nextElementSibling!.nextElementSibling!.textContent;
      possibleErrors.push({ code, description, type });
    });
    return possibleErrors;
  }
  parse(): ExtendedMethodRepresentation {
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
      possibleErrors: this.getPossibleErrors(),
      resultDescription: this.getResultDesc(),
    };
  }
  private getResultDesc(): string | null {
    const resultTitle = this.dom.getElementById("result")?.parentElement;
    if (!resultTitle) return null;
    return resultTitle.nextElementSibling!.textContent;
  }
}
