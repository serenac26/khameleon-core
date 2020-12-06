extern crate image;
use sled::{Db};
extern crate base64;

#[derive(Clone)]
pub struct GameManager {
    gamename: String,
}

impl GameManager {
    pub fn new(dbname: String) -> Self {
        // initialize backend server
        GameManager{gamename: dbname}
    }

    // get values stored at key @key
    // if it doesnt exist return None+ warning?
    pub fn get(&self, key:usize) -> Option<Vec<u8>> {
        None
    }
}
