# UX54 — throttle instead of idle, spinning wheels

HUD: `build cd91b62+ux54`. Preview branch only.

- Sitting in the car is silent. `engine-idle.ogg` is not played.
- The moment the car starts moving, `engine-throttle.ogg` plays once. It is the short Freesound CC0 rev "Car Go Fast!" by Beetlemuse (678961). It does not loop.
- While the car keeps moving, `engine-drive.ogg` stays the UX53 cruise loop.
- Getting out, a panel, blocked chat, leaving the page, SFX off, or simply stopping the car halts the rev and the cruise.
- The car's existing wheel drawing rotates with distance traveled and holds still when the car is parked. The body is unchanged.
