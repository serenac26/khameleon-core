import * as _ from 'underscore';
import { Distribution, qToKey} from "./dist"

export class GuassianDistribution implements Distribution {
    private keyFunc;
    private dist: {} = {};
    private gaussianX;
    private gaussianY;

    constructor(keyFunc, gaussianX?, gaussianY?) {
        this.keyFunc = keyFunc || qToKey;
        this.gaussianX = gaussianX;
        this.gaussianY = gaussianY;
    }

    from(q, keyFunc) {
        const d = new GuassianDistribution(keyFunc);
        d.set(q, 1);
        return d;
    };

    set (q, prob) {
        this.dist[this.keyFunc(q)] = [q, prob];
    };

    get (q) {
        if (q == null || q === undefined) return 0;
        const key = this.keyFunc(q);
        if (key in this.dist) return this.dist[key][1];
        return 0;
    };

   getArea (qs) {
        if (qs == null || qs === undefined) return 0;
        let topright = this.gaussianX.cdf(qs[0][0]) * this.gaussianY.cdf(qs[0][1]);
        let topleft = this.gaussianX.cdf(qs[1][0]) * this.gaussianY.cdf(qs[1][1]);
        let bottomright = this.gaussianX.cdf(qs[2][0]) * this.gaussianY.cdf(qs[2][1]);
        let bottomleft = this.gaussianX.cdf(qs[3][0]) * this.gaussianY.cdf(qs[3][1]);

        let results = _.sortBy([topright, topleft, bottomright, bottomleft], function(num) {
            return num;
        });
        return (results[3] - results[2] - results[1] + results[0]);
    };

    toWire () {
      if (!this.gaussianX.mean || !this.gaussianY.mean) {
        console.log('check: ', this.gaussianX.mean);
        return false;
      }

        return {
                xmu: this.gaussianX.mean,
                xsigma: this.gaussianX.standardDeviation,
                ymu: this.gaussianY.mean,
                ysigma: this.gaussianY.standardDeviation
            };
    };
}
