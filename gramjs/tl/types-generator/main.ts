import { TypeGenerator } from "./type-generator/type-gen.ts";
import { getSchemaDefinition } from "./tl-parser/tl-parser.ts";
import { extendSchema } from "./docs/crawl.ts";

console.log("getting schema");
const schema = await fetch(
  "https://raw.githubusercontent.com/telegramdesktop/tdesktop/5e2cdde2c8cd377063d051a24f5be649e4343b16/Telegram/Resources/tl/api.tl",
).then((r) => r.text());
console.log("parsing schema");
const parseSchema = getSchemaDefinition(schema);
console.log("fetching documentation");
const extendedSchema = await extendSchema(parseSchema, {
  DocsBasePath: "https://corefork.telegram.org/",
  language: "en",
});
console.log("generating dts");
const dtsFile = new TypeGenerator().generate(extendedSchema);

Deno.writeFileSync(
  "../api.d.ts",
  new TextEncoder().encode(dtsFile),
);
console.log("done");
