import DataLoader from "dataloader";
import { DOMParser, HTMLDocument } from "dom_parser";
import * as R from "https://esm.sh/ramda";
import { ParsedSchema, ParseResult } from "./../tl-parser/types.ts";
import { ConstructorPageParser } from "./Parsers/ConstructPageParser.ts";
import { MethodPageParser } from "./Parsers/MethodPageParser.ts";
import { ExtendedSchema } from "./types.ts";
import { asElements } from "./utils.ts";

const BATCH_SIZE = 150;

export function extendSchema(
  schema: ParsedSchema,
  { DocsBasePath, language }: { DocsBasePath: string; language: string },
): Promise<ExtendedSchema> {
  const dataLoader = new DataLoader(
    async (requests: ReadonlyArray<Request | string | URL>) => {
      const chunks: ReadonlyArray<Request | string | URL>[] = R.splitEvery(
        BATCH_SIZE,
        requests,
      );
      let result: string[] = [];
      for (const chunk of chunks) {
        const responses: string[] = await Promise.all(
          chunk.map((req) => fetch(req).then((res) => res.text())),
        );
        console.log("progress ...");
        result = result.concat(responses);
      }

      return result;
    },
  );
  const crawler = new DocumentCrawler(
    schema,
    dataLoader,
    DocsBasePath,
    language,
  );
  return crawler.crawl();
}

class DocumentCrawler {
  private readonly basePath: string;
  private readonly language: string;
  private readonly schema: ParsedSchema;
  private fetcher: DataLoader<Request, string>;

  constructor(
    schema: ParsedSchema,
    fetcher: DataLoader<Request, string>,
    basePath: string,
    language: string,
  ) {
    this.basePath = basePath;
    this.language = language;
    this.schema = schema;
    this.fetcher = fetcher;
  }

  async crawl(): Promise<ExtendedSchema> {
    return {
      constructors: await Promise.all(
        this.schema.constructors.map((c) => this.getExtendedConstruct(c)),
      ),
      methods: await Promise.all(
        this.schema.methods.map((c) => this.getExtendedMethod(c)),
      ),
      layerNumber: this.schema.layerNumber,
    };
  }

  private parseDom(htmlPage: string): HTMLDocument {
    const parser = new DOMParser();
    return parser.parseFromString(htmlPage, "text/html")!;
  }

  private absoluteLinks(dom: HTMLDocument, basePath: string) {
    const links = asElements(dom.querySelectorAll("a"));
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href) {
        const absHref = new URL(href, basePath).href;
        link.setAttribute("href", absHref);
      }
    }
  }

  private async getUrl(url: string) {
    const htmlPage = await this.fetcher.load(
      new Request(url, {
        headers: {
          Cookie:
            `stel_ln=${this.language}; stel_dev_layer=${this.schema.layerNumber}`,
        },
      }),
    );
    return this.parseDom(htmlPage);
  }

  private async getExtendedMethod(method: ParseResult) {
    const dom = await this.getUrl(`${this.basePath}/method/${method.name}`);
    this.absoluteLinks(dom, this.basePath);
    const pageParser = new MethodPageParser(dom, method);
    return (pageParser.parse());
  }

  private async getExtendedConstruct(constructor: ParseResult) {
    const dom = await this.getUrl(
      `${this.basePath}/constructor/${constructor.name}`,
    );
    this.absoluteLinks(dom, this.basePath);
    const pageParser = new ConstructorPageParser(dom, constructor);
    return pageParser.parse();
  }
}
