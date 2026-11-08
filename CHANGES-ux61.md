# UX61 — limits, hunger, birds, and animals that get unstuck

HUD: `build cd91b62+ux61`. Preview branch only. No formal deploy.

Keeps the UX60 tree, curved pond, and passage rules.

## Trees and hunger

A full or peckish child still fells a tree on the 5th swing. Swings stay about half a second apart. The first four swings only shake the tree. The last swing gives 1 or 2 wood and leaves a stump for 75 seconds.

When the child is hungry, chopping takes 7 swings and each swing waits about 0.9 seconds. Other knocks wait longer too. The line is `I'm hungry.` Hungry counts stay in `TREE_HITS`.

Eating bread is a tap in the chest. A small loaf bobs over the child's head and the mouth works for about 1.2 seconds. Only then does `Yum! Bread.` or `I'm full!` play. Nothing speaks that line unless bread was tapped.

## Three tiers

There is no separate axe or pick. Those rows are not new items. The mid-tier world drops are the existing rod, wheel, fence, door, window, and roof blocks (`house`).

- L1 (wood, stone, bread, and the other materials) stays unlimited and keeps cycling.
- L2 drops 3–5 of each kind once. Picking them up does not restock the world. Crafting more only needs the usual materials.
- L3 is car, house kit, and boat. The world starts with one of each. Inventory plus anything already placed is capped at 2. An old save that is already over the cap is left as it is and cannot craft another. Boat crafting still needs 5 planks and now also 1 wool. A car needs Find a tree! or 5 wood. A house kit needs a fence made or placed, or any placed block. A boat needs Find water! or a caught fish.

Near an L2 or L3 drop, a small label says `Left n/cap`. The craft card shows the same line. L1 items do not.

## Animals

A blocked animal tries to step past a one-block fence. Trees are still walkable, and land animals still refuse water. If the way is closed, it stops and turns instead of pushing. After about 5 seconds stuck, it stamps in place, plays that animal's existing cry, then turns again. The same animal waits at least 6 seconds before another fuss. The child's auto-walk slides back from a tall wall and then stops, instead of leaning on it.

## Sky

Four small pastel birds cross the upper sky slowly and wrap around. They are not click targets and do not change play.
