# UX55 — double-tap the car to honk

HUD: `build cd91b62+ux55`. Preview branch only.

Getting in and getting out are unchanged. One tap on a parked car still gets in. Getting out is the Get out button, not a second tap on the car.

While the child is already in the car, two taps on the car within about half a second play `engine-horn.ogg` once. That is Freesound "Nissan Altima car horn honk (raw)" by ChrisReierson (433578), CC0. A single tap while seated does not honk and does not get out. The horn does not loop.

SFX off, a panel, blocked chat, leaving the page, or getting out stops a honk that is still playing. Driving, the throttle blip, the cruise loop, and wheel spin are unchanged.
