import * as Dom from "dom_parser";

export function asElements(
  nodes: ReturnType<Dom.HTMLDocument["querySelectorAll"]>,
): Dom.Element[] {
  return Array.from(nodes) as Dom.Element[];
}
