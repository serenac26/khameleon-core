import { EventEmitter } from "events";
import { Layout } from "../apps";

export enum DistModel {
  Gaussian = "GM", // gaussian model
  Dictionary = "DM", // dictionary model
  // mix of gaussian and point dist
  LinearGP = "LGP", // linear gaussian point
}

export interface Prediction {
    model: string;
    data: any;
}

export interface Predictor extends EventEmitter {
    _model: string;
    _data_type: string;

    // start the prediction process

    start();
    // predictor has to be able to give me
    // list of prediction to stream 
    serialize(): Prediction | null;

    // update predictor state -> eg. using data run prediction function
    updateState(data);
    
    // @k  the maximum number of objects to return
    // @return the top k objects by probability
    getTopK(k: number, layouts: Layout);
}
