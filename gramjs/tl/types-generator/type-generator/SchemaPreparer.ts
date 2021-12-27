import * as R from "https://esm.sh/ramda";
import {
  ExtendedConstructorRepresentation,
  ExtendedMethodRepresentation,
  ExtendedSchema,
} from "./../docs/types.ts";
export type Method = ExtendedMethodRepresentation & {
  classType: "request";
};

export type Constructor = ExtendedConstructorRepresentation & {
  classType: "constructor";
};

export type Construct = (Method | Constructor) & {
  namespace: string | null;
  hasParams: boolean;
  interfaceName: string;
};

export type Namespace = {
  constructs: Construct[];
  types: {
    name: string;
    unionElements: string[];
  }[];
};
export type PreparedSchema = {
  global: Namespace;
  namespaces: [string, Namespace][];
  layerNumber: number;
};

const excludedConstructs = [
  -1132882121, // boolFalse
  -1720552011, // boolTrue
  1072550713, // true
  481674261, // vector
  -994444869, // error
  1450380236, // null
];
const excludedConstructsNames = [
  "Utils",
  "X",
  "Type",
  "Bool",
  "int",
  "double",
  "float",
  "int128",
  "int256",
  "long",
  "bytes",
  "string",
  "true",
];
export class SchemaPreparer {
  private constructs: Construct[];
  constructor(private schema: ExtendedSchema) {
    this.constructs = SchemaPreparer.generateConstructs(schema);
  }
  public prepare(): PreparedSchema {
    return {
      global: this.getGlobalNamespace(),
      namespaces: this.getNamespaces(),
      layerNumber: this.schema.layerNumber,
    };
  }
  private getNamespaces() {
    const groupedNamespaces = R.toPairs(R.groupBy(
      (e) => e.namespace!,
      this.constructs.filter((e) => e.namespace !== null),
    ));
    const namespaces: [string, Namespace][] = groupedNamespaces.map((
      [name, constructs],
    ) => [name, {
      constructs: constructs,
      types: this.getTypes(constructs),
    }]);
    return namespaces;
  }

  private getGlobalNamespace(): Namespace {

    const constructs = this.constructs.filter((e) => !e.namespace);
    const types = this.getTypes(constructs);
    return {
      constructs,
      types,
    };
  }

  private getTypes(constructs: Construct[]) {
    const groupedConstructors = R.toPairs(
      R.groupBy(
        (e) => e.type,
        constructs.filter((e) => e.classType === "constructor"),
      ),
    );
    const types = groupedConstructors
      .map(([name, constructors]) => ({
        name: upperFirst(name.includes(".") ? name.split(".")[1] : name),
        unionElements: constructors.map((e) => e.name),
      }));
    return types;
  }

  private static generateConstructs(schema: ExtendedSchema): Construct[] {
    const constructors: Constructor[] = schema.constructors
      .map((e) => ({ ...e, classType: "constructor" }));
    const methods: Method[] = schema.methods
      .map((e) => ({ ...e, classType: "request" }));
    return [...constructors, ...methods]
      .filter((e) => !excludedConstructs.includes(e.id))
      .map((e) =>
        e.name.includes(".")
          ? {
            ...e,
            namespace: e.name.split(".")[0],
            name: e.name.split(".")[1],
          }
          : { ...e, namespace: null }
      ).map((e) => ({ ...e, name: upperFirst(e.name) }))
      .map((e) => ({
        ...e,
        type: SchemaPreparer.transformType(e.type),
        params: [...e.params.map((p) => ({
          ...p,
          type: SchemaPreparer.transformType(p.type),
        }))],
      }))
      .map((e) => ({
        ...e,
        hasParams: e.params.length > 0,
        interfaceName: e.name + "Args",
      }));
  }

  private static transformType(e: string): string {
    if (isExcludedType(e)) {
      return e;
    }
    let result = e;
    if (result === "#") {
      return "number";
    }
    if (result.startsWith("Vector")) {
      result = result.replace(/Vector<(.*)>/, "$1[]");
    }
    if (!isExcludedType(result)) {
      result = result.includes(".")
        ? result.split(".")[0] + ".Type" + result.split(".")[1]
        : "Type" + result;
    }
    return result;
  }
}

function isExcludedType(type: string) {
  return excludedConstructsNames.some((e) => type.startsWith(e));
}

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
