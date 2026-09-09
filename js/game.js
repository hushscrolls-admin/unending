(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const SAVE_KEY = "unending-save-v2";
  const RUN_KEY = "unending-run-v2";
  let saveTimer = 0;
  let buyAmount = 1;
  const PLAYER_SCREEN_X = 220;
  const HOME_X = 80;
  const GROUND = 0.78;
  const WHIRL_RANGE = 220;
  const WHIRL_CD = 6;
  const FORWARD_X = HOME_X + 280;
  const CHARGE_SPEED = 560;
  const RETURN_SPEED = 500;

  const img = {};
  const meta = { loaded: false };

  let W = 1280;
  let H = 720;
  let state = "title";
  let last = 0;
  let camera = 0;
  let shake = 0;
  let toastT = 0;
  let paused = false;

  const persist = loadSave();
  const run = emptyRun();
  const fx = { floats: [], bolts: [], drops: [], gibs: [] };

  function emptyRun() {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      wave: 0,
      kills: 0,
      gold: 0,
      waveTimer: 0.45,
      cleared: [], ledger: {}, bosses: [], talents: {}, offers: [], pendingChoices: 0,
      elapsed: 0, idleTime: 0, purchases: 0, damageTaken: {}, bossTimes: {},
      autoBuy: "off", autoTimer: 0, claimedGlory: 0, campaignDone: false, victoryPending: false,
      hero: null,
      enemies: [],
      levels: Object.fromEntries(RUN_UPGRADES.map((u) => [u.id, 0])),
    };
  }

  function loadSave() {
    const blank = { glory: 0, bestWave: 0, prest: {}, branch: "vanguard", milestones: [], endless: false };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (raw && typeof raw === "object") {
        const result = { ...blank, ...raw };
        result.glory = Math.max(0, Number(result.glory) || 0);
        result.prest = Object.fromEntries(PRESTIGE_UPGRADES.map(u => [u.id, Math.min(u.max, Math.max(0, Math.floor(Number(raw.prest?.[u.id]) || 0)))]));
        if (!BRANCHES.some(b => b.id === result.branch)) result.branch = "vanguard";
        if (!Array.isArray(result.milestones)) result.milestones = [];
        return result;
      }
      const old = JSON.parse(localStorage.getItem("unending-save-v1") || "null");
      if (old) {
        blank.glory = Math.max(0, Number(old.glory) || 0);
        for (const [id, value] of Object.entries(old.prest || {})) {
          const lv = Math.max(0, Math.floor(Number(value) || 0));
          if (["blood", "might", "purse"].includes(id)) blank.glory += lv * lv;
          if (["greed", "spark"].includes(id)) blank.glory += lv * (lv + 1);
          if (id === "fate") blank.glory += 2 * lv + 1.5 * lv * (lv - 1);
        }
        blank.bestWave = Math.max(0, (Number(old.bestWave) || 0) - 1);
        blank.migrated = true;
      }
    } catch (e) { /* A damaged save starts safely; the legacy save is retained. */ }
    return blank;
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(persist)); }
    catch (e) { toast("Saving unavailable in this browser"); }
  }

  function saveRun() {
    if (!["fight", "talent", "victory"].includes(state) || !run.hero) return;
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({ version: 2, state, run: {
        ...run, enemies: run.enemies.map(({ def, ...enemy }) => enemy),
      }, bolts: fx.bolts, drops: fx.drops }));
    } catch (e) { /* The live run remains playable if storage is full. */ }
  }

  function savedRun() {
    try {
      const data = JSON.parse(localStorage.getItem(RUN_KEY) || "null");
      if (data?.version === 2 && ["fight", "talent", "victory"].includes(data.state) &&
          data.run?.hero?.hp > 0 && Array.isArray(data.run.enemies) &&
          data.run.enemies.every(e => ENEMIES[e.type]) && Array.isArray(data.run.cleared)) return data;
    } catch (e) { /* Ignore an incomplete snapshot. */ }
    return null;
  }

  function resumeRun() {
    const data = savedRun();
    if (!data) return;
    Object.assign(run, emptyRun(), data.run);
    run.enemies = run.enemies.map(e => ({ ...e, def: ENEMIES[e.type] }));
    fx.bolts = data.bolts || []; fx.drops = data.drops || [];
    paused = false; state = "fight";
    showFight();
    if (data.state === "talent") showTalent();
    else if (data.state === "victory") showVictory();
    syncHud();
  }

  function showFight() {
    for (const id of ["title", "dead", "talent", "victory"]) document.getElementById(id).classList.add("hidden");
    for (const id of ["hud", "shop", "keys"]) document.getElementById(id).classList.remove("hidden");
    document.getElementById("auto-buy").value = run.autoBuy;
    document.getElementById("pause-label").classList.add("hidden");
    buildShop();
  }

  function rank(id) { return run.talents[id] || 0; }
  function keystone(branch) { return persist.branch === branch && persist.prest[branch + "_keystone"] > 0; }

  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function makeHero() {
    const p = persist.prest;
    const branch = persist.branch;
    const body = p[branch + "_body"] || 0;
    const craft = p[branch + "_craft"] || 0;
    const hero = {
      x: HOME_X,
      homeX: HOME_X,
      mode: "home",
      hp: 140 * (1 + body * 0.05),
      maxHp: 140 * (1 + body * 0.05),
      dmg: 12 * (1 + (branch === "ravager" ? craft * 0.04 : 0)),
      armor: branch === "vanguard" ? craft : 0,
      atkRate: 0.9,
      atkT: 0,
      reach: 92,
      walk: 95,
      crit: 0.05,
      leech: 0,
      goldFind: 1,
      mana: 30,
      maxMana: 80,
      manaRegen: 1.8 + (branch === "spellblade" ? craft * 0.2 : 0),
      anim: "idle",
      animT: 0,
      flash: 0,
      strikeCd: 0, mendCd: 0, shield: 0, shieldT: 0, shieldCd: 0, empowered: false,
      whirlCd: 0,
      whirl: null,
      buffs: { rage: 0, haste: 0 },
    };
    run.gold = 24;
    for (const u of RUN_UPGRADES) {
      const lv = run.levels[u.id] || 0;
      for (let i = 0; i < lv; i++) u.apply(hero);
    }
    hero.hp = Math.min(hero.maxHp, hero.hp);
    return hero;
  }

  function startRun() {
    Object.assign(run, emptyRun());
    run.hero = makeHero();
    camera = HOME_X - PLAYER_SCREEN_X;
    fx.floats.length = 0; fx.bolts.length = 0; fx.drops.length = 0; fx.gibs.length = 0;
    paused = false; state = "fight";
    document.querySelector("#dead h1").textContent = "FALLEN";
    showFight(); syncHud(); save(); saveRun();
    sfx(220, 0.12, "square", 0.04);
  }

  function gloryFor() { return run.cleared.length + run.bosses.length * 8; }
  function bankGlory() {
    // Keep the bank receipt with permanent currency so an older run snapshot
    // cannot pay the same Glory twice after a crash between storage writes.
    const receipt = persist.lastBank?.id === run.id ? persist.lastBank.total : 0;
    run.claimedGlory = Math.max(run.claimedGlory, receipt);
    const earned = Math.max(0, gloryFor() - run.claimedGlory);
    persist.glory += earned; run.claimedGlory += earned;
    persist.lastBank = { id: run.id, total: run.claimedGlory };
    persist.bestWave = Math.max(persist.bestWave, ...run.cleared, 0);
    save(); return earned;
  }

  function die() {
    if (state !== "fight") return;
    const g = bankGlory();
    try { localStorage.removeItem(RUN_KEY); } catch (e) { /* optional storage */ }
    state = "dead";
    shake = 0;
    document.getElementById("dead").classList.remove("hidden");
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("keys").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("dead-summary").textContent =
      `Cleared ${run.cleared.length} waves · ${run.kills} kills · best cleared ${persist.bestWave}`;
    document.getElementById("dead-glory").textContent = fmt(g);
    document.getElementById("run-recap").textContent = recap();
    buildPrestige();
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
  }

  // --- combat helpers ---
  function dmgIn(raw, armor) {
    return Math.max(1, raw * (100 / (100 + armor * 8)));
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

  function hitHero(amount, srcX, crit, source = "Enemy") {
    if (state !== "fight") return;
    const h = run.hero;
    const raw = dmgIn(amount, h.armor);
    const absorbed = Math.min(h.shield, raw); h.shield -= absorbed;
    const d = raw - absorbed;
    run.damageTaken[source] = (run.damageTaken[source] || 0) + d;
    run.lastHit = source;
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
    if (h.hp <= 0) {
      h.hp = 0;
      die();
    }
  }

  function enemyStrike(e) {
    let dmg = e.dmg;
    const crit = Math.random() < (e.def.crit || 0);
    if (crit) dmg *= 2;
    hitHero(dmg, e.x, crit, e.def.name);
  }

  function hitEnemy(e, amount, crit, area = false, dot = false) {
    if (e.hp <= 0 || !run.enemies.includes(e)) return;
    const d = Math.min(e.hp, dot ? amount * (100 / (100 + e.armor * 8)) : dmgIn(amount, e.armor));
    e.hp -= d;
    e.flash = 0.1;
    floatText(e.x, groundY() - 160, (crit ? "CRIT " : "") + fmt(d), crit ? "#ffe27a" : "#fff");
    const h = run.hero;
    if (h.leech > 0 && !dot) {
      const heal = d * Math.min(0.08, h.leech) * (area ? 0.25 : 1);
      h.hp = Math.min(h.maxHp, h.hp + heal);
    }
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (!run.enemies.includes(e)) return;
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
    run.enemies = run.enemies.filter((x) => x !== e);
    const ledger = run.ledger[e.wave];
    if (ledger && --ledger.remaining === 0) clearWave(e.wave);
    if (!run.enemies.length) run.waveTimer = Math.min(run.waveTimer, e.def.boss ? 5 : 2);
  }

  function bossAlive() {
    return run.enemies.some((e) => e.def.boss);
  }

  function spawnWave() {
    const n = run.wave;
    const roster = waveRoster(n);
    const sc = waveScale(n);
    // Fixed world-space approach: viewport size cannot change combat timing.
    const base = HOME_X + 520;
    run.ledger[n] = { remaining: roster.length, started: run.elapsed };
    roster.forEach((type, i) => {
      const def = ENEMIES[type];
      run.enemies.push({
        type,
        def,
        x: base + i * 18,
        wave: n, bleed: 0, bleedT: 0,
        hp: def.hp * sc.hp * (def.boss ? 3 : 1),
        maxHp: def.hp * sc.hp * (def.boss ? 3 : 1),
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
      });
    });
    if (isBossWave(n)) {
      toast("BOSS  " + defTitle(n));
      sfx(140, 0.22, "sawtooth", 0.06);
    } else {
      toast("Wave " + n);
      sfx(360, 0.1, "square", 0.04);
    }
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

  function swing(mult) {
    const h = run.hero;
    h.anim = "atk";
    h.animT = 0;
    const bonus = h.buffs.rage > 0 ? 1.35 : 1;
    let dmg = h.dmg * (mult || 1) * bonus;
    const crit = Math.random() < Math.min(0.35, h.crit);
    if (crit) dmg *= 2;
    const target = nearest(
      h.x,
      (e) => inMelee(e, h.reach + 16) && !shadowedBehind(e)
    );
    if (target) {
      if (!run.enemies.some(e => e !== target && Math.abs(e.x - target.x) < 150)) dmg *= 1 + rank("duelist") * 0.12;
      if (h.empowered) { dmg *= 1.6; h.empowered = false; }
      if (mult > 1 && target.def.heal) {
        target.healT = Math.max(target.healT, 2.4);
        floatText(target.x, groundY() - 205, "INTERRUPT", "#6ec4ff");
      }
      hitEnemy(target, dmg, crit);
    }
    sfx(crit ? 520 : 240, 0.06, "square", 0.05);
  }

  function powerStrike() {
    const h = run.hero;
    if (state !== "fight" || paused || h.strikeCd > 0) return;
    h.strikeCd = 1.35;
    swing(2.15);
    shake = 8;
  }

  function mend() {
    const h = run.hero;
    if (state !== "fight" || paused || h.mendCd > 0 || h.mana < 25) return;
    h.mana -= 25; h.mendCd = 4;
    if (keystone("spellblade")) h.empowered = true;
    const heal = h.maxHp * (0.18 + rank("ward") * 0.03);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floatText(h.x, groundY() - 200, "+" + fmt(heal), "#8fd18f");
    sfx(480, 0.12, "sine", 0.05);
  }

  function charge() {
    const h = run.hero;
    if (state !== "fight" || paused) return;
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
    const bonus = h.buffs.rage > 0 ? 1.35 : 1;
    const dmg = h.dmg * 0.65 * bonus * (1 + rank("reach") * 0.08);
    const targets = run.enemies.filter((e) => Math.abs(e.x - h.x) < WHIRL_RANGE + rank("reach") * 25);
    for (const e of targets) {
      hitEnemy(e, dmg, false, true);
      if (keystone("ravager") && e.hp > 0) { e.bleed = h.dmg * 0.45 / 3; e.bleedT = 3; }
    }
    shake = 7;
    sfx(170, 0.08, "sawtooth", 0.045);
  }

  function whirlwind() {
    const h = run.hero;
    if (state !== "fight" || paused || h.whirlCd > 0 || h.whirl) return;
    h.whirlCd = WHIRL_CD;
    h.whirl = { t: 0, next: 0, left: 3 };
    h.anim = "atk";
    h.animT = 0;
  }

  function pickup(d) {
    const h = run.hero;
    if (d.kind === "heart") {
      const heal = h.maxHp * 0.10;
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
    run.elapsed += dt;
    if (!run.enemies.length) run.idleTime += dt;
    h.mendCd = Math.max(0, h.mendCd - dt);
    h.shieldCd = Math.max(0, h.shieldCd - dt); h.shieldT = Math.max(0, h.shieldT - dt);
    if (!h.shieldT) h.shield = 0;
    h.flash = Math.max(0, h.flash - dt);
    h.strikeCd = Math.max(0, h.strikeCd - dt);
    h.whirlCd = Math.max(0, h.whirlCd - dt);
    h.buffs.rage = Math.max(0, h.buffs.rage - dt);
    h.buffs.haste = Math.max(0, h.buffs.haste - dt);
    h.mana = Math.min(h.maxMana, h.mana + h.manaRegen * dt);
    shake = Math.max(0, shake - dt * 18);
    camera = HOME_X - PLAYER_SCREEN_X;

    if (!bossAlive()) {
      run.waveTimer -= dt;
      if (run.waveTimer <= 0 && run.enemies.length + waveRoster(run.wave + 1).length <= 14 &&
          !(isBossWave(run.wave + 1) && run.enemies.length) && !(run.wave >= 50 && !run.campaignDone)) {
        run.wave += 1;
        spawnWave();
        run.waveTimer = nextWaveDelay(run.wave);
      }
    }

    const melee = run.enemies.filter(
      (e) => inMelee(e, h.reach + 16) && !shadowedBehind(e)
    );

    if (h.mode === "charge") {
      h.x += CHARGE_SPEED * dt;
      h.anim = "atk";
      h.animT = 0.12;
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
        if (keystone("vanguard") && h.shieldCd <= 0) {
          h.shield = h.maxHp * 0.15; h.shieldT = 4; h.shieldCd = 10;
        }
      }
    }

    if (h.whirl) {
      h.whirl.t += dt;
      h.anim = "atk";
      h.animT = (h.whirl.t % 0.14);
      if (h.whirl.t >= h.whirl.next && h.whirl.left > 0) {
        whirlHit();
        h.whirl.left -= 1;
        h.whirl.next += 0.14;
      }
      if (h.whirl.left <= 0 && h.whirl.t >= 0.42) h.whirl = null;
    } else if (h.mode === "charge" || h.mode === "return") {
      /* dashing */
    } else {
      // Animation and cooldown advance together, so displayed speed matches attacks.
      h.animT += dt;
      if (h.anim === "atk" && h.animT >= 0.34) h.anim = "idle";
      h.atkT = Math.max(0, h.atkT - dt * h.atkRate * (h.buffs.haste > 0 ? 1.35 : 1));
      if (melee.length && h.atkT <= 0) { h.atkT = 1; swing(1); }
    }

    for (const e of [...run.enemies]) {
      if (e.bleedT > 0) {
        const tick = Math.min(dt, e.bleedT); e.bleedT -= tick;
        hitEnemy(e, e.bleed * tick, false, true, true);
        if (e.hp <= 0) continue;
      }
      e.flash = Math.max(0, e.flash - dt);
      e.animT += dt;
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
      const dx = e.x - h.x;
      e.facing = dx >= 0 ? -1 : 1;
      if (ranged) {
        const desired = h.homeX + e.def.keep;
        if (e.x > desired + 8) {
          e.x -= spd * dt;
          e.anim = "walk";
        } else {
          e.anim = "idle";
        }
        if (e.def.heal) {
          e.healT -= dt;
          if (e.healT <= 0) {
            e.healT = e.def.healRate;
            let hurt = nearest(e.x, (o) => o !== e && o.hp < o.maxHp - 1);
            if (!hurt && e.hp < e.maxHp - 1) hurt = e;
            if (hurt) {
              const amt = e.def.heal * waveScale(e.wave).hp * 0.55;
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
                  dmg: e.dmg, source: e.def.name,
                });
              }
              sfx(e.def.projectile === "bolt" ? 420 : 500, 0.05, "triangle", 0.03);
            }
          }
        }
      } else {
        const closeIn = Math.max(56, h.reach - 16);
        if (Math.abs(dx) > closeIn) {
          e.x += Math.sign(h.x - e.x) * spd * dt;
          e.anim = "walk";
        } else {
          e.anim = "idle";
          e.atkT -= dt * e.def.atkRate;
          if (e.atkT <= 0) {
            e.atkT = 1;
            e.anim = "atk";
            e.animT = 0;
            enemyStrike(e);
            if (state !== "fight") return;
          }
        }
      }
    }

    for (const b of fx.bolts) {
      b.x += b.vx * dt;
      if (Math.abs(b.x - h.x) < 30) {
        hitHero(b.dmg, b.x, false, b.source);
        if (state !== "fight") return;
        b.dead = true;
      }
      if (b.x < HOME_X - 600 || b.x > HOME_X + 1200) b.dead = true;
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

    run.autoTimer -= dt;
    if (run.autoBuy !== "off" && run.autoTimer <= 0) {
      run.autoTimer = 0.5;
      const id = run.autoBuy === "balanced" ? balancedUpgrade() : run.autoBuy;
      if (id) buyRun(id, 1, true);
    }
    if (run.pendingChoices > 0) showTalent();
    else if (run.victoryPending) showVictory();
    saveTimer += dt;
    if (saveTimer >= 3) { saveTimer = 0; saveRun(); }
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
    if (o.flash) ctx.filter = "brightness(2.6) saturate(0.4)";
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

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ox = state === "fight" && shake ? (Math.random() - 0.5) * shake : 0;
    const oy = state === "fight" && shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(ox, oy);
    drawBg();

    const gy = groundY();
    const h = run.hero;

    if (h) {
      let spr = img.hero;
      if (h.anim === "atk" && img.heroAtk.length) {
        const i = Math.min(img.heroAtk.length - 1, Math.floor(h.animT / 0.08));
        spr = img.heroAtk[i];
      } else if (img.heroIdle.length) {
        spr = frameOf(img.heroIdle, h.animT, 6);
      }
      drawImg(spr, sx(h.x), gy + 6, 168, { flash: h.flash > 0 });
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
        ctx.arc(sx(h.x), gy - 80, 50 + (h.whirl.t * 80) % 40, 0, Math.PI * 2);
        ctx.stroke();
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
        flash: e.flash > 0,
        flip: face > 0,
      });
      drawHpBar(
        sx(e.x),
        gy - hgt - 18,
        e.def.boss ? 110 : 70,
        e.hp,
        e.maxHp,
        e.def.color
      );
    }

    for (const b of fx.bolts) {
      const spr = b.kind === "bolt" ? img.bolt : img.arrow;
      drawImg(spr, sx(b.x), b.y + 40, b.kind === "bolt" ? 36 : 28, {
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
    dmgEl.textContent = fmt(h.dmg * (rage ? 1.35 : 1));
    dmgEl.classList.toggle("hot", rage);
    spdEl.textContent = (h.atkRate * (haste ? 1.35 : 1)).toFixed(2) + "/s";
    spdEl.classList.toggle("hot", haste);
    document.getElementById("st-armor").textContent = (Math.round(h.armor * 10) / 10).toString();
    document.getElementById("st-crit").textContent = Math.round(h.crit * 100) + "%";
    document.getElementById("st-leech").textContent = Math.round(h.leech * 100) + "%";
    document.getElementById("st-fortune").textContent = Math.round(h.goldFind * 100) + "%";
    document.getElementById("st-regen").textContent = h.manaRegen.toFixed(1) + "/s";
    const buffs = [];
    if (rage) buffs.push("Rage " + Math.ceil(h.buffs.rage) + "s");
    if (haste) buffs.push("Haste " + Math.ceil(h.buffs.haste) + "s");
    const buffEl = document.getElementById("st-buffs");
    buffEl.textContent = buffs.length ? buffs.join(" · ") : "—";
    buffEl.classList.toggle("hot", buffs.length > 0);
    document.getElementById("btn-mend").disabled = h.mana < 25 || h.mendCd > 0;
    document.getElementById("btn-mend").textContent = h.mendCd > 0 ? `Mend (${Math.ceil(h.mendCd)}s)` : "Mend (25)";
    const next = Math.max(1, run.wave + (run.cleared.includes(run.wave) ? 1 : 0));
    document.getElementById("milestone").textContent = next > 50 ? `Endless · next boss ${Math.ceil(next / 10) * 10}` : `${CHAPTERS[Math.floor((next - 1) / 10)]} · boss ${Math.ceil(next / 10) * 10}`;
    document.getElementById("wave-status").textContent = bossAlive() ? "Defeat the boss · Power Strike interrupts healing" : (run.waveTimer <= 0 && run.enemies.length ? "Next wave waiting · clear enemies" : `${run.enemies.length} enemies · next wave ${Math.ceil(Math.max(0, run.waveTimer))}s`);
    document.getElementById("btn-next").disabled = paused || state !== "fight" || bossAlive() || run.enemies.length > 0;
    document.getElementById("btn-pause").textContent = paused ? "Resume (P)" : "Pause (P)";
    document.getElementById("talent-list").textContent = Object.entries(run.talents).map(([id, lv]) => `${TALENTS.find(t => t.id === id).name} ${lv}/3`).join(" · ") || "First talent after wave 5";
    document.getElementById("specialization").textContent = `${BRANCHES.find(b => b.id === persist.branch).name}${h.shield > 0 ? ` · Shield ${fmt(h.shield)}` : ""}${h.empowered ? " · Spellsteel ready" : ""}`;
    const whirlBtn = document.getElementById("btn-whirl");
    if (h.whirlCd > 0) {
      whirlBtn.disabled = true;
      whirlBtn.textContent = "Whirlwind (" + Math.ceil(h.whirlCd) + "s)";
    } else {
      whirlBtn.disabled = false;
      whirlBtn.textContent = "Whirlwind (" + WHIRL_CD + "s)";
    }
    const chargeBtn = document.getElementById("btn-charge");
    chargeBtn.disabled = false;
    chargeBtn.textContent =
      h.mode === "home" || h.mode === "return" ? "Charge" : "Return";
    // live cost buttons
    for (const u of RUN_UPGRADES) {
      const btn = document.getElementById("buy-" + u.id);
      if (!btn) continue;
      const lv = run.levels[u.id] || 0;
      const c = u.cost(lv);
      const quote = purchaseQuote(u);
      btn.textContent = lv >= u.max ? "Max" : `${fmt(quote.cost)}g${quote.count > 1 ? ` ×${quote.count}` : ""}`;
      btn.disabled = lv >= u.max || run.gold < quote.cost;
    }
  }

  function buildShop() {
    const box = document.getElementById("upgrades");
    box.innerHTML = "";
    for (const u of RUN_UPGRADES) {
      const lv = run.levels[u.id] || 0;
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="name">${u.icon} ${u.name} <span style="color:#8ea0b5">${lv}</span></div>
        <button id="buy-${u.id}" type="button">${fmt(u.cost(lv))}</button>
        <div class="desc">${u.desc}</div>`;
      box.appendChild(row);
      row.querySelector("button").onclick = () => buyRun(u.id);
    }
  }

  function balancedUpgrade() {
    const h = run.hero;
    const score = u => {
      const cost = u.cost(run.levels[u.id] || 0);
      if (u.id === "iron") return 1.8 * 1.5 / h.dmg / cost;
      if (u.id === "swift") return 1.8 * 0.04 / h.atkRate / cost;
      return (12 / h.maxHp + 0.048 / (1 + h.armor * 0.08)) / cost * (h.hp < h.maxHp * 0.6 ? 2 : 1);
    };
    return RUN_UPGRADES.filter(u => (run.levels[u.id] || 0) < u.max && u.cost(run.levels[u.id] || 0) <= run.gold)
      .sort((a, b) => score(b) - score(a))[0]?.id;
  }

  function purchaseQuote(u, count = buyAmount) {
    let lv = run.levels[u.id] || 0, cost = 0, bought = 0;
    const limit = count === "max" ? u.max : Number(count);
    while (lv + bought < u.max && bought < limit) {
      const next = u.cost(lv + bought);
      if (bought && cost + next > run.gold) break;
      cost += next; bought++;
    }
    return { cost, count: bought };
  }

  function buyRun(id, count = buyAmount, automatic = false) {
    const u = RUN_UPGRADES.find(x => x.id === id);
    if (!u || state !== "fight" || paused || (run.levels[id] || 0) >= u.max) return;
    const quote = purchaseQuote(u, count);
    if (run.gold < quote.cost || !quote.count) return;
    run.gold -= quote.cost;
    run.levels[id] = (run.levels[id] || 0) + quote.count;
    for (let i = 0; i < quote.count; i++) u.apply(run.hero);
    run.purchases += quote.count;
    if (!automatic) run.manualPurchases = (run.manualPurchases || 0) + 1;
    buildShop();
    if (!automatic) { sfx(560, 0.08, "square", 0.05); saveRun(); }
  }

  function buildPrestige() {
    const box = document.getElementById("prestige-shop"); box.innerHTML = "";
    document.getElementById("prestige-glory").textContent = `${fmt(persist.glory)} Glory · only your selected branch applies`;
    for (const branch of BRANCHES) {
      const panel = document.createElement("section"); panel.className = "branch";
      const heading = document.createElement("button"); heading.className = "branch-select";
      heading.textContent = `${persist.branch === branch.id ? "✓ " : ""}${branch.name}`;
      heading.onclick = () => { if (state !== "dead") return; persist.branch = branch.id; save(); buildPrestige(); };
      panel.appendChild(heading);
      const desc = document.createElement("p"); desc.className = "branch-desc"; desc.textContent = branch.desc; panel.appendChild(desc);
      const invested = (persist.prest[branch.id + "_body"] || 0) + (persist.prest[branch.id + "_craft"] || 0);
      for (const u of PRESTIGE_UPGRADES.filter(u => u.branch === branch.id)) {
        const lv = persist.prest[u.id] || 0, cost = u.cost(lv);
        const row = document.createElement("div"); row.className = "row";
        row.innerHTML = `<div class="name">${u.name} ${lv}/${u.max}</div><button type="button">${lv >= u.max ? "Max" : cost + " Glory"}</button><div class="desc">${u.desc}${u.requires ? " · Requires 6 minor ranks" : ""}</div>`;
        const btn = row.querySelector("button");
        btn.disabled = lv >= u.max || persist.glory < cost || invested < (u.requires || 0);
        btn.onclick = () => {
          if (state !== "dead" || btn.disabled) return;
          persist.glory -= cost; persist.prest[u.id] = lv + 1; save(); buildPrestige();
        };
        panel.appendChild(row);
      }
      box.appendChild(panel);
    }
  }

  function clearWave(n) {
    if (run.cleared.includes(n)) return;
    run.cleared.push(n);
    if (isBossWave(n)) {
      run.bosses.push(n);
      run.bossTimes[n] = run.elapsed - run.ledger[n].started;
      const reward = Math.floor(65 * waveScale(n).gold);
      run.gold += reward;
      run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + run.hero.maxHp * 0.15);
      run.hero.mana = Math.min(run.hero.maxMana, run.hero.mana + 20);
      if (!persist.milestones.includes(n)) {
        persist.milestones.push(n); persist.glory += 10; save();
        toast(`Boss cleared · +${reward}g · +10 first-clear Glory`);
      } else toast(`Boss cleared · +${reward}g · health and mana restored`);
    }
    if (n % 5 === 0) run.pendingChoices++;
    if (n === 50 && !run.campaignDone) run.victoryPending = true;
  }

  function talentPool() {
    const owned = Object.keys(run.talents).length;
    return TALENTS.filter(t => rank(t.id) < 3 && (rank(t.id) > 0 || owned < 4));
  }

  function showTalent() {
    if (run.pendingChoices <= 0) return;
    const pool = talentPool();
    if (!pool.length) { run.pendingChoices = 0; run.offers = []; return; }
    state = "talent";
    if (!run.offers.length) {
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      run.offers = shuffled.slice(0, 3).map(t => t.id);
    }
    const box = document.getElementById("talent-options"); box.innerHTML = "";
    for (const id of run.offers) {
      const t = TALENTS.find(t => t.id === id); if (!t) continue;
      const btn = document.createElement("button"); btn.className = "talent-card";
      btn.innerHTML = `<strong>${t.name}</strong><span>Rank ${rank(id) + 1}/3</span><p>${t.desc}</p>`;
      btn.onclick = () => chooseTalent(id); box.appendChild(btn);
    }
    document.getElementById("talent").classList.remove("hidden");
    saveRun();
  }

  function chooseTalent(id) {
    if (state !== "talent" || !run.offers.includes(id) || !talentPool().some(t => t.id === id)) return;
    run.talents[id] = rank(id) + 1;
    if (id === "edge") run.hero.crit = Math.min(0.35, run.hero.crit + 0.05);
    if (id === "leech") run.hero.leech = Math.min(0.08, run.hero.leech + 0.02);
    if (id === "fortune") run.hero.goldFind += 0.08;
    run.pendingChoices--; run.offers = [];
    document.getElementById("talent").classList.add("hidden"); state = "fight";
    if (run.pendingChoices > 0) showTalent();
    if (state === "fight" && run.victoryPending) showVictory();
    syncHud(); saveRun();
  }

  function recap() {
    const top = Object.entries(run.damageTaken).sort((a, b) => b[1] - a[1])[0];
    const talents = Object.entries(run.talents).map(([id, lv]) => `${TALENTS.find(t => t.id === id)?.name || id} ${lv}`).join(", ") || "No talents yet";
    const minutes = run.elapsed / 60;
    const bosses = Object.entries(run.bossTimes).map(([n, seconds]) => `W${n}: ${Math.round(seconds)}s`).join(" · ");
    return `${Math.floor(minutes)}m ${Math.floor(run.elapsed % 60)}s · ${Math.round(100 * run.idleTime / Math.max(1, run.elapsed))}% without enemies · ${run.purchases} ranks bought (${((run.manualPurchases || 0) / Math.max(1 / 60, minutes)).toFixed(1)} manual purchases/min). ${run.lastHit && state === "dead" ? `Final hit: ${run.lastHit}. ` : ""}${top ? `Most damage: ${top[0]} (${fmt(top[1])}). ` : ""}${bosses ? `Boss times: ${bosses}. ` : ""}Build: ${talents}.`;
  }

  function showVictory() {
    run.victoryPending = false; run.campaignDone = true;
    if (!persist.endless) { persist.endless = true; persist.glory += 50; }
    bankGlory(); state = "victory";
    document.getElementById("victory-recap").textContent = recap();
    document.getElementById("victory").classList.remove("hidden");
    saveRun();
  }

  function returnToCamp() {
    if (state !== "victory") return;
    state = "fight";
    document.getElementById("victory").classList.add("hidden");
    die();
    document.querySelector("#dead h1").textContent = "ROAD COMPLETE";
  }

  function togglePause() {
    if (state !== "fight") return;
    paused = !paused;
    document.getElementById("pause-label").classList.toggle("hidden", !paused);
    syncHud(); saveRun();
  }

  function callWave() {
    if (state !== "fight" || paused || bossAlive() || run.enemies.length) return;
    run.waveTimer = 0;
  }

  function respec() {
    if (state !== "dead") return;
    for (const u of PRESTIGE_UPGRADES) {
      for (let lv = 0; lv < (persist.prest[u.id] || 0); lv++) persist.glory += u.cost(lv);
    }
    persist.prest = {}; save(); buildPrestige();
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
    img.coin = await n("assets/ui/coin.png");
    img.heart = await n("assets/ui/heart.png");
    img.mana = await n("assets/ui/mana.png");
    meta.loaded = true;
  }

  // --- input ---
  document.getElementById("btn-start").onclick = () => {
    try { audio(); } catch (e) { /* Audio is optional. */ }
    startRun();
  };
  document.getElementById("btn-again").onclick = () => startRun();
  document.getElementById("btn-mend").onclick = mend;
  document.getElementById("btn-whirl").onclick = whirlwind;
  document.getElementById("btn-charge").onclick = charge;
  canvas.addEventListener("pointerdown", (ev) => {
    if (state === "title") return;
    if (state === "fight") powerStrike();
  });
  window.addEventListener("keydown", (ev) => {
    if (["INPUT", "SELECT"].includes(ev.target.tagName)) return;
    if (ev.code === "Space" && ev.target.tagName === "BUTTON") return;
    if (ev.code === "Space") {
      ev.preventDefault();
      if (state === "title") startRun();
      else powerStrike();
    }
    if (ev.key === "1") mend();
    if (ev.key === "2") whirlwind();
    if (ev.key === "3") charge();
    if (ev.key === "p" || ev.key === "P") togglePause();
    if (ev.key === "n" || ev.key === "N") callWave();
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
      run.ledger = {};
    },
    smite() {
      [...run.enemies].forEach(killEnemy);
    },
  };

  document.getElementById("btn-camp-title").classList.toggle("hidden", !!savedRun());
  document.getElementById("btn-camp-title").onclick = () => {
    if (state !== "title" || savedRun()) return;
    state = "dead";
    document.getElementById("title").classList.add("hidden");
    document.getElementById("dead").classList.remove("hidden");
    document.querySelector("#dead h1").textContent = "CAMP";
    document.getElementById("dead-summary").textContent = `Best cleared wave: ${persist.bestWave}`;
    document.getElementById("dead-glory").textContent = "0";
    buildPrestige();
  };
  document.getElementById("btn-resume").onclick = resumeRun;
  document.getElementById("btn-resume").classList.toggle("hidden", !savedRun());
  document.getElementById("btn-next").onclick = callWave;
  document.getElementById("btn-pause").onclick = togglePause;
  document.getElementById("btn-respec").onclick = respec;
  document.getElementById("buy-amount").onchange = ev => { buyAmount = ev.target.value; syncHud(); };
  document.getElementById("auto-buy").onchange = ev => { run.autoBuy = ev.target.value; saveRun(); };
  document.getElementById("btn-endless").onclick = () => {
    if (state !== "victory") return;
    state = "fight"; paused = false;
    document.getElementById("victory").classList.add("hidden"); run.waveTimer = 5; saveRun();
  };
  document.getElementById("btn-camp").onclick = returnToCamp;
  document.getElementById("save-note").textContent = persist.migrated ? "Your old prestige spending has been refunded as Glory. Choose a branch at camp." : "Runs save automatically. Five bosses stand between you and the end of the road.";
  window.addEventListener("pagehide", saveRun);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "fight" && !paused) togglePause();
  });
  resize();
  loadAll()
    .then(() => requestAnimationFrame(loop))
    .catch((err) => {
      console.error(err);
      document.getElementById("title").querySelector("p").textContent =
        "Failed to load sprites. Serve the folder over HTTP.";
    });
})();
