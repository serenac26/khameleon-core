// use crate::ds;

extern crate ndarray;
use ndarray::{Array1};

#[derive(Clone)]
pub struct TopKScheduler {
    // number of queries to schedule
    pub k: usize,
}

pub fn new(k: usize) -> TopKScheduler {
    TopKScheduler {k}
}

impl super::SchedulerTrait for TopKScheduler {
    fn run_scheduler(&mut self, probs: super::Prob, state: Array1<usize>,
                     start_idx: usize) -> Vec<usize> {
        let mut plan: Vec<usize> = Vec::new();
        let mut qids = probs.get_k();
        qids.remove(&0);
        for qid in qids {
            plan.push(qid);
            // debug!("qid: {} with probability {}", qid, probs.get(qid, 0));
        }
        plan.sort_by(|a, b| probs.get(*b, 0).partial_cmp(&probs.get(*a, 0)).unwrap_or(core::cmp::Ordering::Equal));
        plan[0..self.k].to_vec()
    }
}
