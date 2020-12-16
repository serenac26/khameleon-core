import { App, Engine, Data, post_stringify, SystemLogger, DistModel  } from "../../khameleon-core";
import { Markov } from "../../khameleon-core/predictor/markov";
import * as d3 from "d3";
import * as _ from 'underscore';
interface RenderData {
  img_dir: any;
};


export class Game implements App {
  private engine: Engine;
  private image_holder_dimension: number;
  private tile_dimension: number;
  private path: string;
  private prevData: string | undefined = undefined;
  public appName: string = "Game";
  private future: number;
  private nactions: number;
  private time: number;
  private lastMoves: Array<number>;
  private predictor: Markov;
  private moved: boolean;

  constructor(private sysconfig) {
    console.log("construct Game")
    this.image_holder_dimension = (sysconfig && sysconfig.image_holder_dimension) ? sysconfig.image_holder_dimension : 800;
    this.tile_dimension = (sysconfig && sysconfig.tile_dimension) ? sysconfig.tile_dimension : 600;
    this.path = (sysconfig && sysconfig.path) ? sysconfig.path : "static/data/";
    this.future = 3;
    this.nactions = 5;
    this.time = 0;
    this.lastMoves = new Array<number>(0);
    this.moved = false;
    var tmatrix_0 = [
      [0.6, 0.1, 0.1, 0.1, 0.1],
      [0.1, 0.6, 0.1, 0.1, 0.1],
      [0.1, 0.1, 0.6, 0.1, 0.1],
      [0.1, 0.1, 0.1, 0.6, 0.1],
      [0.1, 0.1, 0.1, 0.1, 0.6]
    ];
    var counts_0 = [
      [6, 1, 1, 1, 1],
      [1, 6, 1, 1, 1],
      [1, 1, 6, 1, 1],
      [1, 1, 1, 6, 1],
      [1, 1, 1, 1, 6]
    ];
    var margins_0 = [10, 10, 10, 10, 10];
    this.predictor = new Markov(this.nactions, tmatrix_0, counts_0, margins_0);
  }

    bindEngine(engine: Engine) {
      this.engine = engine;
    }

    getState() {
     let appstate =  { "future": this.future,
                       "nactions": this.nactions
     };

      let state=  { "appname": this.appName,
                   "cachesize": this.sysconfig.cachesize,
                   "state": appstate
      };

      return state;
    }

    tick() {
      console.log("start tick")
      console.log(this.time)
      console.log(this.lastMoves)
      console.log(this.moved)
      if (this.lastMoves.length < this.future) {
        this.time = this.time + 1;
        return;
      }
      if (!this.moved) {
        this.lastMoves.push(4);
      }
      else {
        this.moved = false;
      }
      var tempMoves = this.lastMoves.slice(-this.future);
      tempMoves.sort();
      var action = this.lastMoves[this.lastMoves.length - 1];
      var prevaction = this.lastMoves[this.lastMoves.length - 2];
      this.predictor.updatestate(action, prevaction);
      var num = 0;
      for (let i=0; i<this.future; i++) {
        num += Math.pow(this.nactions, this.future - 1 - i) * tempMoves[i];
      }
      console.log("NUM IS " + num);
      var qid = (this.time * Math.pow(10, this.future) + num).toString();
      // FOR TESTING ONLY
      // @Harrison vary the accuracy across .2, .4, .6, .8, 1.0
      var accuracy = 0.2;
      var rand = Math.random();
      if (rand < accuracy) {
        // no action frame, always returned
        // ensure cache hit
        qid = (this.time * Math.pow(10, this.future) + Math.pow(this.nactions, this.future) - 1).toString();
      } else {
        // force cache miss
        qid = "";
      }
      // END TESTING BLOCK
      this.sendQuery(qid); //query cache
      var serverQuery = {
        "tick": this.time,
        "action": action,
        "dist": this.predictor.getdistribution(),
      }
      var dists = { model: DistModel.Markov, data: serverQuery };
      console.log("send dist", dists)
      post_stringify("/post_dist", dists);
      this.time = this.time + 1;
    }

    decode_key(key: string) : string {
      return key;
    }

    onopen(data: string) {
      console.log("Game data received", data);
      this.setup();
      console.log("start logger && predictor");
      this.engine.predictor.start();
      window.gsyslogger = new SystemLogger();
    }

    sendQuery(data: string) {
        console.log("send query", data)
        // wonder if we need this or we always sendquery
        if (this.prevData && this.prevData === data) {
            return;
        }
        this.prevData = data;
        this.engine.registerQuery(data, this.render.bind(this));
    }

    setup() {
        let dim = this.image_holder_dimension;
        let tile_dim = this.tile_dimension;
        let offset = 50;
        let large_view_svg = d3.select("body").append("div")
            .style("left", tile_dim + offset + "px")
            .style("top", "0px")
            .style("position", "absolute")
            .append("svg");

        /* Main View */
        large_view_svg
            .attr("id", "large_view")
            .style("border", "2px solid black")
            .attr("width", dim)
            .attr("height", dim);

        large_view_svg.append("image")
            .attr("href", (_) => {
                return this.path + "/image_holder.jpg";
            })
            .attr("id", "large")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", dim)
            .attr("height", dim)
            .attr("preserveAspectRatio", "xMidYMin slice");

        setInterval(this.tick.bind(this), 100);

        let that = this;

        d3.select("body")
            .on("keypress", function() {
              var key = 4;
              that.moved = true;
              console.log(d3.event.keyCode)
              switch (d3.event.keyCode) {
                case 119:
                  key = 0; //w
                  break;
                case 97: //a
                  key = 1;
                  break;
                case 115: //s
                  key = 2;
                  break;
                case 100: //d
                  key = 3;
                  break;
              }
              that.lastMoves.push(key);
              //let query = (key);
              //if (query) {
                //that.sendQuery(query);
              //}
            })
    }


  render(data: RenderData) {
      let dim = this.image_holder_dimension;

      d3.select("#large_view")
          .attr("width", dim)
          .attr("height",  dim)
          .select("image")
          .attr("width", dim)
          .attr("height", dim)
          .attr("href", function (_) {
              return data.img_dir;
          })
          .on("load", function() {
            URL.revokeObjectURL(data.img_dir);
          });
  }

  decodeBlock(block: any) {
    let offset = 0;
    let block_id = new Uint32Array(block, 0, 1)[0]; offset += 4;  // u32
    let content_len = new Uint32Array(block, offset, 1)[0]; offset += 8; // u64
    let content = new Uint8Array(block, offset, content_len);

    //console.log("storeData: ", key, block_id, nblocks);
    let decodedblock = {"block_id": block_id, "content": content };
    return decodedblock;
  }

  construct(req, blocks, nblocks) : Data {
    let image_data: any[] = [];
    for (var i = 0; i < blocks.size; i++) {
      if ( blocks.has(i) ) {
        let {data} = blocks.get(i);
        let block = this.decodeBlock(data);
        if (block == undefined) break;
        image_data.push( new Uint8Array( block.content ) );
      } else {
        break;
      }
    }

    let img_dir  = URL.createObjectURL(new Blob( image_data ));

    d3.select("#utility")
      .text(req+" has "+image_data.length + " blocks out of "+nblocks);

    return  { render_data: {img_dir: img_dir}, inblocks: image_data.length };
  }
}
