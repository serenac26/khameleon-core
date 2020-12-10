import { App, Engine, Data, post_stringify, SystemLogger  } from "../../khameleon-core";
import * as d3 from "d3";
import * as _ from 'underscore';
interface RenderData {
  img_dir: any;
};


export class Game implements App {
  private engine: Engine;
  private factor: number;
  private image_holder_dimension: number;
  private tile_dimension: number;
  private path: string;
  private prevData: string | undefined = undefined;
  public appName: string = "Game";
  private dbname: string;
  private time: number;
  private lastMoves: Array<number>;
  private moved: boolean;

  constructor(private sysconfig) {
    console.log("construct Game")
    this.factor = (sysconfig && sysconfig.factor) ? sysconfig.factor : 10;
    this.image_holder_dimension = (sysconfig && sysconfig.image_holder_dimension) ? sysconfig.image_holder_dimension : 800;
    this.tile_dimension = (sysconfig && sysconfig.tile_dimension) ? sysconfig.tile_dimension : 600;
    this.path = (sysconfig && sysconfig.path) ? sysconfig.path : "static/data/";
    this.time = 0;
    this.lastMoves = new Array<number>(0);
    this.moved = false;

    this.dbname = (sysconfig && sysconfig.dbname) ? sysconfig.dbname : "game_data";
  }

    bindEngine(engine: Engine) {
      this.engine = engine;
    }

    getState() {
     let appstate =  { "dbname": this.dbname,
                       "factor": this.factor,
                       "dimension": this.tile_dimension
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
      if (this.lastMoves.length < 3) {
        this.time = this.time + 1;
        return;
      }
      if (!this.moved) {
        this.lastMoves.push(4);
      }
      else {
        this.moved = false;
      }
      var prob = [
        [1, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 1]
      ];
      var num = this.lastMoves[this.lastMoves.length - 1] + 5*this.lastMoves[this.lastMoves.length - 2] + 25 * this.lastMoves[this.lastMoves.length - 3];
      var qid = (this.time * 1000 + num).toString();
      this.sendQuery(qid); //query cache
      var serverQuery = {
        "tick": this.time,
        "action": this.lastMoves[this.lastMoves.length - 1],
        "dist": prob,
      }
      var dists = { model: "Markov", data: serverQuery };
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

        d3.select("body").append("div")
            .style("left", 0)
            .style("top", tile_dim+10+"px")
            .style("position", "absolute")
            .attr("id", "utility")
            .style("width", tile_dim+"px")
            .style("height", "100px")
            .text("Utility X");

        const small_view_svg = d3.select("body").append("div")
            .style("left", "0px")
            .style("top", "0px")
            .style("width", tile_dim + "px")
            .style("height", tile_dim + "px")
            .style("border", "2px solid black")
            .style("position", "absolute")
            .append("svg");

        /* Main View */
        small_view_svg
            .attr("id", "nav_map")
            .attr("width", tile_dim)
            .attr("height", tile_dim);

        setInterval(this.tick.bind(this), 100);

        let that = this;
        small_view_svg.append("image")
            .attr("href", (_) => {
                return this.path + "tile.jpg";
            })
            .attr("id", "small")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", tile_dim)
            .attr("height", tile_dim)
            .attr("preserveAspectRatio", "xMidYMin slice")
            /* Draggable viewport */

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
