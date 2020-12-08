import { Header } from "../apps";

export class WS {
  private _running: boolean = false;

  
  constructor(private wsUri, private onmessage) {
    this.setup();
  }

  get running() {
    return this._running;
  }

  setup() {
    let socket = new WebSocket(this.wsUri);
    socket.binaryType = "arraybuffer";
    socket.onopen= () => {
      console.log("connected webworker websocket");
      this._running = true;
    }

    socket.onmessage = (event) => {
      // one block currently
      let { header,blockbuffer,  blockIdx } = this.decode_bytebuffer(event.data);
      if (blockIdx > 0) {
          socket.send(blockIdx+" "+Date.now());
      }
      
      this.onmessage(blockbuffer, header, blockIdx);
    }

    socket.onerror = (error) => {
      console.log("ws webworker error", error);
    };

    socket.onclose = (error) => {
      console.log('closed ws', error);
    };

    console.log("start websocket here", socket);
  }
  
  decode_bytebuffer(buffer) {
    let offset = 0;
    var blockIdx = new Uint32Array(buffer, offset, 1)[0];  offset += 4; // u32
    var blockid = new Uint32Array(buffer, offset, 1)[0];  offset += 4; // u32
    var nblocks = new Uint32Array(buffer, offset, 1)[0];  offset += 4; // u32

    // u64, assumption: key len is u32 so it doesnt overflow
    var key_len = new Uint32Array(buffer, offset, 1)[0];     offset += 8;
    console.log("blockIdx: ", blockIdx);
    console.log("blockid: ", blockid);
    console.log("nblocks: ", nblocks);    
    console.log("key_len: ", key_len);
    var keybuf = new Uint8Array(buffer, offset, key_len); offset += key_len;
    console.log("keybuf: ", keybuf);
    var enc = new TextDecoder("utf-8");
    var key = enc.decode( keybuf );
    console.log("key: ", key);
    
    // pass this to the application as a blob
    let blockbuffer = buffer.slice(offset, buffer.byteLength);

    let header: Header = {blockid: blockid, nblocks: nblocks, key: key};
    return { header, blockbuffer , blockIdx};
  }

}

