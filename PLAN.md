# Idle RPG — Rencana Produk & Teknis

> Game idle RPG 2D, auto-battle, mobile-web portrait. Pemain tidak mengendalikan gerakan karakter; seluruh interaksi ada di menu upgrade, equipment, dan keputusan build.

---

## 1. Ringkasan Konsep

**Posisi:** "Taskbar Hero versi mobile web" — sesi pendek, selalu progres, tapi punya kedalaman build yang lebih serius daripada sekadar menaikkan angka.

**Pilar desain:**

1. **Nol kontrol saat battle.** Karakter jalan, menyerang, memakai skill, dan lanjut ke wave berikutnya sendiri.
2. **Keputusan ada di luar battle.** Enhance, Refine, Enchant, Boost, Skill, Equipment, Ascension.
3. **Satu tangan, satu layar.** Semua menu bisa dijangkau ibu jari; tidak ada layout desktop.
4. **Progres selalu terasa.** Setiap sesi 2–5 menit harus menghasilkan minimal satu peningkatan yang terlihat.
5. **Offline tidak menghukum.** Pemain kembali dan mendapat laporan ekspedisi, bukan kehilangan progres.

**Target sesi:** 2–5 menit, 3–8 kali per hari. **Target retensi:** progres terasa tiap sesi; power spike besar tiap 1–2 hari.

**Non-goals (v1):** multiplayer, backend/cloud save, layout desktop, gacha/uang nyata, kontrol manual karakter.

---

## 2. Keputusan yang Sudah Disepakati

| Topik | Keputusan |
|---|---|
| Platform | Web, mobile-only, portrait |
| Engine | Phaser 3 + Vite + TypeScript |
| Scope sistem | 7–8 sistem upgrade sejak v1 |
| Persistence | `localStorage`, tanpa backend |
| Kontrol | Otomatis penuh; interaksi hanya lewat UI |
| Aset & tooling | Pixel art 48–64 px; PixelLab + Retro Diffusion + fal.ai via MCP; Aseprite untuk cleanup |

**Keputusan yang masih perlu konfirmasi (lihat §12):**
- Overlay UI memakai React atau DOM/Phaser murni.
- Gaya art final: pixel art (default) vs flat vector.
- Plafon budget untuk produksi aset.

---

## 3. Referensi & Pembeda

Referensi: **Taskbar Hero** — idle RPG berjalan di strip taskbar, karakter auto-battle, loot, dan upgrade berlapis.

Yang dipertahankan: auto-battle tanpa kontrol, loot yang terus menetes, upgrade berlapis, sesi singkat.

Yang ditingkatkan:

| Area | Taskbar Hero (referensi) | Versi kita |
|---|---|---|
| Kedalaman build | Dominan angka | **Elemen + resonance + prioritas skill** memberi keputusan nyata |
| QoL | Manual satu per satu | **Batch upgrade, auto-enhance ke target, auto-refine sampai tier, aturan auto-salvage** |
| Offline | Ringkasan progres | **Laporan ekspedisi** dengan rincian kill, gold, item, dan waktu |
| Prestige | Multiplier polos | **Pohon Ascension dengan pilihan**, bukan hanya +% |
| Transparansi | Status tersembunyi | **Tracker power spike**: "Boss berikutnya butuh +8% DPS" |
| Format | Strip horizontal | **Portrait native**, bottom-sheet, satu ibu jari |
| Interaksi | Pasif total | **Opsional**: tap weak point saat boss untuk bonus, tidak wajib |

---

## 4. Core Loop

```
[Battle otomatis] → kill → gold + EXP + loot + material
        ↑                                  ↓
        │                        [Upgrade / ganti gear]
        │                                  ↓
        └──────── power naik → stage lebih tinggi
                          ↓
                    boss stage → unlock sistem baru
                          ↓
                    Ascension → multiplier permanen
```

**Loop 60 detik:** wave berjalan → 3–8 kill → drop → notifikasi "upgrade tersedia" → pemain buka sheet → enhance 1 level → kembali.
**Loop harian:** naikkan farm stage → kumpulkan material → unlock node Boost → coba stage push.
**Loop mingguan:** cap stage → Ascension → mulai run baru lebih cepat.

**Auto-advance:** setelah boss stage selesai, otomatis maju. Jika gagal 2× di stage baru, mundur ke farm stage dan idle di sana sampai pemain menekan "Push".

---

## 5. Combat Design

### 5.1 Stat

**Hero:** `HP`, `ATK`, `DEF`, `ATK SPD` (serangan/detik), `CRIT%`, `CRIT DMG%`, `Lifesteal%`, `Elem DMG%` (5 elemen), `DMG Amp%`, `Gold%`, `Drop%`.

**Enemy:** `HP`, `ATK`, `DEF`, `ATK SPD`, `element`, `type` (normal / elite / boss).

### 5.2 Formula

```
raw        = ATK × skillMult × elementMultiplier
mitigated  = max(1, raw − DEF × 0.6)
final      = mitigated × (1 + elemBonus) × (1 + dmgAmp)
crit       = final × (1 + critDmg)   // jika roll < critRate

elementMultiplier = 1.25 (unggul) | 1.00 (netral) | 0.85 (lemah)
```

Semua bonus bersifat **multiplicative per layer** (base → equipment flat → equipment % → Boost % → Ascension %) supaya tidak ada satu sistem yang mendominasi.

### 5.3 Scaling musuh (per wave)

```
enemyHP   = 50 × 1.16^(wave−1) × (elite ? 1.8 : 1) × (boss ? 8 : 1)
enemyATK  = 8  × 1.14^(wave−1) × (boss ? 1.5 : 1)
gold      = 5  × 1.13^(wave−1) × (boss ? 10 : 1)
exp       = 6  × 1.12^(wave−1)
```

1 stage = 10 wave. Wave 10 = boss. Wave 5 = elite.
Angka-angka ini disimpan di `src/data/balance.ts` dan **wajib bisa diubah tanpa menyentuh logika** — tuning akan sering dilakukan.

### 5.4 Aturan battle

- Fixed-step simulation 20 tick/detik, terpisah dari render 60 FPS.
- Serangan melee jarak dekat; hero dan musuh punya lunge animation sederhana.
- Skill aktif auto-cast sesuai prioritas + cooldown.
- Death hero = mundur ke farm stage, tanpa kehilangan item; jeda 3 detik lalu lanjut.
- Tab hidden: simulasi berhenti, waktu dihitung sebagai offline saat kembali.

### 5.5 Elemen

`Fire`, `Ice`, `Lightning`, `Holy`, `Dark`. Tiap musuh punya kelemahan; Enchant menentukan elemen hero. Ini yang membuat Enchant bukan sekadar stat.

---

## 6. Delapan Sistem Upgrade

Setiap sistem punya: **currency**, **kurva biaya**, **cap/unlock stage**, **UI**, dan **QoL**.

### 1) Level (EXP)
- Sumber: kill, offline, quest harian ringan (post-MVP).
- Efek: +3 ATK, +12 HP, +1 DEF per level; setiap 10 level +1% CRIT.
- Biaya: EXP otomatis. Cap awal 100.

### 2) Enhance
- Slot: per item (6 slot equipment).
- Range: `+0` → `+15`. Tiap level **+10% stat item**.
- Biaya gold: `base × 2.1^level` (base menurut rarity).
- Aturan: `+1..+5` 100% sukses. `+6..+15` memakai chance (85% → 25%) dengan **pity** (gagal 3× = sukses berikutnya). Gagal tidak menurunkan level — hanya menghabiskan gold. Ini disengaja: frustrasi rendah, keputusan tetap ada.
- QoL: `Enhance ×10`, `Enhance sampai target`, `Auto-enhance semua slot ke +5`.

### 3) Refine
- Slot: 2–4 substat per item, sesuai rarity.
- Roll ulang dengan gold; tier substat `C < B < A < S < SS`.
- Substat pool: ATK%, HP%, DEF%, CRIT%, CRIT DMG%, ATK SPD%, Gold%, Drop%.
- Bisa **lock** substat yang bagus; roll hanya menyentuh line yang tidak dikunci.
- **Biaya tetap** per attempt, ditentukan iLv + rarity (`120 + 6 × iLv`, dikali multiplier rarity). Harga tidak pernah naik karena jumlah roll — pelajaran dari model `1.55^refines` yang membuat attempt ke-20 tidak terjangkau.
- **Refine Level per slot** (0–20): 10 attempt = 1 level, dan level menaikkan cap kualitas roll (`0.5 + 0.025 × level`, maksimum 1.0). Tier A baru mungkin di level 4, SS di level 16 ke atas.
- Level menempel ke **slot**, bukan item: mengganti gear tetap membawa progres.
- **Pity 30**: 30 roll tanpa line tier S memaksa satu line S pada roll berikutnya.
- **Resonance** memakai level terendah dari enam slot (10 / 15 / 20 → +4% ATK / +6% ATK +5% HP / +8% ATK +8% HP +3% CRIT), supaya pemain menyebar level, bukan menumpuk satu item.
- QoL: `Auto-refine sampai minimal tier A`, ditolak lebih awal kalau cap slot belum mencapai tier A.

### 4) Enchant
- 3 slot rune per item; rune punya elemen + nilai.
- Efek: `+Elem DMG%` dan proc kecil (burn, chill/slow, chain, heal, drain).
- **Resonance:** 3 rune elemen sama di satu item → tier resonance (extra proc + visual).
- Sumber rune: elite/boss, salvage item.
- QoL: `Enchant otomatis pakai rune terendah`, preview resonance sebelum pasang.

### 5) Boost
- Pohon permanen 5 cabang: `Offense`, `Defense`, `Fortune`, `Speed`, `Element`.
- Mata uang: `Boss Core` (drop boss tiap 10 wave).
- Node: +% stat datar plus unlock kecil (mis. +1 slot equip di tier 4), respec gratis.
- Ini pengganti "angka naik terus" — pilihan node harus terasa.

### 6) Skills
- 6 slot aktif + 1 passive slot, mengikuti build Pockie Ninja yang memakai enam skill.
- Skill aktif punya cooldown, multiplier, efek (AoE, buff, heal, shield).
- Auto-cast memakai **priority list** yang bisa diatur pemain, dengan jeda global 2 detik antar cast supaya slot tambahan memperluas pilihan, bukan menambah DPS linear.
- Upgrade skill dengan `Skill Book` → level 1–10, +8% efek per level.
- Passive tree kecil (≈24 node) memakai `Skill Book` juga.

### 7) Equipment & Gems
- 6 slot: Weapon, Helm, Armor, Boots, Ring, Amulet.
- 5 rarity: Common → Mythic. Base stat roll + item level + 0–3 socket.
- Set bonus (3 pc / 6 pc) untuk 3 set awal.
- Gem: `Ruby` (ATK), `Sapphire` (HP), `Topaz` (CRIT), `Emerald` (Gold), `Diamond` (Elem).
- Power score untuk membandingkan item; tombol `Equip if better`.
- Filter auto-salvage: rarity, power score, tipe.

### 8) Ascension (Prestige)
- Syarat: clear stage 50.
- Reset: level, gold, stage, inventory equipment, Boost tree.
- Simpan: Ascension tree, Codex, QoL unlock, cosmetic.
- Reward: `Star Shard = floor((maxStage / 10)^1.6)`.
- Ascension tree: 3 cabang (Power, Fortune, Automation) dengan node yang mengubah cara main, mis. mulai di stage 5, auto-salvage gratis, +2 jam offline cap.
- Target: Ascension pertama di hari ke-2–3, berikutnya makin cepat.

---

## 7. Ekonomi & Kurva Progresi

### 7.1 Mata uang

| Mata uang | Sumber | Dipakai |
|---|---|---|
| Gold | Kill, offline, salvage | Level, Enhance |
| EXP | Kill | Level |
| Refine Stone | Elite, salvage | Refine |
| Rune/Essence | Elite, boss, salvage | Enchant |
| Boss Core | Boss | Boost |
| Skill Book | Boss, milestone | Skill |
| Gem | Elite, boss | Socket |
| Star Shard | Ascension | Ascension tree |

### 7.2 Target pacing (v1, bisa digeser saat playtest)

| Waktu | Pencapaian |
|---|---|
| 0–2 menit | Kill pertama, enhance pertama |
| 10 menit | Stage 5, Refine terbuka |
| 30 menit | Boss stage 10, Boost terbuka |
| 2 jam | Stage 20, Enchant + Skill terbuka |
| 6–8 jam | Stage 35–40 |
| Hari 2–3 | Stage 50, Ascension pertama |
| Hari 7 | Ascension ke-3, farm stabil |

### 7.3 Offline

- Efisiensi **85%** dari rate aktif di farm stage.
- Cap dasar **8 jam**; +2 jam per node Ascension, maksimum 24 jam.
- Dihitung saat `visibilitychange`/load, bukan timer background.
- Laporan: durasi, kill, gold, EXP, item (diringkas), material, dan "apa yang bisa di-upgrade sekarang".
- Anti-cheat sederhana: clamp waktu ke `now`, tolak timestamp mundur, checksum save.

---

## 8. Mobile Web

### 8.1 Viewport & layout

- Logical resolution **390×844** (iPhone 14 baseline), `Phaser.Scale.FIT` + `CENTER_BOTH`.
- `meta viewport` dengan `viewport-fit=cover`; hormati `env(safe-area-inset-*)`.
- Layar lebih lebar/tinggi: letterbox gelap, bukan layout desktop.
- Orientasi landscape: overlay "Putar kembali ke portrait" (bukan memaksa rotate API).
- `touch-action: none`, cegah double-tap zoom, `user-select: none`.
- Target sentuh minimum **44×44 px**; navigasi utama bottom sheet, bukan sidebar.

### 8.2 Alur layar

```
Battle (default)
 ├── bottom bar: Battle | Hero | Bag | Upgrade | Ascend
 ├── tap HUD → detail stat
 ├── Upgrade hub → Enhance / Refine / Enchant / Boost / Skill
 ├── Bag → equipment, gem, salvage
 └── Ascend → tree + confirm
```

Battle tetap terlihat di belakang sheet (sheet 60–85% tinggi, bisa di-drag). Tidak ada layar kosong yang memutus rasa "game jalan terus".

### 8.3 PWA & performa

- Manifest, ikon, `display: standalone`, theme color.
- Cache-first untuk asset, network-first untuk HTML.
- **Budget:** JS awal ≤ 460 KB gzip (`npm run check:bundle`), atlas ≤ 1 MB, first paint ≤ 2.0 s dan canvas ready ≤ 4.0 s di throttle 1.6 Mbps/150 ms (`npm run check:perf`).
- 60 FPS di mid-range Android: object pooling untuk damage text, particle, dan enemy; maksimal 30 damage text aktif; hindari alokasi di `update()`.
- Audio: unlock pada tap pertama, musik + SFX sprite, mute persisten.
- Getar singkat via Vibration API saat boss muncul (opsional).
- Simpan otomatis tiap 10 detik dan saat `pagehide`.

---

## 9. Arsitektur Teknis

### 9.1 Stack

- **Vite + TypeScript** (strict).
- **Phaser 3** untuk battle: sprite, animasi, particle, kamera, audio.
- **UI overlay:** rekomendasi **React + Zustand** di atas canvas, karena 8 sistem menu butuh list, tab, sheet, dan form yang kompleks. Phaser tetap satu-satunya yang menggambar battle. *(Perlu konfirmasi — §12.)*
- **Vitest** untuk unit test; **Playwright** untuk smoke test 390×844.

### 9.2 Prinsip

1. **Simulasi terpisah dari render.** `sim/` tidak boleh mengimpor Phaser. Ini membuat balance bisa diuji headless dan offline bisa dihitung tanpa menjalankan game.
2. **State satu arah.** `GameState` immutable-ish di store; semua perubahan lewat action (`enhanceItem`, `equipItem`, `castSkill`). React dan Phaser membaca state yang sama.
3. **Data-driven.** Item, musuh, skill, node Boost, dan konstanta balance ada di `src/data/*.ts`.
4. **Save berversi.** Setiap save punya `version` + migrasi berurutan.
5. **RNG bisa di-seed.** Untuk test dan reproduksi bug.

### 9.3 Struktur folder

```
src/
  main.tsx
  game/
    PhaserGame.ts
    scenes/ BootScene.ts, PreloadScene.ts, BattleScene.ts
    entities/ Hero.ts, Enemy.ts, Projectile.ts, DamageText.ts
    fx/ Particles.ts, CameraFx.ts
  sim/
    combat.ts        # tick, damage, skill, death
    waves.ts         # spawn, stage, boss
    loot.ts          # drop table, rarity, roll
    offline.ts       # kalkulasi offline
    formulas.ts      # semua rumus, tanpa state
  systems/
    enhance.ts refine.ts enchant.ts boost.ts skills.ts equipment.ts ascension.ts
  state/
    store.ts save.ts migrations.ts selectors.ts
  ui/
    App.tsx
    screens/ BattleHUD.tsx, UpgradeHub.tsx, EquipmentSheet.tsx, ...
    components/ Button.tsx, Sheet.tsx, StatRow.tsx, ProgressBar.tsx
  data/
    balance.ts enemies.ts items.ts skills.ts boosts.ts runes.ts
  assets/
    atlas/ audio/ fonts/
tests/
  formulas.test.ts offline.test.ts save.test.ts progression.test.ts
```

### 9.4 State inti (ringkas)

```ts
type GameState = {
  version: number;
  hero: { level: number; exp: number; hp: number; equipped: Record<Slot, Item | null> };
  progress: { maxStage: number; farmStage: number; wave: number; autoAdvance: boolean };
  wallet: { gold: number; refineStone: number; bossCore: number; skillBook: number; starShard: number };
  inventory: Item[];
  boost: Record<string, number>;        // nodeId -> level
  skills: { levels: Record<string, number>; loadout: (string | null)[] };
  ascension: { count: number; nodes: Record<string, number> };
  settings: { sound: boolean; haptics: boolean; autoSalvage: SalvageRule };
  stats: { totalKills: number; totalGold: number; playTimeSec: number };
  lastSeen: number;                     // epoch ms untuk offline
};
```

### 9.5 Save

- Key: `idle-rpg-save-v1`.
- Tulis: debounce 5 detik + `pagehide` + tiap 10 detik.
- Format JSON dengan `version`; validasi dengan Zod-like guard; jika korup → fallback save terakhir yang valid, jangan reset diam-diam.
- Export/import save code (base64 + checksum) sebagai pengaman, walau tanpa cloud.

### 9.6 Offline simulation

- Hitung `elapsed = clamp(now - lastSeen, 0, cap)`.
- Estimasi rate dari state saat ini: DPS vs HP musuh farm stage → waktu per kill → kill/jam → gold/EXP/item.
- Untuk akurasi lebih baik, jalankan simulasi coarse (5 detik/tick, maksimal 2.000 tick) hanya jika DPS dekat threshold; selain itu pakai closed-form.
- Tampilkan laporan sebelum state diterapkan (opsi "Klaim").

### 9.7 Testing

- **Unit:** rumus damage, scaling wave, biaya enhance, roll loot (distribusi), offline cap.
- **Progression:** simulasi headless 8 jam dengan strategi upgrade bot → harus mencapai target stage ±20%. Ini menjaga balance tidak melenceng saat tuning.
- **Save:** roundtrip, migrasi versi lama, file korup.
- **Smoke:** Playwright di 390×844 — battle jalan 30 detik, buka sheet, enhance, reload, progres tetap.

---

## 10. Roadmap

Setiap milestone harus bisa dimainkan, bukan hanya "selesai coding".

### M0 — Fondasi (½–1 hari)
Vite + TS + Phaser, shell portrait, scene battle kosong, state store, save/load, deploy lokal.
**Selesai jika:** reload mempertahankan state; tampil rapi di 390×844 dan tidak ada layout desktop.

### M1 — Combat slice (1–2 hari)
Hero vs wave, attack, damage, death, gold/EXP, HUD, stage auto-advance, boss tiap 10 wave.
**Selesai jika:** bisa main 10 menit tanpa error; stage naik otomatis; 60 FPS.

### M2 — Loot & Equipment (1–2 hari)
Drop table, rarity, 6 slot, power score, equip/salvage, auto-salvage rule.
**Selesai jika:** item bagus terasa berbeda; inventory tidak meledak setelah 30 menit.

### M3 — Enhance + Refine (1–2 hari)
Kurva biaya, chance + pity, UI batch, substat roll, lock.
**Selesai jika:** gold tidak pernah tidak berguna; enhance ×10 nyaman di layar kecil.

### M4 — Enchant + Boost (1–2 hari)
Rune, resonance, elemen vs musuh, pohon Boost + respec.
**Selesai jika:** memilih elemen mengubah hasil fight secara terukur.

### M5 — Skills (1–2 hari)
6 aktif + passive, auto-cast priority dengan jeda global, upgrade, 7 skill awal.
**Selesai jika:** loadout berbeda terasa berbeda, bukan hanya DPS +10%.

### M6 — Offline + Laporan (1 hari)
Kalkulasi, cap, laporan ekspedisi, klaim.
**Selesai jika:** 8 jam offline menghasilkan progres yang masuk akal dan tidak over-powered.

### M7 — Ascension (1 hari)
Syarat, reset, Star Shard, tree, konfirmasi.
**Selesai jika:** run kedua terasa jauh lebih cepat tanpa terasa "mengulang dari nol".

### M8 — Polish & rilis (2–3 hari)
Juice (hit stop, screen shake, particle), audio, PWA, onboarding 3 langkah, balance pass, Playwright, deploy.
**Selesai jika:** Lighthouse PWA installable, tidak ada bug blocker, target pacing §7.2 tercapai.

### Post-MVP
Pet/companion, rift harian dengan modifier, set equipment tambahan, codex, event musiman, cloud save opsional.

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Balance melenceng saat menambah sistem | Semua angka di `balance.ts`; test simulasi progresi di CI |
| Menu terlalu padat di 390 px | Bottom sheet + tab; review tiap layar di 390×844 sebelum lanjut |
| Art menjadi bottleneck | Placeholder bentuk/warna di M0–M7; art pass di M8 |
| Save korup / pemain hilang progres | Save berversi, backup slot, export code, validasi |
| Offline terlalu besar → game selesai | Cap 8 jam, efisiensi 85%, kurva biaya eksponensial |
| Battery/panas di HP | Batasi particle, pause render saat hidden, fixed-step ringan |
| iOS audio & PWA quirks | Unlock audio di tap pertama, test Safari iOS sejak M1 |
| Scope 8 sistem melebar | Sistem dikunci ke definisi §6; ide baru masuk Post-MVP |

---

## 12. Yang Perlu Dikonfirmasi Sebelum M0

1. **UI overlay:** React + Zustand di atas canvas (rekomendasi, cepat untuk 8 menu) atau UI full Phaser (bundle lebih kecil, development lebih lambat)?
2. **Gaya art:** pixel art 48–64 px (default, sesuai tooling §13) atau flat vector?
3. **Aset awal:** placeholder di M0–M7 lalu art pass di M8, atau mulai generate aset final lebih awal?
4. **Bahasa UI:** Indonesia, Inggris, atau keduanya (i18n sejak awal lebih murah)?
5. **Budget aset:** setujui plafon $50 untuk bulan pertama produksi?

Jika setuju dengan default — **React overlay, pixel art, placeholder dulu, UI Inggris + istilah Indonesia, budget $50** — M0 bisa langsung dikerjakan.

---

## 13. Art Tooling & MCP

### 13.1 Keputusan tooling

Gaya: pixel art, side view, sprite 48–64 px, palet 32 warna, outline 1 px, latar transparan. Tooling dipilih karena semuanya punya MCP resmi sehingga coding agent bisa generate, mengunduh, dan memasang aset langsung ke repo.

| Tool | Peran | MCP | Biaya |
|---|---|---|---|
| **Retro Diffusion** | Base sprite, boss, item icon, animasi, pixel fixer | `https://mcp.retrodiffusion.ai/mcp` | Pay-per-use, ~$0.015–0.18/gambar; animasi $0.07–0.25; kredit tidak kedaluwarsa |
| **PixelLab** | Animasi dari base frame, variasi karakter, UI/object, tileset | `https://api.pixellab.ai/mcp` | $12–24/bln (atau kredit) |
| **fal.ai** | Background, ilustrasi marketing, vektor UI lewat Recraft/FLUX | `https://mcp.fal.ai/mcp-relay` | Pay-per-use |
| **Aseprite** | Cleanup, indexed palette, onion skin, export | Tidak ada MCP | ~$20 one-time |

Catatan: **Ludo MCP hanya tersedia di Pro ($35–50/bln)**, bukan Indie $20. Ludo baru masuk kalau audio, voice, dan 3D benar-benar dibutuhkan dari satu tempat; untuk game ini, audio bisa ditangani terpisah.

### 13.2 Pembagian kerja

1. **Retro Diffusion** — base hero, 5 musuh, elite, boss, 20 item icon, 8 skill icon. Kualitas pixel paling konsisten dan biayanya per-gambar.
2. **PixelLab** — animasi dari base frame (`animate_image`), variasi pose, UI object, frame tombol, dan perbaikan frame.
3. **fal.ai** — 3 background (2–3 layer), splash screen, icon marketing, materi store/landing page.
4. **Aseprite** — cleanup manual: samakan baseline kaki, buang frame duplikat, rapikan palet, trim.
5. **Script lokal** — trim, atlas, manifest, validasi. Ini bagian deterministik yang tidak boleh bergantung pada MCP.

### 13.3 Spesifikasi aset v1

| Aset | Ukuran | Frame |
|---|---|---|
| Hero | 64×64 | idle 4, attack 4, hurt 2, death 4 |
| Musuh normal | 48×48 | idle 4, attack 4, hurt 2, death 3 |
| Elite | 64×64 | idle 4, attack 4, hurt 2, death 4 |
| Boss | 96×96 | idle 6, attack 6, hurt 2, death 6 |
| Item icon | 32×32 | statis |
| Skill icon | 64×64 | statis |
| Elemen/status | 32×32 | statis |
| Background | 390×844 | 2–3 layer parallax |
| UI | 24/32 px icon, frame 9-slice sederhana | statis |

Semua animasi di bawah batas 128 px PixelLab. Jangan memakai 8 arah — game ini side view, jadi 4–6 frame per state sudah cukup.

### 13.4 Setup MCP

```bash
# PixelLab
claude mcp add pixellab https://api.pixellab.ai/mcp -t http \
  -H "Authorization: Bearer $PIXELLAB_API_KEY"

# Retro Diffusion
claude mcp add --transport http retro-diffusion https://mcp.retrodiffusion.ai/mcp \
  --header "Authorization: Bearer $RETRO_DIFFUSION_API_KEY"

# fal.ai — OAuth, tanpa API key di config
claude mcp add --transport http fal https://mcp.fal.ai/mcp-relay
# lalu jalankan /mcp untuk login lewat browser
```

- Simpan key di environment / secret manager, **jangan commit**. Tambahkan `.env*` dan `assets-src/raw/` ke `.gitignore` bila berisi output besar atau rahasia.
- Dukungan ekspansi `${VAR}` berbeda per client; kalau tidak didukung, isi header saat sesi dan jangan tulis ke file repo.
- Semua server memakai Streamable HTTP, jadi kompatibel dengan Claude Code, Cursor, Codex, VS Code, dan Windsurf.

### 13.5 Alur generation dengan agent

1. Agent cek katalog dan biaya dulu: RD `list_available_styles` + `estimate_inference_cost`, fal `get_pricing`, PixelLab `get_balance`.
2. Generate base sprite di RD (`create_inference`, RD Pro, transparan, seed dicatat).
3. Kirim base frame ke PixelLab `animate_image` untuk idle/attack; untuk variasi gunakan `create_image_pro` dengan reference image yang sama.
4. Background dan UI di fal (`search_models` → `get_model_schema` → `run_model`), lalu downscale + kurangi palet agar menyatu.
5. `npm run assets:build` — trim, atlas, manifest.
6. Review manual di Aseprite, terutama baseline kaki dan frame duplikat.
7. `npm run assets:validate` — ukuran, alpha, jumlah frame, total < 1 MB.

### 13.6 Manifest & provenance

Setiap aset mencatat asal-usulnya di `assets-src/manifest.json`:

```json
{
  "asset": "hero/knight",
  "tool": "retro-diffusion",
  "model": "rd-pro",
  "style": "rd-pro-default",
  "prompt": "knight in worn plate armor, side view, idle",
  "seed": 84213,
  "costUsd": 0.18,
  "license": "commercial",
  "generatedAt": "2026-10-22T10:00:00Z",
  "files": ["hero/knight-idle.png", "hero/knight-atlas.json"]
}
```

Ini dipakai untuk audit lisensi, regenerate, dan menghindari generate ulang yang membuang kredit.

### 13.7 Guardrail

- **Selalu estimasi biaya sebelum generate.** Setiap panggilan > $1 atau batch > $5 harus minta persetujuan.
- Gunakan async untuk animasi dan job panjang: RD `start_inference_job`, fal `submit_job`. Jangan mengulang job yang timeout — ambil `request_id` dulu.
- MCP hanya untuk produksi aset. **Build, test, dan CI tidak boleh memanggil MCP**; hasil akhir di-commit ke repo.
- Jangan training model dengan output tool lain (ToS PixelLab melarangnya).
- Review di ukuran asli: layar 390×844, sprite tampil 1×/2×. Kalau tidak terbaca di ukuran itu, generate ulang.
- Batasan server: Ludo MCP masih beta dan 1 request konkuren (kalau dipakai); beberapa client punya timeout 60 detik untuk job panjang.
- Simpan bukti lisensi komersial dan log biaya; ini penting kalau game dirilis atau masuk platform lain.

### 13.8 Estimasi biaya produksi

| Pos | Estimasi |
|---|---|
| PixelLab 1 bulan | $12–24 |
| Retro Diffusion: ~60 gambar statis + ~20 animasi | $10–20 |
| fal.ai: ~20 background/UI/marketing | $3–8 |
| Aseprite | ~$20 one-time |
| **Total bulan pertama** | **$25–50 + Aseprite** |

Setelah aset selesai, langganan bisa dihentikan. Ini alasan memilih RD + fal pay-per-use daripada Ludo Pro yang harus aktif terus. Harga dicek Oktober 2026 — verifikasi lagi sebelum berlangganan.

### 13.9 Definisi selesai art pass

- Semua aset v1 ada dan tampil di game pada 390×844 tanpa texture hilang.
- Atlas + manifest ter-generate oleh `npm run assets:build`.
- `npm run assets:validate` lulus: dimensi, alpha, frame count, total < 1 MB.
- Tidak ada frame dengan kaki melayang, palet drift, atau outline tidak konsisten.
- Manifest mencantumkan tool, model, prompt, seed, biaya, dan lisensi untuk setiap aset.

---

## 14. Draft — Fitur bergaya Pockie Ninja (Post-MVP)

> **Status:** draft, belum disepakati dan bukan bagian dari scope v1. Ditulis 24 Oktober 2026 setelah arena ranked asinkron masuk. Angka waktu adalah estimasi relatif, bukan komitmen.

### 14.1 Prinsip & batasan

Semua fitur di bawah harus lolos filter yang sama dengan v1:

| Batasan | Konsekuensi desain |
|---|---|
| Tanpa backend, save `localStorage` | Tidak ada clan, auction, world boss bersama, atau ladder lintas perangkat. Semua "sosial" harus berupa snapshot/AI. |
| Nol kontrol saat battle | Tidak ada turn-based, pilih target, atau combo manual. Fitur tempur harus otomatis. |
| Satu layar, 8 tab (grid 4×2) | Tab ke-9 dilarang. Fitur baru menumpang di tab lama atau jadi bagian dari layar yang sudah ada. |
| Bundle awal 437.7 KB / 460 KB | Ruang ~23 KB; gate byte + first paint terukur. Fitur baru tetap harus masuk chunk lazy bila UI-nya besar. |
| Semua UI baru | Wajib `lazy()` + chunk sendiri; jangan menambah entry. |
| Save berversi | Tiap phase menaikkan `SAVE_VERSION`, dengan migrasi dan test roundtrip. |
| Headless-testable | Logika di `src/sim/*`, UI hanya membaca snapshot/event. |

**Penempatan UI yang disepakati untuk draft ini:**

| Fitur | Tempat |
|---|---|
| Awakening / Surge | HUD (bar tipis di bawah HP hero) + node Ascension nanti |
| Synthesis / Forge | Tab GEAR, bagian FORGE (lazy component) |
| League season | Tab ARENA, header + kartu hadiah |
| Trial Tower | Tab RIFT, segmented `RIFT · TRIAL` |
| Pet kennel | Tab BOOST, bagian COMPANION |
| Outfit | Tab GEAR, bagian penampilan |

### 14.2 Phase 0 — Budget gate (wajib sebelum coding fitur)

Saat ini JS awal **448.8 KB gzip** (entry 107.2 + chunk Phaser/battle 341.6) dari budget 450: sisa **~1.2 KB**. Satu fitur tempur realistis menambah 0.5–1.5 KB, jadi Phase 1 akan menembus batas.

Pilihan:

| Opsi | Isi | Risiko |
|---|---|---|
| **A. Re-baseline 460 KB** (rekomendasi) | Naikkan budget, ganti gate dari "byte" ke **first paint + canvas ready** pada throttle 1.6 Mbps/150 ms | Menyimpang dari angka awal; harus diukur ulang, bukan diklaim |
| B. Tetap 450 KB | Pangkas kode/data dulu sampai ada 4–5 KB ruang | Pemangkasan berisiko ke fitur; data item/skill dipakai sim, sulit di-lazy |
| C. Tunda fitur tempur | Hanya rilis fitur non-entry (league, outfit) | Menunda nilai terbesar |

**Definisi selesai Phase 0:** keputusan tertulis di README + PLAN, dan `scripts/bundle-check.mjs` (baru) membaca `dist/assets/*.js`, menjumlahkan entry + chunk Phaser, lalu gagal kalau melewati batas baru. Perf probe lama dipakai untuk memastikan first paint tidak regresi > 100 ms.

**Status: selesai.** Opsi A diambil: budget 460 KB gzip, gate byte lewat `npm run check:bundle` (437.7 KB saat ini), dan gate performa baru `scripts/perf-check.mjs` (`npm run check:perf`) mengukur FCP + canvas ready di throttle 4G dengan cache dingin — hasil 1.46–1.49 s dan 2.75–2.80 s, batas 2.0 s / 4.0 s.

### 14.3 Phase 1 — Awakening (Forge Surge)

**Fantasi pemain:** makin lama bertarung, makin panas; saat meter penuh hero "menyala" sejenak. Ini pengganti transformasi ala Pockie tanpa tombol tambahan.

**Scope v1 (kecil):**
- Meter terisi dari **damage yang dihasilkan hero** (bukan waktu), jadi build DPS tinggi mengisi lebih cepat.
- Saat penuh: **Surge 8 detik**, ATK ×1.25 dan ATK SPD ×1.15, aura + tint elemen + banner. Otomatis, tanpa tap. Selama surge, meter tidak mengisi.
- Unlock: **stage 30** (sama dengan arena). Tanpa upgrade di v1; nilai tetap.
- Tidak ada state permanen di v1: charge dan sisa durasi reset saat reload (dokumentasikan). Kalau nanti ada upgrade, baru tambah `surgeLevel` ke save.

**Implementasi:**
- `src/data/surge.ts` baru: `SURGE_UNLOCK_STAGE`, `SURGE_THRESHOLD`, `SURGE_DURATION`, `SURGE_ATK`, `SURGE_SPEED`.
- `src/sim/battle.ts`: field `surgeCharge`, `surgeTimer`; tambah charge di `heroAttack`, `castSkill` (damage), dan `companionHit`? (pilihan: hanya damage hero); buff di `computeStats`/`attackPower`; emit `surge` saat mulai/berakhir.
- `types.ts`: `surge` di `HudSnapshot` (`charge`, `active`, `remaining`, `unlocked`), event `{ type: 'surge'; phase: 'start' | 'end' }`.
- `BattleScene.ts`: aura particle di sekitar hero, tint emas, banner `SURGE`, getar pendek; hormati `reduceMotion`.
- HUD `App.tsx`: bar tipis 4 px di bawah HP hero + label kecil `SURGE` (isi %), warna gradien emas→pink.

**Tuning:** target uptime 15–20% dari waktu tempur di stage 30 dan 50; charge per 1 damage = `1 / (hero.maxHp * 6)` (kasar) lalu diuji lewat `scripts/pacing.ts` atau test simulasi baru.

**Test:** ambang charge, trigger otomatis, buff kedaluwarsa, tidak dobel saat sudah aktif, damage 0 tidak mengisi, snapshot benar, save/reload tidak menyimpan charge.

**Ukuran:** +0.6–1.0 KB gzip. **Estimasi:** S (1–2 hari).

**Selesai jika:** surge terlihat di arena, uptime terukur masuk target, tidak ada penurunan FPS di throttle 4×, dan `smoke:arena`/`smoke:juice` tetap lulus.

**Status: selesai.** `SURGE_CHARGE_HP = 22` (22× max HP sebagai damage untuk mengisi meter) memberi uptime **17.6–19.7%** pada tiga seed pacing 12 jam, di dalam target 15–20%. Charge tidak disimpan, jadi tidak ada kenaikan `SAVE_VERSION`; meter reset saat reload, mati, atau Ascension. Test: `src/sim/surge.test.ts` (6 kasus) + kolom `surgeUptime` di `npm run pacing`.

### 14.4 Phase 2 — Synthesis & Forge

**Fantasi pemain:** salvage tidak lagi cuma gold; item jelek bisa "dilebur" menjadi item lebih tinggi, dan set yang kurang satu potong bisa dikejar dengan usaha, bukan keberuntungan.

**Scope v1:**
- **Dust** (currency baru) dari salvage: Common 1, Rare 2, Epic 4, Legendary 8. Tidak memakai essence supaya tidak bersaing dengan rune/boost.
- **FUSE:** 3 item satu rarity → 1 item rarity berikutnya (slot/nama acak, level mengikuti stage). Tombol memilih 3 item terlemah yang tidak terpasang, dengan konfirmasi daftar. Item yang di-fuse tidak boleh equipped.
- **CRAFT SET PIECE:** pilih slot + set yang sudah pernah ditemukan; biaya dust + essence; hasil Epic dengan set tersebut. Batasi 1 craft per hari per set? (open question).
- Semua hasil tetap melewati `stashItem` dan aturan auto-salvage.

**Implementasi:** `src/sim/forge.ts` (fungsi murni: biaya, hasil, pemilihan item), field `dust` di save, panel `ForgePanel` lazy di dalam tab GEAR, tombol di `BagSheet`.

**Test:** matematika rarity, item equipped tidak terpakai, inventory penuh, dust tidak negatif, save v14.

**Ukuran:** +1.0–1.5 KB entry (logika) + chunk UI. **Estimasi:** M (2–3 hari).

**Selesai jika:** simulasi ekonomi menunjukkan set 4 potong bisa dikejar < 2 hari grind tanpa merusak pacing, dan tidak ada item hilang saat inventory penuh.

**Status: selesai.** Save **v14** menambah `dust`. Biaya craft final **60 dust + 15 essence**, tanpa batas harian (keputusan: batas harian ditunda sampai ekonomi terbukti terlalu cepat). Pacing engaged 12 jam menghasilkan **283 dust**, jadi satu set piece ≈ 2,5 jam aktif dan empat potong ≈ 10 jam — masih di bawah target 2 hari. Set Emberforged sengaja tidak bisa di-craft agar cache event tetap bernilai. Test: `src/sim/forge.test.ts` (10 kasus) + smoke browser `npm run smoke:forge`.

### 14.5 Phase 3 — League season (ARENA)

**Fantasi pemain:** ladder tidak berhenti di satu angka; tiap minggu ada divisi, promosi, dan hadiah.

**Scope v1:**
- **Career points** (yang sekarang) tetap. Tambah **season points** yang reset tiap Senin 00:00 lokal.
- League = 4 divisi dari season points (`Bronze/Silver/Gold/Prismatic`), promosi/degradasi saat reset berdasarkan ambang.
- Header ARENA menampilkan **dua angka**: `LADDER` (career, tidak reset) dan `LEAGUE` (musim, reset). Jangan campur keduanya dalam satu bar.
- Rival harian mengambil satu lawan dari league di atas (bobot 1 dari 3) supaya ada rasa "naik kelas".
- Hadiah akhir musim: gold + essence + 1 piece set untuk Gold+, diklaim sekali.

**Implementasi:** `src/sim/league.ts` (fungsi murni), `arena.season` di save (v15), header ARENA + kartu hadiah, event `leagueend`.

**Test:** rollover Senin, promosi/degradasi, klaim sekali, hadiah tidak dobel saat reload, musim pertama untuk save lama.

**Ukuran:** +0.5–0.8 KB. **Estimasi:** S–M (1–2 hari).

**Selesai jika:** satu musim penuh bisa diselesaikan tanpa save corrupt, hadiah hanya bisa diklaim sekali, dan pemain baru (save lama) masuk ke Bronze tanpa error.

**Status: selesai.** Save **v15** menambah `league` (`key`, `points`, `division`, `rewardDivision`, `rewardClaimed`). Keputusan yang diambil: 4 divisi dengan ambang promosi 200/330/450 dan ambang bertahan 0/100/220/340, dihitung dari plafon 21 tiket/minggu (504 poin). Musim diselesaikan **sekali** saat pemain membuka arena di minggu baru, jadi absen tiga minggu tidak menumpuk crate; crate hanya terbit kalau ada minimal satu duel, dan pemain yang tidak bermain tetap turun divisi (kecuali Bronze). Hadiah: gold ≈40 kill farm, essence 5+4×divisi, core 2×divisi untuk Silver+, satu set piece Epic untuk Gold+. Poin musim dan divisi tidak direset oleh Ascension. UI memisahkan **LEAGUE** (musim + hitung mundur + ambang) dan **LADDER** (karier + W/L). Test: `src/sim/league.test.ts` (13 kasus), 4 kasus baru di `src/sim/battle.test.ts`, dan smoke browser `npm run smoke:league` (settle Silver→Gold, klaim, set piece, reload). Bundle setelah fitur: **JS awal 435.3 KB** (entry 103.3 + Phaser/battle 332.1) dari budget 460 KB, jadi masih di dalam gate tanpa perlu memindahkan apa pun ke chunk lazy.

### 14.6 Phase 4 — Trial Tower (Ninja Exam)

**Fantasi pemain:** tantangan bertingkat yang tidak bisa di-farm, dengan aturan berbeda tiap lantai.

**Scope v1:**
- **10 lantai/minggu**, tiap lantai satu boss dengan **2 modifier tetap** dan stat yang di-scale dari `maxStage`.
- **3 attempt/minggu**; menang membuka lantai berikutnya, kalah menghabiskan attempt. Lantai yang sudah clear tidak bisa diulang sampai reset.
- Hadiah per lantai (dust/essence/cores) + cache mingguan di lantai 10.
- Reset Senin, seed mingguan.

**Implementasi:** mode baru di `BattleSim` mirip `startRift` (`startTrial(floor)`, `endTrial`) dengan satu boss, `src/sim/trial.ts` untuk data lantai, `TrialPanel` lazy di tab RIFT dengan segmented control.

**Test:** urutan lantai, attempt berkurang, clear tersimpan, reset mingguan, hadiah sekali, save v16.

**Ukuran:** +1.0–1.5 KB. **Estimasi:** M (2–3 hari).

**Selesai jika:** 10 lantai selesai dalam 1 minggu oleh build stage 40, dan tower tidak mempercepat farm stage utama > 15% (diukur simulasi).

**Status: selesai.** Save **v16** menambah `trial` (`key`, `cleared`, `attempts`). Keputusan yang diambil: **retry = anggaran gagal**, jadi masuk lantai dan menang tidak memakai apa pun, hanya kalah yang memotong 3 retry/minggu; tower dibuka di **stage 35**; 10 lantai memakai boss farm stage dengan eskalasi linear (+12% HP, +5% ATK, +4% DEF per lantai) plus **2 aturan mingguan** dari pool 6 yang di-seed dari Senin (semua pemain melihat tower yang sama, ganti tiap minggu). Aturan hanya menyentuh stat boss, tidak ada debuff hero, supaya tidak perlu jalur buff baru di `computeStats`. Hadiah: dust `4+2×lantai`, essence `2+lantai`, core di lantai 5/10, dan cache lantai 10 (gold ≈2 boss farm + 1 set piece Epic). **Tidak ada gold/EXP per lantai**, jadi tower hanya mempercepat Forge: total satu tower penuh = **150 dust** (≈0,5 sesi farm 12 jam engaged yang menghasilkan 283 dust), 75 essence, 3 core, dan 2 boss-kill gold — jauh di bawah batas 15% percepatan stage, dan tidak menyentuh `farmStage`/`maxStage` sama sekali (dijaga test). Senin mereset lantai dan retry; tab tersembunyi membatalkan tanpa memakai retry; save tidak ditulis di tengah run. Test: `src/sim/trial.test.ts` (13 kasus), 8 kasus baru di `src/sim/battle.test.ts`, dan smoke browser `npm run smoke:trial` (10 lantai, 2 aturan, menang, retry utuh, lanjut lantai 2, persistensi).

### 14.7 Phase 5 — Pet kennel

**Fantasi pemain:** bukan satu wisp, tapi koleksi beast dengan elemen dan pasif, yang bisa disintesis seperti di Pockie.

**Scope v1:**
- 3 wisp: **Ember** (burn), **Frost** (slow), **Storm** (chain hit). Satu aktif pada satu waktu.
- Duplikat dari cache arena/trial/event → **synthesis** menaikkan level maksimum (bukan langsung level).
- Level dasar dinaikkan dengan gold seperti companion sekarang.

**Batasan balance:** total DPS pet ≤ 20% DPS hero pada gear yang sama; elemen pet tidak menambah attunement hero.

**Implementasi:** `src/data/pets.ts`, `src/sim/pets.ts`, `Boosts`/companion section di BOOST, save `pets` + `activePet`, scene memakai texture/tint wisp yang ada.

**Test:** cap DPS, elemen, synthesis, swap, save/reload, Ascension tidak menghapus koleksi.

**Ukuran:** +1.0–1.5 KB. **Estimasi:** L (3–4 hari) karena balance.

**Status: selesai.** Save **v18** mengganti `companion` dengan `pets` (`active`, `kinds: { level, maxLevel, eggs }`); save v17 dengan `companion.level` dimigrasi otomatis jadi Ember di level yang sama. Keputusan yang diambil: **Ember** tetap seperti dulu (burn), **Frost** (stage 40) memberi slow 20% / 2,5 s, **Storm** (stage 60) memukul dua kali (60% hit kedua) — semuanya memakai satu rasio damage per level yang menjaga total DPS di bawah 20% DPS hero sampai ceiling 20. **Egg duplikat** drop dari boss (6%), cache tower (50%), crate liga Gold+ (dijamin), dan kemenangan arena Champion+ (35–65% sesuai pangkat), lalu **SYNTHESISE** menaikkan ceiling **+2** (maks 20), jadi egg tidak pernah memberi power gratis — hanya memperpanjang jalur gold. Wisp aktif diwarnai per elemen di scene dan tiap serangan punya efek sendiri — percikan api Ember, pecahan es + label CHILL + tint biru pada musuh untuk Frost, dan kilat zigzag dari wisp ke musuh untuk Storm (dimatikan saat reduce motion) — dan kennel tidak direset Ascension. Karena wisp menambah damage, `SURGE_CHARGE_HP` digeser 24 → **26** supaya uptime surge tetap **15,9–18,9%** di tiga seed engaged; pacing sekarang melatih wisp aktif, bukan companion tunggal. Test: `src/sim/pets.test.ts` (13 kasus, menggantikan `companion.test.ts`), kasus migrasi/roundtrip di `src/state/save.test.ts`, dan smoke browser `npm run smoke:pets` (3 wisp, unlock stage 40/60, pindah aktif, training, synthesis ceiling 12, persistensi, 360 px). Smoke `npm run smoke:league` sekarang juga memeriksa crate membawa satu egg, dan `smoke:pets` menjalankan battle 6 detik dengan Storm aktif untuk memastikan efek kilat tidak melempar error. **Tidak ada sisa scope** untuk fitur ini.

**Audit pacing setelah sumber egg baru:** engaged 12 jam di tiga seed mencapai stage 50 pada **7,1–7,9 jam** dengan surge **17,2–18,5%** (target 15–20%); casual 8,3 jam, idle tetap mentok di stage 4. Egg tidak mempercepat pacing karena `simulatePacing` tidak pernah menyintesis dan level tetap dibeli dengan gold — egg hanya memperpanjang gold sink sampai ceiling 20. **Edge yang diketahui:** kalau semua wisp sudah di ceiling 20, `grantPetEgg` mengembalikan null tetapi crate liga tetap menampilkan "1 wisp egg"; egg dari boss/arena/tower juga hangus tanpa pesan. Solusi yang disarankan (belum dikerjakan): bayar dust pengganti dan tampilkan di panel.

### 14.8 Phase 6 — Costume bertier (wardrobe)

**Fantasi pemain:** outfit seperti di Pockie Ninja — tiap kostum punya efek khas dan skill sendiri, dan tier menentukan seberapa sakit.

**Scope v1:**
- **6 tier:** Bronze → Silver → Gold → Platinum → Diamond → Emerald, satu outfit per tier.
- Passive persen (ATK/HP/DEF/SPD/crit) naik tiap tier; tiap outfit membawa **satu skill eksklusif** yang menembak otomatis sebagai cast ke-7.
- Ditemukan dari boss farm (8%) dan cache Trial lantai 5/8/10; duplikat jadi dust. Save **v17** (`costume.owned`, `costume.equipped`).

**Batasan balance:** skill outfit tetap patuh jeda global 2 detik dan punya cooldown sendiri 10–16 s, jadi tambahan DPS kecil dan tidak menggandakan throughput skill. Passive maksimal +26% ATK di Emerald, di bawah satu rank Ascension penuh dikali tiga.

**Status: selesai.** `src/data/costumes.ts` memegang katalog, `src/sim/costume.ts` normalisasi + roll + bonus, `CostumePanel` jadi sub-tab **GEAR · COSTUME**. Keputusan yang diambil: **satu slot outfit** (bukan empat bagian), **drop dari boss + cache tower** (bukan craft), dan **cast otomatis** di luar 6 slot loadout. Roll costume memakai **stream RNG sendiri** (`BattleSim(save, rng, lootRng)`) supaya loot tidak menggeser crit/damage — percobaan pertama memakai stream yang sama dan membuat uptime surge melonjak 17,8–24,6% hanya karena urutan RNG. Setelah itu `SURGE_CHARGE_HP` dinaikkan 22 → **24** agar costume di pertengahan run tidak mendorong uptime di atas 20%; hasil tiga seed engaged: 16,6% / 18,7% / 18,7%. Tower cache: lantai 5 → Gold, 8 → Platinum, 10 → Emerald. Test: `src/sim/costume.test.ts` (12 kasus), 7 kasus wardrobe di `src/sim/battle.test.ts`, migrasi v16→v17 di `src/state/save.test.ts`, dan smoke browser `npm run smoke:costume` (6 kartu, tier terkunci menampilkan stage, swap menaikkan ATK, remove, persistensi, 360 px).

**Iterasi kedua (visual + ekonomi duplikat).** (1) **Outfit terlihat:** enam tekstur `hero-<tier>` dibangun dari `hero().recolor()` di `src/game/dummy/assets.ts`, dipilih BattleScene lewat `costumeSprite(tier)` dan disegarkan oleh event `outfit`/`costume`, plus chip tier di topbar HUD. (2) **Duplikat berguna:** roll boss/tower sekarang **mendahulukan outfit yang belum dimiliki**, dan duplikat (dust) bisa dipakai **FORGE** tier mana pun (150+6 dust/essence di Bronze sampai 2800+90 di Emerald) — jadi koleksi tetap punya tujuan setelah 5/6 dan emerald bisa dikejar tanpa stage 100. (3) **Pity:** `costume.pity` tersimpan di save, boss ke-12 tanpa costume dijamin memberi satu, dan panel menampilkan sisa boss. (4) **CODEX → WARDROBE:** 6 entri dengan `???`; koleksi lengkap membayar sekali **600 dust + 60 essence**. (5) **Guard balance:** `simulatePacing({ costume })` mensimulasikan outfit terpasang dari detik pertama; test mengunci Emerald ≤**28%** uptime surge dan stage 50 ≥**4 jam** (terukur 4,9–6,8 jam, uptime 17,6–25,4%). Test baru: 4 kasus `costume.test.ts`, 3 kasus `battle.test.ts`, 1 kasus `assets.test.ts`, 1 kasus `pacing.test.ts`; `npm run smoke:costume` diperluas ke pity, forge, chip HUD, dan codex.

### 14.8b Phase 6b (opsional) — Palet kosmetik hero

- 5 palet hero (dan rival) di-unlock oleh milestone: Ascension 1, Arena Champion, Trial lantai 10, event Emberfall, stage 60.
- Tanpa stat. Dipilih di halaman COSTUME; disimpan sebagai `palette`.
- Implementasi: `recolor()` yang sudah ada + map palet; tidak perlu aset baru.

**Estimasi:** S (0.5–1 hari). **Ukuran:** +0.2 KB.

**Status: selesai.** Save **v19** menambah `palette: { worn, unlocked }`. Keputusan yang diambil: **unlock disimpan permanen**, bukan dihitung ulang dari state hidup, karena tiga milestone bisa berbalik arah (poin arena bisa turun, `trial.cleared` reset tiap Senin) — jadi palet yang sudah didapat tidak pernah dicabut, dan save lama yang sudah memenuhi syarat langsung mendapatkannya saat load. Milestone dicek di `tick` plus titik-titik penting (ascension, duel, trial, klaim event). Palet adalah **lapisan aksen**: outfit tetap memegang warna armor (steel), palet mewarnai trim, cape, dan leather, dengan kedua map digabung dalam satu `recolor` dari sprite dasar — percobaan pertama memakai dua `recolor` berurutan dan hasilnya outfit kedua menimpa semua aksen. Tekstur dibuat lazy per kombinasi outfit+palet (`hero-<tier>-<palet>`), jadi tidak ada 35 tekstur di bundle. Tanpa stat: smoke memverifikasi ATK tidak berubah setelah memakai palet. Test: `src/sim/palette.test.ts` (7 kasus), kasus komposisi di `src/game/dummy/assets.test.ts`, migrasi v18→v19 di `src/state/save.test.ts`, dan smoke browser `npm run smoke:palette` (4/5 earned dari save v18, satu terkunci, wear, ATK tetap, reload, clear, 360 px). Bundle: **443.3 KB** dari budget 460 KB.

### 14.8c Phase 7 — Mount & wing (dungeon chase)

- **Mount:** 4 beast (Ember Steed, Dusk Wolf, Frost Stag, Storm Gryphon), satu dipakai sekaligus, level 1–10 dibayar gold + crystal dungeon. Passive persen per level plus **satu skill berbasis peluang** yang menembak dari serangan hero. Sprite beast digambar di belakang knight, yang diangkat ke sadel.
- **Wing:** 3 pasang (Emberpinions, Rimepinions, Stormpinions), level 1–12, passive 2–2,6% ATK per level dan skill 2,2–3,0× ATK (sampai ~5× di level 12) dengan chance 8–10% → cap 22% — di atas mount karena wing adalah chase utama.
- **Dungeon:** 3 tier (Cinder Den / Rime Hollow / Skyfall Aerie), 3 wave trash + boss, 5 tiket gratis per hari plus tiket beli di shop. Mount drop 1/3/5%, wing 0,2/0,4/0,7%, dengan roll terpisah. Shop juga menjual maksimal 2 crystal per hari supaya gold tidak menggantikan run.
- Craft sebagai cadangan: mount selalu berhasil (12–42 crystal + gold), wing berisiko (45/35/25% sukses; gagal menyimpan gold dan mengembalikan separuh crystal).

**Status: selesai.** Save **v20** menambah `mounts` (`active`, `owned`), `crystals`, `dungeon`, `shop`; save **v21** menambah `wings` (`active`, `owned`); save **v22** menambah `codex.mounts`/`codex.wings`. Keputusan yang diambil: **mount dan wing memakai slot terpisah** (bisa dipakai bersamaan), **roll drop terpisah** dari combat dan dari satu sama lain (`lootRng`), dan **wing tidak dijual di shop** supaya satu-satunya jalan adalah dungeon atau craft berisiko. Setelah semua mount/wing satu tier dimiliki, roll yang meleset membayar crystal bonus (2 untuk mount, 3 untuk wing) alih-alih drop mati. Visual memakai sprite prosedural baru (`mount-*`, `wing-*`); sayap berada di belakang knight dan ikut naik saat menunggang. **Tuning setelah pengukuran:** versi pertama wing (+4–6% ATK per level, skill 3.2–5.0× dengan chance sampai 55%) membuat stage 50 clear dalam **1,5–1,9 jam** — 4× lebih cepat dari baseline — karena skill tanpa cooldown dihitung per hit. Angka diturunkan ke **+2–2,6% ATK per level** dan skill **2.2–3.0× ATK** dengan chance 8–10% → cap 22%; hasil tiga seed dengan Stormpinions level 12: stage 50 di **3,57 / 3,78 / 4,91 jam** (baseline 6,93–7,71 jam), surge 13,8–19,4%. `simulatePacing({ wing })` + `npm run pacing` dengan `WING=stormpinions:12` menjaga angka ini lewat test (floor 3 jam, ceiling 8 jam, surge ≤28%). Codex **v22** mencatat mount/wing saat drop, craft, atau load save lama; CODEX sekarang punya blok **STABLE** dan **WING VAULT**. Efek skill wing memakai beam, dua slash silang, shockwave, dan flash kamera (dimatikan di reduce motion). Test: `src/sim/mounts.test.ts`, `src/sim/wings.test.ts`, kasus dungeon/shop di `src/sim/battle.test.ts`, kasus codex di `src/sim/codex.test.ts`, `src/sim/pacing.test.ts`, migrasi v19→v20→v21→v22 di `src/state/save.test.ts`, dan smoke `npm run smoke:mount` + `npm run smoke:wing`.

### 14.9 Lintas-fitur

- **Save version:** v14 forge, v15 league, v16 trial, v17 costume, v18 pets, v19 palet, v20 mount + dungeon, v21 wing, v22 codex mount/wing — mengikuti urutan eksekusi. Tiap kenaikan wajib punya test migrasi dari versi sebelumnya.
- **Mode tempur baru** (surge, trial) tidak boleh menulis save di tengah run, dan harus batal saat tab disembunyikan — pola yang sama dengan rift/duel.
- **Offline:** fitur baru tidak boleh memperbesar laporan offline kecuali disengaja; uji `offline.test.ts`.
- **Codex:** hanya entri yang bisa ditemukan (pet, outfit) yang masuk codex; jangan menambah counter yang membingungkan.
- **Aksesibilitas:** semua efek baru punya varian `reduce-motion`.
- **Konsistensi UI:** tab tetap 8; semua panel baru lazy; tidak ada overlay yang menutupi HP dua sisi saat duel.

**Risiko yang sudah terlihat:**

| Risiko | Mitigasi |
|---|---|
| Budget (460 KB) terlampaui | `npm run check:bundle` + `check:perf` dijalankan sebelum rilis; UI baru wajib lazy |
| Dua ladder (career + league) membingungkan | Label dan warna berbeda; league hanya terlihat di tab ARENA, bukan HUD |
| Synthesis membuat ekonomi terlalu cepat | Simulasi dust per jam sebelum tuning; batasi craft per hari |
| Surge membuat pacing melonjak | Uptime target 15–20%; uji di stage 30/50 dan bandingkan `npm run pacing` |
| Pet menumpuk DPS di atas companion | Cap DPS pet ≤20% hero; uji dengan gear terbaik |
| Scope melebar ke fitur sosial | Non-goal §14.12 dikunci; ide baru masuk draft baru, bukan phase berjalan |

### 14.10 Urutan & ketergantungan

| Phase | Fitur | Ukuran | Bergantung pada |
|---|---|---|---|
| 0 | Budget gate + bundle-check | S | — |
| 1 | Awakening | S | Phase 0 |
| 2 | Synthesis | M | Phase 0, save v14 |
| 3 | League | S–M | Arena (sudah ada) |
| 4 | Trial | M | Rift (sudah ada), save v16 |
| 5 | Pets | L | Phase 2 (dust), Phase 4 (drop duplikat) |
| 6 | Costume bertier | M | Phase 3/4 (drop boss & cache) |
| 6b | Palet kosmetik | S | Phase 6 (katalog costume) |

Total kasar: **10–15 hari kerja** untuk 1–6, di luar playtest dan tuning. Rekomendasi eksekusi: **0 → 1 → 2 → 3 → 4 → 5 → 6**, dengan playtest LAN setelah Phase 3.

### 14.11 Keputusan yang perlu diambil

1. **Budget:** re-baseline ke 460 KB dengan gate first-paint (rekomendasi) atau pangkas kode untuk tetap 450 KB?
2. **Surge:** otomatis penuh (rekomendasi) atau tombol tap saat meter penuh? Tombol menambah kontrol yang bertentangan dengan pilar idle.
3. **Synthesis:** currency baru `dust` (rekomendasi) atau memakai `essence` yang sudah ada?
4. **League:** reset Senin 00:00 lokal; berapa divisi dan ambang promosi?
5. **Trial:** 3 attempt/minggu atau 1 attempt per lantai? Hadiah di tiap lantai atau hanya cache akhir?
6. **Pets:** apakah elemen pet boleh menambah damage elemen hero, atau murni damage pet sendiri (rekomendasi: sendiri)?
7. **Synthesis:** batasi craft set piece 1×/hari (rekomendasi) atau bebas selama dust cukup?
8. **Costume:** satu outfit per slot (dipakai) atau empat bagian terpisah? Apakah skill-nya cast otomatis atau harus masuk salah satu dari 6 slot loadout? (v1: satu slot + cast otomatis.)

### 14.12 Non-goals draft ini

Clan/guild, auction/trade, world boss real-time, ladder lintas perangkat, combat manual/turn-based, gacha, dan fitur apa pun yang menambah tab ke-9.

## 15. Party & karakter (implementasi bertahap)

Keputusan pemilik produk: **party 5 slot sekaligus**, **gear per karakter**, dan **wardrobe per karakter**. Bagian ini memecah pekerjaan itu jadi langkah yang masing-masing bisa diverifikasi, karena satu langkah besar tidak bisa diuji tanpa menebak.

### 15.1 Roster v1

| id | Nama | Role | Elemen | Unlock | HP | ATK | DEF | SPD | Crit | Signature |
|---|---|---|---|---|---|---|---|---|---|---|
| knight | Warden | tank | holy | stage 1 | 1.15 | 0.90 | 1.30 | 0.95 | 0 | Aegis Oath — shield party 18%, 14 s |
| ranger | Ranger | ranged | lightning | 10 | 0.90 | 1.10 | 0.90 | 1.15 | +4% | Storm Volley — 170% ATK, 6 s |
| cleric | Cleric | support | holy | 20 | 1.00 | 0.75 | 1.05 | 1.00 | 0 | Mending Light — heal party 16%, 12 s |
| mage | Mage | caster | fire | 35 | 0.85 | 1.30 | 0.85 | 0.90 | +2% | Inferno — 240% ATK, 9 s |
| rogue | Rogue | striker | dark | 50 | 0.85 | 1.20 | 0.85 | 1.05 | +6% | Nightfall — 190% ATK drain 30%, 8 s |

Multiplier dikalikan ke stat turunan gear karakter itu sendiri. Tidak ada karakter yang unggul di semua sumbu: tank menukar damage dengan HP/DEF, mage sebaliknya, cleric satu-satunya sumber heal party.

### 15.2 Aturan tarung

- Slot 0 = baris depan (menanggung 65% serangan musuh), slot 1–4 = belakang (35% dan damage +10%).
- Tiap anggota punya cooldown serang, HP, dan signature sendiri; mati berarti keluar dari pertarungan sampai wave berikutnya (bukan revive seluruh party).
- Party wipe = mundur ke farm stage, aturan yang sudah ada.
- **Resonance:** dua anggota satu elemen memberi seluruh party +6% ATK.
- **Assist:** anggota belakang menembak tambahan tiap 4 detik sebesar 40% ATK, hanya saat target masih hidup.

### 15.3 Wave & musuh

- Jumlah musuh per wave: 2 (stage 1–9), 3 (10–29), 4 (30–49), 5 (50–79), 6 (80+); boss tetap 1 tapi dengan HP setara jumlah musuh.
- HP/ATK musuh dibagi faktor `sqrt(count)` supaya total "effective HP" per wave tidak meledak saat jumlahnya naik.
- `heroCd`/`enemyCd` tunggal diganti loop per kombatan; `Hero` menjadi `Combatant` (id karakter + stat).

### 15.4 Gear per karakter

- `equipped: Record<CharacterId, Equipped>`; bag tetap satu (dinaikkan 24 → 40 slot).
- Set bonus dihitung per karakter; `EQUIP BEST`, refine, rune, enhance bekerja per karakter dengan pemilih karakter di halaman GEAR.
- Ekonomi: drop rate item dinaikkan ~2.5× dan salvage memberi dust per rarity tetap, supaya 5 set bisa dikejar tanpa mengubah jam main. Kurva ini wajib diukur ulang lewat `npm run pacing`.
- Item yang di-fuse/craft memakai level farm seperti sekarang; item terpasang di karakter mana pun tidak ikut ter-fuse.

### 15.5 Wardrobe per karakter

- `costume: Record<CharacterId, CostumeState>` (6 tier × 5 karakter = 30 outfit), pity dan `mastered` per karakter.
- Drop costume memilih karakter acak berbobot yang tier-nya sudah terbuka; duplikat jadi dust seperti sekarang.
- Skill outfit hanya aktif untuk karakter yang memakainya; `CODEX → WARDROBE` menampilkan 5 kolom.

### 15.6 Save v24

- Field baru: `party` (slots/unlocked/activeSlot), `gear` per karakter, `costume` per karakter.
- Migrasi: save lama → `party = { slots: ['knight', null…], unlocked: ['knight'] }`, `gear.knight` = `equipped` lama, `costume.knight` = costume lama; karakter lain kosong. Save tanpa versi tetap ditolak seperti sekarang.
- Milestone unlock dihitung ulang saat load (`bestStage`), jadi save lama yang sudah stage 50 langsung mendapat kelima karakter.

### 15.7 UI & teknis

- Halaman **PARTY** baru (lazy chunk) berisi 5 kartu slot, roster, unlock stage, dan tombol pasang.
- HUD BATTLE: 5 bar HP tipis menggantikan satu bar hero; nama karakter aktif di baris stat.
- Scene: 5 hero digambar 1.6× (bukan 2×) di dua baris, monster 2–6 di kanan; march dan parallax yang sudah ada tetap dipakai.
- Bundle: entry saat ini 454,95/520 KB. **Keputusan:** `modulepreload` Phaser dipertahankan dan gate dinaikkan ke 520 KB, karena tanpa preload chunk battle baru ditemukan setelah entry dieksekusi sehingga unduhannya bersambung di 1,6 Mbps. Angka 520 KB diverifikasi lewat `npm run check:perf` pada 454,95 KB: first paint 1608 ms, canvas ready 3147 ms (batas 2000/4000 ms), margin ≈850 ms ≈ 65 KB. Kenaikan berikutnya wajib diukur ulang.

### 15.8 Urutan kerja & gate

1. **Fondasi (selesai):** data roster + `PartyState` + normalisasi/unlock/resonance, 12 test. Belum tersambung ke tarung.
2. **Save v24 + party di state (selesai):** `party`/`gear`/`costumes` disimpan, save v23 ke bawah memindahkan satu set ke knight, milestone unlock dihitung ulang saat load, 5 test migrasi di `src/sim/partySave.test.ts`. Getter `equipped`/`costume` tetap menunjuk karakter aktif, jadi seluruh jalur upgrade belum perlu berubah.
3. **Combat party:** loop kombatan, target, wave bertingkat, signature skill; `battle.test.ts` dan `pacing.test.ts` disesuaikan dan diukur ulang.
4. **UI:** halaman PARTY, GEAR per karakter, wardrobe per karakter, HUD 5 bar.
5. **Scene & balance:** layout 5 hero, wave 2–6 monster, ekonomi ×2.5, kalibrasi ulang surge/pacing.

Tiap langkah harus hijau di `npm test`, `npm run build`, dan `npm run check:bundle` sebelum lanjut.
