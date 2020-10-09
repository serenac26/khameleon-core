import { RingIndex } from "./ringIndex";
import { LRUcache } from "./LRUcache";

export class CacheFactory {
    constructor() {}

    createCache(cacheConfig) {
        if (cacheConfig == undefined) { cacheConfig = {}; }
        const cacheSize = cacheConfig.cacheSize || 10;
        if (cacheConfig.cache === "ringIndex") {
          return new RingIndex(cacheSize);
        } else {
          return new LRUcache(cacheSize);
        }
    }

}
