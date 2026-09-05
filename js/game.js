(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const SAVE_KEY = "unending-save-v1";
  const PLAYER_SCREEN_X = 220;
  const HOME_X = 80;
  const GROUND = 0.78;
  const WHIRL_RANGE = 220;
  const FORWARD_X = HOME_X + 280;
  const CHARGE_SPEED = 560;
  const RETURN_SPEED = 500;
  const SHOP_W = 332;
  const LIVE_CAP = 8;

  const img = {};
  const meta = { loaded: false };

  let W = 1280;
  let H = 720;
  let state = "title";
  let last = 0;
  let camera = 0;
  let shake = 0;
  let toastT = 0;
  let waveBanner = 0;
  let paused = false;

  const persist = loadSave();
  const run = emptyRun();
  const fx = { floats: [], bolts: [], drops: [], gibs: [], rings: [] };

  function emptyRun() {
    return {
      wave: 0,
      kills: 0,
      gold: 0,
      waveTimer: 0.45,
      spawning: false,
      hero: null,
      wolf: null,
      enemies: [],
      levels: Object.fromEntries(RUN_UPGRADES.map((u) => [u.id, 0])),
    };
  }

  function validClass(id) {
    return id && CLASSES[id] ? id : "warrior";
  }

  function classDef(id) {
    return CLASSES[validClass(id || persist.klass)];
  }

  function prestLv(id) {
    return persist.prest[id] || 0;
  }

  function lastStanding() {
    const h = run.hero;
    return !!(h && h.lastStand && h.hp > 0 && h.hp / h.maxHp <= 0.28);
  }

  function heroDmgMult() {
    return rageMult() * (lastStanding() ? 1.25 : 1) * (run.hero.strikeMult || 1);
  }

  function autoDmgMult() {
    return rageMult() * (lastStanding() ? 1.25 : 1);
  }

  function cdScale(seconds) {
    const haste = (run.hero && run.hero.skillHaste) || 0;
    return seconds * Math.max(0.45, 1 - haste);
  }

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (raw && typeof raw === "object") {
        return {
          glory: raw.glory || 0,
          bestWave: raw.bestWave || 0,
          klass: validClass(raw.klass),
          prest: Object.assign(
            Object.fromEntries(PRESTIGE_UPGRADES.map((u) => [u.id, 0])),
            raw.prest || {}
          ),
        };
      }
    } catch (e) {
      /* ignore */
    }
    return {
      glory: 0,
      bestWave: 0,
      klass: "warrior",
      prest: Object.fromEntries(PRESTIGE_UPGRADES.map((u) => [u.id, 0])),
    };
  }

  function save() {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        glory: persist.glory,
        bestWave: persist.bestWave,
        prest: persist.prest,
        klass: persist.klass,
      })
    );
  }

  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function pickClass(id) {
    persist.klass = validClass(id);
    save();
    buildClassPick();
  }

  function makeHero() {
    const c = classDef();
    const hero = {
      klass: c.id,
      x: HOME_X,
      homeX: HOME_X,
      mode: "home",
      hp: c.hp,
      maxHp: c.hp,
      dmg: c.dmg,
      armor: c.armor,
      atkRate: c.atkRate,
      atkT: 0,
      reach: c.reach,
      range: c.range,
      style: c.style,
      walk: 95,
      crit: 0.05,
      leech: 0,
      goldFind: 1,
      mana: c.mana,
      maxMana: c.maxMana,
      manaRegen: c.manaRegen,
      skillHaste: 0,
      strikeMult: 1,
      cinder: 0,
      echo: 0,
      pack: 0,
      execute: 0,
      overkill: 0,
      thorns: 0,
      lastStand: false,
      bloodlust: 0,
      secondWind: 0,
      heirloom: false,
      anim: "idle",
      animT: 0,
      flash: 0,
      strikeCd: 0,
      skillCd: [0, 0, 0],
      whirl: null,
      inferno: null,
      novaT: 0,
      buffs: { rage: 0, haste: 0 },
    };
    for (const n of PRESTIGE_TREE) {
      const lv = prestLv(n.id);
      if (lv > 0 && n.apply) n.apply(hero, lv);
    }
    run.gold = prestLv("purse") * 18;
    if (hero.heirloom) run.levels.iron = Math.max(run.levels.iron || 0, 1);
    for (const u of RUN_UPGRADES) {
      const lv = run.levels[u.id] || 0;
      for (let i = 0; i < lv; i++) u.apply(hero);
    }
    hero.hp = Math.min(hero.maxHp, hero.hp);
    return hero;
  }

  function makeWolf() {
    const pack = (run.hero && run.hero.pack) || 0;
    const hp = (60 + prestLv("blood") * 10) * (1 + pack * 0.25);
    return {
      x: HOME_X + 72,
      hp,
      maxHp: hp,
      dmg: 5 + prestLv("might") + pack * 2,
      armor: 3 + prestLv("hide") * 0.8,
      atkRate: 0.9,
      atkT: 0,
      reach: 72,
      walk: 150,
      anim: "idle",
      animT: 0,
      flash: 0,
      deadT: 0,
      leap: null,
      taunt: 0,
    };
  }

  function startRun() {
    Object.assign(run, emptyRun());
    run.hero = makeHero();
    run.wolf = classDef().companion ? makeWolf() : null;
    camera = HOME_X - PLAYER_SCREEN_X;
    fx.floats.length = 0;
    fx.bolts.length = 0;
    fx.drops.length = 0;
    fx.gibs.length = 0;
    fx.rings.length = 0;
    state = "fight";
    document.getElementById("title").classList.add("hidden");
    document.getElementById("dead").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("shop").classList.remove("hidden");
    document.getElementById("keys").classList.remove("hidden");
    buildShop();
    syncClassChrome();
    syncHud();
    sfx(220, 0.12, "square", 0.04);
  }

  function gloryFor(wave, kills) {
    const raw = Math.max(0, (wave - 1) * 2 + Math.floor(kills * 0.2));
    return Math.floor(raw * (1 + persist.prest.fate * 0.18));
  }

  function die() {
    const g = gloryFor(run.wave, run.kills);
    persist.glory += g;
    persist.bestWave = Math.max(persist.bestWave, run.wave);
    save();
    state = "dead";
    shake = 0;
    document.getElementById("dead").classList.remove("hidden");
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("keys").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("dead-summary").textContent =
      `Wave ${run.wave}  ·  ${run.kills} kills  ·  best ${persist.bestWave}`;
    document.getElementById("dead-glory").textContent = fmt(g);
    buildPrestige();
    buildClassPick();
    sfx(70, 0.5, "sawtooth", 0.06);
  }

  // --- audio ---
  let actx;
  function audio() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function sfx(freq, dur, type, vol) {
    try {
      const a = audio();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.value = vol || 0.05;
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + dur);
    } catch (e) {
      /* ignore */
    }
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    toastT = 1.4;
    waveBanner = 1.4;
  }

  // --- combat helpers ---
  function dmgIn(raw, armor) {
    return Math.max(1, raw * (100 / (100 + armor * 8)));
  }

  function rageMult() {
    return run.hero && run.hero.buffs.rage > 0 ? 1.35 : 1;
  }

  function floatText(x, y, text, color) {
    fx.floats.push({ x, y, text, color, t: 0.9 });
  }

  function drop(kind, x, y, value) {
    fx.drops.push({
      kind,
      x,
      y,
      vy: -80 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 60,
      value: value || 0,
      life: 6,
    });
  }

  function hitHero(amount, srcX, crit) {
    const h = run.hero;
    const d = dmgIn(amount, h.armor);
    h.hp -= d;
    h.flash = 0.12;
    shake = Math.max(shake, 6);
    floatText(
      h.x,
      groundY() - 170,
      (crit ? "CRIT " : "") + "-" + fmt(d),
      crit ? "#ffe27a" : "#ff8080"
    );
    sfx(crit ? 200 : 140, 0.08, "square", 0.04);
    if (h.hp <= h.maxHp * 0.3 && h.secondWind > 0) {
      h.secondWind -= 1;
      const heal = h.maxHp * 0.26;
      h.hp = h.hp <= 0 ? heal : Math.min(h.maxHp, h.hp + heal);
      floatText(h.x, groundY() - 210, "SECOND WIND", "#8fd18f");
      sfx(520, 0.14, "sine", 0.05);
    }
    if (h.hp <= 0) {
      h.hp = 0;
      die();
    }
  }

  function wolfAlive() {
    return !!(run.wolf && run.wolf.hp > 0);
  }

  function hitWolf(amount, crit) {
    const w = run.wolf;
    if (!w || w.hp <= 0) return;
    const d = dmgIn(amount, w.armor);
    w.hp -= d;
    w.flash = 0.12;
    floatText(
      w.x,
      groundY() - 120,
      (crit ? "CRIT " : "") + "-" + fmt(d),
      crit ? "#ffe27a" : "#ffb080"
    );
    if (w.hp <= 0) {
      w.hp = 0;
      w.taunt = 0;
      w.leap = null;
      w.deadT = 12;
      floatText(w.x, groundY() - 150, "WOLF DOWN", "#c07040");
      sfx(90, 0.2, "sawtooth", 0.05);
    }
  }

  function threatFor(e) {
    const h = run.hero;
    if (wolfAlive() && run.wolf.taunt > 0) return run.wolf;
    if (!wolfAlive()) return h;
    const wd = Math.abs(e.x - run.wolf.x);
    const hd = Math.abs(e.x - h.x);
    return wd + 10 < hd ? run.wolf : h;
  }

  function strikeThreat(e) {
    let dmg = e.dmg;
    const crit = Math.random() < (e.def.crit || 0);
    if (crit) dmg *= 2;
    const t = threatFor(e);
    if (t === run.hero) {
      hitHero(dmg, e.x, crit);
      if (run.hero.thorns && run.hero.hp > 0) {
        hitEnemy(e, dmg * 0.1 * run.hero.thorns, false);
      }
    } else hitWolf(dmg, crit);
  }

  function applyDot(e, spec) {
    if (!e || e.hp <= 0) return;
    e.dots = e.dots || [];
    const found = e.dots.find((d) => d.kind === spec.kind);
    if (found) {
      found.t = Math.max(found.t, spec.dur);
      found.dps = Math.max(found.dps, spec.dps);
    } else {
      e.dots.push({ kind: spec.kind, dps: spec.dps, t: spec.dur, acc: 0 });
    }
  }

  function applyCc(e, seconds) {
    e.cc = Math.max(e.cc || 0, seconds);
  }

  function tickDots(e, dt) {
    if (!e.dots || !e.dots.length) return;
    for (const d of e.dots) {
      d.t -= dt;
      d.acc += dt;
      if (d.acc >= 0.45 && e.hp > 0) {
        d.acc -= 0.45;
        hitEnemy(e, d.dps * 0.45, false, true);
        if (e.hp <= 0) return;
      }
    }
    e.dots = e.dots.filter((d) => d.t > 0);
  }

  function hitEnemy(e, amount, crit, fromDot) {
    if (!e || e.hp <= 0) return;
    const h = run.hero;
    if (h && h.execute && e.hp < e.maxHp * 0.4) {
      amount *= 1 + 0.18 * h.execute;
    }
    const d = dmgIn(amount, e.armor);
    const over = d - e.hp;
    e.hp -= d;
    e.flash = 0.1;
    floatText(
      e.x,
      groundY() - (fromDot ? 140 : 160),
      (fromDot ? "burn " : crit ? "CRIT " : "") + fmt(d),
      fromDot ? "#ff8a3a" : crit ? "#ffe27a" : "#fff"
    );
    if (h && h.leech > 0 && !fromDot) {
      const heal = d * h.leech;
      h.hp = Math.min(h.maxHp, h.hp + heal);
    }
    if (e.hp > 0 && h && h.cinder && !fromDot) {
      applyDot(e, { kind: "burn", dps: h.dmg * 0.16 * h.cinder, dur: 1.8 });
    }
    if (e.hp <= 0) {
      if (h && h.overkill && over > 0 && !fromDot) {
        const near = nearest(e.x, (o) => o !== e && o.hp > 0);
        if (near) hitEnemy(near, over * 0.4 * h.overkill, false, true);
      }
      killEnemy(e);
    }
  }

  function killEnemy(e) {
    run.kills += 1;
    const gold = Math.floor(e.gold * run.hero.goldFind);
    run.gold += gold;
    floatText(e.x, groundY() - 190, "+" + gold + "g", "#e6c15a");
    if (e.magic) run.hero.mana = Math.min(run.hero.maxMana, run.hero.mana + e.magic);
    const r = Math.random();
    if (r < 0.12) drop("heart", e.x, groundY() - 80);
    else if (r < 0.22) drop("mana", e.x, groundY() - 80);
    else if (r < 0.28) drop("rage", e.x, groundY() - 80);
    else if (r < 0.33) drop("haste", e.x, groundY() - 80);
    for (let i = 0; i < 8; i++) {
      fx.gibs.push({
        x: e.x,
        y: groundY() - 70,
        vx: (Math.random() - 0.5) * 180,
        vy: -80 - Math.random() * 120,
        t: 0.5 + Math.random() * 0.3,
        c: e.def.color,
      });
    }
    sfx(320, 0.07, "triangle", 0.05);
    if (run.hero.bloodlust) {
      run.hero.buffs.rage = Math.max(run.hero.buffs.rage, 1.6 * run.hero.bloodlust);
    }
    const wasBoss = e.def.boss;
    run.enemies = run.enemies.filter((x) => x !== e);
    if (wasBoss && !bossAlive()) {
      run.waveTimer = nextWaveDelay(run.wave);
    }
  }

  function bossAlive() {
    return run.enemies.some((e) => e.def.boss);
  }

  function playRight() {
    return camera + W - SHOP_W;
  }

  function spawnWave() {
    const n = run.wave;
    const roster = waveRoster(n);
    const sc = waveScale(n);
    const h = run.hero;
    const far = Math.min(playRight() + 20, (h ? h.x : HOME_X) + 390);
    roster.forEach((type, i) => {
      const def = ENEMIES[type];
      run.enemies.push({
        type,
        def,
        x: far + i * 28,
        hp: def.hp * sc.hp,
        maxHp: def.hp * sc.hp,
        dmg: def.dmg * sc.dmg,
        armor: def.armor,
        gold: def.gold * sc.gold,
        magic: def.magic,
        atkT: 0.2 + Math.random() * 0.4,
        healT: 0.5,
        anim: "walk",
        animT: Math.random(),
        flash: 0,
        enraged: false,
        facing: -1,
        stepped: false,
        dots: [],
        cc: 0,
        charged: false,
      });
    });
    const fresh = shopUnlocksAt(n);
    if (isBossWave(n)) {
      toast("BOSS  " + defTitle(n));
      sfx(140, 0.22, "sawtooth", 0.06);
    } else {
      toast(
        fresh.length && n > 1
          ? "Wave " + n + "  ·  " + fresh.map((u) => u.name).join(" / ")
          : "Wave " + n
      );
      sfx(360, 0.1, "square", 0.04);
    }
    buildShop();
  }

  function defTitle(n) {
    return ENEMIES[bossTypeFor(n)].name;
  }

  function nearest(fromX, pred) {
    let best = null;
    let bestD = 1e9;
    for (const e of run.enemies) {
      if (pred && !pred(e)) continue;
      const d = Math.abs(e.x - fromX);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function inMelee(e, reach) {
    return Math.abs(e.x - run.hero.x) < reach;
  }

  function isBehind(e) {
    return e.x < run.hero.x - 18;
  }

  function shadowedBehind(e) {
    return !!(e.def.shadowstep && e.stepped && isBehind(e));
  }

  function livingInRange(range, allowBehind) {
    return run.enemies.filter((e) => {
      if (Math.abs(e.x - run.hero.x) > range) return false;
      if (!allowBehind && shadowedBehind(e)) return false;
      return true;
    });
  }

  function shoot(opts) {
    const h = run.hero;
    const dir = opts.dir || 1;
    fx.bolts.push({
      kind: opts.kind || "arrow",
      friendly: true,
      x: h.x + dir * 18,
      y: opts.y || groundY() - 90,
      vx: dir * (opts.speed || 460),
      dmg: opts.dmg,
      crit: !!opts.crit,
      pierce: opts.pierce || 0,
      aoe: opts.aoe || 0,
      burn: opts.burn || null,
      hit: [],
    });
  }

  function swing(mult, extra) {
    const h = run.hero;
    h.anim = "atk";
    h.animT = 0;
    let dmg = h.dmg * (mult || 1) * autoDmgMult();
    const crit = Math.random() < h.crit;
    if (crit) dmg *= 2;
    const targets = livingInRange(h.reach + 16, false).sort(
      (a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x)
    );
    if (targets[0]) {
      hitEnemy(targets[0], dmg, crit);
      if (extra && extra.stun) applyCc(targets[0], extra.stun);
      if (extra && extra.knock) targets[0].x += extra.knock;
    }
    if (targets[1] && extra && extra.cleave) {
      hitEnemy(targets[1], dmg * extra.cleave, false);
    }
    sfx(crit ? 520 : 240, 0.06, "square", 0.05);
  }

  function autoAttack(fromEcho) {
    const h = run.hero;
    const c = classDef(h.klass);
    h.anim = "atk";
    h.animT = 0;
    if (c.style === "melee") {
      swing(1, { cleave: 0.48 });
      if (!fromEcho && h.echo && Math.random() < h.echo) autoAttack(true);
      return;
    }
    const t = nearest(h.x, (e) => Math.abs(e.x - h.x) <= c.range);
    if (!t) return;
    const dir = t.x >= h.x ? 1 : -1;
    const crit = Math.random() < h.crit;
    let dmg = h.dmg * autoDmgMult();
    if (crit) dmg *= 2;
    if (c.proj === "fire") {
      shoot({
        kind: "fire",
        dir,
        dmg,
        crit,
        speed: 380,
        burn: { kind: "burn", dps: h.dmg * 0.28, dur: 2.4 },
      });
      sfx(crit ? 480 : 400, 0.06, "triangle", 0.04);
    } else {
      shoot({ kind: "arrow", dir, dmg, crit, speed: 500 });
      sfx(crit ? 540 : 460, 0.05, "triangle", 0.04);
    }
    if (!fromEcho && h.echo && Math.random() < h.echo) autoAttack(true);
  }

  function powerStrike() {
    const h = run.hero;
    if (state !== "fight" || h.strikeCd > 0) return;
    const c = classDef(h.klass);
    h.strikeCd = cdScale(c.strikeCd);
    h.anim = "atk";
    h.animT = 0;
    if (c.id === "warrior") {
      swing(2.15 * (h.strikeMult || 1), { stun: 0.55, knock: 18 });
      shake = 8;
      return;
    }
    const t = nearest(h.x, (e) => Math.abs(e.x - h.x) <= c.range + 40);
    const dir = t && t.x < h.x ? -1 : 1;
    const crit = Math.random() < h.crit;
    let dmg = h.dmg * heroDmgMult();
    if (c.id === "mage") {
      dmg *= 2.2;
      if (crit) dmg *= 2;
      shoot({
        kind: "fire",
        dir,
        dmg,
        crit,
        speed: 340,
        aoe: 78,
        burn: { kind: "burn", dps: h.dmg * 0.42, dur: 3.2 },
        y: groundY() - 96,
      });
      shake = 7;
      sfx(180, 0.12, "sawtooth", 0.05);
    } else {
      dmg *= 2.7;
      if (crit) dmg *= 2;
      shoot({
        kind: "arrow",
        dir,
        dmg,
        crit,
        speed: 620,
        pierce: 2,
      });
      shake = 6;
      sfx(560, 0.08, "square", 0.05);
    }
  }

  function spendMana(n) {
    const h = run.hero;
    if (!h || h.mana < n) return false;
    h.mana -= n;
    return true;
  }

  function mend() {
    const h = run.hero;
    if (state !== "fight" || !spendMana(25)) return;
    const heal = h.maxHp * 0.28;
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floatText(h.x, groundY() - 200, "+" + fmt(heal), "#8fd18f");
    sfx(480, 0.12, "sine", 0.05);
  }

  function cauterize() {
    const h = run.hero;
    if (state !== "fight" || !spendMana(25)) return;
    const heal = h.maxHp * 0.24;
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floatText(h.x, groundY() - 200, "+" + fmt(heal), "#ff8a4a");
    for (const e of [...run.enemies]) {
      if (Math.abs(e.x - h.x) < 170) {
        hitEnemy(e, h.dmg * 0.45 * autoDmgMult(), false);
        applyDot(e, { kind: "burn", dps: h.dmg * 0.32, dur: 2.8 });
      }
    }
    fx.rings.push({ x: h.x, t: 0.35, color: "rgba(255,110,40,0.7)", r: 40 });
    sfx(360, 0.12, "sawtooth", 0.05);
  }

  function fieldDress() {
    const h = run.hero;
    if (state !== "fight" || !spendMana(25)) return;
    const heal = h.maxHp * 0.2;
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floatText(h.x, groundY() - 200, "+" + fmt(heal), "#8fd18f");
    if (run.wolf) {
      if (run.wolf.hp <= 0) {
        const fresh = makeWolf();
        fresh.x = h.x + 60;
        fresh.hp = fresh.maxHp * 0.45;
        run.wolf = fresh;
        floatText(fresh.x, groundY() - 150, "UP", "#c9e6a0");
      } else {
        const wh = run.wolf.maxHp * 0.42;
        run.wolf.hp = Math.min(run.wolf.maxHp, run.wolf.hp + wh);
        floatText(run.wolf.x, groundY() - 150, "+" + fmt(wh), "#8fd18f");
      }
    }
    sfx(500, 0.12, "sine", 0.05);
  }

  function nextWaveDelay(wave) {
    return 5.5 + wave * 0.5;
  }

  function charge() {
    const h = run.hero;
    if (state !== "fight") return;
    for (const e of run.enemies) e.charged = false;
    if (h.mode === "home" || h.mode === "return") {
      h.mode = "charge";
      sfx(300, 0.1, "square", 0.05);
    } else {
      h.mode = "return";
      sfx(240, 0.08, "square", 0.04);
    }
  }

  function whirlHit() {
    const h = run.hero;
    const dmg = h.dmg * 0.85 * autoDmgMult();
    const targets = run.enemies.filter((e) => Math.abs(e.x - h.x) < WHIRL_RANGE);
    for (const e of targets) hitEnemy(e, dmg, false);
    shake = 7;
    sfx(170, 0.08, "sawtooth", 0.045);
  }

  function whirlwind() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[1];
    if (state !== "fight" || h.skillCd[1] > 0 || h.whirl) return;
    h.skillCd[1] = cdScale(spec.cd || 6);
    h.whirl = { t: 0, next: 0, left: 3 };
    h.anim = "atk";
    h.animT = 0;
  }

  function inferno() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[1];
    if (state !== "fight" || h.skillCd[1] > 0) return;
    h.skillCd[1] = cdScale(spec.cd);
    h.inferno = { t: 0, next: 0, left: 3, x: h.x + 150 };
    h.anim = "atk";
    h.animT = 0;
    sfx(200, 0.14, "sawtooth", 0.05);
  }

  function infernoPulse() {
    const h = run.hero;
    const x = h.inferno.x;
    const dmg = h.dmg * 0.95 * autoDmgMult();
    for (const e of [...run.enemies]) {
      if (e.x > h.x + 20 && e.x < x + 160) {
        hitEnemy(e, dmg, false);
        applyDot(e, { kind: "burn", dps: h.dmg * 0.38, dur: 2.6 });
      }
    }
    fx.rings.push({ x: x, t: 0.4, color: "rgba(255,90,20,0.75)", r: 30 });
    shake = 6;
    sfx(160, 0.08, "sawtooth", 0.04);
  }

  function frostNova() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[2];
    if (state !== "fight" || h.skillCd[2] > 0 || h.mana < spec.mana) return;
    h.mana -= spec.mana;
    h.skillCd[2] = cdScale(spec.cd);
    h.novaT = 0.45;
    const dmg = h.dmg * 0.55 * autoDmgMult();
    for (const e of [...run.enemies]) {
      if (Math.abs(e.x - h.x) < 300) {
        hitEnemy(e, dmg, false);
        applyCc(e, 2.2);
      }
    }
    fx.rings.push({ x: h.x, t: 0.5, color: "rgba(140,210,255,0.85)", r: 50 });
    shake = 5;
    sfx(620, 0.16, "sine", 0.05);
  }

  function volley() {
    const h = run.hero;
    const c = classDef(h.klass);
    if (state !== "fight" || h.skillCd[1] > 0) return;
    h.skillCd[1] = cdScale(c.skills[1].cd);
    h.anim = "atk";
    h.animT = 0;
    const targets = [...run.enemies]
      .filter((e) => Math.abs(e.x - h.x) < c.range + 50)
      .sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x));
    const n = 5;
    if (!targets.length) {
      for (let i = 0; i < n; i++) {
        shoot({
          kind: "arrow",
          dir: 1,
          dmg: h.dmg * 0.7 * autoDmgMult(),
          speed: 520,
          y: groundY() - 70 - i * 16,
        });
      }
    } else {
      for (let i = 0; i < n; i++) {
        const t = targets[i % targets.length];
        const dir = t.x >= h.x ? 1 : -1;
        const crit = Math.random() < h.crit * 0.6;
        let dmg = h.dmg * 0.74 * autoDmgMult();
        if (crit) dmg *= 2;
        shoot({
          kind: "arrow",
          dir,
          dmg,
          crit,
          speed: 540,
          y: groundY() - 70 - (i - 2) * 14,
        });
      }
    }
    shake = 5;
    sfx(480, 0.1, "triangle", 0.05);
  }

  function sicEm() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[2];
    if (state !== "fight" || h.skillCd[2] > 0) return;
    h.skillCd[2] = cdScale(spec.cd);
    if (!run.wolf || run.wolf.hp <= 0) {
      run.wolf = makeWolf();
      run.wolf.x = h.x + 50;
      floatText(run.wolf.x, groundY() - 150, "WOLF", "#c9e6a0");
    }
    const w = run.wolf;
    const target =
      nearest(h.x + 400, (e) => e.x > h.x) || nearest(w.x);
    const dest = target ? target.x - 36 : h.x + 220;
    w.leap = { from: w.x, to: dest, t: 0, hit: false };
    w.taunt = 3.2;
    w.anim = "atk";
    floatText(w.x, groundY() - 140, "SIC 'EM", "#e6c15a");
    sfx(280, 0.12, "square", 0.05);
  }

  function useSkill(slot) {
    if (state !== "fight") return;
    const c = classDef(run.hero.klass);
    const id = c.skills[slot].id;
    if (id === "mend") mend();
    else if (id === "cauterize") cauterize();
    else if (id === "dress") fieldDress();
    else if (id === "whirl") whirlwind();
    else if (id === "inferno") inferno();
    else if (id === "volley") volley();
    else if (id === "charge") charge();
    else if (id === "nova") frostNova();
    else if (id === "sic") sicEm();
  }

  function pickup(d) {
    const h = run.hero;
    if (d.kind === "heart") {
      const heal = h.maxHp * 0.18;
      h.hp = Math.min(h.maxHp, h.hp + heal);
      floatText(h.x, groundY() - 180, "heal", "#ff8a8a");
    } else if (d.kind === "mana") {
      h.mana = Math.min(h.maxMana, h.mana + 18);
      floatText(h.x, groundY() - 180, "mana", "#6ec4ff");
    } else if (d.kind === "rage") {
      h.buffs.rage = 6;
      floatText(h.x, groundY() - 180, "RAGE", "#ff6a3a");
    } else if (d.kind === "haste") {
      h.buffs.haste = 6;
      floatText(h.x, groundY() - 180, "HASTE", "#ffe27a");
    }
    sfx(700, 0.08, "sine", 0.04);
  }

  // --- update ---
  function groundY() {
    return H * GROUND;
  }

  function updateWolf(dt) {
    const w = run.wolf;
    const h = run.hero;
    if (!w) return;
    w.flash = Math.max(0, w.flash - dt);
    w.animT += dt;
    w.taunt = Math.max(0, w.taunt - dt);
    if (w.hp <= 0) {
      w.deadT = Math.max(0, w.deadT - dt);
      return;
    }
    if (w.leap) {
      w.leap.t += dt;
      const u = Math.min(1, w.leap.t / 0.28);
      w.x = w.leap.from + (w.leap.to - w.leap.from) * u;
      if (!w.leap.hit && u > 0.55) {
        w.leap.hit = true;
        for (const e of [...run.enemies]) {
          if (Math.abs(e.x - w.x) < 70) {
            hitEnemy(e, w.dmg * 1.5, false);
            applyCc(e, 0.35);
          }
        }
      }
      if (u >= 1) w.leap = null;
      return;
    }
    const prey = nearest(w.x);
    const guard = h.x + 70;
    if (prey && Math.abs(prey.x - w.x) > w.reach) {
      const dest = prey.x > w.x ? prey.x - w.reach + 8 : prey.x + w.reach - 8;
      w.x += Math.sign(dest - w.x) * w.walk * dt;
      w.anim = "walk";
    } else if (prey) {
      w.anim = "idle";
      w.atkT -= dt * w.atkRate;
      if (w.atkT <= 0) {
        w.atkT = 1;
        w.anim = "atk";
        w.animT = 0;
        hitEnemy(prey, w.dmg, false);
        sfx(210, 0.05, "square", 0.03);
      }
    } else {
      if (Math.abs(w.x - guard) > 10) {
        w.x += Math.sign(guard - w.x) * w.walk * 0.7 * dt;
        w.anim = "walk";
      } else w.anim = "idle";
    }
    w.x = Math.max(h.x - 90, Math.min(h.x + 420, w.x));
  }

  function update(dt) {
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) document.getElementById("toast").classList.remove("show");
    }
    if (state !== "fight" || paused) {
      shake = 0;
      updateFx(dt);
      return;
    }
    const h = run.hero;
    const c = classDef(h.klass);
    h.flash = Math.max(0, h.flash - dt);
    h.strikeCd = Math.max(0, h.strikeCd - dt);
    h.skillCd[0] = Math.max(0, h.skillCd[0] - dt);
    h.skillCd[1] = Math.max(0, h.skillCd[1] - dt);
    h.skillCd[2] = Math.max(0, h.skillCd[2] - dt);
    h.novaT = Math.max(0, h.novaT - dt);
    h.buffs.rage = Math.max(0, h.buffs.rage - dt);
    h.buffs.haste = Math.max(0, h.buffs.haste - dt);
    h.mana = Math.min(h.maxMana, h.mana + h.manaRegen * dt);
    shake = Math.max(0, shake - dt * 18);
    camera = HOME_X - PLAYER_SCREEN_X;

    if (!bossAlive()) {
      if (run.enemies.length >= LIVE_CAP) {
        run.waveTimer = Math.max(run.waveTimer, 1.8);
      } else {
        run.waveTimer -= dt;
        if (run.waveTimer <= 0) {
          run.wave += 1;
          spawnWave();
          run.waveTimer = isBossWave(run.wave) ? 1e9 : nextWaveDelay(run.wave);
        }
      }
    }

    const melee = livingInRange(h.reach + 16, false);

    if (h.mode === "charge") {
      h.x += CHARGE_SPEED * dt;
      h.anim = "atk";
      h.animT = 0.12;
      for (const e of [...run.enemies]) {
        if (!e.charged && Math.abs(e.x - h.x) < 42) {
          e.charged = true;
          hitEnemy(e, h.dmg * 0.8 * autoDmgMult(), false);
        }
      }
      if (h.x >= FORWARD_X) {
        h.x = FORWARD_X;
        h.mode = "forward";
      }
    } else if (h.mode === "return") {
      h.x -= RETURN_SPEED * dt;
      h.anim = "idle";
      h.animT += dt;
      if (h.x <= h.homeX) {
        h.x = h.homeX;
        h.mode = "home";
      }
    }

    if (h.whirl) {
      h.whirl.t += dt;
      h.anim = "atk";
      h.animT = h.whirl.t % 0.14;
      if (h.whirl.t >= h.whirl.next && h.whirl.left > 0) {
        whirlHit();
        h.whirl.left -= 1;
        h.whirl.next += 0.14;
      }
      if (h.whirl.left <= 0 && h.whirl.t >= 0.42) h.whirl = null;
    } else if (h.inferno) {
      h.inferno.t += dt;
      h.anim = "atk";
      if (h.inferno.t >= h.inferno.next && h.inferno.left > 0) {
        infernoPulse();
        h.inferno.left -= 1;
        h.inferno.next += 0.22;
      }
      if (h.inferno.left <= 0 && h.inferno.t >= 0.7) h.inferno = null;
    } else if (h.mode === "charge" || h.mode === "return") {
      /* dashing */
    } else if (h.anim === "atk") {
      h.animT += dt;
      if (h.animT >= 0.34) h.anim = "idle";
    } else {
      const ready =
        c.style === "melee"
          ? melee.length
          : run.enemies.some((e) => Math.abs(e.x - h.x) <= c.range);
      if (ready) {
        const rate = h.atkRate * (h.buffs.haste > 0 ? 1.35 : 1) * (lastStanding() ? 1.2 : 1);
        h.atkT -= dt * rate;
        if (h.atkT <= 0) {
          h.atkT = 1;
          autoAttack();
        }
      } else {
        h.anim = "idle";
        h.animT += dt;
      }
    }

    updateWolf(dt);

    for (const e of [...run.enemies]) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.animT += dt;
      e.cc = Math.max(0, (e.cc || 0) - dt);
      tickDots(e, dt);
      if (e.hp <= 0) continue;
      if (e.cc > 0) {
        e.anim = "idle";
        continue;
      }
      if (e.def.enrage && !e.enraged && e.hp < e.maxHp * 0.45) {
        e.enraged = true;
        e.dmg *= 1.45;
        e.defSpeed = (e.defSpeed || e.def.speed) * 1.25;
        floatText(e.x, groundY() - 170, "ENRAGE", "#ff4a3a");
      }
      if (e.def.shadowstep && !e.stepped && e.x <= FORWARD_X && e.x >= HOME_X) {
        e.x = h.x - 56;
        e.stepped = true;
        e.facing = 1;
        floatText(e.x, groundY() - 190, "SHADOW", "#a070ff");
        sfx(260, 0.1, "triangle", 0.05);
      }
      const ranged = !!(e.def.projectile || e.def.heal);
      const spd = e.defSpeed || e.def.speed;
      const tgt = threatFor(e);
      const dx = e.x - tgt.x;
      e.facing = dx >= 0 ? -1 : 1;
      if (ranged) {
        const keep = e.def.keep;
        const healRange = e.def.healRange || 0;
        let desired = Math.min(h.x + keep, playRight() - 36);
        if (e.def.heal) {
          const wounded = nearest(
            e.x,
            (o) => o !== e && o.hp < o.maxHp * 0.92
          );
          if (wounded && Math.abs(wounded.x - e.x) > healRange) {
            desired = Math.max(h.x + 130, Math.min(wounded.x + 28, h.x + keep));
          }
        }
        const maxCamp = h.x + keep + 36;
        if (e.x > maxCamp) {
          e.x -= spd * dt;
          e.anim = "walk";
        } else if (e.x > desired + 8) {
          e.x -= spd * dt;
          e.anim = "walk";
        } else if (e.x < h.x + 110) {
          e.x += spd * dt;
          e.anim = "walk";
        } else {
          e.anim = "idle";
        }
        if (e.def.heal) {
          e.healT -= dt;
          if (e.healT <= 0) {
            e.healT = e.def.healRate;
            let hurt = nearest(
              e.x,
              (o) =>
                o !== e &&
                o.hp < o.maxHp - 1 &&
                Math.abs(o.x - e.x) <= healRange
            );
            if (!hurt && e.hp < e.maxHp - 1) hurt = e;
            if (hurt) {
              const amt = e.def.heal * waveScale(Math.max(1, run.wave - 1)).hp;
              hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt);
              floatText(hurt.x, groundY() - 180, "+" + fmt(amt), "#c9a227");
              sfx(640, 0.08, "sine", 0.03);
            }
          }
        }
        if (e.def.projectile) {
          const range = e.def.atkRange || e.def.keep + 80;
          if (Math.abs(e.x - h.x) <= range) {
            e.atkT -= dt * e.def.atkRate;
            if (e.atkT <= 0) {
              e.atkT = 1;
              const dir = h.x < e.x ? -1 : 1;
              const shots = e.def.volley || 1;
              for (let i = 0; i < shots; i++) {
                fx.bolts.push({
                  kind: e.def.projectile,
                  x: e.x + dir * 16,
                  y: groundY() - 90 - i * 22,
                  vx: dir * e.def.projSpeed,
                  dmg: e.dmg,
                });
              }
              sfx(e.def.projectile === "bolt" ? 420 : 500, 0.05, "triangle", 0.03);
            }
          }
        }
      } else {
        const closeIn = Math.max(56, (tgt === h ? h.reach : 64) - 16);
        if (Math.abs(dx) > closeIn) {
          e.x += Math.sign(tgt.x - e.x) * spd * dt;
          e.anim = "walk";
        } else {
          e.anim = "idle";
          e.atkT -= dt * e.def.atkRate;
          if (e.atkT <= 0) {
            e.atkT = 1;
            e.anim = "atk";
            e.animT = 0;
            strikeThreat(e);
          }
        }
      }
    }

    for (const b of fx.bolts) {
      b.x += b.vx * dt;
      if (b.friendly) {
        for (const e of [...run.enemies]) {
          if (e.hp <= 0) continue;
          if (Math.abs(b.x - e.x) < 30 && b.hit.indexOf(e) < 0) {
            hitEnemy(e, b.dmg, b.crit);
            if (b.burn) applyDot(e, b.burn);
            if (b.aoe) {
              for (const o of [...run.enemies]) {
                if (o !== e && o.hp > 0 && Math.abs(o.x - e.x) < b.aoe) {
                  hitEnemy(o, b.dmg * 0.55, false);
                  if (b.burn) applyDot(o, b.burn);
                }
              }
            }
            b.hit.push(e);
            if (b.pierce > 0) b.pierce -= 1;
            else {
              b.dead = true;
              break;
            }
          }
        }
      } else if (Math.abs(b.x - h.x) < 30) {
        hitHero(b.dmg, b.x);
        b.dead = true;
      }
      if (b.x < camera - 80 || b.x > camera + W + 80) b.dead = true;
    }
    fx.bolts = fx.bolts.filter((b) => !b.dead);

    for (const d of fx.drops) {
      d.life -= dt;
      d.vy += 420 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const gy = groundY() - 28;
      if (d.y > gy) {
        d.y = gy;
        d.vy *= -0.25;
        d.vx *= 0.6;
      }
      if (Math.abs(d.x - h.x) < 50 && Math.abs(d.y - (groundY() - 60)) < 80) {
        pickup(d);
        d.life = 0;
      }
    }
    fx.drops = fx.drops.filter((d) => d.life > 0);

    updateFx(dt);
    syncHud();
  }

  function updateFx(dt) {
    for (const f of fx.floats) {
      f.t -= dt;
      f.y -= 40 * dt;
    }
    fx.floats = fx.floats.filter((f) => f.t > 0);
    for (const g of fx.gibs) {
      g.t -= dt;
      g.vy += 500 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }
    fx.gibs = fx.gibs.filter((g) => g.t > 0);
    for (const r of fx.rings) r.t -= dt;
    fx.rings = fx.rings.filter((r) => r.t > 0);
  }

  // --- render ---
  function sx(x) {
    return x - camera;
  }

  function drawImg(image, x, y, height, opts) {
    if (!image) return;
    const o = opts || {};
    const scale = height / image.height;
    const w = image.width * scale;
    const hgt = height;
    ctx.save();
    const bits = [];
    if (o.hue) bits.push("hue-rotate(" + o.hue + "deg)");
    if (o.sat) bits.push("saturate(" + o.sat + ")");
    if (o.flash) bits.push("brightness(2.6) saturate(0.4)");
    if (bits.length) ctx.filter = bits.join(" ");
    ctx.imageSmoothingEnabled = false;
    if (o.flip) {
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -w / 2, y - hgt, w, hgt);
    } else {
      ctx.drawImage(image, x - w / 2, y - hgt, w, hgt);
    }
    ctx.restore();
  }

  function frameOf(list, t, fps) {
    if (!list || !list.length) return null;
    const i = Math.floor(t * fps) % list.length;
    return list[i];
  }

  function drawBg() {
    const bg = img.bg;
    if (!bg) {
      ctx.fillStyle = "#122";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const scale = H / bg.height;
    const sw = bg.width * scale;
    const maxPan = Math.max(0, sw - W);
    const trip = maxPan * 2 || 1;
    let t = (camera * 0.22) % trip;
    if (t < 0) t += trip;
    const pan = t > maxPan ? trip - t : t;
    ctx.drawImage(bg, -pan, 0, sw, H);
  }

  function drawHpBar(x, y, w, hp, max, color) {
    ctx.fillStyle = "#1118";
    ctx.fillRect(x - w / 2, y, w, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * Math.max(0, hp / max), 6);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(x - w / 2, y, w, 6);
  }

  function heroSprite(h) {
    const c = classDef(h.klass);
    if (c.anims) {
      if (h.anim === "atk" && img.heroAtk.length) {
        const i = Math.min(img.heroAtk.length - 1, Math.floor(h.animT / 0.08));
        return img.heroAtk[i];
      }
      if (img.heroIdle.length) return frameOf(img.heroIdle, h.animT, 6);
      return img.hero;
    }
    return img[c.sprite] || img.hero;
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ox = state === "fight" && shake ? (Math.random() - 0.5) * shake : 0;
    const oy = state === "fight" && shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(ox, oy);
    drawBg();

    const gy = groundY();
    const h = run.hero;

    if (h && (state === "fight" || state === "dead")) {
      const c = classDef(h.klass);
      const spr = heroSprite(h);
      drawImg(spr, sx(h.x), gy + 6, 168, {
        flash: h.flash > 0,
        flip: !!c.flip,
        hue: c.hue,
      });
      drawHpBar(sx(h.x), gy - 184, 84, h.hp, h.maxHp, "#d45454");
      if (h.buffs.rage > 0) {
        ctx.fillStyle = "rgba(255,80,30,0.18)";
        ctx.beginPath();
        ctx.arc(sx(h.x), gy - 80, 70, 0, Math.PI * 2);
        ctx.fill();
      }
      if (h.whirl) {
        ctx.strokeStyle = "rgba(230,210,120,0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx(h.x), gy - 80, 50 + ((h.whirl.t * 80) % 40), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (h.inferno) {
        ctx.fillStyle = "rgba(255,80,20," + (0.12 + (h.inferno.t % 0.22) * 0.5) + ")";
        ctx.fillRect(sx(h.x + 30), gy - 20, 280, 18);
      }
      if (h.novaT > 0) {
        ctx.strokeStyle = "rgba(140,210,255,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx(h.x), gy - 80, 80 + (0.45 - h.novaT) * 180, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (run.wolf && (state === "fight" || state === "dead")) {
      const w = run.wolf;
      if (w.hp > 0) {
        const bob = w.anim === "walk" ? Math.sin(w.animT * 12) * 3 : 0;
        drawImg(img.wolf, sx(w.x), gy + 8 + bob, 92, { flash: w.flash > 0 });
        drawHpBar(sx(w.x), gy - 108, 58, w.hp, w.maxHp, "#c9a06a");
        if (w.taunt > 0) {
          ctx.strokeStyle = "rgba(230,193,90,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx(w.x), gy - 40, 36, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    const sorted = [...run.enemies].sort((a, b) => a.x - b.x);
    for (const e of sorted) {
      let spr = img[e.def.sprite];
      if (e.type === "grunt" && e.anim === "walk" && img.gruntWalk.length) {
        spr = frameOf(img.gruntWalk, e.animT, 8);
      }
      const bob = e.anim === "walk" ? Math.sin(e.animT * 10) * 3 : 0;
      const face = e.facing || -1;
      const lunge = e.anim === "atk" && e.animT < 0.2 ? 14 * face : 0;
      const hgt = 150 * (e.def.scale || 1);
      drawImg(spr, sx(e.x) + lunge, gy + 6 + bob, hgt, {
        flash: e.flash > 0 || e.cc > 0,
        flip: face > 0,
        hue: e.cc > 0 ? 180 : 0,
      });
      drawHpBar(
        sx(e.x),
        gy - hgt - 18,
        e.def.boss ? 110 : 70,
        e.hp,
        e.maxHp,
        e.def.color
      );
      if (e.dots && e.dots.some((d) => d.kind === "burn")) {
        ctx.fillStyle = "rgba(255,90,30,0.35)";
        ctx.beginPath();
        ctx.arc(sx(e.x) + 18, gy - 40, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const r of fx.rings) {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx(r.x), gy - 70, r.r + (0.5 - r.t) * 80, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const b of fx.bolts) {
      const spr =
        b.kind === "fire" ? img.fire : b.kind === "bolt" ? img.bolt : img.arrow;
      drawImg(spr, sx(b.x), b.y + 40, b.kind === "arrow" ? 28 : 36, {
        flip: b.vx > 0,
      });
    }

    for (const d of fx.drops) {
      const spr = d.kind === "mana" ? img.mana : d.kind === "heart" ? img.heart : img.coin;
      const col = d.kind === "rage" ? "#ff6a3a" : d.kind === "haste" ? "#ffe27a" : null;
      if (col && (d.kind === "rage" || d.kind === "haste")) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(sx(d.x), d.y, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawImg(spr, sx(d.x), d.y + 18, 28);
      }
    }

    for (const g of fx.gibs) {
      ctx.globalAlpha = Math.max(0, g.t * 2);
      ctx.fillStyle = g.c;
      ctx.fillRect(sx(g.x), g.y, 4, 4);
      ctx.globalAlpha = 1;
    }

    ctx.font = "22px VT323, monospace";
    ctx.textAlign = "center";
    for (const f of fx.floats) {
      ctx.globalAlpha = Math.max(0, f.t * 1.4);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx(f.x), f.y);
      ctx.globalAlpha = 1;
    }

    if (h && h.buffs.haste > 0) {
      ctx.fillStyle = "rgba(255,226,122,0.12)";
      ctx.fillRect(sx(h.x) - 40, gy - 160, 80, 160);
    }
  }

  function skillLabel(slot) {
    const h = run.hero;
    const c = classDef(h ? h.klass : persist.klass);
    const s = c.skills[slot];
    if (s.toggle) {
      if (h && !(h.mode === "home" || h.mode === "return")) return "Return";
      return s.name;
    }
    if (s.cd && h && h.skillCd[slot] > 0) {
      return s.name + " (" + Math.ceil(h.skillCd[slot]) + "s)";
    }
    if (s.mana) return s.name + " (" + s.mana + ")";
    if (s.cd) return s.name + " (" + s.cd + "s)";
    return s.name;
  }

  function skillDisabled(slot) {
    const h = run.hero;
    if (!h) return true;
    const s = classDef(h.klass).skills[slot];
    if (s.mana && h.mana < s.mana) return true;
    if (s.cd && h.skillCd[slot] > 0) return true;
    if (s.id === "whirl" && h.whirl) return true;
    return false;
  }

  function syncClassChrome() {
    const c = classDef(run.hero ? run.hero.klass : persist.klass);
    const hud = document.getElementById("hud-class");
    if (hud) {
      hud.textContent = c.name;
      hud.style.color = c.color;
    }
    const hint = document.getElementById("shop-hint");
    if (hint) hint.textContent = c.blurb + " Spend gold while they fight.";
    const keys = document.getElementById("keys");
    if (keys) {
      keys.textContent =
        "Click / Space: " +
        c.strikeName +
        " · 1 " +
        c.skills[0].name +
        " · 2 " +
        c.skills[1].name +
        " · 3 " +
        c.skills[2].name;
    }
  }

  function syncHud() {
    const h = run.hero;
    if (!h) return;
    document.getElementById("hp-fill").style.width = (100 * h.hp) / h.maxHp + "%";
    document.getElementById("mp-fill").style.width = (100 * h.mana) / h.maxMana + "%";
    document.getElementById("hp-text").textContent = `${fmt(h.hp)}/${fmt(h.maxHp)}`;
    document.getElementById("mp-text").textContent = `${fmt(h.mana)}/${fmt(h.maxMana)}`;
    document.getElementById("gold").textContent = fmt(run.gold);
    document.getElementById("mana-stat").textContent = fmt(h.mana);
    document.getElementById("wave").textContent = String(Math.max(1, run.wave));
    document.getElementById("kills").textContent = fmt(run.kills);
    document.getElementById("glory").textContent = fmt(persist.glory);
    const rage = h.buffs.rage > 0;
    const haste = h.buffs.haste > 0;
    const dmgEl = document.getElementById("st-dmg");
    const spdEl = document.getElementById("st-spd");
    dmgEl.textContent = fmt(h.dmg * (rage ? 1.35 : 1) * (lastStanding() ? 1.25 : 1));
    dmgEl.classList.toggle("hot", rage || lastStanding());
    spdEl.textContent = (h.atkRate * (haste ? 1.35 : 1) * (lastStanding() ? 1.2 : 1)).toFixed(2) + "/s";
    spdEl.classList.toggle("hot", haste || lastStanding());
    document.getElementById("st-armor").textContent = (Math.round(h.armor * 10) / 10).toString();
    document.getElementById("st-crit").textContent = Math.round(h.crit * 100) + "%";
    document.getElementById("st-leech").textContent = Math.round(h.leech * 100) + "%";
    document.getElementById("st-fortune").textContent = Math.round(h.goldFind * 100) + "%";
    document.getElementById("st-regen").textContent = h.manaRegen.toFixed(1) + "/s";
    const buffs = [];
    if (rage) buffs.push("Rage " + Math.ceil(h.buffs.rage) + "s");
    if (haste) buffs.push("Haste " + Math.ceil(h.buffs.haste) + "s");
    if (wolfAlive() && run.wolf.taunt > 0) buffs.push("Wolf taunt");
    if (lastStanding()) buffs.push("Last Stand");
    if (h.secondWind > 0) buffs.push("Wind " + h.secondWind);
    const buffEl = document.getElementById("st-buffs");
    buffEl.textContent = buffs.length ? buffs.join(" · ") : "—";
    buffEl.classList.toggle("hot", buffs.length > 0);
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById("btn-s" + (i + 1));
      btn.textContent = skillLabel(i);
      btn.disabled = skillDisabled(i);
    }
    for (const u of RUN_UPGRADES) {
      const btn = document.getElementById("buy-" + u.id);
      if (!btn) continue;
      const lv = run.levels[u.id] || 0;
      const cost = u.cost(lv);
      btn.textContent = fmt(cost);
      btn.disabled = run.gold < cost;
    }
  }

  function buildClassPick() {
    const fill = (el, compact) => {
      if (!el) return;
      el.innerHTML = "";
      for (const c of Object.values(CLASSES)) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "class-card" + (persist.klass === c.id ? " sel" : "");
        b.innerHTML = compact
          ? `<b>${c.name}</b><span>${c.tag}</span>`
          : `<b>${c.name}</b><span>${c.tag}</span><small>${c.blurb}</small>`;
        b.onclick = () => pickClass(c.id);
        el.appendChild(b);
      }
    };
    fill(document.getElementById("class-pick"), false);
    fill(document.getElementById("class-pick-dead"), true);
    syncClassChrome();
  }

  function buildShop() {
    const box = document.getElementById("upgrades");
    if (!box) return;
    box.innerHTML = "";
    const wave = Math.max(1, run.wave || 1);
    const next = nextShopUnlockWave(wave);
    const nextEl = document.getElementById("shop-next");
    if (nextEl) {
      nextEl.textContent = next
        ? "Next crate opens at wave " + next + "."
        : "The armory is fully open.";
    }
    for (const u of RUN_UPGRADES) {
      const need = shopUnlockWave(u);
      const open = wave >= need;
      if (!open && need !== next) continue;
      const lv = run.levels[u.id] || 0;
      const row = document.createElement("div");
      row.className = "row" + (open ? "" : " locked");
      if (!open) {
        row.innerHTML = `<div class="name">${u.icon} ${u.name}</div>
          <button type="button" disabled>wave ${need}</button>
          <div class="desc">${u.desc}</div>`;
        box.appendChild(row);
        continue;
      }
      row.innerHTML = `<div class="name">${u.icon} ${u.name} <span style="color:#8ea0b5">${lv}</span></div>
        <button id="buy-${u.id}" type="button">${fmt(u.cost(lv))}</button>
        <div class="desc">${u.desc}</div>`;
      box.appendChild(row);
      row.querySelector("button").onclick = () => buyRun(u.id);
    }
    syncClassChrome();
  }

  function applyPack(hero) {
    if (run.wolf && run.wolf.hp > 0) {
      run.wolf.maxHp += 16;
      run.wolf.hp += 16;
      run.wolf.dmg += 2;
    } else if (hero.klass !== "ranger") {
      hero.maxHp += 20;
      hero.hp = Math.min(hero.maxHp, hero.hp + 20);
    }
  }

  function buyRun(id) {
    const u = RUN_UPGRADES.find((x) => x.id === id);
    const lv = run.levels[id] || 0;
    const c = u.cost(lv);
    if (run.gold < c || state !== "fight") return;
    if (run.wave < shopUnlockWave(u)) return;
    run.gold -= c;
    run.levels[id] = lv + 1;
    u.apply(run.hero);
    if (u.id === "pack") applyPack(run.hero);
    buildShop();
    sfx(560, 0.08, "square", 0.05);
  }

  function buyPrestige(id) {
    const u = PRESTIGE_TREE.find((n) => n.id === id);
    if (!u) return false;
    const lv = persist.prest[u.id] || 0;
    if (lv >= (u.max || 8)) return false;
    if (!prestReqMet(u, persist.prest) && lv === 0) return false;
    const c = u.cost(lv);
    if (persist.glory < c) return false;
    persist.glory -= c;
    persist.prest[u.id] = lv + 1;
    save();
    const bank = document.getElementById("glory-bank");
    if (bank) bank.textContent = fmt(persist.glory);
    document.getElementById("glory").textContent = fmt(persist.glory);
    buildPrestige();
    sfx(500, 0.1, "sine", 0.05);
    return true;
  }

  function buildPrestige() {
    const box = document.getElementById("prestige-shop");
    if (!box) return;
    box.className = "tree";
    box.innerHTML = "";
    const bank = document.getElementById("glory-bank");
    if (bank) bank.textContent = fmt(persist.glory);
    const cols = [[], [], []];
    for (const n of PRESTIGE_TREE) cols[n.col].push(n);
    const titles = ["Vital", "Might", "Fortune"];
    cols.forEach((list, i) => {
      const col = document.createElement("div");
      col.className = "tree-col";
      col.innerHTML = `<h3>${titles[i]}</h3>`;
      list
        .sort((a, b) => a.row - b.row)
        .forEach((u) => {
          const lv = persist.prest[u.id] || 0;
          const open = prestReqMet(u, persist.prest);
          const maxed = lv >= (u.max || 8);
          const c = u.cost(lv);
          const node = document.createElement("div");
          node.className =
            "tree-node" + (lv > 0 ? " owned" : open ? " open" : " locked");
          const req = prestReqText(u);
          const btnLabel = maxed ? "MAX" : c + " glory";
          node.innerHTML = `<div class="name">${u.name} <span>${lv}/${u.max}</span></div>
            <div class="desc">${u.desc}</div>
            ${req && !open ? `<div class="req">Needs ${req}</div>` : ""}
            <button type="button">${btnLabel}</button>`;
          const btn = node.querySelector("button");
          btn.disabled = maxed || !open || persist.glory < c;
          btn.onclick = () => buyPrestige(u.id);
          col.appendChild(node);
        });
      box.appendChild(col);
    });
  }

  // --- loop / resize ---
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(640, Math.floor(r.width));
    H = canvas.height = Math.max(360, Math.floor(r.height));
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(src));
      i.src = src;
    });
  }

  async function loadAll() {
    const n = (p) => loadImage(p);
    const seq = async (prefix, count) => {
      const out = [];
      for (let i = 1; i <= count; i++) out.push(await n(prefix + i + ".png"));
      return out;
    };
    img.bg = await n("assets/bg/forest.jpg");
    img.hero = await n("assets/sprites/hero/hero.png");
    img.heroIdle = await seq("assets/sprites/hero/idle_", 6);
    img.heroAtk = await seq("assets/sprites/hero/atk_", 4);
    img.heroMage = await n("assets/sprites/hero/mage.png");
    img.heroRanger = await n("assets/sprites/enemies/archer.png");
    img.wolf = await n("assets/sprites/hero/wolf.png");
    img.grunt = await n("assets/sprites/enemies/grunt.png");
    img.shield = await n("assets/sprites/enemies/shield.png");
    img.berserk = await n("assets/sprites/enemies/berserk.png");
    img.archer = await n("assets/sprites/enemies/archer.png");
    img.mage = await n("assets/sprites/enemies/mage.png");
    img.healer = await n("assets/sprites/enemies/healer.png");
    img.assassin = await n("assets/sprites/enemies/assassin.png");
    img.butcher = await n("assets/sprites/enemies/butcher.png");
    img.ironhide = await n("assets/sprites/enemies/ironhide.png");
    img.skycleaver = await n("assets/sprites/enemies/skycleaver.png");
    img.stormcaller = await n("assets/sprites/enemies/stormcaller.png");
    img.sunfallen = await n("assets/sprites/enemies/sunfallen.png");
    img.gruntWalk = await seq("assets/sprites/enemies/walk_", 6);
    img.arrow = await n("assets/sprites/fx/arrow.png");
    img.bolt = await n("assets/sprites/fx/bolt.png");
    img.fire = await n("assets/sprites/fx/fire.png");
    img.coin = await n("assets/ui/coin.png");
    img.heart = await n("assets/ui/heart.png");
    img.mana = await n("assets/ui/mana.png");
    meta.loaded = true;
  }

  // --- input ---
  document.getElementById("btn-start").onclick = () => {
    audio();
    startRun();
  };
  document.getElementById("btn-again").onclick = () => startRun();
  document.getElementById("btn-s1").onclick = () => useSkill(0);
  document.getElementById("btn-s2").onclick = () => useSkill(1);
  document.getElementById("btn-s3").onclick = () => useSkill(2);
  canvas.addEventListener("pointerdown", (ev) => {
    if (state === "title") return;
    if (state === "fight") powerStrike();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space") {
      ev.preventDefault();
      if (state === "title") startRun();
      else powerStrike();
    }
    if (ev.key === "1") useSkill(0);
    if (ev.key === "2") useSkill(1);
    if (ev.key === "3") useSkill(2);
    if (ev.key === "p" || ev.key === "P") paused = !paused;
  });
  window.addEventListener("resize", resize);

  window.unending = {
    get run() {
      return run;
    },
    get persist() {
      return persist;
    },
    startRun,
    die,
    pickClass,
    buyPrestige,
    glory(n) {
      persist.glory += n || 0;
      save();
      const bank = document.getElementById("glory-bank");
      if (bank) bank.textContent = fmt(persist.glory);
      document.getElementById("glory").textContent = fmt(persist.glory);
      if (state === "dead") buildPrestige();
    },
    kill() {
      if (run.hero) {
        run.hero.hp = 0;
        die();
      }
    },
    give(gold, mana) {
      run.gold += gold || 0;
      if (run.hero && mana) run.hero.mana = Math.min(run.hero.maxMana, run.hero.mana + mana);
      buildShop();
    },
    jump(wave) {
      run.wave = Math.max(0, (wave || 1) - 1);
      run.enemies = [];
      run.waveTimer = 0.05;
    },
    smite() {
      [...run.enemies].forEach(killEnemy);
    },
  };

  buildClassPick();
  resize();
  loadAll()
    .then(() => requestAnimationFrame(loop))
    .catch((err) => {
      console.error(err);
      document.getElementById("title").querySelector("p").textContent =
        "Failed to load sprites. Serve the folder over HTTP.";
    });
})();
