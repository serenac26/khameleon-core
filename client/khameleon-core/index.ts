import pkg from "../package.json";

export * from "./distribution";
export * from "./logger";
export * from "./engine";
export * from "./apps";
export * from "./predictor";
export * from "./utils";

export const version = pkg.version;
console.log("version", version);


