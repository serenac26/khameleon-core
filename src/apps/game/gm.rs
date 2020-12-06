extern crate image;
use sled::{Db};
extern crate base64;

use super::spingame::{SpinningSquare};

#[derive(Clone)]
pub struct GameManager {
    gamename: String,
    gameinstance: SpinningSquare,
}

impl GameManager {
    pub fn new(gamename: String) -> Self {
        // initialize backend server
        let gi = SpinningSquare::new();

        GameManager{gamename: gamename, gameinstance: gi}
    }

    pub fn set(&mut self, action: usize) {
        self.gameinstance.update(action as u32);
        self.gameinstance.commit();
    }

    // get values stored at key @key
    // if it doesnt exist return None+ warning?
    pub fn get(&mut self, actions:Vec<usize>) {
        for action in actions.iter() {
            self.gameinstance.update(*action as u32);
        }
        self.gameinstance.render();
        self.gameinstance.revert();

        // TODO(Alex): Avoid write to intermediate file
    }

}
