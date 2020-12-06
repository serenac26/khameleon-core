use graphics::*;
use graphics_buffer::*;

#[derive(Clone)]
pub struct SpinningSquare {
    rotation: f64,  // Rotation for the square.
    x: f64,
    y: f64,
    last_x: f64, last_y: f64, last_rot: f64,
}

// MODIFIED GAME ENGINE
impl SpinningSquare {
    pub fn new() -> Self {
        // initialize backend server
        SpinningSquare {
            rotation: 0.0,
            x: 200.0,
            y: 200.0,
            last_x: 200.0, last_y: 200.0, last_rot: 0.0,
        }
    }

    pub fn render(&mut self) {

        const BLACK: [f32; 4] = [0.0, 0.0, 0.0, 1.0];
        const RED: [f32; 4] = [1.0, 0.0, 0.0, 1.0];

        let square = rectangle::square(0.0, 0.0, 50.0);
        let rotation = self.rotation;
        let (x, y) = (self.x, self.y);

        let mut buffer = RenderBuffer::new(400, 400);
        buffer.clear(BLACK);

        let transform = IDENTITY
            .trans(x, y)
            .rot_rad(rotation)
            .trans(-25.0, -25.0);

        // Draw a box rotating around the middle of the screen.
        rectangle(RED, square, transform, &mut buffer);

        buffer.save("square.png").unwrap();
    }

    // TODO: updateN
    fn update3(&mut self, seq: u32) {
        let a1 = seq % 5;
        // println!("{}", a1);
        self.update(a1);
        let a2 = seq / 5;
        self.update(a2);
        let a3 = seq / 25;
        self.update(a3);
    }

    pub fn update(&mut self, seq: u32) {
        // Rotate 2 radians per second.
        self.rotation += 0.2;

        if seq == 0 {
            self.y += -7.0;
        }
        else if seq == 1 {
            self.y += 7.0;
        }
        else if seq == 2 {
            self.x += -7.0;
        }
        else if seq == 3 {
            self.x += 7.0;
        }
    }

    pub fn revert(&mut self) {
        self.x = self.last_x;
        self.y = self.last_y;
        self.rotation = self.last_rot;
    }

    pub fn commit(&mut self) {
        self.last_x = self.x;
        self.last_y = self.y;
        self.last_rot = self.rotation;
    }
}
