# UX59 — terrain order

HUD: `build cd91b62+ux59`. Preview branch only. No formal deploy.

The world stays a designed scene. Grass, dirt, sand, stone, and water cannot be dug out or filled over. A hit still plays the swing feedback, sound, particles, and word card, and the cell does not become a pit. Digging water no longer leaves a hole or turns the sand under it into dirt.

Knocking a tree, rock, sand, or grass gives one material and leaves the block where it is. Grass gives dirt plus one seed, the same rate as before. The same cell waits 3 seconds before it pays again; a hit during that wait is only a small puff. Stone knocks still set `progress.mined.stone`, so Mine stone! completes. Flowers can still be picked. Wheat, wool, fishing, and pets are unchanged.

Real digging happens only on 3–5 glowing dirt mounds placed at world start beside the home pad, on the beach, and at the pond edge. A dig pays one weighted result from the existing gift table and discovery pool: a ★ discovery, one material (`wood` / `stone` / `planks` / `wool` / `seed`), or a small bundle of 1–3 of those. The mound then hides for 10 minutes and comes back. Knocking ordinary ground does not add a ★. Walking into a trail gift still does.

Dirt, stone, sand, wood, grass, leaves, and water stay in the pack for crafting and cannot be placed from the hotbar or Build. Build still offers whole kits, planks, fence, door, roof, window, and Remove. Older saves load as they are, holes and buildings included. The deep-pit warning and rescue rope are still in the code. Parent one-tap flatten is not in this round.
