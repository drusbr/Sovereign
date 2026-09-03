import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return {
      url: pathToFileURL(resolvePath(process.cwd(), "src", specifier.slice(2)) + ".ts").href,
      shortCircuit: true,
    };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.match(/\.[cm]?[jt]sx?$/)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
