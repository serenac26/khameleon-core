import { Header } from "../apps";
import { EventEmitter } from "events";

export type Blocks = Map<number, any>;
export interface IndexData {
  blocks: Blocks;
  nblocks: number;
}

export interface Cache extends EventEmitter {
    
    /**
     * write data to the cache
     
     * @param data
     * @param header key, blockid, total number of blocks for that key
     * @param blockIdx  unique id for block received through ws
     */
    write(data, header: Header, blockIdx: number);
    get(key: string): any;
}
