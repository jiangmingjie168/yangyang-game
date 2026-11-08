/* Terrain-order acceptance checks. Serves nothing by itself.
   PLAYWRIGHT_MODULE=/tmp/node_modules/playwright node tests/terrain-order-ux59.cjs
   BW_URL defaults to http://127.0.0.1:19279 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const URL = process.env.BW_URL || 'http://127.0.0.1:19279';
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

async function boot(browser, data) {
  const context = await browser.newContext({ viewport: { width: 1180, height: 720 } });
  await context.route('**/*', (route) => {
    const req = route.request().url();
    if (req === URL + '/' || req === URL + '/index.html') {
      return route.fulfill({
        contentType: 'text/html',
        body: html.replace(/^const BRAIN_URL = '[^']*';$/m, "const BRAIN_URL = '';")
      });
    }
    return new global.URL(req).origin === new global.URL(URL).origin ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (data) await page.addInitScript((saved) => localStorage.setItem('block-world-save-v1', JSON.stringify(saved)), data);
  await page.goto(URL + '/#seed=42');
  await page.click('#btn-start');
  if (await page.locator('#name-entry').isVisible()) await page.click('#welcome-play');
  await page.waitForTimeout(200);
  await page.evaluate(() => { if (window.BW && BW.hideCard) BW.hideCard(); });
  return { page, context, errors };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox']
  });
  const notes = [];
  try {
    const { page, context, errors } = await boot(browser);
    assert.equal(await page.locator('#build-version').innerText(), 'build cd91b62+ux59');
    const spots = await page.evaluate(() => BW.digSpots());
    assert.ok(spots.length >= 3 && spots.length <= 5, 'spot count ' + spots.length);
    assert.ok(spots.some((s) => s.zone === 'home' && s.open));
    assert.ok(spots.some((s) => s.zone === 'beach' && s.open));
    assert.ok(spots.some((s) => s.zone === 'pond' && s.open));
    notes.push('spots ' + spots.map((s) => s.zone + '@' + s.tx + ',' + s.ty).join(' '));

    const grass = await page.evaluate(() => {
      const taken = {};
      BW.digSpots().forEach((s) => { taken[s.tx] = 1; });
      let tx = 79;
      while (taken[tx]) tx++;
      BW.stand(tx);
      const before = BW.cell(tx, 16);
      let last = before;
      for (let i = 0; i < 20; i++) last = BW.tapCell(tx, 16);
      return { tx, before, last, dirt: BW.inv().dirt || 0, seed: BW.inv().seed || 0, stars: Object.keys(BW.adventure().trail.found).length };
    });
    assert.equal(grass.before, grass.last, 'grass cell changed');
    assert.equal(grass.last, 1);
    assert.equal(grass.dirt, 1);
    assert.equal(grass.seed, 1);
    assert.equal(grass.stars, 0, 'plain ground granted a discovery');
    notes.push('grass x20 stayed ' + grass.tx + ' dirt=' + grass.dirt);

    const stone = await page.evaluate(() => {
      BW.stand(83);
      const before = BW.cell(84, 15);
      BW.tapCell(84, 15);
      BW.tapCell(84, 15);
      BW.saveNow();
      const save = JSON.parse(localStorage.getItem('block-world-save-v1'));
      return { before, after: BW.cell(84, 15), n: BW.inv().stone || 0, mined: save.progress.mined.stone || 0 };
    });
    assert.equal(stone.before, 3);
    assert.equal(stone.after, 3);
    assert.equal(stone.n, 1);
    assert.equal(stone.mined, 1);
    notes.push('stone stays, mined flag set, cooldown holds the second hit');

    const wood = await page.evaluate(() => {
      BW.stand(86);
      const before = BW.cell(87, 15);
      BW.tapCell(87, 15);
      return { before, after: BW.cell(87, 15), n: BW.inv().wood || 0, quest: BW.quest() };
    });
    assert.equal(wood.before, 4);
    assert.equal(wood.after, 4);
    assert.ok(wood.n >= 1);
    notes.push('tree stays, quest now ' + wood.quest);

    const sand = await page.evaluate(() => {
      const taken = {};
      BW.digSpots().forEach((s) => { taken[s.tx] = 1; });
      let tx = 117;
      while (taken[tx] || BW.cell(tx, 16) !== 6) tx++;
      BW.stand(tx);
      const before = BW.cell(tx, 16);
      BW.tapCell(tx, 16);
      return { tx, before, after: BW.cell(tx, 16), n: BW.inv().sand || 0 };
    });
    assert.equal(sand.before, 6);
    assert.equal(sand.after, 6);
    assert.equal(sand.n, 1);

    const water = await page.evaluate(() => {
      BW.stand(119);
      const belowBefore = BW.cell(120, 17);
      BW.tapCell(120, 16);
      BW.give('rod', 1);
      BW.select('rod');
      BW.stand(119);
      BW.tapCell(120, 16, false);
      return { water: BW.cell(120, 16), below: BW.cell(120, 17), belowBefore, fishing: BW.ch3().fishing, quest: BW.quest() };
    });
    assert.equal(water.water, 7);
    assert.equal(water.below, water.belowBefore);
    assert.equal(water.below, 6, 'digging water changed the shore');
    assert.equal(water.fishing, true);
    notes.push('water stays, rod still fishes, quest ' + water.quest);

    const boat = await page.evaluate(() => {
      BW.give('boat', 1);
      BW.select('boat');
      BW.stand(119);
      BW.tapCell(121, 16, false);
      return { water: BW.cell(121, 16), boat: BW.ch3().boat };
    });
    assert.equal(boat.water, 7);
    assert.ok(boat.boat);

    const flower = await page.evaluate(() => {
      let tx = 0;
      for (let x = 2; x < 230; x++) if (BW.cell(x, 15) === 8) { tx = x; break; }
      BW.stand(tx + 1);
      BW.tapCell(tx, 15);
      return { tx, after: BW.cell(tx, 15), n: BW.inv().flower || 0 };
    });
    assert.ok(flower.tx > 0);
    assert.equal(flower.after, 0);
    assert.equal(flower.n, 1);
    notes.push('flower picked at ' + flower.tx + ' (no regrow timer in this build)');

    const planted = await page.evaluate(() => {
      BW.give('seed', 1);
      BW.select('seed');
      BW.stand(76);
      return { placed: BW.place('seed', 75, 15), cell: BW.cell(75, 15) };
    });
    assert.equal(planted.placed, true);
    assert.equal(planted.cell, 17);
    await page.evaluate(() => BW.grow());
    await page.waitForTimeout(80);
    const farm = await page.evaluate(() => {
      BW.stand(76);
      const ripe = BW.cell(75, 15);
      BW.tapCell(75, 15);
      return { ripe, cell: BW.cell(75, 15), wheat: BW.inv().wheat || 0 };
    });
    assert.equal(farm.ripe, 19);
    assert.equal(farm.cell, 0);
    assert.ok(farm.wheat >= 2);

    const dug = await page.evaluate(() => {
      const spot = BW.digSpots().find((s) => s.open);
      const ground = BW.cell(spot.tx, spot.ty);
      const beforeStars = Object.keys(BW.adventure().trail.found).length;
      const beforeInv = BW.inv();
      Math.random = () => 0.05;
      BW.stand(spot.tx);
      BW.tapCell(spot.tx, spot.ty);
      const after = BW.digSpots().find((s) => s.tx === spot.tx && s.ty === spot.ty);
      const stars = Object.keys(BW.adventure().trail.found).length;
      return {
        zone: spot.zone, ground, still: BW.cell(spot.tx, spot.ty),
        stars, beforeStars, open: after.open, until: after.until, now: Date.now()
      };
    });
    assert.equal(dug.still, dug.ground);
    assert.equal(dug.open, false);
    assert.ok(dug.stars > dug.beforeStars, 'dig spot did not grant a discovery');
    const wait = dug.until - dug.now;
    assert.ok(wait > 9 * 60 * 1000 && wait <= 10 * 60 * 1000, 'cooldown ms ' + wait);
    notes.push('discovery dig at ' + dug.zone + ' hides mound for ' + Math.round(wait / 1000) + 's');

    const material = await page.evaluate(() => {
      const spot = BW.digSpots().find((s) => s.open);
      const before = BW.inv();
      Math.random = () => 0.5;
      BW.stand(spot.tx);
      BW.tapCell(spot.tx, spot.ty);
      const after = BW.inv();
      const gained = ['wood', 'stone', 'planks', 'wool', 'seed'].filter((k) => (after[k] || 0) > (before[k] || 0));
      return { gained, open: BW.digSpots().find((s) => s.tx === spot.tx).open };
    });
    assert.equal(material.open, false);
    assert.equal(material.gained.length, 1);
    notes.push('material dig paid ' + material.gained[0]);

    const surprise = await page.evaluate(() => {
      const spot = BW.digSpots().find((s) => s.open);
      assertSpot(spot);
      function assertSpot(s) { if (!s) throw new Error('need a third open mound'); }
      const before = BW.inv();
      // Particles roll random before the loot roll, so keep every draw in the surprise band.
      Math.random = () => 0.9;
      BW.stand(spot.tx);
      BW.tapCell(spot.tx, spot.ty);
      const after = BW.inv();
      let gain = 0;
      ['wood', 'stone', 'planks', 'wool', 'seed'].forEach((k) => { gain += (after[k] || 0) - (before[k] || 0); });
      return { gain };
    });
    assert.ok(surprise.gain >= 1 && surprise.gain <= 3, 'surprise count ' + surprise.gain);
    notes.push('surprise bundle +' + surprise.gain);

    await page.evaluate(() => BW.saveNow());
    const closed = await page.evaluate(() => BW.digSpots().filter((s) => !s.open).length);
    assert.ok(closed >= 3);
    await page.reload();
    await page.click('#btn-start');
    if (await page.locator('#name-entry').isVisible()) await page.click('#welcome-play');
    await page.waitForTimeout(200);
    const stillClosed = await page.evaluate(() => BW.digSpots().filter((s) => !s.open).length);
    assert.ok(stillClosed >= 3, 'cooldown did not survive reload');
    const expiredSave = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('block-world-save-v1'));
      raw.dig_spots = raw.dig_spots.map((row) => [row[0], row[1], Date.now() - 1000]);
      return raw;
    });
    const expired = await boot(browser, expiredSave);
    const restored = await expired.page.evaluate(() => BW.digSpots());
    assert.ok(restored.length >= 3 && restored.every((s) => s.open), 'mounds did not return after cooldown');
    assert.deepEqual(expired.errors, []);
    await expired.context.close();
    notes.push('10 min cooldown persists and restores');

    await page.click('#btn-build');
    const tools = await page.evaluate(() => Array.from(document.querySelectorAll('#build-tools button[data-build]')).map((b) => b.dataset.build));
    ['stone', 'wood', 'dirt', 'sand', 'grass', 'water', 'leaves'].forEach((k) => assert.ok(!tools.includes(k), k + ' still in Build'));
    ['houseKit', 'pen', 'car', 'remove', 'planks', 'fence', 'door', 'roof', 'window'].forEach((k) => assert.ok(tools.includes(k), 'missing ' + k));
    const placed = await page.evaluate(() => {
      const before = { dirt: BW.inv().dirt || 0, wood: BW.inv().wood || 0, stone: BW.inv().stone || 0, sand: BW.inv().sand || 0 };
      BW.give('dirt', 2);
      BW.give('stone', 2);
      BW.give('sand', 2);
      BW.give('wood', 2);
      BW.select('dirt');
      BW.stand(82);
      const dirt = BW.place('dirt', 82, 15);
      BW.select('wood');
      const wood = BW.place('wood', 82, 14);
      const after = BW.inv();
      return {
        dirt, wood, a: BW.cell(82, 15), b: BW.cell(82, 14),
        kept: (after.dirt || 0) === before.dirt + 2 && (after.wood || 0) === before.wood + 2 &&
          (after.stone || 0) === before.stone + 2 && (after.sand || 0) === before.sand + 2
      };
    });
    assert.equal(placed.dirt, false);
    assert.equal(placed.wood, false);
    assert.equal(placed.a, 0);
    assert.equal(placed.b, 0);
    assert.equal(placed.kept, true);
    notes.push('Build tools ' + tools.join(','));

    const crafted = await page.evaluate(() => {
      const before = BW.inv().planks || 0;
      BW.give('wood', 1);
      return before;
    });
    if (await page.locator('#dialogue').isVisible()) {
      const key = await page.evaluate(() => BW.adventure().active.key);
      await page.locator('#chat-options [data-word="' + key + '"]').click();
      await page.waitForFunction(() => !BW.adventure().active);
    }
    await page.click('#btn-craft');
    await page.locator('.recipe').nth(0).locator('.craftbtn').click();
    await page.click('#craft-back');
    const planks = await page.evaluate(() => BW.inv().planks || 0);
    assert.ok(planks >= crafted + 4, 'planks ' + planks);

    const kits = await page.evaluate(() => {
      BW.give('car', 1);
      BW.give('houseKit', 1);
      BW.stand(100);
      const car = BW.place('car', 100, 16);
      BW.stand(93);
      const house = BW.place('houseKit', 93, 16);
      const state = BW.buildState();
      return { car, house, kinds: state.objects.map((o) => o.kind) };
    });
    assert.equal(kits.car, true);
    assert.equal(kits.house, true);
    assert.ok(kits.kinds.includes('car') && kits.kinds.includes('house'));
    if (await page.locator('#btn-build').getAttribute('aria-pressed') === 'true') await page.click('#btn-build');
    await page.waitForTimeout(250);
    const carScreen = await page.evaluate(() => BW.worldToScreen(101.5 * 32, 15 * 32));
    await page.mouse.click(carScreen.x, carScreen.y);
    await page.waitForTimeout(200);
    const driving = await page.evaluate(() => BW.buildState().driving);
    assert.ok(driving, 'car did not board');
    const x0 = await page.evaluate(() => BW.player().x);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    const x1 = await page.evaluate(() => BW.player().x);
    assert.ok(x1 > x0 + 8, 'car did not drive');
    await page.click('#car-exit');
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => BW.buildState().driving), null);
    await page.evaluate(() => BW.stand(94));
    await page.waitForTimeout(200);
    const houseScreen = await page.evaluate(() => BW.worldToScreen(94.2 * 32, 14.2 * 32));
    await page.mouse.click(houseScreen.x, houseScreen.y);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#house-upgrade').isVisible(), true);
    await page.click('#upgrade-back');
    notes.push('craft planks, place car and house, drive, open remodel');

    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => BW.error()), '');
    await context.close();

    const W = 240;
    const idx = (x, y) => y * W + x;
    const old = {
      v: 1, seed: 42, time: 0.3, px: 79.5 * 32, py: 16 * 32 - 0.01, dir: 1,
      mods: [idx(80, 15), 16, idx(75, 16), 0, idx(81, 14), 2],
      inv: { wood: 4, fence: 1 }, hotbar: ['wood', 'fence'], sel: 0,
      words: ['wood', 'fence', 'stone'],
      progress: { mined: { stone: 1 }, crafted: { planks: 1 }, placed: { fence: 1 }, tapped: { sheep: 1 }, tree: 1, water: 1, fish: 2, pet: 0 },
      build_objects: [], builds: []
    };
    const loaded = await boot(browser, old);
    const keep = await loaded.page.evaluate(() => ({
      fence: BW.cell(80, 15),
      hole: BW.cell(75, 16),
      dirt: BW.cell(81, 14),
      wood: BW.inv().wood,
      fish: BW.ch3().fish,
      mined: JSON.parse(localStorage.getItem('block-world-save-v1')).progress.mined.stone,
      rope: typeof BW.rope === 'function'
    }));
    await loaded.page.evaluate(() => BW.saveNow());
    const resaved = await loaded.page.evaluate(() => JSON.parse(localStorage.getItem('block-world-save-v1')));
    assert.equal(keep.fence, 16);
    assert.equal(keep.hole, 0, 'old pit was filled');
    assert.equal(keep.dirt, 2);
    assert.equal(keep.wood, 4);
    assert.equal(keep.fish, 2);
    assert.equal(resaved.progress.mined.stone, 1);
    assert.equal(keep.rope, true);
    assert.deepEqual(loaded.errors, []);
    notes.push('old save kept fence, pit, placed dirt, progress');
    await loaded.context.close();

    console.log(JSON.stringify({ status: 'PASS', notes }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
