import { Engine } from "../engine";

export interface Header {
  blockid: number;
  nblocks: number;
  key: string;
}

export interface Data {
  // data to render
  render_data: any;
  // how many useable blocks
  inblocks: number;
}

export interface Bounds {x: number; y: number; w: number; h: number};
export type Layout = {[key: string] : Bounds};

export interface App {
  render(data);
  sendQuery(data);
  bindEngine(engine: Engine);
  getState() : {};
  // string or binary
  onopen(data: string);
  decode_key(key: string) : string;

  construct(req, blocks, nblocks: number) : Data;
}
