(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const SAVE_KEY = "unending-save-v1";
  const PLAYER_SCREEN_X = 220;
  const HOME_X = 80;
  const GROUND = 0.78;
  const WHIRL_RANGE = 220;
  const WHIRL_CD = 6;
  const FORWARD_X = HOME_X + 280;
  const CHARGE_SPEED = 560;
  const RETURN_SPEED = 500;
  const SHOP_W = 332;

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
  const fx = { floats: [], bolts: [], drops: [], gibs: [] };

  function emptyRun() {
    return {
      wave: 0,
      kills: 0,
      gold: 0,
      waveTimer: 0.45,
      spawning: false,
      hero: null,
      enemies: [],
      levels: Object.fromEntries(RUN_UPGRADES.map((u) => [u.id, 0])),
    };
  }

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (raw && typeof raw === "object") {
        return {
          glory: raw.glory || 0,
          bestWave: raw.bestWave || 0,
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
      })
    );
  }

  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function makeHero() {
    const p = persist.prest;
    const hero = {
      x: HOME_X,
      homeX: HOME_X,
      mode: "home",
      hp: 100 + p.blood * 20,
      maxHp: 100 + p.blood * 20,
      dmg: 8 + p.might * 2,
      armor: 0,
      atkRate: 0.9,
      atkT: 0,
      reach: 92,
      walk: 95,
      crit: 0.05,
      leech: 0,
      goldFind: 1 + p.greed * 0.12,
      mana: 20 + p.spark * 5,
      maxMana: 80 + p.spark * 10,
      manaRegen: 2.2 + p.spark * 0.7,
      anim: "idle",
      animT: 0,
      flash: 0,
      strikeCd: 0,
      whirlCd: 0,
      whirl: null,
      buffs: { rage: 0, haste: 0 },
    };
    run.gold = p.purse * 18;
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
    fx.floats.length = 0;
    fx.bolts.length = 0;
    fx.drops.length = 0;
    fx.gibs.length = 0;
    state = "fight";
    document.getElementById("title").classList.add("hidden");
    document.getElementById("dead").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("shop").classList.remove("hidden");
    document.getElementById("keys").classList.remove("hidden");
    buildShop();
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
    if (h.hp <= 0) {
      h.hp = 0;
      die();
    }
  }

  function enemyStrike(e) {
    let dmg = e.dmg;
    const crit = Math.random() < (e.def.crit || 0);
    if (crit) dmg *= 2;
    hitHero(dmg, e.x, crit);
  }

  function hitEnemy(e, amount, crit) {
    const d = dmgIn(amount, e.armor);
    e.hp -= d;
    e.flash = 0.1;
    floatText(e.x, groundY() - 160, (crit ? "CRIT " : "") + fmt(d), crit ? "#ffe27a" : "#fff");
    const h = run.hero;
    if (h.leech > 0) {
      const heal = d * h.leech;
      h.hp = Math.min(h.maxHp, h.hp + heal);
    }
    if (e.hp <= 0) killEnemy(e);
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
    const base = playRight() + 80;
    roster.forEach((type, i) => {
      const def = ENEMIES[type];
      run.enemies.push({
        type,
        def,
        x: base,
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
    const crit = Math.random() < h.crit;
    if (crit) dmg *= 2;
    const target = nearest(
      h.x,
      (e) => inMelee(e, h.reach + 16) && !shadowedBehind(e)
    );
    if (target) hitEnemy(target, dmg, crit);
    sfx(crit ? 520 : 240, 0.06, "square", 0.05);
  }

  function powerStrike() {
    const h = run.hero;
    if (state !== "fight" || h.strikeCd > 0) return;
    h.strikeCd = 1.35;
    swing(2.15);
    shake = 8;
  }

  function mend() {
    const h = run.hero;
    if (state !== "fight" || h.mana < 25) return;
    h.mana -= 25;
    const heal = h.maxHp * 0.28;
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floatText(h.x, groundY() - 200, "+" + fmt(heal), "#8fd18f");
    sfx(480, 0.12, "sine", 0.05);
  }

  function nextWaveDelay(wave) {
    return 5.5 + wave * 0.5;
  }

  function charge() {
    const h = run.hero;
    if (state !== "fight") return;
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
    const dmg = h.dmg * 0.85 * bonus;
    const targets = run.enemies.filter((e) => Math.abs(e.x - h.x) < WHIRL_RANGE);
    for (const e of targets) hitEnemy(e, dmg, false);
    shake = 7;
    sfx(170, 0.08, "sawtooth", 0.045);
  }

  function whirlwind() {
    const h = run.hero;
    if (state !== "fight" || h.whirlCd > 0 || h.whirl) return;
    h.whirlCd = WHIRL_CD;
    h.whirl = { t: 0, next: 0, left: 3 };
    h.anim = "atk";
    h.animT = 0;
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
      if (run.waveTimer <= 0) {
        run.wave += 1;
        spawnWave();
        run.waveTimer = isBossWave(run.wave) ? 1e9 : nextWaveDelay(run.wave);
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
    } else if (h.anim === "atk") {
      h.animT += dt;
      if (h.animT >= 0.34) h.anim = "idle";
    } else if (melee.length) {
      const rate = h.atkRate * (h.buffs.haste > 0 ? 1.35 : 1);
      h.atkT -= dt * rate;
      if (h.atkT <= 0) {
        h.atkT = 1;
        swing(1);
      }
    } else {
      h.anim = "idle";
      h.animT += dt;
    }

    for (const e of run.enemies) {
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
          }
        }
      }
    }

    for (const b of fx.bolts) {
      b.x += b.vx * dt;
      if (Math.abs(b.x - h.x) < 30) {
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

    if (h && (state === "fight" || state === "dead")) {
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
    document.getElementById("btn-mend").disabled = h.mana < 25;
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
      btn.textContent = fmt(c);
      btn.disabled = run.gold < c;
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

  function buyRun(id) {
    const u = RUN_UPGRADES.find((x) => x.id === id);
    const lv = run.levels[id] || 0;
    const c = u.cost(lv);
    if (run.gold < c || state !== "fight") return;
    run.gold -= c;
    run.levels[id] = lv + 1;
    u.apply(run.hero);
    buildShop();
    sfx(560, 0.08, "square", 0.05);
  }

  function buildPrestige() {
    const box = document.getElementById("prestige-shop");
    box.innerHTML = "";
    for (const u of PRESTIGE_UPGRADES) {
      const lv = persist.prest[u.id] || 0;
      const c = u.cost(lv);
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<div class="name">${u.name} <span style="color:#8ea0b5">${lv}</span></div>
        <button type="button">${c} glory</button>
        <div class="desc">${u.desc}</div>`;
      box.appendChild(row);
      row.querySelector("button").onclick = () => {
        if (persist.glory < c) return;
        persist.glory -= c;
        persist.prest[u.id] = lv + 1;
        save();
        document.getElementById("glory").textContent = fmt(persist.glory);
        buildPrestige();
        sfx(500, 0.1, "sine", 0.05);
      };
      row.querySelector("button").disabled = persist.glory < c;
    }
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
    audio();
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
    if (ev.code === "Space") {
      ev.preventDefault();
      if (state === "title") startRun();
      else powerStrike();
    }
    if (ev.key === "1") mend();
    if (ev.key === "2") whirlwind();
    if (ev.key === "3") charge();
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

  resize();
  loadAll()
    .then(() => requestAnimationFrame(loop))
    .catch((err) => {
      console.error(err);
      document.getElementById("title").querySelector("p").textContent =
        "Failed to load sprites. Serve the folder over HTTP.";
    });
})();
