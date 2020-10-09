import { post_stringify } from "./utils";
import * as _ from "underscore";

declare global {
    interface Window { gsyslogger: SystemLogger | undefined; socket; running; session_config; }
}

window.running = false;
window.session_config = {}

export enum EventType {
  Response = "Response",
  OnBlock = "OnBlock",
  Query = "Query",
  NewState = "NewState",
  Predictor = "Predictor",
  OverPush = "OverPush",
  ThinkTime = "ThinkTime",
  Network = "Network",
  Write = "Write",
  Open = "Open",
}

interface traceEvent {
  etype: string,
  e: any,
}

export class SystemLogger {
  private trace: traceEvent[] = [];
  public events: {[key: string]: any[]} = {};
  public prefix: string = "";
  public subfolder: string = "nocat";
  
  private blockstag: Map<string, boolean>;

  private blockscount: number = 0;
  private blocksmissed: number = 0;

  constructor() {
    if (window.session_config.macro_test)
      window.session_config.logOverPush = true;

    if (window.session_config && window.session_config.logOverPush) {
      this.blockstag = new Map();
    }


    if (window.session_config.logTrace || window.session_config.logMapD) {
      let duration = window.session_config.duration || 60 * 1000; // 1 s
      setTimeout(() => { this.writeTrace(); }, duration);
    }
  }

  writeTrace() {
    let user_name = (window.session_config && window.session_config.name)? window.session_config.name : "anon";
    let fname = `session-${user_name}-${Date.now()}.log`;

    let session = this.trace;
    
    let trace_wrapper = {file: fname, data: session};
    console.log("trace: ", trace_wrapper);
    this.writeEvents();
    post_stringify("/log/trace", trace_wrapper, () => { alert("done trace"); });
  }

  addSessionEvent(etype: string, e: any) {
    this.trace.push({etype: etype, e: e});
    if (etype != "p")
      console.log('session', etype, e.data)
  }

  addEvent(etype: EventType, event) {
    // create a new logger that logs both mouse positions and events
    // in the same file
    if (!this.events[etype])
      this.events[etype] = [];
    this.events[etype].push(event);
  }

  addBlock(key: string, blockid: number) {
    // we are overriding it
    this.blockstag.set(key+""+blockid, false);
    this.blockscount++;
  }

  tagBlock(key: string, blockids: number[]) {
    // get blocks[key] -> tag the blocks
    let that = this;
    blockids.forEach(function(id) {
      that.blockstag.set(key+""+id, true);
    });
  }

  evictBlock(key: string, blockid: number, count: number) {
    // get blocks[key] -> see if the blocks are used or not
    let flag = this.blockstag.get(key+""+blockid);
    if (!flag) {
      this.blocksmissed++;
    }
    if (count === 0)
      this.blockstag.delete(key+""+blockid);
    else
      this.blockstag.set(key+""+blockid, false);
  }

  writeEvents() {
    console.log("write Events");
    this.events[EventType.Write] = [{ timestamp: Date.now() }];

    // count left over blocks in cache
    //this.blockstag.forEach((v,_) => {
    //  if (v === false) this.blocksmissed++;
    //});

    this.summarize_events();

    if (window.session_config.logOverPush)
      this.events[EventType.OverPush] = [{
        missed: this.blocksmissed, 
        total:this.blockscount }];

    let wrapper = {data: this.events};
    post_stringify("/log/write", wrapper, () => { alert("done events"); });

  }

  // compute summaries and write them
  // -> cache hit, avg utility, avg delay, preempted?
  summarize_events() {
    if (!this.events[EventType.Response] || !this.events[EventType.Query]) {
      console.log("no summary");
      return;
    }

    let firstHit = _.filter(this.events[EventType.Response], (record) => {
        return (record["count"] === 1 && record["duplicate"] === false);
    });

    let preemptedList = _.filter(this.events[EventType.Response], (record) => {
        return (record["count"] === -1 || record["count"] === 0) && (record["duplicate"] === false);
    });

    let utils = _.map(firstHit, (record) => {
      return record["utility"];
    });

    let sum_util = _.reduce(utils, (acc, num) => {
      return num + acc;
    });

    let avg_util = sum_util / utils.length;

    let delays_firsthitList = _.map(firstHit, (record) => {
        return record.delay;
    });
    
    let delays_preemptedList = _.map(preemptedList, (record) => {
        return record.delay;
    });

    let delays_firsthit = _.reduce(delays_firsthitList, (acc, num) => {
      return num + acc;
    });

    let delays_preempted = _.reduce(delays_preemptedList, (acc, num) => {
      return num + acc;
    });

    let sum_delay = delays_firsthit + delays_preempted;

    let avg_delay = sum_delay / (firstHit.length + preemptedList.length);
    let cacheHit = _.filter(firstHit, (record) => {
      return record["cachehit"] === true;
    }).length;
    
    // out of all queries, how many weren't in cache?
    let cacheMiss = this.events[EventType.Query].length - (cacheHit);
    let preempted = -1;
    if (window.session_config && window.session_config.logQueries)
      preempted = this.events[EventType.Query].length - firstHit.length;

    console.log("preempted: ", preempted, preemptedList.length);

    this.events["summary"] = [{avg_util: avg_util, avg_delay: avg_delay,
                              cachehit: cacheHit, cacheMiss: cacheMiss, preempted: preempted}];
    console.log(this.events["summary"]);
  }
}
