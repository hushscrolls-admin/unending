(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const SAVE_KEY = "unending-save-v1";
  const PLAYER_SCREEN_X = 220;
  const HOME_X = 80;
  const GROUND = 0.78;
  const WHIRL_RANGE = 220;
  const CHARGE_SPAN = 280;
  const CHARGE_SPEED = 560;
  const RETURN_SPEED = 500;
  const SHOP_W = 332;
  const START_GOLD = 24;
  const DROP_PICK_R = 160;
  const DROP_MAGNET_AGE = 0.32;
  const VITAL_CAP = 900;
  const HEAL_GOLD = "#ffe27a";
  const HEAL_GOLD_HOT = "#fff4a8";
  const HEAL_GOLD_INK = "#1a1208";
  const HEAL_GOLD_FILL = "rgba(255, 226, 122, 0.3)";
  const HEAL_GOLD_HALO = "rgba(255, 226, 122, 0.4)";
  const HEAL_GOLD_HALO_HOT = "rgba(255, 244, 168, 0.72)";

  const img = {};
  const meta = { loaded: false };

  let W = 1280;
  let H = 720;
  let state = "title";
  let last = 0;
  let camera = 0;
  let shake = 0;
  let toastT = 0;
  let jumpBannerT = 0;
  let waveBanner = 0;
  let paused = false;
  let healCueOn = false;
  let jumpDest = 0;

  const persist = loadSave();
  const run = emptyRun();
  const fx = { floats: [], bolts: [], drops: [], gibs: [], rings: [], weather: [] };

  function emptyRun() {
    return {
      wave: 1,
      stage: 1,
      kills: 0,
      gold: 0,
      waveTimer: 0,
      spawning: false,
      hero: null,
      wolf: null,
      enemies: [],
      boughtAny: false,
      shopNudge: false,
      placed: {},
      gateOpen: false,
      biomeFlash: 0,
      levels: Object.fromEntries(RUN_UPGRADES.map((u) => [u.id, 0])),
    };
  }

  function validClass(id) {
    return id && CLASSES[id] ? id : "warrior";
  }

  function classDef(id) {
    return CLASSES[validClass(id || persist.klass)];
  }

  function activeKlass() {
    return validClass(run.hero && run.hero.klass ? run.hero.klass : persist.klass);
  }

  function treeBag(klass) {
    const k = validClass(klass || activeKlass());
    if (!persist.trees) persist.trees = emptyTrees();
    if (!persist.trees[k]) persist.trees[k] = emptyTrees()[k];
    return persist.trees[k];
  }

  function prestLv(id, klass) {
    return treeBag(klass)[id] || 0;
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

  function playSpan() {
    const h = run.hero;
    return Math.max(160, playRight() - (h ? h.x : HOME_X));
  }

  function combatRange() {
    const h = run.hero;
    if (!h) return RANGE.ranger;
    return clampCombatRange(h.range, playSpan());
  }

  function boltLimitX(dir) {
    const h = run.hero;
    const span = combatRange();
    if (!h) return playRight() - 16;
    if (dir < 0) return Math.max(h.x - span, camera + 8);
    return Math.min(h.x + span, playRight() - 16);
  }

  function infernoEnd() {
    const h = run.hero;
    const extra = Math.max(0, combatRange() - classDef("mage").range) + (h.infernoReach || 0);
    return Math.min(playRight() - 12, h.x + 310 + extra);
  }

  function cdScale(seconds, minCd) {
    const haste = (run.hero && run.hero.skillHaste) || 0;
    const scaled = seconds * Math.max(0.45, 1 - haste);
    if (minCd != null) return Math.max(minCd, scaled);
    return scaled;
  }

  function skillCdScaled(slot) {
    const h = run.hero;
    const s = classDef(h && h.klass).skills[slot];
    if (!s || !s.cd) return 0;
    return cdScale(s.cd, s.cdMin);
  }

  function readDisk() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      return raw && typeof raw === "object" ? raw : null;
    } catch (e) {
      return null;
    }
  }

  function migrateRaw(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const klass = validClass(src.klass);
    const already = src.saveVersion >= SAVE_VERSION && src.trees;
    if (already) {
      return {
        glory: src.glory || 0,
        bestWave: src.bestWave || 0,
        klass,
        trees: normalizeTrees(src.trees),
        refundNote: src.refundNote || 0,
      };
    }
    const refund = isLegacyPrest(src.prest) ? glorySpentLegacy(src.prest) : 0;
    return {
      glory: (src.glory || 0) + refund,
      bestWave: src.bestWave || 0,
      klass,
      trees: normalizeTrees(src.trees),
      refundNote: refund,
    };
  }

  function loadSave() {
    const raw = readDisk();
    if (raw) return migrateRaw(raw);
    return {
      glory: 0,
      bestWave: 0,
      klass: "warrior",
      trees: emptyTrees(),
      refundNote: 0,
    };
  }

  function save() {
    const disk = readDisk();
    if (disk && disk.saveVersion >= SAVE_VERSION && disk.trees) {
      persist.trees = mergeTrees(persist.trees, disk.trees);
    } else {
      persist.trees = normalizeTrees(persist.trees);
    }
    persist.bestWave = Math.max(persist.bestWave || 0, (disk && disk.bestWave) || 0);
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          glory: persist.glory,
          bestWave: persist.bestWave,
          trees: persist.trees,
          klass: persist.klass,
          saveVersion: SAVE_VERSION,
          refundNote: persist.refundNote || 0,
        })
      );
    } catch (e) {
      /* quota / private mode — keep memory ranks */
    }
    syncTreeHeld();
  }

  function hydratePersist() {
    const disk = readDisk();
    if (disk && disk.saveVersion >= SAVE_VERSION && disk.trees) {
      persist.trees = mergeTrees(persist.trees, disk.trees);
    }
    persist.bestWave = Math.max(persist.bestWave || 0, (disk && disk.bestWave) || 0);
    if (disk && disk.klass) persist.klass = persist.klass || validClass(disk.klass);
  }

  function treeHeldText() {
    const k = activeKlass();
    const tree = prestigeTree(k);
    const bag = treeBag(k);
    const owned = tree.nodes.filter((n) => (bag[n.id] || 0) > 0).map((n) => n.name + " " + bag[n.id]);
    return owned.length ? tree.name + " held: " + owned.join(" · ") : tree.name + ": no ranks yet.";
  }

  function syncTreeHeld() {
    const el = document.getElementById("tree-held");
    if (el) el.textContent = treeHeldText();
    const bank = document.getElementById("glory-bank");
    if (bank) bank.textContent = fmt(persist.glory);
  }

  function snapshotPersist() {
    hydratePersist();
    save();
    return {
      glory: persist.glory,
      bestWave: persist.bestWave,
      trees: JSON.parse(JSON.stringify(persist.trees)),
      refundNote: persist.refundNote || 0,
      disk: readDisk(),
      held: treeHeldText(),
    };
  }

  function fmt(n) {
    n = Math.floor(Number(n));
    if (!Number.isFinite(n)) return "0";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function hpPair(hp, max) {
    const cap = VITAL_CAP;
    let m = Math.floor(Number(max));
    if (!Number.isFinite(m) || m < 1) m = 1;
    if (m > cap) m = cap;
    let n = Math.floor(Number(hp));
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > m) n = m;
    return { hp: n, max: m, text: n + "/" + m };
  }

  function heroFallbackMax() {
    const h = run.hero;
    if (!h) return 100;
    const c = classDef(h.klass);
    const vitalIds = { warrior: "w_vital", mage: "m_ward", ranger: "r_vital" };
    const vital = run.levels[vitalIds[h.klass] || "w_vital"] || 0;
    return c.hp + (h.prestHp || 0) + vital * 25 + (h.klass !== "ranger" ? (h.pack || 0) * 20 : 0);
  }

  function clampVitals(u, opts) {
    if (!u) return false;
    const o = opts || {};
    const cap = o.cap || VITAL_CAP;
    const fallback = Math.max(1, o.fallback || 100);
    let fixed = false;
    if (!Number.isFinite(u.maxHp) || u.maxHp <= 0 || u.maxHp > cap) {
      u.maxHp = Math.max(1, Math.min(cap, fallback));
      fixed = true;
    }
    if (!Number.isFinite(u.hp)) {
      u.hp = 0;
      fixed = true;
    }
    if (u.hp > u.maxHp) {
      u.hp = u.maxHp;
      fixed = true;
    }
    if (u.hp < 0) {
      u.hp = 0;
      fixed = true;
    }
    if (u.maxMana != null) {
      if (!Number.isFinite(u.maxMana) || u.maxMana <= 0) {
        u.maxMana = o.manaFallback || 80;
        fixed = true;
      }
      if (!Number.isFinite(u.mana)) u.mana = 0;
      u.mana = Math.max(0, Math.min(u.mana, u.maxMana));
    }
    return fixed;
  }

  function healHero(amount) {
    const h = run.hero;
    if (!h) return 0;
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
    const add = Math.max(0, Number(amount) || 0);
    const before = h.hp;
    h.hp = Math.min(h.maxHp, h.hp + add);
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
    return h.hp - before;
  }

  function pickClass(id) {
    persist.klass = validClass(id);
    save();
    buildClassPick();
    if (state === "dead") buildPrestige();
  }

  function makeHero() {
    const c = classDef();
    const hero = {
      klass: c.id,
      x: HOME_X,
      homeX: HOME_X,
      mode: "march",
      chargeTo: HOME_X + CHARGE_SPAN,
      returnTo: HOME_X,
      hp: c.hp,
      maxHp: c.hp,
      dmg: c.dmg,
      armor: c.armor,
      atkRate: c.atkRate,
      atkT: 0,
      reach: c.reach,
      range: c.range,
      style: c.style,
      walk: ROAD.heroWalk,
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
      startGold: 0,
      prestHp: 0,
      gloryBonus: 0,
      cleaveBonus: 0,
      burnAmp: 0,
      infernoMult: 1,
      chill: 0,
      shatter: 0,
      wildfire: 0,
      novaReach: 0,
      novaHold: 0,
      wolfHp: 0,
      wolfArmor: 0,
      wolfRegen: 0,
      wolfStride: 0,
      sicHold: 0,
      sicDmg: 0,
      sicRevive: 0,
      strikePierce: 0,
      waveWard: 0,
      mendArmor: 0,
      mendArmorT: 0,
      lowHpArmor: 0,
      mendDR: 0,
      mendDRHits: 0,
      cheatDeath: false,
      usedCheat: false,
      mendAmp: 0,
      bleed: 0,
      whirlExtra: 0,
      strikeStun: 0,
      whirlRefund: 0,
      executeHp: 0.4,
      eliteGold: 0,
      heartFind: 0,
      heartAmp: 0,
      heirloomSwift: false,
      provisioner: false,
      infernoExtra: 0,
      infernoReach: 0,
      burnMana: 0,
      phoenix: false,
      usedPhoenix: false,
      livingBomb: false,
      frostbite: 0,
      iceLance: 0,
      iceLanceHits: 0,
      chillHold: 0,
      novaMana: 0,
      slowShatter: false,
      rime: false,
      killMana: 0,
      cautMana: 0,
      infernoEcho: 0,
      cautWardExtra: 0,
      multishot: 0,
      critDmg: 0,
      volleyExtra: 0,
      deadeye: false,
      strikeEcho: false,
      howl: 0,
      wolfLeech: 0,
      packBond: 0,
      dire: 0,
      sicHeal: 0,
      alphaAura: false,
      camo: 0,
      camoT: 0,
      dressWard: 0,
      dressWardT: 0,
      waveHits: 0,
      anim: "idle",
      animT: 0,
      flash: 0,
      strikeCd: 0,
      skillCd: [0, 0, 0],
      whirl: null,
      inferno: null,
      novaT: 0,
      cauterizeT: 0,
      cauterizeWard: 0,
      cauterizeIgnited: 0,
      healFlash: 0,
      buffs: { rage: 0, haste: 0 },
    };
    for (const n of prestigeNodes(hero.klass)) {
      const lv = prestLv(n.id, hero.klass);
      if (lv > 0 && n.apply) n.apply(hero, lv);
    }
    run.gold = START_GOLD + (hero.startGold || 0);
    if (hero.heirloom) {
      const first = heirloomUpgrade(hero.klass);
      if (first) run.levels[first.id] = Math.max(run.levels[first.id] || 0, 1);
    }
    if (hero.heirloomSwift) {
      const swiftId = hero.klass === "warrior" ? "w_swift" : hero.klass === "ranger" ? "r_swift" : "m_cadence";
      run.levels[swiftId] = Math.max(run.levels[swiftId] || 0, 1);
    }
    if (hero.provisioner) {
      if (hero.secondWind > 0) hero.secondWind += 1;
      else {
        hero.maxHp = Math.round(hero.maxHp * 1.1);
        hero.hp = Math.round(hero.hp * 1.1);
        hero.prestHp = (hero.prestHp || 0) + Math.round(classDef(hero.klass).hp * 0.1);
      }
    }
    for (const u of shopList(hero.klass)) {
      const lv = run.levels[u.id] || 0;
      for (let i = 0; i < lv; i++) u.apply(hero);
    }
    hero.hp = Math.min(hero.maxHp, hero.hp);
    hero.secondWind = Math.max(0, Math.min(4, Math.floor(Number(hero.secondWind) || 0)));
    clampVitals(hero, {
      fallback: c.hp + (hero.prestHp || 0),
      manaFallback: c.maxMana,
    });
    return hero;
  }

  function wolfWave() {
    return Math.max(1, run.wave || 1, jumpDest || 0);
  }

  function wolfBaseStats() {
    const h = run.hero;
    const pack = (h && h.pack) || 0;
    const wave = wolfWave();
    const scale = 1 + Math.min(1.6, (wave - 1) * 0.12);
    const dire = (h && h.dire) || 0;
    const hp = Math.round((72 + ((h && h.wolfHp) || 0)) * scale * (1 + pack * 0.22) * (1 + dire * 0.12));
    return {
      hp,
      maxHp: hp,
      dmg: 6 + ((h && h.dmg) || 9) * 0.08 + pack * 2 + dire * 1.5 + Math.min(3, (wave - 1) * 0.18),
      armor: 1.8 + ((h && h.wolfArmor) || 0) + Math.min(3.2, (wave - 1) * 0.22) + pack * 0.4,
      regen: 0.4 + ((h && h.wolfRegen) || 0) + Math.min(1.0, (wave - 1) * 0.06),
    };
  }

  function syncWolfVitals(keepRatio) {
    const w = run.wolf;
    if (!w) return w;
    const next = wolfBaseStats();
    w.maxHp = next.maxHp;
    if (w.hp <= 0 && keepRatio) {
      w.hp = 0;
    } else if (keepRatio) {
      w.hp = Math.max(0, Math.min(w.maxHp, w.hp));
    } else {
      w.hp = next.maxHp;
    }
    w.armor = next.armor;
    w.dmg = next.dmg;
    w.regen = next.regen;
    w.walk = 150 * (1 + ((run.hero && run.hero.wolfStride) || 0));
    return w;
  }

  function makeWolf() {
    const stats = wolfBaseStats();
    return {
      x: HOME_X + 72,
      hp: stats.hp,
      maxHp: stats.maxHp,
      dmg: stats.dmg,
      armor: stats.armor,
      regen: stats.regen,
      atkRate: 0.9,
      atkT: 0,
      reach: 72,
      walk: 150 * (1 + ((run.hero && run.hero.wolfStride) || 0)),
      anim: "idle",
      animT: 0,
      flash: 0,
      deadT: 0,
      leap: null,
      taunt: 0,
    };
  }

  function wolfSnapshot() {
    const w = run.wolf;
    if (!w) return null;
    const base = wolfBaseStats();
    return {
      hp: Math.round(w.hp),
      maxHp: Math.round(w.maxHp),
      armor: Math.round(w.armor * 10) / 10,
      dmg: Math.round(w.dmg * 10) / 10,
      regen: Math.round((w.regen || 0) * 10) / 10,
      down: w.hp <= 0,
      wave: wolfWave(),
      taunt: w.taunt > 0,
      expect: { hp: base.hp, armor: Math.round(base.armor * 10) / 10, regen: Math.round(base.regen * 10) / 10 },
    };
  }

  function startRun() {
    hydratePersist();
    save();
    Object.assign(run, emptyRun());
    run.hero = makeHero();
    run.wolf = classDef().companion ? makeWolf() : null;
    fx.floats.length = 0;
    fx.bolts.length = 0;
    fx.drops.length = 0;
    fx.gibs.length = 0;
    fx.rings.length = 0;
    fx.weather.length = 0;
    healCueOn = false;
    state = "fight";
    const jumped = jumpDest > 0;
    if (jumped) {
      jumpToWave(jumpDest, { grant: true });
    } else {
      placeStage(1);
      run.wave = 1;
      run.stage = 1;
      run.hero.x = stageOriginX(1);
      run.hero.mode = "march";
      if (run.wolf) run.wolf.x = run.hero.x + 72;
      followCamera(0);
      toast(biomeForStage(1).name);
    }
    document.getElementById("title").classList.add("hidden");
    document.getElementById("dead").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("shop").classList.remove("hidden");
    document.getElementById("keys").classList.remove("hidden");
    buildShop();
    syncClassChrome();
    syncHud();
    syncTreeHeld();
    if (jumped) {
      /* jumpToWave already banners */
    } else {
      const held = treeHeldText();
      if (held.indexOf("held:") >= 0) toast(held, 2.2);
      if (persist.refundNote > 0) {
        toast("Old Blood Tree ranks refunded as " + persist.refundNote + " Glory", 3.4);
        persist.refundNote = 0;
        save();
      }
    }
    sfx(220, 0.12, "square", 0.04);
  }

  function gloryFor(wave, kills) {
    const raw = Math.max(0, (wave - 1) * 2 + Math.floor(kills * 0.2) + Math.min(3, Math.max(0, wave)));
    const bonus = (run.hero && run.hero.gloryBonus) || 0;
    return Math.floor(raw * (1 + bonus * 0.18));
  }

  function die() {
    hydratePersist();
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
      `${biomeForStage(run.stage).name}  ·  Wave ${run.wave}  ·  ${run.kills} kills  ·  best ${persist.bestWave}`;
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

  function toast(msg, dur) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    toastT = dur || 1.4;
    waveBanner = toastT;
  }

  function showJumpBanner(msg) {
    const el = document.getElementById("jump-banner");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    jumpBannerT = 3.6;
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
      life: 8,
      age: 0,
    });
  }

  function hitHero(amount, srcX, crit) {
    const h = run.hero;
    let armor = h.armor + (h.mendArmorT > 0 ? 1.4 * (h.mendArmor || 0) : 0);
    if (h.lowHpArmor && h.hp / h.maxHp <= 0.45) armor += 1.6 * h.lowHpArmor;
    if (h.klass === "mage" && run.wave > 0) {
      if (run.wave <= 5) armor += 5.8;
      else if (run.wave <= 8) armor += 2.4;
    }
    let d = dmgIn(amount, armor);
    if (h.klass === "mage" && run.wave > 0 && run.wave <= 5) d *= 0.78;
    if (h.cauterizeWard > 0) d *= 0.78;
    if (h.waveHits > 0 && h.waveWard) {
      d *= Math.max(0.4, 1 - 0.16 * h.waveWard);
      h.waveHits -= 1;
    }
    if (h.mendDRHits > 0 && h.mendDR) {
      d *= Math.max(0.5, 1 - 0.12 * h.mendDR);
      h.mendDRHits -= 1;
    }
    if (h.camoT > 0 && h.camo) d *= Math.max(0.5, 1 - 0.14 * h.camo);
    if (h.dressWardT > 0 && h.dressWard) d *= Math.max(0.55, 1 - 0.18 * h.dressWard);
    h.hp -= d;
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
    h.flash = 0.12;
    shake = Math.max(shake, 6);
    floatText(
      h.x,
      groundY() - 170,
      (crit ? "CRIT " : "") + "-" + fmt(d),
      crit ? "#ffe27a" : "#ff8080"
    );
    sfx(crit ? 200 : 140, 0.08, "square", 0.04);
    const charges = Math.max(0, Math.floor(Number(h.secondWind) || 0));
    if (charges > 0 && h.hp <= h.maxHp * 0.3) {
      h.secondWind = charges - 1;
      healHero(h.maxHp * 0.26);
      floatText(h.x + 72, groundY() - 230, "SECOND WIND", "#8fd18f");
      sfx(520, 0.14, "sine", 0.05);
    }
    if (h.hp <= 0) {
      if (h.cheatDeath && !h.usedCheat) {
        h.usedCheat = true;
        h.hp = Math.max(1, h.maxHp * 0.12);
        floatText(h.x + 60, groundY() - 220, "UNBREAKABLE", "#ffe27a");
        sfx(480, 0.16, "sine", 0.05);
        syncHud();
        return;
      }
      if (h.phoenix && !h.usedPhoenix) {
        h.usedPhoenix = true;
        h.hp = Math.max(1, h.maxHp * 0.18);
        for (const e of [...run.enemies]) {
          if (Math.abs(e.x - h.x) < 220) {
            applyDot(e, ampBurn({ kind: "burn", dps: h.dmg * 0.5, dur: 2.4 }));
            e.igniteFlash = 0.8;
          }
        }
        floatText(h.x + 60, groundY() - 220, "PHOENIX", "#ff6a3a");
        sfx(360, 0.18, "sawtooth", 0.06);
        syncHud();
        return;
      }
      h.hp = 0;
      die();
    } else {
      syncHud();
    }
  }

  function wolfAlive() {
    return !!(run.wolf && run.wolf.hp > 0);
  }

  function hitWolf(amount, crit) {
    const w = run.wolf;
    if (!w || w.hp <= 0) return;
    const armor = w.armor + (w.taunt > 0 ? 1.4 : 0);
    let d = dmgIn(amount, armor);
    if (w.taunt > 0) d *= 0.9;
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
    const h = run.hero;
    let dmg = e.dmg;
    const crit = Math.random() < (e.def.crit || 0);
    if (crit) dmg *= 2;
    const t = threatFor(e);
    if (t === run.hero) {
      if (h && h.alphaAura && wolfAlive() && !e.def.projectile) dmg *= 0.9;
      hitHero(dmg, e.x, crit);
      if (run.hero.thorns && run.hero.hp > 0) {
        hitEnemy(e, dmg * 0.1 * run.hero.thorns, false);
      }
    } else hitWolf(dmg, crit);
  }

  function ampBurn(spec) {
    const h = run.hero;
    if (!spec || !h || !h.burnAmp) return spec;
    return {
      kind: spec.kind,
      dps: spec.dps * (1 + h.burnAmp),
      dur: spec.dur * (1 + h.burnAmp * 0.45),
    };
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
    if (h && h.execute && e.hp < e.maxHp * (h.executeHp || 0.4)) {
      amount *= 1 + 0.18 * h.execute;
    }
    if (h && h.shatter && !fromDot && (e.cc > 0 || (h.slowShatter && e.slow > 0))) {
      const half = e.cc > 0 ? 1 : 0.5;
      amount *= 1 + 0.14 * h.shatter * half;
    }
    if (h && h.frostbite && e.slow > 0) amount *= 1 + 0.08 * h.frostbite;
    if (h && h.deadeye && Math.abs(e.x - h.x) > 200) amount *= 1.14;
    if (h && h.iceLanceHits > 0 && !fromDot) {
      amount *= 1 + 0.28 * (h.iceLance || 0);
      h.iceLanceHits -= 1;
    }
    e.aggro = true;
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
      healHero(d * h.leech);
      if (wolfAlive()) {
        run.wolf.hp = Math.min(run.wolf.maxHp, run.wolf.hp + d * h.leech);
      }
    }
    if (e.hp > 0 && h && h.cinder && !fromDot) {
      applyDot(e, ampBurn({ kind: "burn", dps: h.dmg * 0.16 * h.cinder, dur: 1.8 }));
    }
    if (e.hp > 0 && h && h.chill && !fromDot) {
      e.slow = Math.max(e.slow || 0, 1.1 * h.chill + (h.chillHold || 0));
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
    const h = run.hero;
    const elite = !!(e.def.boss || e.type === "mage" || e.type === "healer" || e.type === "assassin");
    const goldMult = h.goldFind * (elite && h.eliteGold ? 1 + 0.22 * h.eliteGold : 1);
    const gold = Math.floor(e.gold * goldMult);
    run.gold += gold;
    floatText(e.x, groundY() - 190, "+" + gold + "g", "#e6c15a");
    if (!run.boughtAny && !run.shopNudge && run.gold >= 10) {
      run.shopNudge = true;
      toast("Armory ready");
      buildShop();
    }
    if (e.magic) run.hero.mana = Math.min(run.hero.maxMana, run.hero.mana + e.magic);
    const r = Math.random();
    const heartP = 0.12 + ((h && h.heartFind) || 0);
    if (r < heartP) drop("heart", e.x, groundY() - 80);
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
    if (h.bloodlust) {
      h.buffs.rage = Math.max(h.buffs.rage, 1.6 * h.bloodlust);
    }
    if (h.whirlRefund && h.skillCd[1] > 0) h.skillCd[1] = Math.max(0, h.skillCd[1] - h.whirlRefund);
    if (h.killMana) h.mana = Math.min(h.maxMana, h.mana + h.killMana);
    if (h.burnMana && e.dots && e.dots.some((d) => d.kind === "burn")) {
      h.mana = Math.min(h.maxMana, h.mana + 4 * h.burnMana);
    }
    if (h.rime && e.cc > 0) h.mana = Math.min(h.maxMana, h.mana + 10);
    if (h.wildfire) {
      const near = nearest(e.x, (o) => o !== e && o.hp > 0);
      if (near) {
        applyDot(near, ampBurn({ kind: "burn", dps: h.dmg * 0.28 * h.wildfire, dur: 2.2 }));
        near.igniteFlash = Math.max(near.igniteFlash || 0, 0.6);
        if (h.livingBomb) hitEnemy(near, h.dmg * 0.3, false, true);
      }
    }
    const wasBoss = e.def.boss;
    run.enemies = run.enemies.filter((x) => x !== e);
    if (wasBoss && !bossAlive()) {
      openGate();
    }
  }

  function bossAlive() {
    return run.enemies.some((e) => e.def.boss);
  }

  function playRight() {
    return camera + W - SHOP_W;
  }

  function viewLeft() {
    return camera - 28;
  }

  function onScreen(x) {
    return x > viewLeft() && x < camera + playClipW() + 36;
  }

  function inAggroView(x) {
    const wake = camera + Math.min(playClipW() * 0.64, 540);
    return x > camera + 36 && x < wake;
  }

  function followCamera(dt) {
    const target = (run.hero ? run.hero.x : HOME_X) - PLAYER_SCREEN_X;
    if (!dt) {
      camera = target;
      return;
    }
    camera += (target - camera) * Math.min(1, dt * 7);
  }

  function makeFoe(type, wave, x) {
    const def = ENEMIES[type];
    const sc = waveScale(wave);
    return {
      type,
      def,
      wave,
      aggro: false,
      x,
      hp: def.hp * sc.hp,
      maxHp: def.hp * sc.hp,
      dmg: def.dmg * sc.dmg,
      armor: def.armor,
      gold: def.gold * sc.gold,
      magic: def.magic,
      atkT: 0.2 + Math.random() * 0.4,
      healT: 0.5,
      anim: "idle",
      animT: Math.random(),
      flash: 0,
      enraged: false,
      facing: -1,
      stepped: false,
      dots: [],
      cc: 0,
      slow: 0,
      charged: false,
      healTarget: null,
      healFlash: 0,
    };
  }

  function placePack(wave) {
    const stage = stageIndex(wave);
    const base = packWorldX(stage, wave);
    waveRoster(wave).forEach((type, i) => {
      run.enemies.push(makeFoe(type, wave, base + i * ROAD.packSpread));
    });
  }

  function placeStage(stage) {
    const s = Math.max(1, stage);
    if (run.placed[s]) return;
    run.placed[s] = true;
    syncWolfVitals(true);
    for (let i = 1; i <= STAGE_LEN; i++) placePack((s - 1) * STAGE_LEN + i);
  }

  function announceWave(n) {
    const h = run.hero;
    const fresh = shopUnlocksAt(n, activeKlass());
    const crate = fresh.length && n > 1 ? "  ·  " + fresh.map((u) => u.name).join(" / ") : "";
    if (jumpDest === n) {
      const msg = (isBossWave(n) ? "Jumped to BOSS " + defTitle(n) : "Jumped to wave " + n) + crate;
      showJumpBanner(msg);
      jumpDest = 0;
    } else if (isBossWave(n)) {
      toast("BOSS  " + defTitle(n));
      sfx(140, 0.22, "sawtooth", 0.06);
    } else {
      toast(crate ? "Wave " + n + crate : "Wave " + n);
      sfx(360, 0.1, "square", 0.04);
    }
    if (h) {
      if (h.waveWard) h.waveHits = 2;
      if (h.camo) h.camoT = 2.2;
      if (h.howl && run.wolf && run.wolf.hp > 0) {
        run.wolf.taunt = Math.max(run.wolf.taunt || 0, 1.1 * h.howl);
      }
    }
    buildShop();
  }

  function openGate() {
    run.gateOpen = true;
    const next = (run.stage || 1) + 1;
    placeStage(next);
    toast("The road opens — " + biomeForStage(next).name);
    sfx(180, 0.2, "triangle", 0.05);
  }

  function stageAtHero() {
    const h = run.hero;
    if (!h) return 1;
    return Math.max(1, Math.floor((h.x - HOME_X + 8) / stageSpan()) + 1);
  }

  function maybeAdvanceStage() {
    const next = stageAtHero();
    if (next > (run.stage || 1) && run.gateOpen) {
      run.stage = next;
      run.gateOpen = false;
      run.biomeFlash = 1.15;
      run.wave = Math.max(run.wave, (next - 1) * STAGE_LEN + 1);
      toast(biomeForStage(next).name);
      sfx(240, 0.16, "sine", 0.05);
      buildShop();
    }
  }

  function tryAggro(e) {
    if (e.aggro || e.hp <= 0) return;
    if (!inAggroView(e.x)) return;
    e.aggro = true;
    if (e.wave > run.wave) {
      run.wave = e.wave;
      announceWave(e.wave);
    }
  }

  function fightBlocking() {
    const h = run.hero;
    if (!h) return false;
    const c = classDef(h.klass);
    const stop = c.style === "melee" ? ROAD.stopMelee : ROAD.stopRanged;
    return run.enemies.some((e) => e.aggro && e.hp > 0 && e.x - h.x < stop && e.x > h.x - 100);
  }

  function shouldMarch() {
    const h = run.hero;
    if (!h) return false;
    if (h.mode === "charge" || h.mode === "return") return false;
    if (h.whirl) return false;
    const boss = run.enemies.find((e) => e.def.boss && e.hp > 0);
    if (boss && h.x >= boss.x - ROAD.stopMelee) return false;
    return !fightBlocking();
  }

  function jumpToWave(dest, opts) {
    const n = Math.max(1, Math.floor(dest || 1));
    const stage = stageIndex(n);
    run.enemies = [];
    run.placed = {};
    run.gateOpen = false;
    placeStage(stage);
    run.enemies = run.enemies.filter((e) => e.wave >= n);
    run.wave = n;
    run.stage = stage;
    if (run.hero) {
      run.hero.x = packWorldX(stage, n) - 240;
      run.hero.mode = "march";
      run.hero.homeX = run.hero.x;
    }
    if (run.wolf) run.wolf.x = (run.hero ? run.hero.x : HOME_X) + 70;
    if (opts && opts.grant && run.hero) {
      let earned = 0;
      for (let w = 1; w < n; w++) {
        const sc = waveScale(w);
        for (const type of waveRoster(w)) earned += (ENEMIES[type].gold || 0) * sc.gold;
      }
      run.gold = Math.max(run.gold, START_GOLD + (run.hero.startGold || 0) + Math.floor(earned));
    }
    followCamera(0);
    syncWolfVitals(false);
    announceWave(n);
    jumpDest = 0;
  }

  function spawnWave() {
    placePack(run.wave);
    announceWave(run.wave);
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
      maxX: opts.maxX != null ? opts.maxX : boltLimitX(dir),
      hit: [],
    });
  }

  function swing(mult, extra) {
    const h = run.hero;
    h.anim = "atk";
    h.animT = 0;
    let dmg = h.dmg * (mult || 1) * autoDmgMult();
    const crit = Math.random() < h.crit;
    if (crit) dmg *= 2 + (h.critDmg || 0);
    const targets = livingInRange(h.reach + 16, false).sort(
      (a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x)
    );
    if (targets[0]) {
      hitEnemy(targets[0], dmg, crit);
      if (extra && extra.stun) applyCc(targets[0], extra.stun);
      if (extra && extra.knock) targets[0].x += extra.knock;
      if (h.bleed) applyDot(targets[0], { kind: "bleed", dps: h.dmg * 0.22 * h.bleed, dur: 2.2 });
    }
    if (targets[1] && extra && extra.cleave) {
      hitEnemy(targets[1], dmg * extra.cleave * (1 + (h.cleaveBonus || 0)), false);
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
    const reach = combatRange();
    const t = nearest(h.x, (e) => Math.abs(e.x - h.x) <= reach);
    if (!t) return;
    const dir = t.x >= h.x ? 1 : -1;
    const crit = Math.random() < h.crit;
    let dmg = h.dmg * autoDmgMult();
    if (crit) dmg *= 2 + (h.critDmg || 0);
    if (c.proj === "fire") {
      shoot({
        kind: "fire",
        dir,
        dmg,
        crit,
        speed: 380,
        burn: ampBurn({ kind: "burn", dps: h.dmg * 0.42, dur: 3.0 }),
      });
      sfx(crit ? 480 : 400, 0.06, "triangle", 0.04);
    } else {
      shoot({ kind: "arrow", dir, dmg, crit, speed: 500 });
      sfx(crit ? 540 : 460, 0.05, "triangle", 0.04);
    }
    if (h.multishot) {
      const second = nearest(h.x, (e) => e !== t && Math.abs(e.x - h.x) <= reach);
      if (second) hitEnemy(second, h.dmg * 0.36 * h.multishot * autoDmgMult(), false);
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
      swing(2.15 * (h.strikeMult || 1), { stun: 0.55 + (h.strikeStun || 0), knock: 18 });
      shake = 8;
      return;
    }
    const reach = combatRange();
    const t = nearest(h.x, (e) => Math.abs(e.x - h.x) <= reach);
    const dir = t && t.x < h.x ? -1 : 1;
    const crit = Math.random() < h.crit;
    let dmg = h.dmg * heroDmgMult();
    if (c.id === "mage") {
      dmg *= 2.2;
      if (crit) dmg *= 2 + (h.critDmg || 0);
      shoot({
        kind: "fire",
        dir,
        dmg,
        crit,
        speed: 340,
        aoe: 78,
        burn: ampBurn({ kind: "burn", dps: h.dmg * 0.42, dur: 3.2 }),
        y: groundY() - 96,
      });
      shake = 7;
      sfx(180, 0.12, "sawtooth", 0.05);
    } else {
      dmg *= 2.7;
      if (crit) dmg *= 2 + (h.critDmg || 0);
      shoot({
        kind: "arrow",
        dir,
        dmg,
        crit,
        speed: 620,
        pierce: 2 + (h.strikePierce || 0),
      });
      shake = 6;
      sfx(560, 0.08, "square", 0.05);
      if (h.strikeEcho && h.echo && Math.random() < h.echo) {
        shoot({
          kind: "arrow",
          dir,
          dmg: dmg * 0.7,
          speed: 600,
          pierce: 1 + (h.strikePierce || 0),
        });
      }
    }
  }

  function spendMana(n) {
    const h = run.hero;
    if (!h || h.mana < n) return false;
    h.mana -= n;
    return true;
  }

  function skillManaCost(slot) {
    const s = classDef().skills[slot];
    return (s && s.mana) || 0;
  }

  function mend() {
    const h = run.hero;
    if (state !== "fight" || !spendMana(skillManaCost(0) || 25)) return;
    const heal = h.maxHp * (0.28 + (h.mendAmp || 0));
    const got = healHero(heal);
    h.healFlash = 0.7;
    if (h.mendArmor) h.mendArmorT = 3 * h.mendArmor;
    if (h.mendDR) h.mendDRHits = 3;
    floatText(h.x + 56, groundY() - 220, "+" + fmt(got || heal), "#8fd18f");
    sfx(480, 0.12, "sine", 0.05);
  }

  function cauterize() {
    const h = run.hero;
    if (state !== "fight" || !spendMana(skillManaCost(0) || 22)) return;
    const heal = h.maxHp * 0.32;
    const got = healHero(heal);
    h.cauterizeT = 1.15;
    h.cauterizeWard = 2.4 + (h.cautWardExtra || 0);
    h.healFlash = 0.85;
    h.flash = Math.max(h.flash, 0.35);
    floatText(h.x + 86, groundY() - 236, "+" + fmt(got || heal), "#ff8a4a");
    if (h.cautMana) h.mana = Math.min(h.maxMana, h.mana + 10 * h.cautMana);
    const igniteR = Math.min(combatRange(), 200 + Math.max(0, combatRange() - classDef("mage").range) * 0.55);
    let ignited = 0;
    for (const e of [...run.enemies]) {
      if (Math.abs(e.x - h.x) < igniteR) {
        hitEnemy(e, h.dmg * 0.45 * autoDmgMult(), false);
        applyDot(e, ampBurn({ kind: "burn", dps: h.dmg * 0.32, dur: 2.8 }));
        e.igniteFlash = 1.05;
        ignited += 1;
        floatText(e.x, groundY() - 188, "IGNITE", "#ff6a22");
      }
    }
    h.cauterizeIgnited = ignited;
    if (ignited === 0) {
      toast("Cauterize +" + fmt(got || heal) + " — no foes to ignite", 1.8);
      floatText(h.x + 10, groundY() - 196, "NO FOES", HEAL_GOLD);
    } else {
      toast("Cauterize", 1.1);
    }
    fx.rings.push({ x: h.x, t: 0.85, color: "rgba(255,90,20,1)", r: 36, w: 8, grow: 160 });
    fx.rings.push({ x: h.x, t: 1.0, color: "rgba(255,180,60,0.95)", r: 64, w: 6, grow: 130 });
    fx.rings.push({ x: h.x, t: 0.7, color: "rgba(255,240,140,1)", r: 22, w: 8, grow: 90 });
    fx.rings.push({
      x: h.x,
      t: 1.1,
      color: "rgba(255,110,30,0.9)",
      r: 90,
      w: 5,
      grow: 80,
      ellipse: true,
      fill: "rgba(255,70,16,0.32)",
    });
    shake = Math.max(shake, 6);
    sfx(360, 0.2, "sawtooth", 0.08);
    sfx(220, 0.12, "square", 0.05);
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
  }

  function fieldDress() {
    const h = run.hero;
    if (state !== "fight" || !spendMana(skillManaCost(0) || 22)) return;
    const heal = h.maxHp * 0.2;
    const got = healHero(heal);
    h.healFlash = 0.7;
    if (h.dressWard) h.dressWardT = 1.6 * h.dressWard;
    floatText(h.x + 56, groundY() - 220, "+" + fmt(got || heal), "#8fd18f");
    if (run.wolf && run.wolf.hp > 0) {
      const wh = run.wolf.maxHp * 0.32;
      run.wolf.hp = Math.min(run.wolf.maxHp, run.wolf.hp + wh);
      floatText(run.wolf.x, groundY() - 150, "+" + fmt(wh), "#8fd18f");
    }
    sfx(500, 0.12, "sine", 0.05);
  }

  function nextWaveDelay(wave) {
    const early = wave < 6 ? 6.8 : wave < 10 ? 3.0 : 0.6;
    return 8.2 + wave * 0.5 + early;
  }

  function liveCap() {
    const n = run.wave || 0;
    if (n < 6) return 3;
    if (n < 10) return 4;
    return 6;
  }

  function charge() {
    const h = run.hero;
    if (state !== "fight") return;
    for (const e of run.enemies) e.charged = false;
    if (h.mode === "charge") {
      h.mode = "return";
      h.returnTo = Math.max(stageOriginX(run.stage || 1), h.x - 200);
      sfx(240, 0.08, "square", 0.04);
      return;
    }
    const pack = run.enemies.filter((e) => e.aggro && e.hp > 0);
    const far = pack.length ? Math.max(...pack.map((e) => e.x)) + 36 : h.x + CHARGE_SPAN;
    h.chargeTo = Math.min(far, h.x + CHARGE_SPAN + 40);
    h.mode = "charge";
    sfx(300, 0.1, "square", 0.05);
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
    h.whirl = { t: 0, next: 0, left: 3 + (h.whirlExtra || 0) };
    h.anim = "atk";
    h.animT = 0;
  }

  function inferno() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[1];
    if (state !== "fight" || h.skillCd[1] > 0) return;
    h.skillCd[1] = cdScale(spec.cd);
    h.inferno = { t: 0, next: 0, left: 3 + (h.infernoExtra || 0), x: h.x + 150 };
    h.anim = "atk";
    h.animT = 0;
    sfx(200, 0.14, "sawtooth", 0.05);
  }

  function infernoPulse() {
    const h = run.hero;
    const x = h.inferno.x;
    const dmg = h.dmg * 0.95 * autoDmgMult() * (h.infernoMult || 1);
    for (const e of [...run.enemies]) {
      if (e.x > h.x + 20 && e.x < infernoEnd()) {
        hitEnemy(e, dmg, false);
        applyDot(e, ampBurn({ kind: "burn", dps: h.dmg * 0.38, dur: 2.6 }));
      }
    }
    fx.rings.push({ x: x, t: 0.4, color: "rgba(255,90,20,0.75)", r: 30 });
    if (h.infernoEcho && Math.random() < h.infernoEcho) {
      for (const e of [...run.enemies]) {
        if (e.x > h.x + 20 && e.x < infernoEnd()) {
          hitEnemy(e, dmg * 0.55, false);
        }
      }
    }
    shake = 6;
    sfx(160, 0.08, "sawtooth", 0.04);
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
  }

  function frostNova() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[2];
    if (state !== "fight" || h.skillCd[2] > 0 || h.mana < spec.mana) return;
    h.mana -= spec.mana;
    h.skillCd[2] = skillCdScaled(2);
    h.novaT = 0.45;
    if (h.iceLance) h.iceLanceHits = 2;
    if (h.novaMana) h.mana = Math.min(h.maxMana, h.mana + 8 * h.novaMana);
    const dmg = h.dmg * 0.55 * autoDmgMult();
    const reach = novaReachFor(h.novaReach);
    const hold = novaFreezeFor(h.novaHold);
    for (const e of [...run.enemies]) {
      if (Math.abs(e.x - h.x) < reach) {
        hitEnemy(e, dmg, false);
        applyCc(e, hold);
      }
    }
    fx.rings.push({ x: h.x, t: 0.45, color: "rgba(140,210,255,0.85)", r: 36, w: 5, grow: reach - 36 });
    shake = 5;
    sfx(620, 0.16, "sine", 0.05);
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
  }

  function volley() {
    const h = run.hero;
    const c = classDef(h.klass);
    if (state !== "fight" || h.skillCd[1] > 0) return;
    const reach = combatRange();
    const targets = [...run.enemies]
      .filter((e) => Math.abs(e.x - h.x) < reach)
      .sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x));
    if (!targets.length) return;
    h.skillCd[1] = cdScale(c.skills[1].cd);
    h.anim = "atk";
    h.animT = 0;
    const n = 5 + (h.volleyExtra || 0);
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
    shake = 5;
    sfx(480, 0.1, "triangle", 0.05);
  }

  function sicEm() {
    const h = run.hero;
    const spec = classDef(h.klass).skills[2];
    if (state !== "fight" || h.skillCd[2] > 0) return;
    if (wolfAlive()) {
      toast("Wolf is up");
      return;
    }
    h.skillCd[2] = cdScale(spec.cd);
    const at = run.wolf ? run.wolf.x : h.x + 56;
    const fresh = makeWolf();
    fresh.x = at || h.x + 56;
    const frac = Math.min(1, 0.7 + (h.sicRevive || 0));
    fresh.hp = Math.max(1, Math.round(fresh.maxHp * frac));
    fresh.leap = null;
    fresh.taunt = 0;
    run.wolf = fresh;
    if (h.sicHeal) healHero(h.maxHp * h.sicHeal);
    floatText(fresh.x, groundY() - 150, "SIC 'EM", "#c9e6a0");
    floatText(fresh.x, groundY() - 118, "UP", "#8fd18f");
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
    syncAbilities();
  }

  function pickup(d) {
    const h = run.hero;
    if (d.kind === "heart") {
      const heal = h.maxHp * (0.18 + (h.heartAmp || 0));
      healHero(heal);
      floatText(h.x + 56, groundY() - 180, "heal", "#ff8a8a");
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
    if (w.regen) w.hp = Math.min(w.maxHp, w.hp + w.regen * dt);
    w.leap = null;
    const prey = nearest(w.x, (e) => e.aggro && e.hp > 0);
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
        const sip = Math.max(0, w.dmg * (h.wolfLeech || 0));
        if (sip) w.hp = Math.min(w.maxHp, w.hp + sip);
        if (h.packBond) healHero(w.dmg * 0.1 * h.packBond);
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
    if (jumpBannerT > 0) {
      jumpBannerT -= dt;
      if (jumpBannerT <= 0) {
        const ban = document.getElementById("jump-banner");
        if (ban) ban.classList.remove("show");
      }
    }
    if (state !== "fight" || paused) {
      shake = 0;
      updateFx(dt);
      syncHud();
      return;
    }
    const h = run.hero;
    const c = classDef(h.klass);
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: c.maxMana });
    h.flash = Math.max(0, h.flash - dt);
    h.strikeCd = Math.max(0, (Number(h.strikeCd) || 0) - dt);
    h.skillCd[0] = Math.max(0, (Number(h.skillCd[0]) || 0) - dt);
    h.skillCd[1] = Math.max(0, (Number(h.skillCd[1]) || 0) - dt);
    h.skillCd[2] = Math.max(0, (Number(h.skillCd[2]) || 0) - dt);
    h.novaT = Math.max(0, h.novaT - dt);
    h.cauterizeT = Math.max(0, (h.cauterizeT || 0) - dt);
    h.cauterizeWard = Math.max(0, (h.cauterizeWard || 0) - dt);
    h.mendArmorT = Math.max(0, (h.mendArmorT || 0) - dt);
    h.camoT = Math.max(0, (h.camoT || 0) - dt);
    h.dressWardT = Math.max(0, (h.dressWardT || 0) - dt);
    h.healFlash = Math.max(0, (h.healFlash || 0) - dt);
    h.buffs.rage = Math.max(0, h.buffs.rage - dt);
    h.buffs.haste = Math.max(0, h.buffs.haste - dt);
    h.mana = Math.min(h.maxMana, h.mana + h.manaRegen * dt);
    shake = Math.max(0, shake - dt * 18);
    run.biomeFlash = Math.max(0, (run.biomeFlash || 0) - dt);
    followCamera(dt);
    maybeAdvanceStage();
    for (const e of run.enemies) tryAggro(e);

    const melee = livingInRange(h.reach + 16, false);

    if (h.mode === "charge") {
      h.x += CHARGE_SPEED * dt;
      h.anim = "atk";
      h.animT = 0.12;
      for (const e of [...run.enemies]) {
        if (!e.charged && Math.abs(e.x - h.x) < 42) {
          e.charged = true;
          e.aggro = true;
          hitEnemy(e, h.dmg * 0.8 * autoDmgMult(), false);
        }
      }
      if (h.x >= (h.chargeTo || h.x)) {
        h.x = h.chargeTo;
        h.mode = "march";
      }
    } else if (h.mode === "return") {
      h.x -= RETURN_SPEED * dt;
      h.anim = "walk";
      h.animT += dt;
      if (h.x <= (h.returnTo || h.x)) {
        h.x = h.returnTo;
        h.mode = "march";
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
    } else {
      const ready =
        c.style === "melee"
          ? melee.length
          : run.enemies.some((e) => e.aggro && Math.abs(e.x - h.x) <= combatRange());
      if (ready) {
        const rate = h.atkRate * (h.buffs.haste > 0 ? 1.35 : 1) * (lastStanding() ? 1.2 : 1);
        h.atkT -= dt * rate;
        if (h.atkT <= 0) {
          h.atkT = 1;
          autoAttack();
        }
      }
      const swinging = h.anim === "atk" && h.animT < 0.34;
      if (swinging) {
        h.animT += dt;
        if (h.animT >= 0.34) h.anim = shouldMarch() ? "walk" : "idle";
      }
      if (shouldMarch() && !(c.style === "melee" && swinging)) {
        const spd = (h.walk || ROAD.heroWalk) * (h.buffs.haste > 0 ? 1.25 : 1);
        h.x += spd * dt;
        if (!swinging) {
          h.anim = "walk";
          h.animT += dt;
        }
      } else if (!swinging) {
        if (h.anim !== "atk") h.anim = ready ? h.anim : "idle";
        if (h.anim === "idle") h.animT += dt;
      }
    }

    updateWolf(dt);

    for (const e of [...run.enemies]) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.igniteFlash = Math.max(0, (e.igniteFlash || 0) - dt);
      e.animT += dt;
      e.cc = Math.max(0, (e.cc || 0) - dt);
      e.slow = Math.max(0, (e.slow || 0) - dt);
      if (!e.aggro) {
        e.anim = "idle";
        continue;
      }
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
      if (e.def.shadowstep && !e.stepped && Math.abs(e.x - h.x) < 220) {
        e.x = h.x - 56;
        e.stepped = true;
        e.facing = 1;
        floatText(e.x, groundY() - 190, "SHADOW", "#a070ff");
        sfx(260, 0.1, "triangle", 0.05);
      }
      const ranged = !!(e.def.projectile || e.def.heal);
      const spd = (e.defSpeed || e.def.speed) * ((e.slow || 0) > 0 ? 0.62 : 1);
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
              const healers = run.enemies.filter((o) => o.def.heal && o.hp > 0).length;
              const amt = allyHealAmount(e.def, run.wave, healers);
              hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt);
              clampVitals(hurt, { fallback: hurt.maxHp, cap: 4000 });
              e.healTarget = hurt;
              e.healFlash = 0.9;
              floatText(hurt.x, groundY() - 180, "+" + fmt(amt), HEAL_GOLD);
              sfx(640, 0.08, "sine", 0.03);
            }
          }
          const focus =
            nearest(
              e.x,
              (o) =>
                o !== e &&
                o.hp < o.maxHp * 0.95 &&
                Math.abs(o.x - e.x) <= healRange
            ) || (e.hp < e.maxHp * 0.95 ? e : e.healTarget);
          if (focus && focus.hp > 0) e.healTarget = focus;
          e.healFlash = Math.max(0, (e.healFlash || 0) - dt);
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
      } else if (wolfAlive() && Math.abs(b.x - run.wolf.x) < 28) {
        hitWolf(b.dmg);
        b.dead = true;
      } else if (Math.abs(b.x - h.x) < 30) {
        hitHero(b.dmg, b.x);
        b.dead = true;
      }
      if (b.friendly && b.maxX != null) {
        if (b.vx >= 0 && b.x > b.maxX) b.dead = true;
        if (b.vx < 0 && b.x < b.maxX) b.dead = true;
      }
      if (b.x < camera - 80 || b.x > camera + W + 80) b.dead = true;
    }
    fx.bolts = fx.bolts.filter((b) => !b.dead);

    for (const d of fx.drops) {
      d.life -= dt;
      d.age = (d.age || 0) + dt;
      const gy = groundY() - 28;
      if (d.age < DROP_MAGNET_AGE) {
        d.vy += 420 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y > gy) {
          d.y = gy;
          d.vy *= -0.25;
          d.vx *= 0.6;
        }
      } else {
        let tx = h.x;
        let ty = groundY() - 72;
        if (run.wolf && run.wolf.hp > 0) {
          const wd = Math.abs(d.x - run.wolf.x);
          const hd = Math.abs(d.x - h.x);
          if (wd + 24 < hd) {
            tx = run.wolf.x;
            ty = groundY() - 48;
          }
        }
        const dx = tx - d.x;
        const dy = ty - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        const spd = 320 + Math.min(460, (d.age - DROP_MAGNET_AGE) * 220);
        d.x += (dx / dist) * spd * dt;
        d.y += (dy / dist) * spd * dt;
        d.vx = 0;
        d.vy = 0;
      }
      const nearHero = Math.abs(d.x - h.x) < DROP_PICK_R && Math.abs(d.y - (groundY() - 64)) < 110;
      const nearWolf =
        run.wolf &&
        run.wolf.hp > 0 &&
        Math.abs(d.x - run.wolf.x) < 80 &&
        Math.abs(d.y - (groundY() - 48)) < 80;
      if (nearHero || nearWolf) {
        pickup(d);
        d.life = 0;
      }
    }
    fx.drops = fx.drops.filter((d) => d.life > 0);

    updateWeather(dt);
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

  function updateWeather(dt) {
    const biome = biomeForStage(run.stage || 1);
    const kind = biome.particle;
    if (fx.weather.length < 30) {
      fx.weather.push({
        kind,
        x: camera + Math.random() * (W + 80) - 40,
        y: Math.random() * H * 0.72,
        vx: kind === "snow" ? -18 - Math.random() * 22 : kind === "ember" ? -10 + Math.random() * 30 : -30 + Math.random() * 20,
        vy: kind === "ember" ? -20 - Math.random() * 40 : 22 + Math.random() * 36,
        s: 2 + Math.random() * 3,
      });
    }
    for (const p of fx.weather) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > H * 0.82 || p.x < camera - 60 || p.x > camera + W + 60) {
        p.x = camera + Math.random() * W;
        p.y = -8;
        p.kind = kind;
      }
    }
  }

  // --- render ---
  function sx(x) {
    return x - camera;
  }

  function playClipW() {
    return Math.max(240, W - SHOP_W + 8);
  }

  function clipPlay(fn) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, playClipW(), H);
    ctx.clip();
    fn();
    ctx.restore();
  }

  function hudNum(n, cap) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0";
    const x = Math.round(v * 10) / 10;
    const max = cap == null ? 99 : cap;
    if (x < 0) return "0";
    if (x > max) return String(max);
    return String(x);
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
    const biome = biomeForStage(run.stage || 1);
    const bg = img.bg;
    if (!bg) {
      ctx.fillStyle = biome.skyTop;
      ctx.fillRect(0, 0, W, H);
    } else {
      const scale = H / bg.height;
      const sw = bg.width * scale;
      const maxPan = Math.max(0, sw - W);
      const trip = maxPan * 2 || 1;
      let t = (camera * 0.22) % trip;
      if (t < 0) t += trip;
      const pan = t > maxPan ? trip - t : t;
      ctx.save();
      ctx.filter =
        "hue-rotate(" +
        biome.hue +
        "deg) saturate(" +
        biome.sat +
        ") brightness(" +
        biome.bright +
        ")";
      ctx.drawImage(bg, -pan, 0, sw, H);
      ctx.restore();
    }
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.42);
    sky.addColorStop(0, biome.skyTop);
    sky.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sky;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, W, H * 0.42);
    ctx.globalAlpha = 1;
    const gy = groundY();
    if (biome.wash) {
      ctx.fillStyle = biome.wash;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = biome.ground;
    ctx.fillRect(0, gy + 4, W, H - gy);
    ctx.fillStyle = biome.fog;
    ctx.fillRect(0, gy - 86, W, 94);
    drawSilhouettes(biome, gy);
    drawWeather();
    if ((run.biomeFlash || 0) > 0) {
      ctx.fillStyle = "rgba(8,6,4," + run.biomeFlash * 0.55 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawSilhouettes(biome, gy) {
    const span = 220;
    const start = Math.floor(camera / span) - 1;
    ctx.save();
    ctx.fillStyle = biome.accent;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 8; i++) {
      const wx = (start + i) * span + 40;
      const x = sx(wx);
      const hgt = 90 + ((start + i) % 5) * 16;
      if (biome.id === "duskwood") {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + 18, gy - hgt);
        ctx.lineTo(x + 36, gy);
        ctx.fill();
      } else if (biome.id === "ember") {
        ctx.fillRect(x + 8, gy - hgt * 0.45, 22, hgt * 0.45);
        ctx.beginPath();
        ctx.moveTo(x, gy - hgt * 0.45);
        ctx.lineTo(x + 19, gy - hgt);
        ctx.lineTo(x + 38, gy - hgt * 0.45);
        ctx.fill();
      } else if (biome.id === "rime") {
        ctx.beginPath();
        ctx.moveTo(x + 16, gy);
        ctx.lineTo(x + 6, gy - hgt);
        ctx.lineTo(x + 26, gy - hgt * 0.7);
        ctx.lineTo(x + 36, gy);
        ctx.fill();
      } else if (biome.id === "storm") {
        ctx.fillRect(x + 10, gy - hgt * 0.35, 28, hgt * 0.35);
        ctx.fillRect(x + 18, gy - hgt, 8, hgt);
      } else {
        ctx.fillRect(x + 4, gy - hgt * 0.6, 34, hgt * 0.6);
        ctx.fillRect(x + 12, gy - hgt, 18, hgt * 0.4);
      }
    }
    ctx.restore();
  }

  function drawGates(gy) {
    const maxStage = Math.max(run.stage || 1, ...Object.keys(run.placed || {}).map(Number), 1);
    for (let s = 1; s <= maxStage; s++) {
      const gx = gateWorldX(s);
      const x = sx(gx);
      if (x < -80 || x > W + 80) continue;
      const next = biomeForStage(s + 1);
      ctx.save();
      ctx.fillStyle = next.accent;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x - 14, gy - 168, 12, 168);
      ctx.fillRect(x + 10, gy - 168, 12, 168);
      ctx.fillRect(x - 22, gy - 180, 52, 16);
      ctx.fillStyle = next.dust;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x - 40, 0, 80, gy);
      ctx.restore();
      drawStamp(next.name, x, gy - 196, {
        color: "#1a1208",
        bg: next.dust,
        border: next.accent,
        font: "bold 16px VT323, monospace",
        h: 20,
      });
    }
  }

  function drawWeather() {
    const biome = biomeForStage(run.stage || 1);
    ctx.save();
    for (const p of fx.weather) {
      ctx.fillStyle = biome.dust;
      ctx.globalAlpha = 0.55;
      if (p.kind === "ember") {
        ctx.fillRect(sx(p.x), p.y, 3, 5);
      } else if (p.kind === "snow") {
        ctx.beginPath();
        ctx.arc(sx(p.x), p.y, p.s * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(sx(p.x), p.y, p.s, 2);
      }
    }
    ctx.restore();
  }

  function drawHpBar(x, y, w, hp, max, color, opts) {
    const o = opts || {};
    const hgt = o.h || 9;
    const left = x - w / 2;
    const ratio = Math.max(0, Math.min(1, hp / Math.max(1, max)));
    const low = ratio <= 0.35;
    ctx.save();
    ctx.fillStyle = "rgba(6,4,3,0.8)";
    ctx.fillRect(left - 2, y - 2, w + 4, hgt + 4);
    ctx.fillStyle = "#0c0a08";
    ctx.fillRect(left, y, w, hgt);
    ctx.fillStyle = low ? "#e04840" : color;
    ctx.fillRect(left + 1, y + 1, Math.max(0, (w - 2) * ratio), hgt - 2);
    ctx.strokeStyle = o.urgent ? "#ffe27a" : low ? "#ff8a6a" : "#1a120c";
    ctx.lineWidth = o.urgent ? 2.2 : 1.4;
    ctx.strokeRect(left + 0.5, y + 0.5, w - 1, hgt - 1);
    const pair = hpPair(hp, max);
    const label = o.label ? o.label + " " + pair.text : pair.text;
    ctx.font = "bold 13px VT323, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = Math.ceil(ctx.measureText(label).width) + 10;
    const side = o.chipSide || 0;
    const cx = side ? x + side * (w / 2 + tw / 2 + 7) : x;
    const cy = side ? y + hgt / 2 : y - 12;
    ctx.fillStyle = "rgba(6, 4, 2, 0.94)";
    ctx.strokeStyle = o.urgent ? "#ffe27a" : "#4a3820";
    ctx.lineWidth = 1.6;
    ctx.fillRect(Math.round(cx - tw / 2), Math.round(cy - 8), tw, 16);
    ctx.strokeRect(Math.round(cx - tw / 2) + 0.5, Math.round(cy - 8) + 0.5, tw - 1, 15);
    ctx.fillStyle = "#f4e6c8";
    ctx.fillText(label, cx, cy + 1);
    ctx.restore();
  }

  function assignBarLanes(units) {
    const sorted = units.slice().sort((a, b) => a.x - b.x);
    const clusters = [];
    for (const u of sorted) {
      let cluster = clusters.find((c) => c.some((m) => Math.abs(m.x - u.x) < 120));
      if (!cluster) {
        cluster = [];
        clusters.push(cluster);
      }
      cluster.push(u);
    }
    for (const cluster of clusters) {
      cluster.forEach((u, i) => {
        u.lane = i;
        u.fan = i - (cluster.length - 1) / 2;
        u.chipSide = 0;
      });
    }
    return units;
  }

  function healSkillReady() {
    const h = run.hero;
    if (!h || state !== "fight") return false;
    const s = classDef(h.klass).skills[0];
    if (s.mana && h.mana < s.mana) return false;
    if (s.cd && (h.skillCd[0] || 0) > 0) return false;
    return true;
  }

  function healUrgent() {
    const h = run.hero;
    if (!h || !healSkillReady()) return false;
    if (h.hp / h.maxHp <= 0.35) return true;
    if (h.klass === "ranger" && wolfAlive() && run.wolf.hp / run.wolf.maxHp <= 0.35) return true;
    return false;
  }

  function healCueClear() {
    const h = run.hero;
    if (!h) return true;
    if (h.hp / h.maxHp <= 0.45) return false;
    if (h.klass === "ranger" && wolfAlive() && run.wolf.hp / run.wolf.maxHp <= 0.45) return false;
    return true;
  }

  function sicReady() {
    const h = run.hero;
    if (!h || h.klass !== "ranger" || state !== "fight") return false;
    if ((h.skillCd[2] || 0) > 0) return false;
    return !!(run.wolf && run.wolf.hp <= 0);
  }

  function drawWorldBars(gy) {
    const h = run.hero;
    const pack = [];
    if (run.wolf && run.wolf.hp > 0 && state === "fight") {
      pack.push({
        x: run.wolf.x,
        y: gy - 98,
        w: 80,
        h: 10,
        hp: run.wolf.hp,
        max: run.wolf.maxHp,
        color: "#c9a06a",
        label: "WOLF",
      });
    }
    for (const e of run.enemies) {
      if (e.hp <= 0) continue;
      const hgt = 150 * (e.def.scale || 1);
      pack.push({
        x: e.x,
        y: gy - hgt + 8,
        w: e.def.boss ? 118 : 76,
        h: e.def.boss ? 11 : 9,
        hp: e.hp,
        max: e.maxHp,
        color: e.def.color,
        label: e.def.boss ? (e.def.name.split(" ").pop() || "BOSS") : "",
      });
    }
    assignBarLanes(pack);
    pack.sort((a, b) => a.lane - b.lane);
    for (const b of pack) {
      drawHpBar(sx(b.x) + (b.fan || 0) * 40, b.y - b.lane * 40, b.w, b.hp, b.max, b.color, {
        h: b.h,
        label: b.label,
        chipSide: b.chipSide,
      });
    }
    if (h && state === "fight") {
      drawHpBar(sx(h.x), gy - 300, 104, h.hp, h.maxHp, "#d45454", {
        h: 13,
        label: "YOU",
        urgent: healUrgent(),
      });
    }
  }

  function drawStamp(text, x, y, opts) {
    const o = opts || {};
    ctx.save();
    ctx.font = o.font || "bold 18px VT323, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const pad = o.pad || 7;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = o.h || 20;
    ctx.fillStyle = o.bg || "rgba(4, 3, 2, 0.88)";
    ctx.strokeStyle = o.border || "#ffe27a";
    ctx.lineWidth = 2;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - h / 2) + 0.5, w - 1, h - 1);
    ctx.fillStyle = o.color || "#ffe27a";
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function drawCdRing(x, y, r, frac, color) {
    const ready = Math.max(0, Math.min(1, 1 - frac));
    ctx.beginPath();
    ctx.fillStyle = "rgba(6, 5, 4, 0.88)";
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = ready >= 0.99 ? "#fff4a8" : "rgba(40,36,28,0.95)";
    ctx.lineWidth = 4;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready);
    ctx.stroke();
    if (ready >= 0.99) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 244, 168, 0.55)";
      ctx.lineWidth = 2;
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function skillCdFrac(slot) {
    const h = run.hero;
    const s = classDef(h.klass).skills[slot];
    if (!s.cd) return 0;
    return Math.min(1, (Number(h.skillCd[slot]) || 0) / Math.max(0.01, skillCdScaled(slot)));
  }

  function drawHealVfx(e, gy, labels) {
    const range = e.def.healRange || 0;
    if (!range) return;
    const t = e.healTarget;
    if (!labels) {
      ctx.save();
      ctx.fillStyle = HEAL_GOLD_FILL;
      ctx.strokeStyle = HEAL_GOLD_INK;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(sx(e.x), gy - 6, range, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = HEAL_GOLD;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(sx(e.x), gy - 6, range, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (t && t.hp > 0) {
        const pulse = e.healFlash || 0;
        ctx.strokeStyle = HEAL_GOLD_INK;
        ctx.lineWidth = pulse > 0 ? 7 : 5;
        ctx.beginPath();
        ctx.moveTo(sx(e.x), gy - 88);
        ctx.lineTo(sx(t.x), gy - 70);
        ctx.stroke();
        ctx.strokeStyle = pulse > 0 ? HEAL_GOLD_HOT : HEAL_GOLD;
        ctx.lineWidth = pulse > 0 ? 5 : 3.5;
        ctx.beginPath();
        ctx.moveTo(sx(e.x), gy - 88);
        ctx.lineTo(sx(t.x), gy - 70);
        ctx.stroke();
        ctx.fillStyle = pulse > 0 ? HEAL_GOLD_HALO_HOT : HEAL_GOLD_HALO;
        ctx.beginPath();
        ctx.arc(sx(t.x), gy - 50, pulse > 0 ? 38 : 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = HEAL_GOLD_INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx(t.x), gy - 50, pulse > 0 ? 38 : 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = pulse > 0 ? HEAL_GOLD_HOT : HEAL_GOLD;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx(t.x), gy - 50, pulse > 0 ? 38 : 26, 0, Math.PI * 2);
        ctx.stroke();
        if (pulse > 0) {
          ctx.strokeStyle = HEAL_GOLD_HOT;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(sx(t.x), gy - 50, 44 + (0.9 - pulse) * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }
    drawStamp("HEAL RANGE", sx(e.x), gy + 50, {
      color: HEAL_GOLD_INK,
      bg: HEAL_GOLD,
      border: HEAL_GOLD_HOT,
      font: "bold 16px VT323, monospace",
      h: 20,
    });
  }

  function drawPatientStamps(gy) {
    const seen = [];
    for (const e of run.enemies) {
      if (!e.def.heal) continue;
      const t = e.healTarget;
      if (!t || t.hp <= 0) continue;
      if (seen.some((p) => p === t)) continue;
      seen.push(t);
      const self = t === e;
      const hot = (e.healFlash || 0) > 0.05;
      const py = self || (t.igniteFlash || 0) > 0.25 ? gy - 58 : gy + 20;
      drawStamp("PATIENT", sx(t.x), py, {
        color: HEAL_GOLD_INK,
        bg: hot ? HEAL_GOLD_HOT : HEAL_GOLD,
        border: HEAL_GOLD_HOT,
        font: "bold 20px VT323, monospace",
        h: 24,
        pad: 9,
      });
    }
  }

  function drawHeroCdPips() {
    const h = run.hero;
    if (!h || state !== "fight") return;
    const cdef = classDef(h.klass);
    const accent = cdef.color || "#e6c15a";
    const slots = [
      { lab: "S", frac: Math.min(1, h.strikeCd / Math.max(0.01, cdScale(cdef.strikeCd))), color: "#e6c15a" },
      { lab: "1", frac: skillCdFrac(0), color: "#7ad0ff" },
      { lab: "2", frac: skillCdFrac(1), color: "#7ad0ff" },
      { lab: "3", frac: skillCdFrac(2), color: "#7ad0ff" },
    ];
    const r = 13;
    const gap = 12;
    const padX = 16;
    const padY = 9;
    const panelW = padX * 2 + slots.length * (r * 2) + (slots.length - 1) * gap;
    const panelH = 50;
    const x0 = 14;
    const y0 = H - 84;
    ctx.save();
    ctx.fillStyle = "rgba(6, 8, 14, 0.78)";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x0 + 0.5, y0 + 0.5, panelW, panelH);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x0 + 1, y0 + 1, panelW - 1, 3);
    ctx.globalAlpha = 1;
    ctx.font = "bold 15px VT323, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    slots.forEach((p, i) => {
      const cx = x0 + padX + r + i * (r * 2 + gap);
      const cy = y0 + padY + r + 2;
      drawCdRing(cx, cy, r, p.frac, p.frac <= 0.02 ? "#fff4a8" : p.color);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000";
      ctx.strokeText(p.lab, cx, cy + 1);
      ctx.fillStyle = p.frac <= 0.02 ? "#fff4a8" : "#e8eef6";
      ctx.fillText(p.lab, cx, cy + 1);
    });
    ctx.restore();
  }

  function drawWolfTags(gy) {
    const w = run.wolf;
    if (!w || (state !== "fight" && state !== "dead")) return;
    if (w.hp > 0) {
      const tanking = run.enemies.some((e) => threatFor(e) === w);
      const tag = w.taunt > 0 ? "TAUNT" : tanking ? "TANK" : "GUARD";
      const hot = w.taunt > 0 || tanking;
      drawStamp(tag, sx(w.x), gy + 18, {
        color: hot ? "#1a1208" : "#d8f0a8",
        bg: hot ? "#ffe27a" : "rgba(8, 12, 6, 0.9)",
        border: hot ? "#fff4a8" : "#8faf4a",
        font: "bold 20px VT323, monospace",
        h: 22,
      });
    } else {
      drawStamp("DOWN", sx(w.x), gy - 108, {
        color: "#fff0e0",
        bg: "#6a2018",
        border: "#ff8a6a",
        font: "bold 20px VT323, monospace",
        h: 22,
      });
      drawStamp("3 revive", sx(w.x), gy + 18, {
        color: "#ffe27a",
        border: "#c07040",
        font: "bold 16px VT323, monospace",
      });
    }
  }

  function drawBurn(e, gy) {
    const burn = e.dots && e.dots.find((d) => d.kind === "burn");
    if (!burn) return;
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(e.animT * 10) * 0.12;
    ctx.fillStyle = "rgba(255,80,20,0.45)";
    ctx.beginPath();
    ctx.arc(sx(e.x), gy - 48, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const ox = Math.sin(e.animT * 11 + i * 1.3) * 12;
      const oy = -((e.animT * 50 + i * 11) % 40);
      ctx.fillStyle = i % 2 ? "#ffe27a" : "#ff5a22";
      ctx.fillRect(sx(e.x) + ox - 2, gy - 36 + oy, 4, 7);
    }
    ctx.restore();
    drawStamp("BURN " + Math.ceil(burn.t) + "s", sx(e.x), gy - 128, {
      color: "#fff0d8",
      bg: "#5a180c",
      border: "#ff8a3a",
      font: "bold 16px VT323, monospace",
    });
  }

  function heroSprite(h) {
    const c = classDef(h.klass);
    if (c.anims) {
      if (h.anim === "atk" && img.heroAtk.length) {
        const i = Math.min(img.heroAtk.length - 1, Math.floor(h.animT / 0.08));
        return img.heroAtk[i];
      }
      if (h.anim === "walk" && img.heroIdle.length) return frameOf(img.heroIdle, h.animT, 9);
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
    if (state === "dead") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "rgba(6, 8, 14, 0.8)";
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const gy = groundY();
    const h = run.hero;
    drawGates(gy);

    if (h && (state === "fight" || state === "dead")) {
      const c = classDef(h.klass);
      const spr = heroSprite(h);
      const bob = h.anim === "walk" ? Math.sin(h.animT * 14) * 3 : 0;
      drawImg(spr, sx(h.x), gy + 6 + bob, 168, {
        flash: h.flash > 0 || h.cauterizeT > 0,
        flip: !!c.flip,
        hue: c.hue,
      });
      if (h.cauterizeT > 0 || h.healFlash > 0) {
        const t = h.cauterizeT || 0;
        const hf = h.healFlash || 0;
        const a = Math.max(t / 1.15, hf / 0.85, 0);
        ctx.save();
        if (t > 0) {
          ctx.globalAlpha = 0.22 + a * 0.35;
          ctx.fillStyle = "rgba(255,70,10,0.28)";
          ctx.fillRect(0, gy - 28, playClipW(), 36);
          ctx.globalAlpha = 0.45 + a * 0.5;
          ctx.fillStyle = "rgba(255,90,16,0.4)";
          ctx.beginPath();
          ctx.ellipse(sx(h.x), gy - 6, 120 + (1.15 - t) * 50, 22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffe27a";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.globalAlpha = a;
          ctx.strokeStyle = "#ff6a22";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(sx(h.x), gy - 80, 48 + (1.15 - t) * 90, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "#fff4a8";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx(h.x), gy - 80, 70 + (1.15 - t) * 70, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 12; i++) {
            const ox = Math.sin(t * 16 + i * 0.9) * 36;
            const oy = -((1.15 - t) * 90 + i * 7);
            ctx.fillStyle = i % 2 ? "#ffe27a" : "#ff4a14";
            ctx.fillRect(sx(h.x) + ox - 3, gy - 70 + oy, 5, 10);
          }
        }
        if (hf > 0 && t <= 0) {
          ctx.globalAlpha = Math.min(1, hf * 1.4);
          ctx.strokeStyle = "#8fd18f";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(sx(h.x), gy - 80, 42 + (0.7 - hf) * 50, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
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
        ctx.fillRect(sx(h.x + 30), gy - 20, Math.max(80, infernoEnd() - h.x - 30), 18);
      }
      if (h.novaT > 0) {
        const reach = novaReachFor(h.novaReach);
        const u = (0.45 - h.novaT) / 0.45;
        ctx.strokeStyle = "rgba(140,210,255,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx(h.x), gy - 80, 40 + u * (reach - 40), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (run.wolf && (state === "fight" || state === "dead")) {
      const w = run.wolf;
      ctx.save();
      if (w.hp > 0) {
        const bob = w.anim === "walk" ? Math.sin(w.animT * 12) * 3 : 0;
        const tanking = run.enemies.some((e) => threatFor(e) === w);
        if (tanking) {
          ctx.strokeStyle = "rgba(255,170,70,0.55)";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(sx(w.x), gy - 36, 40, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawImg(img.wolf, sx(w.x), gy + 8 + bob, 92, { flash: w.flash > 0 });
        if (w.taunt > 0) {
          ctx.strokeStyle = "rgba(230,193,90,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx(w.x), gy - 40, 36 + Math.sin(w.animT * 8) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const e of run.enemies) {
          if (threatFor(e) !== w) continue;
          ctx.strokeStyle = "rgba(230,193,90,0.35)";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(sx(e.x), gy - 60);
          ctx.lineTo(sx(w.x), gy - 40);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.globalAlpha = 0.32;
        drawImg(img.wolf, sx(w.x), gy + 8, 92);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
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
      ctx.save();
      if (!e.aggro) ctx.globalAlpha = 0.72;
      drawImg(spr, sx(e.x) + lunge, gy + 6 + bob, hgt, {
        flash: e.flash > 0 || e.cc > 0 || e.igniteFlash > 0,
        flip: face > 0,
        hue: e.cc > 0 ? 180 : e.igniteFlash > 0 ? 20 : 0,
      });
      ctx.restore();
      if (!e.aggro && onScreen(e.x)) {
        drawStamp("WAIT", sx(e.x), gy + 20, {
          color: "#d8e0c8",
          bg: "rgba(8,10,8,0.72)",
          border: "#6a7a58",
          font: "bold 14px VT323, monospace",
          h: 16,
        });
      }
      if (e.igniteFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, e.igniteFlash * 1.2);
        ctx.fillStyle = "rgba(255,70,10,0.28)";
        ctx.beginPath();
        ctx.arc(sx(e.x), gy - 48, 34 + (1.05 - e.igniteFlash) * 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ff6a22";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(sx(e.x), gy - 52, 30 + (1.05 - e.igniteFlash) * 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawBurn(e, gy);
    }

    for (const e of run.enemies) {
      if (e.def.heal) drawHealVfx(e, gy, false);
    }

    if (state === "fight") {
      clipPlay(() => {
        drawWorldBars(gy);
        for (const e of run.enemies) {
          if (e.def.heal) drawHealVfx(e, gy, true);
        }
        drawWolfTags(gy);
        drawHeroCdPips();
        if (h && h.cauterizeT > 0) {
          drawStamp("CAUTERIZE", sx(h.x), gy - 322, {
            color: "#1a1008",
            bg: "#ff8a3a",
            border: "#ffe27a",
            font: "bold 22px VT323, monospace",
            h: 24,
          });
          if (!(h.cauterizeIgnited > 0)) {
            drawStamp("NO FOES TO IGNITE", sx(h.x), gy - 292, {
              color: "#1a1008",
              bg: HEAL_GOLD,
              border: HEAL_GOLD_HOT,
              font: "bold 16px VT323, monospace",
              h: 20,
            });
          }
        }
        if (h && h.healFlash > 0 && !(h.cauterizeT > 0)) {
          drawStamp("HEAL", sx(h.x), gy - 322, {
            color: "#102010",
            bg: "#8fd18f",
            border: "#d8f0a8",
            font: "bold 20px VT323, monospace",
            h: 22,
          });
        }
        for (const e of run.enemies) {
          if ((e.igniteFlash || 0) > 0.25) {
            drawStamp("IGNITE", sx(e.x), gy - 110, {
              color: "#fff4e0",
              bg: "#7a1808",
              border: "#ff8a3a",
              font: "bold 18px VT323, monospace",
              h: 20,
            });
          }
        }
        drawPatientStamps(gy);
      });
    }

    for (const r of fx.rings) {
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.w || 3;
      const grow = r.grow != null ? r.grow : 80;
      const rad = Math.max(4, r.r + (0.5 - r.t) * grow);
      ctx.beginPath();
      if (r.ellipse) {
        ctx.ellipse(sx(r.x), gy - 8, rad, 16, 0, 0, Math.PI * 2);
        if (r.fill) {
          ctx.fillStyle = r.fill;
          ctx.fill();
        }
        ctx.stroke();
      } else {
        ctx.arc(sx(r.x), gy - 70, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
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

    clipPlay(() => {
      for (const f of fx.floats) {
        const px = sx(f.x);
        if (px < -40) continue;
        const word = /[A-Za-z]/.test(f.text);
        if (word) {
          drawStamp(f.text, px, f.y, {
            color: f.color,
            bg: "rgba(6,4,2,0.9)",
            border: f.color,
            font: "bold 16px VT323, monospace",
            h: 18,
          });
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, f.t * 1.4);
          ctx.font = "bold 18px VT323, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(6,4,2,0.9)";
          ctx.strokeText(f.text, px, f.y);
          ctx.fillStyle = f.color;
          ctx.fillText(f.text, px, f.y);
          ctx.restore();
        }
      }
    });

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
      if (h && h.mode === "charge") return "Return";
      return s.name;
    }
    if (s.id === "sic" && h && run.wolf && run.wolf.hp <= 0 && !(h.skillCd[slot] > 0)) {
      return "Sic 'em — UP";
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
    if (s.cd && (Number(h.skillCd[slot]) || 0) > 0) return true;
    if (s.id === "whirl" && h.whirl) return true;
    if (s.id === "inferno" && h.inferno) return true;
    if (s.id === "sic" && wolfAlive()) return true;
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

  function syncAbilities() {
    const h = run.hero;
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById("btn-s" + (i + 1));
      if (!btn) continue;
      const lab = btn.querySelector("b") || btn;
      lab.textContent = skillLabel(i);
      const dead = skillDisabled(i);
      btn.disabled = dead;
      btn.classList.toggle("ready", !dead && !!h && state === "fight");
      const frac = h ? skillCdFrac(i) : 0;
      btn.style.setProperty("--cd", String(Math.round((Number.isFinite(frac) ? frac : 0) * 100)));
    }
    const healBtn = document.getElementById("btn-s1");
    const urgent = healUrgent();
    if (healBtn) {
      healBtn.classList.toggle("urgent", urgent);
      if (urgent && !healCueOn) {
        healCueOn = true;
        const name = classDef(h.klass).skills[0].name;
        toast(name + " ready");
        healBtn.classList.remove("ready-flash");
        void healBtn.offsetWidth;
        healBtn.classList.add("ready-flash");
      } else if (!urgent && healCueClear()) {
        healCueOn = false;
        healBtn.classList.remove("ready-flash");
      }
    }
    const sicBtn = document.getElementById("btn-s3");
    if (sicBtn && h && h.klass === "ranger") {
      const rez = sicReady();
      sicBtn.classList.toggle("urgent", rez);
      sicBtn.classList.toggle("ready-flash", rez);
    }
  }

  function syncHud() {
    const h = run.hero;
    if (!h) {
      syncAbilities();
      return;
    }
    clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
    const shown = hpPair(h.hp, h.maxHp);
    h.hp = shown.hp;
    h.maxHp = shown.max;
    document.getElementById("hp-fill").style.width = (100 * shown.hp) / shown.max + "%";
    document.getElementById("mp-fill").style.width = (100 * h.mana) / Math.max(1, h.maxMana) + "%";
    const hpBar = document.querySelector(".bar.hp");
    if (hpBar) hpBar.classList.toggle("low", shown.hp / shown.max <= 0.35);
    document.getElementById("hp-text").textContent = shown.text;
    document.getElementById("mp-text").textContent = `${fmt(h.mana)}/${fmt(h.maxMana)}`;
    document.getElementById("gold").textContent = fmt(run.gold);
    document.getElementById("mana-stat").textContent = fmt(h.mana);
    document.getElementById("wave").textContent = String(Math.max(1, run.wave));
    const stageEl = document.getElementById("hud-stage");
    if (stageEl) {
      const biome = biomeForStage(run.stage || 1);
      stageEl.textContent = biome.name;
      stageEl.style.color = biome.dust;
    }
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
    document.getElementById("st-armor").textContent = hudNum(h.armor, 40);
    document.getElementById("st-crit").textContent = hudNum((h.crit || 0) * 100, 100) + "%";
    document.getElementById("st-leech").textContent = hudNum((h.leech || 0) * 100, 80) + "%";
    document.getElementById("st-fortune").textContent = hudNum((h.goldFind || 0) * 100, 400) + "%";
    document.getElementById("st-regen").textContent = hudNum(h.manaRegen, 20) + "/s";
    const rangeEl = document.getElementById("st-range");
    if (rangeEl) {
      rangeEl.textContent =
        h.style === "ranged" ? String(Math.round(combatRange())) : String(Math.round(h.reach));
    }
    const buffs = [];
    if (rage) buffs.push("Rage " + Math.ceil(h.buffs.rage) + "s");
    if (haste) buffs.push("Haste " + Math.ceil(h.buffs.haste) + "s");
    if (run.wolf) {
      if (wolfAlive()) {
        const tag = run.wolf.taunt > 0 ? "Taunt" : "Guard";
        buffs.push("Wolf " + fmt(run.wolf.hp) + "/" + fmt(run.wolf.maxHp) + " " + tag);
      } else buffs.push("Wolf down — press 3");
    }
    if (lastStanding()) buffs.push("Last Stand");
    if (h.secondWind > 0) buffs.push("Wind " + h.secondWind);
    const buffEl = document.getElementById("st-buffs");
    buffEl.textContent = buffs.length ? buffs.join(" · ") : "—";
    buffEl.classList.toggle("hot", buffs.length > 0);
    syncAbilities();
    syncTreeHeld();
    for (const u of shopList(h.klass)) {
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
    const klass = activeKlass();
    const pool = shopList(klass);
    const next = nextShopUnlockWave(wave, klass);
    const starters = pool.filter((u) => shopUnlockWave(u) === 1).map((u) => u.name);
    const nextEl = document.getElementById("shop-next");
    if (nextEl) {
      if (!run.boughtAny && wave < 5) {
        nextEl.textContent =
          run.gold >= 8
            ? "First steel is in reach — buy " +
              (starters.length <= 2
                ? starters.join(" or ")
                : starters.slice(0, -1).join(", ") + ", or " + starters[starters.length - 1]) +
              "."
            : "First steel costs 8g. The first raiders pay for it.";
      } else {
        nextEl.textContent = next
          ? "Next crate opens at wave " + next + "."
          : "The armory is fully open.";
      }
    }
    for (const u of pool) {
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
      if (open && lv === 0 && !run.boughtAny && run.gold >= u.cost(0)) row.classList.add("ready");
      row.innerHTML = `<div class="name">${u.icon} ${u.name} <span style="color:#8ea0b5">${lv}</span></div>
        <button id="buy-${u.id}" type="button">${fmt(u.cost(lv))}</button>
        <div class="desc">${u.desc}</div>`;
      box.appendChild(row);
      row.querySelector("button").onclick = () => buyRun(u.id);
    }
    syncClassChrome();
    syncAbilities();
  }

  function applyPack(hero) {
    if (run.wolf && run.wolf.hp > 0) {
      syncWolfVitals(true);
    } else if (hero.klass !== "ranger") {
      hero.maxHp += 20;
      hero.hp = Math.min(hero.maxHp, hero.hp + 20);
      clampVitals(hero, { fallback: heroFallbackMax(), manaFallback: classDef(hero.klass).maxMana });
    }
  }

  function buyRun(id) {
    const u = RUN_UPGRADES.find((x) => x.id === id);
    if (!u || (u.klass && u.klass !== activeKlass())) return;
    const lv = run.levels[id] || 0;
    const c = u.cost(lv);
    if (run.gold < c || state !== "fight") return;
    if (run.wave < shopUnlockWave(u)) return;
    run.gold -= c;
    run.levels[id] = lv + 1;
    run.boughtAny = true;
    u.apply(run.hero);
    if (u.id === "r_pack" || u.id === "pack") applyPack(run.hero);
    buildShop();
    sfx(560, 0.08, "square", 0.05);
  }

  function buyPrestige(id) {
    const klass = persist.klass;
    const u = findPrestNode(klass, id);
    if (!u) return false;
    const bag = treeBag(klass);
    const lv = bag[u.id] || 0;
    if (lv >= (u.max || 8)) return false;
    if (!prestReqMet(u, bag, klass) && lv === 0) return false;
    const c = u.cost(lv);
    if (persist.glory < c) return false;
    persist.glory -= c;
    bag[u.id] = (bag[u.id] || 0) + 1;
    persist.trees = mergeTrees(persist.trees, ((readDisk() || {}).trees));
    save();
    const disk = readDisk();
    const wrote =
      disk &&
      disk.trees &&
      disk.trees[klass] &&
      (disk.trees[klass][u.id] || 0) >= (persist.trees[klass][u.id] || 0);
    if (!wrote) toast("Class tree save failed — ranks kept in this tab", 3);
    const bank = document.getElementById("glory-bank");
    if (bank) bank.textContent = fmt(persist.glory);
    document.getElementById("glory").textContent = fmt(persist.glory);
    buildPrestige();
    sfx(500, 0.1, "sine", 0.05);
    return true;
  }

  function renderTreeNode(klass, u, bag) {
    const lv = bag[u.id] || 0;
    const open = prestReqMet(u, bag, klass);
    const maxed = lv >= (u.max || 8);
    const c = u.cost(lv);
    const st = lv > 0 ? "owned" : open ? "open" : "locked";
    const req = prestReqText(u, klass);
    const btnLabel = maxed ? "MAX" : c + " glory";
    const step = document.createElement("div");
    step.className = "tree-step depth-" + (u.root ? 0 : u.row) + " " + st;
    step.innerHTML = `<div class="tree-node ${st}">
      <div class="name">${u.name} <span>${lv}/${u.max}</span></div>
      <div class="desc">${u.desc}</div>
      ${req && !open ? `<div class="req">Needs ${req}</div>` : ""}
      <button type="button">${btnLabel}</button>
    </div>`;
    const btn = step.querySelector("button");
    btn.disabled = maxed || !open || persist.glory < c;
    btn.onclick = () => buyPrestige(u.id);
    return step;
  }

  function buildPrestige() {
    const box = document.getElementById("prestige-shop");
    if (!box) return;
    const klass = persist.klass;
    const tree = prestigeTree(klass);
    const bag = treeBag(klass);
    box.className = "tree class-tree";
    box.innerHTML = "";
    const bank = document.getElementById("glory-bank");
    if (bank) bank.textContent = fmt(persist.glory);
    const title = document.getElementById("tree-title");
    if (title) title.textContent = tree.name;
    const note = document.getElementById("tree-note");
    if (note) {
      note.textContent =
        tree.blurb +
        " Fill every rank on a node before its children unlock. Deeper nodes cost more Glory.";
    }
    syncTreeHeld();
    const root = prestigeRoot(klass);
    if (root) {
      const rootWrap = document.createElement("div");
      rootWrap.className = "tree-root";
      const trunk = document.createElement("div");
      trunk.className = "tree-trunk";
      trunk.appendChild(renderTreeNode(klass, root, bag));
      rootWrap.appendChild(trunk);
      box.appendChild(rootWrap);
    }
    const branches = document.createElement("div");
    branches.className = "tree-branches";
    tree.branches.forEach((name, i) => {
      const col = document.createElement("div");
      col.className = "tree-col";
      col.innerHTML = `<h3>${name}</h3>`;
      const trunk = document.createElement("div");
      trunk.className = "tree-trunk";
      const colNodes = tree.nodes
        .filter((n) => !n.root && n.col === i)
        .sort((a, b) => a.row - b.row || (a.fork || 0) - (b.fork || 0));
      const rows = [];
      for (const u of colNodes) {
        const last = rows[rows.length - 1];
        if (last && last[0].row === u.row) last.push(u);
        else rows.push([u]);
      }
      rows.forEach((group) => {
        if (group.length === 1) trunk.appendChild(renderTreeNode(klass, group[0], bag));
        else {
          const fork = document.createElement("div");
          fork.className = "tree-fork";
          group.forEach((u) => fork.appendChild(renderTreeNode(klass, u, bag)));
          trunk.appendChild(fork);
        }
      });
      col.appendChild(trunk);
      branches.appendChild(col);
    });
    box.appendChild(branches);
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
    spawnDrop(kind, x) {
      const k = kind || "heart";
      const px = x != null ? x : (run.hero ? run.hero.x + 280 : 360);
      drop(k, px, groundY() - 80);
      return { kind: k, x: px, pickR: DROP_PICK_R, magnetAge: DROP_MAGNET_AGE };
    },
    jump(wave) {
      const dest = Math.max(1, Math.floor(wave || 1));
      jumpDest = dest;
      if (state === "fight") {
        jumpToWave(dest, { grant: true });
      } else {
        showJumpBanner("Jump queued: wave " + dest + " — Rise to start there");
      }
      return {
        wave: dest,
        stage: stageIndex(dest),
        biome: biomeForStage(stageIndex(dest)).name,
        queued: state !== "fight",
        persist: snapshotPersist(),
      };
    },
    tree() {
      return snapshotPersist();
    },
    shop() {
      return shopList(activeKlass()).map((u) => ({
        id: u.id,
        name: u.name,
        klass: u.klass,
        wave: shopUnlockWave(u),
        lv: run.levels[u.id] || 0,
      }));
    },
    content() {
      const h = run.hero;
      return {
        mageFlip: classDef("mage").flip,
        warriorFlip: classDef("warrior").flip,
        rangerFlip: classDef("ranger").flip,
        nova: {
          reach: novaReachFor(h && h.novaReach),
          freeze: novaFreezeFor(h && h.novaHold),
          cd: novaCdFor(h && h.skillHaste),
          cdMin: NOVA.cdMin,
          spawnGap: RANGE.spawnGap,
        },
        range: h
          ? {
              raw: h.range,
              combat: combatRange(),
              cap: roadRangeCap(playSpan()),
              playSpan: playSpan(),
            }
          : { baseMage: RANGE.mage, baseRanger: RANGE.ranger },
        trees: Object.fromEntries(
          Object.keys(PRESTIGE_TREES).map((k) => [k, { name: PRESTIGE_TREES[k].name, branches: PRESTIGE_TREES[k].branches }])
        ),
        shops: {
          warrior: shopList("warrior").map((u) => u.name),
          mage: shopList("mage").map((u) => u.name),
          ranger: shopList("ranger").map((u) => u.name),
        },
        road: ROAD,
        biomes: BIOMES.map((b) => b.name),
        stageLen: STAGE_LEN,
        scale: [1, 8, 10, 16, 20].map((n) => ({ wave: n, ...waveScale(n) })),
      };
    },
    road() {
      const h = run.hero;
      return {
        stage: run.stage,
        biome: biomeForStage(run.stage || 1).name,
        wave: run.wave,
        heroX: h ? Math.round(h.x) : 0,
        camera: Math.round(camera),
        marching: !!(h && shouldMarch()),
        mode: h ? h.mode : "",
        gateOpen: !!run.gateOpen,
        idle: run.enemies.filter((e) => !e.aggro && e.hp > 0).length,
        aggro: run.enemies.filter((e) => e.aggro && e.hp > 0).length,
        packs: run.enemies.map((e) => ({
          type: e.type,
          wave: e.wave,
          x: Math.round(e.x),
          aggro: !!e.aggro,
          hp: Math.round(e.hp),
        })),
        drops: fx.drops.map((d) => d.kind),
      };
    },
    wolf() {
      return wolfSnapshot();
    },
    hudStats() {
      const h = run.hero;
      return {
        hp: (document.getElementById("hp-text") || {}).textContent || "",
        mp: (document.getElementById("mp-text") || {}).textContent || "",
        gold: (document.getElementById("gold") || {}).textContent || "",
        mana: (document.getElementById("mana-stat") || {}).textContent || "",
        armor: (document.getElementById("st-armor") || {}).textContent || "",
        buffs: (document.getElementById("st-buffs") || {}).textContent || "",
        armorRaw: h ? h.armor : null,
        goldRaw: run.gold,
      };
    },
    healPreview() {
      const healers = run.enemies.filter((e) => e.def && e.def.heal && e.hp > 0);
      const def = (healers[0] && healers[0].def) || ENEMIES.healer;
      const amt = allyHealAmount(def, run.wave, healers.length || 1);
      return {
        wave: run.wave,
        healers: healers.length,
        amount: Math.round(amt * 10) / 10,
        rate: def.healRate,
        perSec: Math.round((amt / Math.max(0.1, def.healRate)) * 10) / 10,
      };
    },
    checkVitals() {
      const h = run.hero;
      if (!h) return null;
      clampVitals(h, { fallback: heroFallbackMax(), manaFallback: classDef(h.klass).maxMana });
      const shown = hpPair(h.hp, h.maxHp);
      const hud = document.getElementById("hp-text");
      return {
        hp: h.hp,
        maxHp: h.maxHp,
        hud: hud ? hud.textContent : "",
        pair: shown.text,
        secondWind: h.secondWind || 0,
        inferno: !!h.inferno,
        jumpDest,
        kills: run.kills,
        wave: run.wave,
      };
    },
    smite() {
      [...run.enemies].forEach(killEnemy);
    },
    nudge(px) {
      if (!run.hero) return null;
      run.hero.x += px || 200;
      followCamera(0);
      for (const e of run.enemies) tryAggro(e);
      return window.unending.road();
    },
    hurt(n) {
      if (run.hero && state === "fight") hitHero(n || 10, run.hero.x);
    },
    hurtWolf(n) {
      if (run.wolf && state === "fight") hitWolf(n || 24);
      return wolfSnapshot();
    },
    downWolf() {
      if (!run.wolf) return null;
      run.wolf.hp = 0;
      run.wolf.taunt = 0;
      run.wolf.leap = null;
      run.wolf.deadT = 12;
      floatText(run.wolf.x, groundY() - 150, "WOLF DOWN", "#c07040");
      return wolfSnapshot();
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
