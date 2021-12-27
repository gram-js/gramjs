import { ParseResult } from "./../../tl-parser/types.ts";
import { HTMLDocument } from "dom_parser";
import { asElements } from "../utils.ts";

export abstract class PageParser {
  constructor(
    protected readonly dom: HTMLDocument,
    protected construct: ParseResult,
  ) {
  }
  protected getParametersDescriptions(): string[] {
    if (this.construct.params.length === 0) {
      return [];
    }
    const parametersTitleLink = this.dom.querySelector(
      `a[href$="#parameters"],#parameters`,
    )!;
    const table = parametersTitleLink!.parentElement!.nextElementSibling!;
    const rows = asElements(table.querySelectorAll("tbody>tr"));
    return rows.map((r) => {
      const cells = asElements(r.querySelectorAll("td"));
      const description = cells[2].innerHTML;
      return description;
    });
  }

  protected getMainDescription() {
    const pTag = this.dom.querySelector("#dev_page_content > p");

    const pTags = [];
    let current = pTag;

    while (current && current.tagName.toLowerCase() === "p") {
      pTags.push(current);
      current = current.nextElementSibling;
    }

    return pTags.map((p) => p.innerHTML).join("<br>");
  }

  protected getRelatedPages(): string[] {
    const relatedPageLink = this.dom.getElementById("related-pages");
    if (!relatedPageLink) {
      return [];
    }
    const linksUrls: string[] = [];

    let currentLinkHolder = relatedPageLink.parentElement!.nextElementSibling;
    while (currentLinkHolder) {
      if (currentLinkHolder.querySelectorAll("a").length > 0) {
        asElements(currentLinkHolder.querySelectorAll("a"))
          .map((a) => a.getAttribute("href")!)
          .filter((url) => !new URL(url).hash)
          .forEach((url) => linksUrls.push(url!));
      }
      currentLinkHolder = currentLinkHolder.nextElementSibling;
    }

    return linksUrls;
  }
  abstract parse(): ParseResult;
}
