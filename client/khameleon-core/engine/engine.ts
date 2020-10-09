import { CacheFactory, Cache } from "../cache";
import { EventEmitter } from "events";
import { EventType, WS } from "../utils";
import { Predictor } from "../predictor";
import { App } from "../apps";
import { post_stringify, SystemLogger } from "../utils";
import { RequestManager } from "./reqmanager";

export class Engine extends EventEmitter {
    public cache: Cache;
    public app: App;
    public predictor: Predictor;
    public requestManager: RequestManager = new RequestManager();

    public total_requests: number = 0;
    constructor(app: App, predictor: Predictor, config) {
      super();

      window.session_config = config;

      this.app = app;
      this.predictor = predictor;
      this.predictor.on("onupdate", this.onUpdate.bind(this));
    }

    
    // binded to "onupdate" signal, which hints on new user state to be sent to the server
    onUpdate() {
      if (!window.running) return;

      let dists = this.predictor.serialize();

      if (dists) {
        post_stringify("/post_dist", dists);
      }
    }

    // establish connection with the server
    async connect(appstate: {}, onopen, onmessage) {
      const wsUri = (window.location.protocol === 'https:' && 'wss://' || 'ws://') + window.location.host + "/ws/";
      this.cache = new CacheFactory().createCache(window.session_config.cacheConfig);
      this.cache.on("onblock", this.onblock.bind(this));
      let instance = new WS(wsUri, onmessage);

      if (await instance.running === false ) {
        setTimeout( () => {
          post_stringify("/initapp", appstate, onopen);
        }, 100);
      }
    }


    async registerQuery(qid, cb) {
      let req = this.requestManager.addRequest(qid, cb);

      if (window.gsyslogger && window.session_config &&
          (window.session_config.logTrace || window.session_config.logQueries)) {
        window.gsyslogger.addEvent(EventType.Query, {
          query: qid, 
          qid: req.ridx,
          dtime: Date.now()
        });
      }

      let data = this.cache.get(qid);
      if (data) {
        req.cacheHit = true;
        this.handlerequest(req, data, "register", -1);
      } else {

        // if direct request then send to server
        if (window.session_config.request) {
          // here, get the data and store it in this.cache
          console.log("cache miss", qid, this.requestManager.requests_len());
          let start = Date.now();
          this.total_requests++;
          post_stringify("/request", {query: qid, rtype: false}, (data) => {
            let duration = Date.now() - start;
            console.log("received response for", qid, duration, data);
          });
        }
        req.lock = false;
      }
    }

    run() {
        // todo: no need for this, the client just connect to an initialized server
        let appstate = this.app.getState();
        this.app.bindEngine(this);


        const onmessage = (block, header, blockIdx) => {
            header.key = this.app.decode_key(header.key);
            this.cache.write(block, header, blockIdx);
        };

        const onopen = (data) => {
            console.log("successfully initialized app", data);
            this.app.onopen(data);
            if (window.gsyslogger)
              window.gsyslogger.addEvent(EventType.Open, {timestamp: Date.now()});
            // i can query the app for further config states s.t. 
            // blocks count and utility for each block
            post_stringify("start/threads", {}, () => {
              window.running = true;

              console.log("session_config", window.session_config);
              if (window.session_config && window.session_config.macro_test === false) {

                  if (!window.session_config.logTrace && !window.session_config.request) {
                     console.log("start logger");
                     window.gsyslogger = new SystemLogger();
                    console.log("starting predictor");
                    this.predictor.start();
                  }
                  
              } else {
                  window.gsyslogger = new SystemLogger();
              }
            });
            
            if (window.session_config.macro_test === true ) {
              let event = {payload_size: 0, bw: Math.floor(window.session_config.bandwidth), latency: window.session_config.latency};
              console.log("set the bandwidth and latency at the server", event);
              post_stringify("/log/bandwidth", event);
            }
        };
        this.connect(appstate, onopen, onmessage);
    }


    // cache calls this
    // blockIdx: unique id for each block received by ws
    public async onblock(qid: string, f: string, blockIdx: number) {
      this.total_requests--;
      if (window.gsyslogger &&
          window.session_config && window.session_config.logOnBlock)
        window.gsyslogger.addEvent(EventType.OnBlock, {fn: "onblock@start", 
                                   data: qid, bid: blockIdx, time: Date.now()});

      let req = this.requestManager.getRequest(qid);
      if (req == null) return;


      let data = this.cache.get(qid);
      if (window.gsyslogger &&
          window.session_config && window.session_config.logOnBlock)
        window.gsyslogger.addEvent(EventType.OnBlock, {fn: "onblock@cache.get", 
                                     data: qid, bid: blockIdx, time: Date.now()});
      if (data) {
        this.handlerequest(req, data, f, blockIdx);
      }
      if (window.gsyslogger &&
          window.session_config && window.session_config.logOnBlock)
        window.gsyslogger.addEvent(EventType.OnBlock, {fn: "onblock@end", 
                                     data: qid, bid: blockIdx, time: Date.now()});
    }

    handlerequest(req, data, f: string, blockIdx: number) {
      if (blockIdx >= 0 && window.gsyslogger &&
          window.session_config && window.session_config.logOnBlock)
          window.gsyslogger.addEvent(EventType.OnBlock, {fn: "handlerequest@start", 
                                       data: JSON.stringify(req), bid: blockIdx, time: Date.now()});
      let { blocks, nblocks } = data;
      let end = Date.now();
      let {render_data, inblocks} = this.app.construct(req.qid, blocks, nblocks);
      let utility = inblocks / nblocks;

      if (blockIdx >= 0 && window.gsyslogger &&
          window.session_config && window.session_config.logOnBlock)
        window.gsyslogger.addEvent(EventType.OnBlock, {fn: "handlerequest@postconstruct", 
                                     data: inblocks, bid: blockIdx, time: Date.now()});
      // TODO: suppress consecutive identical upcalls
      if (req.maxUtility >= utility || req.inblocks >= inblocks) {
        req.lock = false;
        if (req.nupcalls === 0 && req.cacheHit) req.cacheHit = false;
        return;
      }


      let npreempted = this.requestManager.preemptOlderThan(req);
      if (blockIdx >= 0 && window.gsyslogger &&
          window.session_config && window.session_config.logOnBlock)
        window.gsyslogger.addEvent(EventType.OnBlock, {fn: "handlerequest@postpreempt", 
                                     data: npreempted, bid: blockIdx, time: Date.now()});
      req.f = f;
      req.maxUtility = utility;
      req.inblocks = inblocks;
      req.nblocks = nblocks;
      req.nupcalls++;
      req.cb.apply(req.cb, [render_data]);

      this.requestManager.log(req.qid, req.cacheHit, req.maxUtility, req.nblocks, req.inblocks, end-req.stime, end, req.nupcalls, req.ridx, req.f, req.lock);
      if (req.maxUtility == 1) {
        let nremoved = this.requestManager.rmRequest(req);
        if (blockIdx >= 0 && window.gsyslogger &&
            window.session_config && window.session_config.logOnBlock)
          window.gsyslogger.addEvent(EventType.OnBlock, {fn: "handlerequest@postrm", 
                                       data: nremoved, bid: blockIdx, time: Date.now()});
      }
      req.lock = false;
    }
}
