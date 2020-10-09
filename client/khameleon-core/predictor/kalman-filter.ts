import gaussian from "gaussian";
import * as _ from "underscore";
import 'sylvester';
import { Predictor, Prediction, DistModel } from "./predictor";
import { Distribution, GuassianDistribution } from "../distribution";
import { ContinuesLogger } from "../logger";
import { Layout } from "../apps";
import { EventEmitter } from "events";

// @position: [x, y, action]
function mouseToKey(position) {
    return position.join(":");
}

interface PointModel {
  a: number; //alpha
  X: number;
  Y: number;
}

export class KalmanFilter extends EventEmitter implements Predictor {
    get state(): { [p: number]: Distribution } {
        return this._state;
    }

    set state(value: { [p: number]: Distribution }) {
        this._state = value;
    }
    private _state: { [time: number]: Distribution };
    _model: string;
    _data_type:string;
    private timeRange: [number];
    private minInterval: number;
    public logger: ContinuesLogger;

    private thresh_stop: number;
    private max_stop: number;
    private alpha: number;
    private sigma: number;

    private layout = {};
    private layout_changed: boolean = false;
    private app_state: any = undefined;

    constructor(logger: ContinuesLogger, opts?) {
        super();
        if (opts == undefined) opts = {};
        this._model = opts.model || DistModel.LinearGP;
        this._data_type = opts.data_type || "JSON";
        // predicted time stamps in the future
        this.timeRange = opts.timeRange || [100, 200, 500];
        this.minInterval = opts.minInterval || 100;

        this.thresh_stop = opts.thresh_stop || 5;
        this.max_stop = opts.max_stop || 500;

        this.logger = logger;
        this.alpha = opts.alpha || 0.00000000000001;
        this.sigma = opts.sigma || 1.0;
    }

    start() {
      setTimeout(this.update.bind(this), this.minInterval);
    }

    // called from the application when the layout changes
    // todo: define a layout?
    onUpdateLayout(layout) {
      this.layout = layout;
      this.layout_changed = true;
      if (window.gsyslogger &&
          window.session_config && window.session_config.logTrace)
        window.gsyslogger.addSessionEvent("layout", {data: layout, time: Date.now()});
    }

    onUpdateState(state) {
      this.app_state = state;
      if (window.gsyslogger &&
          window.session_config && window.session_config.logTrace)
        window.gsyslogger.addSessionEvent("state", {data: state, time: Date.now()});
    }

    update(): void {
        let trace = this.logger.getTrace();
        if (trace) {
          this.updateState(trace);
          this.emit("onupdate");
        }
        setTimeout(this.update.bind(this), this.minInterval);
    }

    get_point_model() : PointModel {
      let last_point = this.logger.last_point;

      let linger = this.logger.get_stopDelta();

      let alpha = this.alpha;
      if (linger < this.thresh_stop) {
        alpha = 1.0;
      } else {
        alpha = Math.max( 1 - (linger - this.thresh_stop) / (this.max_stop-this.thresh_stop), alpha);
      } 
      
      return { a: alpha, X:  last_point[0], Y: last_point[1] };
    }

    updateState(trace) {
      this.state = this.predict(trace, this.timeRange);
    }

    // @trace list of [x, y, t, action] tuples.
    //        t might not be normalized to start at 0!
    //        action is "m", "d", or "u"
    // @ deltaTimes list of time steps predicted in the future
    // @return a Distribution object whose predictions are arrays of
    //
    //            [x position, y position, action]
    //
    //         where action is "m", "d", or "u"
    //
    predict(trace, deltaTimes: [number]): {[time: number]: Distribution} {
        // hack for convergence
        let mydists: { [time: number]: Distribution } = {};
        if (trace.length <= 0) {
            if (trace.length === 0) return mydists;
        } else {

            // R to add random noise
            // to the known position of the mouse.  The higher the
            // values, the more noise
            const decay = 0.003;
            const R = Matrix.Diagonal([0.1, 0.1, 0.1, 0.1, 0, 0]);

            // initial state (location and velocity, acceleration)
            let x = $M([
                [trace[0][0]],
                [trace[0][1]],
                [0],
                [0],
                [0],
                [0]
            ]);

            // external motion
            let u = $M([
                [0],
                [0],
                [0],
                [0],
                [0],
                [0]
            ]);

            // initial uncertainty
            let P = Matrix.Random(6, 6);


            // measurement function (4D -> 2D)
            // This one has to be this way to make things run
            let H = $M([
                [1, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
                [0, 0, 1, 0, 0, 0],
                [0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 1, 0],
                [0, 0, 0, 0, 0, 1],
            ]);

            // identity matrix
            const I = Matrix.I(6);

            let Q = $M(
                [
                    [0.1, 0, 0, 0, 0, 0],
                    [0, 0.1, 0, 0, 0, 0],
                    [0, 0, 0.1, 0, 0, 0],
                    [0, 0, 0, 0.1, 0, 0],
                    [0, 0, 0, 0, 0.1, 0],
                    [0, 0, 0, 0, 0, 0.1]
                ]);
            let timeElapse: number[] = [];
            for (let i = 0; i < trace.length - 1; i++) {
                timeElapse.push(trace[i + 1][2] - trace[i][2]);
            }
            
            for (var i = 2; i < trace.length; i++) {
                let dt = timeElapse[i - 1];
                // Derive the next state
                const dt2 = Math.pow(dt, 2);
                const F = $M([
                    [1, 0, dt, 0, dt2, 0],
                    [0, 1, 0, dt, 0, dt2],
                    [0, 0, 1, 0, dt, 0],
                    [0, 0, 0, 1, 0, dt],
                    [0, 0, 0, 0, 1, 0],
                    [0, 0, 0, 0, 0, 1]
                ]);

                // decay confidence
                // to account for change in velocity
                P = P.map(function (x) {
                    return x * (1 + decay * dt);
                });

                // Fake uncertaintity in our measurements
                let xMeasure = trace[i][0];
                let yMeasure = trace[i][1];
                let vxMeasure = (trace[i][0] - trace[i - 1][0]) / dt;
                let vyMeasure = (trace[i][1] - trace[i - 1][1]) / dt;
                let vxpMeasure = (trace[i - 1][0] - trace[i - 2][0]) / timeElapse[i - 2];
                let vypMeasure = (trace[i - 1][1] - trace[i - 2][1]) / timeElapse[i - 2];
                let axMeasure = (vxMeasure - vxpMeasure) * 2 / (dt + timeElapse[i - 2]);
                let ayMeasure = (vyMeasure - vypMeasure) * 2 / (dt + timeElapse[i - 2]);


                // prediction
                x = F.x(x).add(u);
                P = F.x(P).x(F.transpose()).add(Q);

                // measurement update
                const Z = $M([[xMeasure, yMeasure, vxMeasure, vyMeasure, axMeasure, ayMeasure]]);
                const y = Z.transpose().subtract(H.x(x));
                const S = H.x(P).x(H.transpose()).add(R);

                const K = P.x(H.transpose()).x(S.inverse());
                x = x.add(K.x(y));
                P = I.subtract(K.x(H)).x(P);

            }

           let time_offset = 0;
          // if (window.session_config && window.session_config.latency)
          //  time_offset = window.session_config.latency;
            
            for (let i = 0; i < deltaTimes.length; i++) {
                // Derive the next state
                const delta = deltaTimes[i] + time_offset;
                let F_time = $M([
                    [1, 0, delta * 0.6, 0, 0, 0],
                    [0, 1, 0, delta * 0.6, 0, 0],
                    [0, 0, 1, 0, delta, 0],
                    [0, 0, 0, 1, 0, delta],
                    [0, 0, 0, 0, 1, 0],
                    [0, 0, 0, 0, 0, 1]
                ]);

                // decay confidence
                // to account for change in velocity
                let P_time = P.map(function (x) {
                    return x * (1 + decay * deltaTimes[i]);
                });

                // prediction
                let x_time = F_time.x(x).add(u);
                P_time = F_time.x(P_time).x(F_time.transpose()).add(Q);

                let mouseX = x_time.e(1, 1);
                let mouseY = x_time.e(2, 1);

                let vx = (P_time.e(1, 1) < 1) ? 1 : P_time.e(1, 1).toFixed(3) * this.sigma ;
                let vy = (P_time.e(2, 2) < 1) ? 1 : P_time.e(2, 2).toFixed(3) * this.sigma;
                let distributionX = gaussian(mouseX, vx);
                let distributionY = gaussian(mouseY, vy);
                let gdist = new GuassianDistribution(mouseToKey, distributionX, distributionY);
                mydists[delta] = gdist;
            }
        }

        return mydists;
    }

    serialize(): Prediction | null {
        let dist;
      
        if (this._model === DistModel.Gaussian) {
            dist = {};
            // todo: make interfaces that makes it better to manage
            // prediction resutls and encode them
            for (let [time, dist] of Object.entries(this.state)) {
                let state = dist.toWire();
                if (state === false)  continue;
                dist[time] = state;
            }

            // and option to send model or explicit probs
        } else if (this._model === DistModel.Dictionary){

        } else if (this._model === DistModel.LinearGP) {
            dist = {};
            let gaussian = {};
            // todo: make interfaces that makes it better to manage
            // prediction resutls and encode them
            for (let [time, d] of Object.entries(this.state)) {
                let state = d.toWire();
                if (state === false)  continue;
                gaussian[time] = state;
            }

            dist["g"] = gaussian;
            dist["p"] = this.get_point_model();
        }

        let data = {}
        if (this.layout_changed) {
          data["layout"] = this.layout;
          this.layout_changed = false;
        }

        data["dist"] = dist;

        if (this.app_state) {
          data["state"] = this.app_state;
        }

        /*
        if (this._data_type == "JSON") {
            data = JSON.stringify(data)
        }
        // TODO: bytes array
        else if (this._data_type == "BYTES") {
        }*/

        return {model: this._model, data: data};

    }

    getTopK(k: number, layouts: Layout) : [] {
      let gdist = this.state[this.timeRange[0]];

      if (!gdist)
        return [];
      let probs : {[key: string]: number} = {};

      for (let q in layouts) {
        let bound = layouts[q];
        let xpw = bound.x + bound.w;
        let xmw = bound.x;
        let yph = bound.y + bound.h;
        let ymh = bound.y;
        let area: number = gdist.getArea([
                                [xpw, yph],
                                [xmw, yph],
                                [xpw, ymh],
                                [xmw, ymh]]);
        probs[q] = area;
      }

      let topk = _.rest(_.sortBy(Object.keys(probs), function(k) { return probs[k]; }), -k);

      return topk;
    }
}
