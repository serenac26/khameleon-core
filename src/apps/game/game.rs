use serde_derive::{Deserialize, Serialize};
use std::io::prelude::*;
use std::mem::size_of;

use super::AppTrait;
use super::gm::{GameManager};
use crate::ds;
use crate::scheduler;
use crate::backend;

#[derive(Clone)]
pub struct Game {
    blocks_per_query: indexmap::IndexMap<String, usize>,
    utility: Vec<f32>,
    blocksize: usize,
    backend: backend::inmem::InMemBackend,
    game_manager: GameManager,
    future: u32,
    num_actions: usize
}

/// appstate: specific data passed at initialization state from the client
/// config: configuration data passed from the server
pub fn new(_appstate: &ds::AppState, _config: serde_json::Value) -> Game {
    info!("1) load K/V store");
    let db_path = "data/game_data".to_string();
    let backend: backend::inmem::InMemBackend;
    if std::path::Path::new(&db_path).exists() == true {
       backend = backend::inmem::InMemBackend::new(db_path);
    } else {
        panic!("backend is not initialized {:?}", db_path);
    }

    info!("2) create an index of how many blocks/query");
    let blocks_per_query = backend.collect_blocks_per_query(Game::count_blocks);
    let blocksize = match backend.get_iter().next() {
        Some(Ok((_k, v))) => {
            let value: Vec<FrameBlock> = bincode::deserialize(&v).unwrap();
            let size = match value.iter().next() {
                Some(v) => v.size(),
                None => 0
            };

            size

        }, _ => 0,
    };

    let max_blocks_count: usize = blocks_per_query.iter().map(|(_, v)| *v).max().unwrap_or_else(|| 0 );
    let utility: Vec<f32> = (0..max_blocks_count).enumerate().map(|(i, _)| (1.0 / max_blocks_count as f32)*(i as f32+1.0) ).collect();
    let (future, num_actions): (u32, usize) = match _appstate.state.as_object() {
        Some(obj) => (obj["future"].clone().as_u64().unwrap() as u32, obj["nactions"].clone().as_u64().unwrap() as usize),
        _ => (3, 5)
    };
    let game_manager = GameManager::new("spingame".to_owned());

    Game{blocks_per_query, utility, blocksize, backend, game_manager, future, num_actions}
}

// app specific
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct FrameBlock {
    block_id: u32,
    // TODO: possibly use to encode tick # in frame block
    // tick: u64,
    content: Vec<u8>,
}

impl FrameBlock {
    fn serialize(&self) -> Vec<u8> {
        bincode::serialize(self).unwrap()
    }

    fn size(&self) -> usize {
        self.content.len()
    }
}


impl Game {
    fn count_blocks(v: &Vec<u8>) -> usize {
        let value: Vec<FrameBlock> = bincode::deserialize(&v).unwrap();
        let blocks_count = value.len();

        blocks_count
    }

    fn create_blocks(fname: String, blocksize: usize) -> Vec<FrameBlock> {
        let mut file = std::fs::File::open(&fname).unwrap();
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).unwrap();
        let img = buffer;

        let mut blocks = Vec::new();
        let mut start = 0;

        let blocksize = if blocksize > img.len() { img.len() } else { blocksize };
        let mut end = blocksize;

        debug!("blocksize: {:?} end: {:?}", blocksize, end);
        let mut bid = 0;

        while end <= img.len() {
            if end > img.len() {
                end = img.len();
            }

            blocks.push( FrameBlock{block_id: bid, content: img[start..end].to_vec()} );
            bid += 1;
            start = end;
            end += blocksize;
        }

        blocks
    }

    // TODO: rewrite to take in sequence of actions and tick # as input
    // TODO: simulate actions on game instances and encode qid and tick into FrameBlock
    fn get_nblocks_bytes(&self, key: &str, count: usize, incache: usize) -> Option::<Vec<ds::StreamBlock>> {
        // TODO: remove this
        if let Some(blocks_bytes) = self.backend.get(key.as_bytes().to_vec()) {
            let mut sblocks: Vec<ds::StreamBlock> = Vec::new();
            let blocks: Vec<FrameBlock> = bincode::deserialize(&blocks_bytes).unwrap();
            let nblocks: u32 = blocks.len() as u32;

            let end = if incache + count > blocks.len() { blocks.len() } else { incache + count };
            for i in incache..end {
                let block = &blocks[i];
                let mut bytebuffer: Vec<u8> = Vec::new();
                let mut block_byte = block.serialize();
                let mut block_id = bincode::serialize(&block.block_id).unwrap();
                let mut nblock = bincode::serialize(&nblocks).unwrap();
                let mut key_byte = bincode::serialize(&key).unwrap();

                bytebuffer.append( &mut block_id );
                bytebuffer.append( &mut nblock );
                bytebuffer.append( &mut key_byte );
                bytebuffer.append( &mut block_byte );

                sblocks.push(ds::StreamBlock::Binary(bytebuffer));
            }

            Some(sblocks)
        } else {
            None
        }
    }
}

impl AppTrait for Game {
    fn get_scheduler_config(&self) -> (indexmap::IndexMap<String, usize>, Vec<f32>) {
        (self.blocks_per_query.clone(), self.utility.clone())
    }

    fn get_nblocks_byindex(&mut self, index: usize, count: usize,
                           incache: usize) -> Option::<Vec<ds::StreamBlock>> {
        debug!("get_nblocks_byindex");
        // parse tick # and action sequence
        let index_str = index.to_string();
        debug!("index_str: {}", index_str);
        let d = 10usize.pow(self.future);
        let tick = index / d;
        let mut qid = index % d;
        let mut actions: Vec<usize> = Vec::new();
        for d in (0..self.future).rev() {
            actions.push(qid / self.num_actions.pow(d));
            qid = qid % self.num_actions.pow(d);
        }
        // TODO: simulate actions on parallel game instances and return frame as vec of blocks with index (tick|qid) encoded in each block
        debug!("THE ACTIONS ARE: {:?}", actions);
        self.game_manager.get(actions);
        // TODO: remove this after finishing game manager get() or else the temp file accessed below won't exist
        // return None;

        let mut file = std::fs::File::open("/tmp/square.png").unwrap();
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).unwrap();
        let img = buffer;

        let mut blocks = Vec::new();
        let mut start = 0;

        let blocksize = if self.blocksize > img.len() { img.len() } else { self.blocksize };
        let mut end = blocksize;

        debug!("blocksize: {:?} end: {:?}", blocksize, end);
        let mut bid = 0;

        while end <= img.len() {
            if end > img.len() {
                end = img.len();
            }

            blocks.push( FrameBlock{block_id: bid, content: img[start..end].to_vec()} );
            bid += 1;
            start = end;
            end += blocksize;
        }

        let mut sblocks: Vec<ds::StreamBlock> = Vec::new();
        // let blocks: Vec<FrameBlock> = bincode::deserialize(&blocks_bytes).unwrap();
        let nblocks: u32 = blocks.len() as u32;

        let end = if incache + count > blocks.len() { blocks.len() } else { incache + count };
        for i in incache..end {
            let block = &blocks[i];
            let mut bytebuffer: Vec<u8> = Vec::new();
            // start ring cache that checks if the client cache has already got rid of this
            // block, should we send this block or a new one?
            // for key and count and decision, construct the message to stream to the client

            let mut block_byte = block.serialize();
            let size: u32 = block_byte.len() as u32;
            let mut block_id = bincode::serialize(&block.block_id).unwrap();
            let mut nblock = bincode::serialize(&nblocks).unwrap();
            let mut key_len = bincode::serialize(&(index_str.len() as u64)).unwrap();
            let mut key_byte = index_str.clone().into_bytes();

            bytebuffer.append( &mut block_id );
            bytebuffer.append( &mut nblock );
            bytebuffer.append( &mut key_len );
            bytebuffer.append( &mut key_byte );
            bytebuffer.append( &mut block_byte );
            info!("FrameBlock i {} {}, incache: {} nblocks: {:?} block#: {:?} size: {:?}, blocksize: {:?}",  i, index, incache,nblocks, block.block_id, bytebuffer.len(), size);

            sblocks.push(ds::StreamBlock::Binary(bytebuffer));
        }

        Some(sblocks)
    }

    fn decode_dist(&mut self, userstate: ds::PredictorState) -> scheduler::Prob {
        debug!("decode_dist: {:?}", userstate);
        let total_queries = self.num_actions.pow(self.future);
        let mut prob = scheduler::Prob::new(total_queries);
        match userstate.model.trim() {
            "MM" => {
                match userstate.data.as_object() {
                    // obj is a 5x5 transition matrix
                    Some(obj) => {
                        let action_id = obj["action"].clone().as_u64().unwrap() as usize;
                        // debug!("ACTION: {}", action_id);
                        // Send action to game instances
                        self.game_manager.set(action_id);

                        let tick = obj["tick"].clone().as_u64().unwrap() + self.future as u64;
                        // debug!("TICK: {}", tick);

                        let dist = obj["dist"].clone();
                        scheduler::decode_markov(&dist, self.future, self.num_actions, total_queries, action_id, tick, &mut prob);
                    }, _ => (),
                }
            },
            _ => panic!("no match routine to decode this {}", userstate.model)
        };
        prob
    }

    fn get_block_size(&self) -> usize {
        self.blocksize
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    // create kv store with single image data (key=0) with blocks of size 20KB
    // $ cargo test test_game_prepreocess_backend -- --nocapture
    fn test_game_preprocess_backend() {
        // probably should start testing with 1 block
        // i.e. hard code to size of game frames
        let blocksize = 20*1024;
        let image_path = "data/img_5_30_11.jpg";
        let db_path = "data/game_data";
        let blocks = Game::create_blocks(image_path.to_string(), blocksize);
        // create backend key/value store
        let mut backend = backend::inmem::InMemBackend::new(db_path.to_string());
        let bytes = bincode::serialize(&blocks).unwrap();
        let query = "0";
        let key  = query.as_bytes().to_vec();
        backend.set(key, bytes.clone());
        backend.flush();
    }
}

