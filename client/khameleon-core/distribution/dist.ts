// Models a distribution  at a single instant in time.
// The code doesn't support predicting into the future yet.
//
// A Distribution implements
//
//  set(object, prob) --> set the probability of object
//  get(object)       --> return some probabiity value
//  toWire()          --> JSON object to send to the server
//  format: {"time1":[[{query1}, prob1], [{query2}, prob2], ...], ...}
//
//
// subclass DistributionBase for specific types of distributions
// The reason for subclasses is that we may want more efficient representations of  to predict mouse
// positions in a discretized fashion, rather than on a pixel by pixel basis.
// If this is the case, then there may be more efficient representations.

export interface Distribution {
  // get the probability of some object, or 0 if not found
  get(o: any) : number;
  set(q: any, p: number);
  // to a JSON-able representation that we can pass to jquery
  // aka a dictionary
  toWire(): any;
  getArea(qs): number;
}

// todo: enforce a query type
export function qToKey(q) {
      return JSON.stringify(q);
}

