export class Markov {
    private _nactions: number;
    private _tmatrix: number[][];
    private _counts: number[][];
    private _margins: number[];

    constructor(nactions: number, tmatrix_0: number[][], counts: number[][], margins: number[]) {
        // can use nactions to generalize to variable size action space
        // default is 5 for now
        this._nactions = nactions;
        this._tmatrix = tmatrix_0;
        this._counts = counts;
        this._margins = margins;
    }

    /**
     * update the left stochastic matrix (columns sum to 1) of transition probabilities based on counts
     * @param action 
     * @param prevaction 
     */
    updatestate(action: number, prevaction: number) {
        this._counts[prevaction][action]++;
        this._margins[action]++;
        for (let i=0; i<this._nactions; i++) {
            for (let j=0; j<this._nactions; j++) {
                this._tmatrix[i][j] = this._counts[i][j] / this._margins[j];
            }
        }
    }

    getdistribution(): number[][] {
        return this._tmatrix;
    }
}
