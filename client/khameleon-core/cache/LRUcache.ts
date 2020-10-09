import { EventEmitter } from "events";
import { Cache, Blocks, IndexData } from "./cache";
import { Header } from "../apps";
import LRU from "lru-cache";

export class LRUcache extends EventEmitter implements Cache {
  private cache: LRU;
  private cacheSize: number;
  
  /**
   * @cacheSize how many blocks the cache can hold
   */
  constructor(cacheSize: number) {
    super();
    this.cache = new LRU(cacheSize);
    this.cacheSize = cacheSize;
  }

  write(data: any, header: Header, blockIdx: number) {
    let { key, blockid, nblocks } = header;

    let blocks: Blocks = new Map();
    blocks.set(blockid, {data, count: 1});
    
    let evictKey = this.cache.keys()[this.cache.length-1];
    this.cache.set(key, {blocks, nblocks} );

    if (window.gsyslogger && window.session_config
        && window.session_config.logOverPush
        && this.cache.length == this.cacheSize) {
        console.log("cache length: ", evictKey, this.cache.length, key, this.cache.keys());
        window.gsyslogger.evictBlock(evictKey, blockid, 0);
    }

    if (window.gsyslogger &&
        window.session_config && window.session_config.logOverPush)
      window.gsyslogger.addBlock(key, blockid);

    this.emit("onblock", key, "cache", blockIdx)
  }

  get(key: string) : IndexData | undefined {
    let dataindex = this.cache.get(key);
    if (dataindex) {
      let { blocks, nblocks } = dataindex;
      if (window.gsyslogger &&
          window.session_config && window.session_config.logOverPush) {
        let blockids =[ ...blocks.keys() ];
        window.gsyslogger.tagBlock(key, blockids)
      }

      return { blocks, nblocks };
    } else {
      return undefined;
    }
  }
}
