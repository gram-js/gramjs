import * as assert from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { parseRow } from "./parseRow.ts";

Deno.test("should return a valid result for vector", () => {
  const a = parseRow("vector#1cb5c415 {t:Type} # [ t ] = Vector t;");

  // asserts a should be {"name":"vector","id":481674261,"generic":{"genericDescriptor":[{"key":"t","type":"Type"}],"argsOrder":["t"]},"args":[]} key by key
  assert.assertEquals(a.name, "vector");
  assert.assertEquals(a.id, 481674261);
  assert.assertEquals(a.generic.genericDescriptor[0].key, "t");
  assert.assertEquals(
    a.generic.genericDescriptor[0].type,
    "Type",
  );
  assert.assertEquals(a.generic.argsOrder![0], "t");
  assert.assertEquals(a.type, "Vector t");
  assert.assertEquals(a.params.length, 0);
});

Deno.test("should return a valid result for other generics", () => {
  const a = parseRow(
    "initConnection#c1cd5ea9 {X:Type} flags:# api_id:int device_model:string system_version:string app_version:string system_lang_code:string lang_pack:string lang_code:string proxy:flags.0?InputClientProxy params:flags.1?JSONValue query:!X = X;",
  );
  assert.assertEquals(a, {
    name: "initConnection",
    id: -1043505495,
    generic: { genericDescriptor: [{ key: "X", type: "Type" }] },
    params: [
      { name: "flags", type: "#", index: 0, isOptional: false },
      { name: "api_id", type: "int", index: 1, isOptional: false },
      { name: "device_model", type: "string", index: 2, isOptional: false },
      { name: "system_version", type: "string", index: 3, isOptional: false },
      { name: "app_version", type: "string", index: 4, isOptional: false },
      { name: "system_lang_code", type: "string", index: 5, isOptional: false },
      { name: "lang_pack", type: "string", index: 6, isOptional: false },
      { name: "lang_code", type: "string", index: 7, isOptional: false },
      { name: "proxy", type: "InputClientProxy", index: 8, isOptional: true },
      { name: "params", type: "JSONValue", index: 9, isOptional: true },
      { name: "query", type: "X", index: 10, isOptional: false },
    ],
    type: "X",
    subclassOfId: 3081909835,
  });
});

Deno.test("should return a valid result for non-generics", () => {
  const a = parseRow(
    "channels.getParticipants#77ced9d0 channel:InputChannel filter:ChannelParticipantsFilter offset:int limit:int hash:long = channels.ChannelParticipants;",
  );
  assert.assertEquals(a, {
    name: "channels.getParticipants",
    id: 2010044880,
    generic: {},
    params: [
      { name: "channel", type: "InputChannel", index: 0, isOptional: false },
      {
        name: "filter",
        type: "ChannelParticipantsFilter",
        index: 1,
        isOptional: false,
      },
      { name: "offset", type: "int", index: 2, isOptional: false },
      { name: "limit", type: "int", index: 3, isOptional: false },
      { name: "hash", type: "long", index: 4, isOptional: false },
    ],
    type: "channels.ChannelParticipants",
    subclassOfId: 3859443300,
  });
});
