import {
  ClassDeclarationStructure,
  FileSystemHost,
  InterfaceDeclarationStructure,
  MethodDeclarationStructure,
  ModuleDeclaration,
  ModuleDeclarationKind,
  Project,
  PropertyDeclarationStructure,
  SourceFile,
  StructureKind,
} from "https://deno.land/x/ts_morph@12.2.0/mod.ts";
import * as R from "https://esm.sh/ramda";
import camelCase from "https://deno.land/x/case@v2.1.0/camelCase.ts";
import { ExtendedSchema } from "./../docs/types.ts";
import {
  Construct,
  Namespace,
  PreparedSchema,
  SchemaPreparer,
} from "./SchemaPreparer.ts";

export class TypeGenerator {
  private project: Project;
  private file: SourceFile;
  private fs: FileSystemHost;
  private namespace: ModuleDeclaration;
  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
    });
    this.fs = this.project.getFileSystem();
    this.file = this.project.createSourceFile("./api.d.ts");
    this.namespace = this.file.addModule({
      declarationKind: ModuleDeclarationKind.Namespace,
      name: "Api",
      isExported: true,
    });
  }
  generate(schema: ExtendedSchema): string {
    const preparedSchema = this.prepareSchema(schema);

    this.addImports();
    this.addBasicTypes();
    this.addVirtualClass();
    this.addRequestConstructor();
    this.fill(preparedSchema);
    return this.file.getText();
  }
  fill(preparedSchema: PreparedSchema) {
    const global = preparedSchema.global;
    this.attachNamespace(this.namespace, global);
    preparedSchema.namespaces.forEach(([name, ns]) => {
      const namespaceDeclaration = this.namespace.addModule({
        statements: [],
        declarationKind: ModuleDeclarationKind.Namespace,
        name: name,
      });
      this.attachNamespace(namespaceDeclaration, ns);
    });
  }
  private attachNamespace(
    namespace: ModuleDeclaration,
    namespaceDeclarations: Namespace,
  ) {
    namespace.addStatements(
      [
        ...R.flatten(
          namespaceDeclarations.constructs.map((d) =>
            d.hasParams
              ? [
                this.getInterfaceDecelerationFromConstruct(d),
                this.getClassDecelerationFromConstruct(d),
              ]
              : [this.getClassDecelerationFromConstruct(d)]
          ),
        ),
        ...namespaceDeclarations.types.map((t) => ({
          name: t.name,
          type: t.unionElements.join(" | "),
          kind: StructureKind.TypeAlias,
        })),
      ],
    );
  }
  private getInterfaceDecelerationFromConstruct(
    c: Construct,
  ): InterfaceDeclarationStructure {
    return {
      kind: StructureKind.Interface,
      name: c.interfaceName,
      isExported: true,
      properties: c.params.map((p) => ({
        name: camelCase(p.name),
        type: p.name.includes("msg_id")
          ? p.type.replace("int", "MessageIDLike")
          : c.classType === "request"
          ? p.type.replace(/^TypeInputPeer(\[\])?$/, "EntityLike$1")
          : p.type,
        hasQuestionToken: p.isOptional,
        docs: [{ description: p.description }],
      })),
    };
  }
  private getClassDecelerationFromConstruct(
    c: Construct,
  ): ClassDeclarationStructure {
    return {
      kind: StructureKind.Class,
      name: c.name,
      extends: this.getExtends(c),
      isExported: true,
      docs: [{
        description: c.description,
        tags: [
          ...c.relatedLinks.map((l) => ({ tagName: "link", text: l })),
          ..."possibleErrors" in c
            ? c.possibleErrors.map((e) => ({
              tagName: "throws",
              text: `{{code:${e.code},type:"${e.type}"}} ${e.description}`,
            }))
            : [],
        ],
      }],
      properties: [
        ...this.getInitialProperties(c),
        ...c.params.map((p) => ({
          name: camelCase(p.name),
          type: p.name.includes("msg_id")
            ? p.type.replace("int", "MessageIDLike")
            : c.classType === "request"
            ? p.type.replace(/^TypeInputPeer(\[\])?$/, "EntityLike$1")
            : p.type,
          hasQuestionToken: p.isOptional,
        })),
      ],
      methods: this.getInitialMethods(c),
      implements: c.hasParams ? [c.interfaceName] : undefined,
    };
  }
  private getInitialProperties(c: Construct): PropertyDeclarationStructure[] {
    return [ {
      name: "classType",
      type: `"${c.classType}"`,
      kind: StructureKind.Property,
    }, {
      name: "className",
      type: `"${c.namespace ? c.namespace + "." : ""}${c.name}"`,
      kind: StructureKind.Property,
    }];
  }
  private getInitialMethods(c: Construct): MethodDeclarationStructure[] {
    return [{
      name: "fromReader",
      kind: StructureKind.Method,
      parameters: [{ name: "reader", type: "Reader" }],
      returnType: c.name,
    }];
  }
  private getExtends(c: Construct) {
    return c.classType === "constructor"
      ? `VirtualClass<${c.hasParams ? c.interfaceName : "void"}>`
      : `Request<Partial<${c.hasParams ? c.interfaceName : "void"}>,${c.type}>`;
  }
  prepareSchema(schema: ExtendedSchema): PreparedSchema {
    return new SchemaPreparer(schema).prepare();
  }
  private addRequestConstructor() {
    this.namespace.addClass({
      name: "Request",
      extends: "VirtualClass<Partial<Args>>",
      isAbstract: true,
      typeParameters: [{ name: "Args" }, { name: "Response" }],

      properties: [{ name: "__response", type: "Response" }],
      methods: [{
        name: "readResult",
        isStatic: true,
        parameters: [{ name: "reader", type: "Reader" }],
        returnType: "Buffer",
      }, {
        name: "resolve",
        parameters: [{ name: "client", type: "Client" }, {
          name: "utils",
          type: "Utils",
        }],
        returnType: "Promise<void>",
      }],
    });
  }
  private addVirtualClass() {
    this.namespace.addClass({
      name: "VirtualClass",
      isAbstract: true,
      typeParameters: [{ name: "Args", constraint: "AnyLiteral" }],
      properties: [
        {
          isStatic: true,
          name: "CONSTRUCTOR_ID",
          type: "number",
        },
        {
          isStatic: true,
          name: "SUBCLASS_OF_ID",
          type: "number",
        },
        {
          isStatic: true,
          name: "className",
          type: "string",
        },
        {
          isStatic: true,
          name: "classType",
          type: `"constructor"|"request"`,
        },
        {
          name: "CONSTRUCTOR_ID",
          type: "number",
        },
        {
          name: "SUBCLASS_OF_ID",
          type: "number",
        },
        {
          name: "className",
          type: "string",
        },
        {
          name: "classType",
          type: `"constructor"|"request"`,
        },
        {
          name: "originalArgs",
          type: "Args",
        },
      ],
      methods: [
        {
          name: "serializeBytes",
          isStatic: true,
          parameters: [
            {
              name: "data",
              type: "Buffer|string",
            },
          ],
          returnType: "Buffer",
        },
        {
          name: "serializeDate",
          isStatic: true,
          parameters: [
            {
              name: "date",
              type: "Date|number",
            },
          ],
          returnType: "Buffer",
        },
        {
          name: "getBytes",
          returnType: "Buffer",
        },
        {
          name: "toJSON",
          returnType: "Args",
        },
      ],
      ctors: [{ parameters: [{ name: "args", type: "Args" }] }],
    });
  }

  private addBasicTypes() {
    this.namespace.addTypeAliases([
      { name: "AnyLiteral", type: "Record<string, any> | void" },
      { name: "Reader", type: "any" },
      { name: "Client", type: "any" },
      { name: "Utils", type: "any" },
      { name: "X", type: "unknown" },
      { name: "Type", type: "unknown" },
      { name: "Bool", type: "boolean" },
      { name: "int", type: "number" },
      { name: "double", type: "number" },
      { name: "float", type: "number" },
      { name: "int128", type: "BigInteger" },
      { name: "int256", type: "BigInteger" },
      { name: "long", type: "BigInteger" },
      { name: "bytes", type: "Buffer" },
    ]);
  }

  private addImports() {
    this.file.addImportDeclarations([
      {
        moduleSpecifier: "big-integer",
        namedImports: ["BigInteger"],
      },
      {
        moduleSpecifier: "../define",
        namedImports: ["EntityLike", "MessageIDLike"],
      },
      {
        moduleSpecifier: "./custom/message",
        namedImports: ["CustomMessage"],
      },
    ]);
  }


}
