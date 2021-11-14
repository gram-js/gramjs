export type GenericParams = {
  genericDescriptor?: { key: string; type: string }[];
  argsOrder?: string[];
};

export type ParsedParam = {
  name: string;
  type: string;
  index: number;
  isOptional: boolean;
};

export type ParseResult = {
  name: string;
  id: number;
  generic?: GenericParams;
  params: ParsedParam[];
  type: string;
  subclassOfId: number;
};

export type ParsedSchema = {
  constructors: ParseResult[];
  methods: ParseResult[];
  layerNumber: number;
};
