
import { Engine, KalmanFilter, ContinuesLogger } from "../khameleon-core";
import { Game } from "../apps";  // import specific app

let config = {
 cachesize: 100,
 cachetype: "ringIndex",

 // logger config
 minResolution: 2,
 duration: 3 /* minuetes */ * 60 /*sec*/ * 1000 /* => ms */,

 // kalman filter
 pred_type: "kalman",
};

let logger = new ContinuesLogger();
let predictor = new KalmanFilter(logger);

config["cacheConfig"] = {
       cache: config.cachetype,
       cacheSize: config.cachesize,
};


const app = new Game(config);
const engine = new Engine(app, predictor, config);
engine.run();
logger.start();
