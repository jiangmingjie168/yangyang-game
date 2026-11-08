# UX60 — chop a tree, curved shores, passage

HUD: `build cd91b62+ux60`. Preview branch only. No formal deploy.

## Trees

A natural tree falls on the 5th swing while the child is full or peckish. Each swing waits about half a second; a tap during that wait only makes a small puff. The first four swings shake the tree and play the chop sound, and they do not give wood. The first of those still completes Find a tree! The fifth swing gives 1 or 2 wood, records wood, and leaves a short stump. Knocking the stump gives nothing. The stump grows back after 75 seconds.

Hungry chopping uses the same swing, but it takes 7 hits. That count lives in `TREE_HITS` (`full: 5`, `hungry: 7`) behind `treeHitsNeeded()`. Eating and the meal animation are left for UX61.

Flowers, wheat, and the locked ground, stone, and sand are unchanged. Dig mounds are unchanged.

## Curved ground and pond

Blocks stay square pixels. The skyline of a 1–3 block step is filled with a smooth bank so the ramp is a curve instead of stairs. Each pond is redrawn as one bowl: the rectangular water-and-sand box is covered, and the shore plus the bed follow a single curve. Beach and grass meet that curve with a soft lip. Collision cells are the same, so dig spots, the house pad, and the beach stay where they are.

## Who can pass

- The child walks through trees. Fences, stone, and buildings still stop them. They can step into the pond and swim in the shallow water, and they do not fall through the bed. Walking does not carry them off a drop deeper than one block.
- Animals walk through trees. The duck can swim in the pond. Pig, rabbit, dog, cow, and the other land animals stop on the bank, including a tamed pet.
- The car drives through trees and still stops at water, a fence, a door, or a cliff.
