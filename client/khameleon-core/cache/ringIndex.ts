import { EventEmitter } from "events";
import { Cache, Blocks, IndexData } from "./cache";
import { Header } from "../apps";

interface slot {
  key: string;
  blockid: number;
};

export class RingIndex extends EventEmitter implements Cache {
  private cacheSize: number;
  
  private blocksIndex: Map<string, IndexData> = new Map();
  private ringIndex: Array<slot> = []
  
  /**
   * @cacheSize how many blocks the cache can hold
   */
  constructor(cacheSize: number) {
    super();
    this.cacheSize = cacheSize;
  }

  write(data: any, header: Header, blockIdx: number) {
    
    let { key, blockid, nblocks } = header;

    if (this.ringIndex.length + 1 > this.cacheSize) {
      let slot = this.ringIndex.shift()
      if (slot) this.evict(slot.key, slot.blockid);
    }

    this.ringIndex.push({key, blockid});
    
    let dataindex = this.blocksIndex.get(key);
    let blocks: Blocks;
    let oldcount = 1;
    if (dataindex == undefined) {
      blocks = new Map();
    } else {
      blocks = dataindex.blocks;
    }

    if (blocks.has(blockid)) {
      let {count} = blocks.get(blockid);
      oldcount = count + 1;
    }

    blocks.set(blockid,  {data, count: oldcount} );

    this.blocksIndex.set(key, { blocks, nblocks });

    if (window.gsyslogger &&
        window.session_config && window.session_config.logOverPush)
      window.gsyslogger.addBlock(key, blockid);
    this.emit("onblock", key, "cache", blockIdx)
  }

  get(key: string) : IndexData | undefined {
    let dataindex = this.blocksIndex.get(key);
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

  evict(key: string, blockid: number) {
    let dataindex = this.blocksIndex.get(key);
    if (dataindex) {
      let { blocks, nblocks} = dataindex;
      let {data, count} = blocks.get(blockid);
      count--;
      if (count == 0)
        blocks.delete(blockid);
      else blocks.set(blockid, {data, count});

      if (blocks.size > 0) {
        this.blocksIndex.set(key, {blocks, nblocks});
      } else {
        this.blocksIndex.delete(key);
      }
      if (window.gsyslogger &&
          window.session_config && window.session_config.logOverPush)
        window.gsyslogger.evictBlock(key, blockid, count);
      }
  }
}
