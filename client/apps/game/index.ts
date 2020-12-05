import { App, Engine, Data  } from "../../khameleon-core";
import * as d3 from "d3";

interface RenderData {
  img_dir: any;
};

export class Game implements App {
 private engine: Engine;
 public appName: string = "Game";


 constructor(private sysconfig) {
  console.log("construct Game");
 }

 bindEngine(engine: Engine) {
  this.engine = engine;
 }

 getState() {
  let appstate = {}
  let state = {"appname": this.appName, // used to communicate to the server which app to load
               "cachesize": this.sysconfig.cachesize,
               "state": appstate, // if any specific app data need to be passed to the backend
              };

  return state;
 }

 onopen(_data: string) {
  // optional setup code to initial webpage layout
  // this example load a single image from static folder
  this.setup();

  // this start the predictor module
  this.engine.predictor.start();
 }

 setup() {
  let img = d3.select("body").append("div")
              .attr("id", "large_view")
              .append("svg")
              .attr("width", 800)
              .attr("height", 800);
  img.append("image")
     .attr("id", "large")
     .attr("href", (_) => {
      return "static/data/image_holder.jpg";
     });

  let that = this;
  let el = document.getElementById("R1");
  if (el)
   el.onclick = function() { console.log("register query R1"); that.sendQuery("R1"); };
 }

 decode_key(key: string) : string {
  return key;
 }

 // register query with the engine
 sendQuery(data) {
  this.engine.registerQuery(data, this.render.bind(this));
 }

 // render decoded blocks recieved from server
 render(data: RenderData) {
  console.log("render data");
   let dim = 800;

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

 // decode binary data recieved from the server
 decodeBlock(block: any) {
    let offset = 0;
    let block_id = new Uint32Array(block, 0, 1)[0]; offset += 4;  // u32
    let content_len = new Uint32Array(block, offset, 1)[0]; offset += 8; // u64
    let content = new Uint8Array(block, offset, content_len);

    //console.log("storeData: ", key, block_id, nblocks);
    let decodedblock = {"block_id": block_id, "content": content };
    return decodedblock;
  }


 // reconstruct set of blocks in the cache and return
 // data for rendering
 construct(req, blocks, nblocks: number) : Data {
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
