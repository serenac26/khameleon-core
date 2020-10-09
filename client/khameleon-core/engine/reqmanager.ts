import { EventEmitter } from "events";
import { EventType } from "../utils";

type callbackType = (
  data: any, 
  utility: number, 
  cachehit: boolean, 
  nblocks: number, 
  inblocks: number) => void;

interface Request {
  qid: string;
  ridx: number;
  cb: callbackType;

  stime: number;
  cacheHit: boolean;
  nupcalls: number;
  maxUtility: number;
  nblocks: number;
  inblocks: number;
  f: string;
  lock: boolean;
}

export class RequestManager extends EventEmitter {
  private requests: Request[] = [];
  private requestsIdx: {[key: string]: Request} = {};
  private ridxCounter: number = 0;
  private policy: string = "preempt";

  constructor() {
    super();
  }

  requests_len() : number {
    return this.requests.length;
  }

  log(qid, cacheHit, maxUtility, nblocks, inblocks, delay, dtime, nupcalls, ridx, f, lock) {
    let duplicate = false;
    if (lock === false && nupcalls > 0) duplicate = true;
    if (window.gsyslogger &&
        window.session_config && window.session_config.logResponse)
      window.gsyslogger.addEvent(EventType.Response, {
        query: qid, 
        cachehit: cacheHit, 
        utility: maxUtility,
        nblocks: nblocks,
        inblocks: inblocks, 
        delay: delay,
        dtime: dtime, 
        count: nupcalls,
        qid: ridx,
        fn: f,
        duplicate: duplicate,
        lock: lock
      });
  }

  logPreempted(preempted: Request[]) {
    let end = Date.now();
    preempted.forEach((req) => {
      this.log(req.qid, req.cacheHit, req.maxUtility, req.nblocks, req.inblocks, end-req.stime, end, req.nupcalls, req.ridx, req.f, req.lock);
    })
  }

  End(count: number) {
    console.log("End was called count=" + count + " outstanding reqs " + this.requests.length);
    // wait for requests to finish, or for a fixed amount of time
    if (this.requests.length == 0 || window.session_config.name === "sender") {
      if (window.gsyslogger) window.gsyslogger.writeEvents();
    } else if (count > 0) {
      this.logPreempted(this.requests);
      console.log("logpreempted", window.gsyslogger);
      if (window.gsyslogger) {
        console.log("write Events");
        window.gsyslogger.writeEvents();
      }
    } else {
      setTimeout(() => {
        this.End(++count);
      }, 1000*60);
    }
  }

  preemptOlderThan(req) {
    // preempt requests older (with smaller ridx than) ridx

    if (this.policy != "preempt") return;
    if (!req) return;
    if (this.requests.length == 0) return;

    let num = req.ridx - this.requests[0].ridx;
    let preempted = this.requests.splice(0, num);
    preempted.forEach((req) => {
      if (this.requestsIdx[req.qid] == req) {
        delete this.requestsIdx[req.qid]
      }
      if (req.nupcalls == 0) {
        req.nupcalls = -1;
      }
    });

    this.logPreempted(preempted);

    return num;
  }

  getRequest(qid) {
    if (qid in this.requestsIdx) {
      this.requestsIdx[qid].lock = true;
      return this.requestsIdx[qid];
    }
    return null;
  }

  rmRequest(req) {
    // by definition, only prefixes of the requests array
    // can be explicitly removed
    let num = req.ridx - this.requests[0].ridx;
    if (num != 0) console.log("ERROR");
    let rmed = this.requests.splice(0, num+1); // delete including this request
    rmed.forEach((req) => {
      if (this.requestsIdx[req.qid] == req) {
        delete this.requestsIdx[req.qid]
      }
    });

    return num;
  }

  addRequest(qid, cb) {
    let req = {
      qid: qid,
      ridx: this.ridxCounter++,
      cb: cb,
      stime: Date.now(),
      nupcalls: 0,
      maxUtility: 0,
      cacheHit: false,
      inblocks: 0,
      nblocks: 0,
      f: "init",
      lock: true,
    }
    this.requests.push(req);
    this.requestsIdx[qid] = req;
    return req;
  }

}
