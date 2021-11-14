import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { SchemaPreparer } from "./SchemaPreparer.ts";

Deno.test({
  name: "should return empty prepared if nothing passed",
  fn: () => {
    const p = new SchemaPreparer({
      constructors: [],
      layerNumber: 1,
      methods: [],
    }).prepare();
    assertEquals(p, {
      global: { constructs: [], types: [] },
      namespaces: [],
      layerNumber: 1,
    });
  },
});

Deno.test("should attach classType to constructor for global constructor", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "Test",
      params: [],
      type: "Test",
      description: "test",
      generic: {},
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }],
    layerNumber: 1,
    methods: [],
  }).prepare();
  assertEquals(p.global.constructs[0].classType, "constructor");
});

Deno.test("should attach classType to constructor for non-global constructor", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "test.Test",
      params: [],
      type: "Test",
      description: "test",
      generic: {},
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }],
    layerNumber: 1,
    methods: [],
  }).prepare();
  assertEquals(p.namespaces[0][1].constructs[0].classType, "constructor");
});

Deno.test("should have the correct namespace name", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "test.Test",
      params: [],
      type: "Test",
      description: "test",
      generic: {},
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }],
    layerNumber: 1,
    methods: [],
  }).prepare();
  assertEquals(p.namespaces[0][0], "test");
});

// should have the correct construct in namespace
Deno.test("should have the correct construct in namespace", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "test.Test",
      params: [],
      type: "Test",
      description: "test",
      generic: {},
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }],
    layerNumber: 1,
    methods: [],
  }).prepare();
  assertEquals(p.namespaces[0][1].constructs[0].name, "Test");
});
// should have the correct types
Deno.test("should have the correct types in namespace", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "test.Test",
      params: [],
      type: "Test1",
      description: "test",
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }],
    layerNumber: 1,
    methods: [],
  }).prepare();

  assertEquals(p.namespaces[0][1].types[0].name, "TypeTest1");
  assertEquals(p.namespaces[0][1].types[0].unionElements, ["Test"]);
});

Deno.test("should only set constructor in namespace", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "test.Test",
      params: [],
      type: "Test1",
      description: "test",
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }],
    layerNumber: 1,
    methods: [],
  }).prepare();
  assertEquals(p.global.constructs.length, 0);
});

Deno.test("should set the type properly in other namespaces", () => {
  const p = new SchemaPreparer({
    constructors: [{
      name: "namespace1.constructName1",
      params: [],
      type: "Test1",
      description: "test",
      id: 4343,
      relatedLinks: [],
      subclassOfId: 100978,
    }, {
      name: "namespace2.constructName2",
    }],

    layerNumber: 1,
    methods: [],
  }).prepare();
  assertEquals(p.namespaces[0][1].types[0].name, "TypeTest1");
  assertEquals(p.namespaces[0][1].types[0].unionElements, ["Test"]);
});
