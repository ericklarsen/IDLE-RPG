# Idle Forge — Prototype M0–M8

Idle RPG 2D auto-battle untuk mobile web (portrait 390×844). Prototype ini memakai **dummy art prosedural** — belum ada file gambar, semua sprite dan background digambar dari kode (sprite karakter 32×32 dengan shading 3 tone, background vector-ish 390×844). Aset final digenerate nanti setelah gameplay-nya terkunci.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Untuk pengalaman yang benar, pakai mode device 390×844 (Chrome DevTools) atau buka di HP.

Perintah lain:

```bash
npm test                  # unit test simulasi dan formula
npm run build             # typecheck + build produksi
npm run smoke             # smoke test gameplay Playwright (dev server harus berjalan)
npm run smoke:inventory   # smoke test inventory + persistensi
npm run smoke:upgrade     # smoke test enhance, refine, lock, dan persistensi
npm run smoke:enchant     # smoke test rune, resonance, boost, dan persistensi
npm run smoke:skills      # smoke test slot skill, upgrade, shield, dan persistensi
npm run smoke:offline     # smoke test laporan ekspedisi, cap 8 jam, dan klaim
npm run smoke:ascend      # smoke test tree Ascension, reset run, dan shard
npm run smoke:save        # smoke test export/import save dan reset dua tahap
npm run smoke:rift        # smoke test rift harian 60 detik dan persistensi
npm run smoke:trial       # smoke test trial tower: lantai, retry, cache, dan persistensi
npm run smoke:costume     # smoke test wardrobe costume: tier, passive, skill, dan persistensi
npm run smoke:palette     # smoke test palet kosmetik: unlock milestone, wear, persistensi
npm run smoke:arena       # smoke test arena ranked, duel, tiket, dan persistensi
npm run smoke:league      # smoke test liga mingguan: settle, promosi, crate, dan persistensi
npm run smoke:sets        # smoke test set equipment, tier bonus, dan persistensi
npm run smoke:codex       # smoke test codex bestiary/arsenal dan persistensi
npm run smoke:pets        # smoke test kennel wisp: unlock, training, synthesis, dan persistensi
npm run smoke:mount       # smoke test stable, craft mount, dungeon run, shop, dan visual menunggang
npm run smoke:wing        # smoke test wing vault, temper, craft berisiko, dan visual sayap
npm run smoke:cheat       # smoke test panel cheat DEV: grant mount/wing, resource, unlock stage
npm run smoke:forecast     # smoke test modal Forge Forecast dan simulasi boss
npm run smoke:juice        # smoke test danger vignette dan efek juice
npm run smoke:surge        # smoke test bar SURGE, trigger otomatis, dan reset setelah reload
npm run smoke:forge        # smoke test fuse, craft set piece, dan persistensi dust
npm run smoke:audio        # smoke test panel volume MUSIC/SFX dan persistensinya
npm run smoke:event        # smoke test event Emberfall, klaim cache, dan persistensi
npm run smoke:back         # smoke test tombol back browser: halaman → BATTLE
npm run smoke:a11y         # smoke test keyboard overlay: focus trap, Escape, inert
npm run pacing            # simulasi progres 12 jam (engaged, casual, idle) + uptime surge
npm run check:bundle      # gate JS awal ≤ 520 KB gzip (butuh `npm run build`)
npm run check:perf        # gate first paint & canvas ready pada throttle 1.6 Mbps
npm run icons             # regenerate ikon PWA di public/icons
```

Smoke test polish berjalan di build produksi, karena service worker hanya aktif di sana:

```bash
npm run build
npm run preview -- --port 4173   # terminal 1
npm run smoke:polish            # terminal 2
```

## Deploy

Deploy memakai **Vercel Git integration**, bukan pipeline sendiri: repo di-import sekali di `vercel.com/new`, lalu setiap push ke `main` menjadi production deployment dan setiap pull request mendapat preview URL. Tidak ada token, secret, atau workflow yang perlu dirawat.

`vercel.json` memaku konfigurasi build supaya layar import tidak perlu diubah:

- Framework **Vite**, Build Command `npm run build`, Output Directory `dist`.
- `base: './'` di `vite.config.ts` membuat aset, manifest, dan service worker tetap bekerja di domain root `*.vercel.app` maupun di subpath.

Yang diverifikasi Vercel hanya build: `tsc --noEmit` ikut berjalan di `npm run build`, jadi type error membatalkan deployment. **Unit test dan smoke test tidak dijalankan di sana** — jalankan yang ada di daftar perintah di atas sebelum push.

## Yang sudah jalan

- Auto-battle tanpa kontrol: hero menyerang sendiri, musuh membalas, hero revive setelah 3 detik.
- **Party bertarung:** **MENU → PARTY** memasang sampai 5 karakter ke slot, memilih leader, dan mencabutnya. Anggota selain leader ikut menyerang dengan cooldown, ATK, elemen, serta gear/wardrobe miliknya sendiri, dan 40% serangan musuh jatuh ke mereka — jadi party besar menyebar risiko, bukan menumpuk semuanya di leader. HP anggota yang habis membuatnya `down` (tidak menyerang) sampai target berikutnya mati, lalu ia bangkit penuh. Surge meter hanya terisi setengah dari damage anggota, supaya uptime tidak ikut membengkak.
  - **Signature per karakter:** tiap anggota otomatis melepas signature-nya di cooldown sendiri — Storm Volley (170% ATK), Inferno (240%), Nightfall (190% + drain 30% untuk dirinya), Mending Light (heal 16% max HP ke seluruh party), dan Aegis Oath (shield party 18%). Damage signature memakai ATK dan elemen karakter **yang melepasnya**, bukan leader.
  - **Leader juga melepas signature-nya:** sebelumnya hanya mate yang cast, jadi Warden yang memimpin tidak pernah memakai Aegis Oath sama sekali. Sekarang leader punya timer signature sendiri (`signatureId` + `signatureCd`) di samping loadout dan skill outfit, dan timer itu direset saat leader diganti supaya signature yang sudah terisi tidak diwarisi karakter lain. Path cast-nya satu (`castSignature`): leader mengirim ATK + bonus elemen dan HP hero, mate mengirim stat dirinya sendiri. Pada pengukuran 120 detik stage 10 level 40, Aegis Oath muncul 8× untuk party solo tanpa mengubah jumlah kill, karena efeknya shield, bukan damage.
  - **Ukuran dampaknya (diukur, bukan dikira):** pada stage 10, level 40, tanpa gear, 120 detik — solo 1 kill / 38,5k damage; duo 2 kill / 76,5k; trio 3 kill / 91,2k; party penuh 5 kill / 163,9k dengan signature anggota menyumbang **11,5%** damage party (Storm Volley×19, Nightfall×14, Inferno×13, Mending Light×9). Artinya roster memang menambah kekuatan nyata, dan **wave satu musuh jadi terlalu mudah untuk party penuh** — itu alasan wave multi-musuh + kalibrasi `pacing` adalah langkah berikutnya.
- Wave 1–10 per stage, elite di wave 5, boss di wave 10, lalu naik stage.
- **Farm / push:** setelah boss clear, hero otomatis maju ke stage berikutnya. Dua kematian saat push membuatnya mundur ke **farm stage** dan menetap di sana sampai pemain menekan **PUSH**. Baris target di HUD menunjukkan boss berikutnya dan kebutuhan DPS-nya (mis. "+12% DPS", atau "in reach" kalau sudah cukup). Selama farm, laporan offline dihitung dari farm stage, bukan stage push.
- **Daily rift:** setelah clear stage 10, **MENU → RIFT** membuka gauntlet **60 detik** di farm stage dengan **2 modifier harian** yang di-seed dari tanggal lokal (mis. Haste + Bulwark). Kill tetap memberi gold/EXP seperti biasa; di akhir dapat chest gold + essence, dan item **Epic+** kalau mencapai 5 kill. Sekali per hari, reset tengah malam lokal. Rift memakai battle yang sama, mengembalikan stage/wave lama saat selesai, dan otomatis dibatalkan (tanpa chest) kalau tab disembunyikan.
- Gold, EXP, level-up, dan DPS meter.
- Enhance per item sampai +15: +12% stat item per level, biaya naik eksponensial. Di atas +5 ada peluang gagal yang menaikkan **pity** (peluang berikutnya lebih besar), jadi gold tidak pernah terbuang percuma.
- Refine substat (ala enchant Ragnarok Origin): tiap item punya 1–4 substat sesuai rarity (ATK%, HP%, DEF, CRIT, SPD). **Biayanya tetap** — hanya iLv dan rarity yang menentukan, tidak pernah naik karena sering di-roll. Yang naik adalah **Refine Level per slot** (0–20): tiap percobaan mengisi bar 1/10, dan level menentukan **cap kualitas** roll (tier maksimum yang mungkin). Ganti item tidak menghapus level slot, jadi investasi tidak hangus. Roll buruk tetap mengisi bar, dan **pity 30** memaksa satu line tier S kalau belum dapat. **Resonance** memakai level slot terendah: 10/15/20 memberi bonus ATK/HP/CRIT untuk seluruh hero. Tier substat tetap **C/B/A/S/SS**.
- **QoL batch:** **ENHANCE ALL SLOTS → +5** menaikkan semua item terpasang ke +5 (100% sukses) dan berhenti kalau gold habis. **REFINE TO A** meroll substat yang tidak dikunci sampai semuanya minimal tier A, berhenti saat gold habis atau setelah 40 roll; tombolnya nonaktif selama cap slot masih di bawah tier A, jadi gold tidak terbakar sia-sia.
- **Equipment set:** tiga set 6 potong — **Ashforged** (2: +10% ATK, 4: +8% ATK SPD), **Voidbound** (2: +6% CRIT, 4: +20% ATK), dan **Knight's Oath** (2: +12% HP, 4: +40 DEF, +10% HP). Tag set diturunkan dari nama item, jadi drop lama dan save lama otomatis ikut terdeteksi. Bonus hanya dihitung dari item yang sedang dipakai, dan **EQUIP BEST** memilih kombinasi dengan total stats terbaik — termasuk nilai set — sehingga tidak membongkar bonus 4 potong hanya karena satu item punya power mentah sedikit lebih tinggi.
- Starter weapon otomatis terpasang di game baru, jadi tombol enhance langsung bisa dipakai.
- Enchant: 3 slot rune per item, 5 elemen. Rune terbanyak menentukan elemen hero; elemen unggul memberi damage ×1.25 dan elemen lemah ×0.85.
  - **Resonance:** 3 rune satu elemen di item yang sama memberi bonus ×1.5.
  - Rune Essence didapat dari elite, boss, dan salvage item non-Common.
- Boost permanen 5 cabang (Offense, Defense, Fortune, Speed, Element) sampai rank 10, dibayar dengan Boss Core dari boss; respec mengembalikan semua core.
- Skills: **6 slot aktif** dengan **auto-cast berurutan** (slot 1 prioritas tertinggi) + 1 slot passive, mengikuti jumlah skill per build di Pockie Ninja.
  - **Jeda global 2 detik** antar cast, jadi menambah slot tidak menggandakan output skill: slot ke-4–6 berguna saat skill utama masih cooldown.
  - 8 skill aktif tersedia (6 dipasang sekaligus): damage fisik, fire, ice (slow), lightning, dark (lifesteal), heal, shield, dan buff ATK.
  - 3 passive: +ATK%, +HP%, +ATK SPD%.
  - Level 1–10, +8% efek per level, dibayar dengan Skill Book dari boss.
- **Forge & sintesis:** salvage sekarang juga memberi **dust** (Common 1, Rare 2, Epic 4, Legendary 8, Mythic 15). Halaman **FORGE** dibagi tiga sub-tab — **ENHANCE**, **FUSE**, **CRAFT** — dan tab fuse/craft punya dua fungsi: **FUSE 3 → 1** (tiga item satu rarity terlemah di bag menjadi satu item rarity berikutnya, selalu dengan konfirmasi daftar) dan **CRAFT SET PIECE** (Epic, slot + set pilihan, biaya 60 dust + 15 essence; hanya set yang pernah ditemukan dan bukan set event). Craft/fuse tetap melewati `stashItem`, jadi aturan auto-salvage saat bag penuh berlaku.
  - Hasil fuse/craft memakai level farm saat ini, sama seperti drop biasa. Item yang sedang terpasang tidak pernah ikut di-fuse.
  - Ekonomi diukur lewat pacing: pemain engaged mengumpulkan ~283 dust per 12 jam, jadi satu set piece ≈ 2,5 jam dan 4 potong masih di bawah target 2 hari.
- **Forge Surge (awakening):** setelah clear stage 30, halaman **GEAR** menampilkan bar tipis **SURGE** di baris stat tempur. Meter terisi dari damage yang hero hasilkan (bukan waktu), jadi build DPS tinggi mengisi lebih cepat; saat penuh hero menyala **8 detik** dengan **ATK ×1.25** dan **ATK SPD ×1.15**, aura emas–pink, banner, dan suara sendiri. Otomatis tanpa tombol; meter berhenti mengisi selama surge, habis saat hero mati, dan **tidak disimpan** — reload mengosongkannya.
- **Trial Tower (mingguan):** halaman **RIFT** punya segmented **RIFT · TRIAL**. Tower berisi **10 lantai boss** yang naik **+12% HP / +5% ATK / +4% DEF** per lantai dari boss farm stage, masing-masing membawa **2 aturan mingguan** (dari 6: Bulwark, Frenzy, Haste, Plated, Twin Core, Leaden) yang di-seed dari tanggal Senin, jadi semua pemain menghadapi tower yang sama dan berganti tiap minggu.
  - **Retry, bukan tiket:** masuk lantai gratis dan menang juga gratis. Hanya **kalah** yang memakai satu dari **3 retry** per minggu; lantai yang sudah clear tidak bisa diulang sampai Senin. Retry habis = tower tutup sampai Senin.
  - Hadiah per lantai berupa **dust + essence** (dan **core** di lantai 5 dan 10), **tanpa gold/EXP**, jadi tower tidak mempercepat lomba stage — hanya Forge. Lantai 10 menambah **cache**: gold ≈2 boss farm + **satu set piece Epic**.
  - Pertarungan memakai arena yang sama (badge BOSS, bar TRIAL di HUD), tidak menulis save di tengah run, batal tanpa memakai retry kalau tab disembunyikan, dan lantai/retry bertahan setelah reload.
- **Costume (wardrobe):** halaman **GEAR** punya segmented **GEAR · COSTUME**. Satu outfit dipakai sekaligus dan tidak punya stat roll — tier-nya yang menentukan kekuatan.
  - **6 tier:** **Bronze → Silver → Gold → Platinum → Diamond → Emerald**. Tiap tingkat menambah passive (`+6% ATK` di Bronze sampai `+26% ATK / +22% HP / +10% DEF / +6% ATK SPD / +5% crit` di Emerald) sekaligus skill yang lebih sakit (150% → 250% ATK, shield 18%, atau drain 225%).
  - **Terlihat di layar:** knight di arena di-repaint per tier lewat `recolor()` (bronze = kulit & tembaga, emerald = hijau–emas), dan chip tier berwarna muncul di topbar HUD. Ganti outfit langsung mengganti tekstur tanpa reload.
  - **Skill ke-7 otomatis:** skill outfit menembak sendiri di samping 6 slot loadout, punya cooldown sendiri (10–16 s), dan tetap patuh jeda global 2 detik — jadi menambah outfit tidak menggandakan output skill, hanya menambah satu cast kuat per cooldown.
  - **Ditemukan, bukan dibeli:** boss farm punya peluang **8%** menjatuhkan costume dari tier yang sudah terbuka (Bronze stage 15, Silver 30, Gold 45, Platinum 60, Diamond 80, Emerald 100). Roll selalu mendahulukan outfit yang **belum dimiliki**, jadi drop tidak pernah mengulang tier yang sudah ada selama masih ada yang baru — dan ada **pity**: boss ke-12 tanpa costume dijamin memberi satu. Cache Trial lantai **5 / 8 / 10** memberi jaminan tier Gold / Platinum / Emerald.
  - **Duplikat jadi dust** (12/24/45/80/140/220), dan dust + essence itu bisa dipakai **FORGE** tier yang belum ditemukan (150+6 sampai 2800+90) — jadi koleksi bisa dikejar tanpa menunggu stage 100.
  - Kostum pertama yang ditemukan langsung dipakai; drop berikutnya tidak pernah menimpa outfit yang sedang dipakai. Koleksi lengkap 6/6 membayar **sekali** 600 dust + 60 essence.
  - Semua outfit yang dimiliki otomatis tercatat di **CODEX → WARDROBE** (6 entri, `???` sebelum ditemukan). Uji: `src/sim/costume.test.ts`, kasus wardrobe/pity/forge di `src/sim/battle.test.ts`, `src/game/dummy/assets.test.ts`, dan `npm run smoke:costume`.
  - **Palet kosmetik:** 5 aksen warna yang dilapisi di atas outfit — **Ashen** (Ascension 1), **Champion** (arena Champion), **Trialborn** (trial lantai 10), **Emberfall** (klaim cache event), **Stormtouched** (farm stage 60). Palet hanya mewarnai trim, cape, dan kulit, jadi outfit tetap terlihat; tanpa stat dan tanpa pengaruh drop. Sekali didapat, palet tidak pernah dicabut — turun divisi atau reset tower mingguan tidak menghilangkannya, dan Ascension menyimpannya. Default tones selalu tersedia untuk kembali ke warna outfit murni. Uji: `src/sim/palette.test.ts`, kasus palet di `src/game/dummy/assets.test.ts` dan `src/state/save.test.ts`, serta `npm run smoke:palette`.
- **Mounts & dungeon:** setelah clear stage 30, **MENU → MOUNTS** membuka stable berisi **4 mount** (Ember Steed, Dusk Wolf, Frost Stag, Storm Gryphon). Satu mount dipakai sekaligus; passive-nya menambah ATK/HP/DEF persen, dan tiap mount punya **satu skill berbasis peluang** yang menembak dari serangan hero sendiri (10–22% di level 1, naik per level). Level 1–10 dibayar gold + **crystal** dungeon, dan mount yang dipakai **benar-benar terlihat** di arena: beast digambar di belakang knight dan knight diangkat ke sadel.
  - **MENU → DUNGEON** berisi tiga run bertingkat — **Cinder Den** (stage 30), **Rime Hollow** (50), **Skyfall Aerie** (70). Tiap run = 3 wave trash + boss, membayar crystal + gold, dan menjatuhkan mount tier itu dengan peluang **1% / 3% / 5%**. Crystal juga dipakai untuk craft mount di stable (12–42 crystal + gold), jadi kekeringan drop tidak menghentikan progres.
  - **Tiket:** 5 gratis per hari (reset tengah malam lokal); **MENU → SHOP** menjual tiket tambahan (harga naik tiap pembelian) dan maksimal **2 crystal per hari** dengan gold — crystal tidak bisa dibeli tanpa batas supaya dungeon tetap sumbernya.
  - **Wings (game changer):** **MENU → WINGS** menyimpan **3 pasang sayap** — Emberpinions (T1, fire), Rimepinions (T2, ice), Stormpinions (T3, lightning). Sayap memakai aturan yang sama seperti mount (pakai satu, level 1–12, passive per level) tapi skill-nya jauh lebih besar: **2.2×–3.0× ATK di level 1 → 4.0×–5.0× ATK di level 12**, dengan chance 8–10% yang naik sampai **22%** per hit, plus passive **+2%–2.6% ATK per level** (tambah HP/DEF). Saat dipakai, sepasang sayap digambar di belakang knight dan ikut naik saat menunggang mount, dan skill-nya menembak sebagai **beam + slash + shockwave** berwarna elemennya (flash kamera dimatikan di mode reduce motion).
  - **Pacing:** sayap maksimal yang dipakai dari awal memangkas clear stage 50 dari ~7 jam jadi **3,6–4,9 jam** di tiga seed, jadi chase ini mempercepat tanpa menghapus perjalanan; `npm run pacing` menerima `WING=stormpinions:12` untuk mengukur ulang.
  - **Drop dan craft berisiko:** sayap hanya jatuh dari dungeon tier-nya dengan peluang **0.2% / 0.4% / 0.7%** — jauh di bawah mount — dan roll-nya terpisah, jadi satu clear bisa memberi mount, sayap, keduanya, atau tidak sama sekali. Craft di vault adalah cadangan: biayanya 45/75/120 crystal + gold dengan peluang sukses **45% / 35% / 25%**; gagal tetap menghabiskan gold tapi **separuh crystal dikembalikan**, dan panel menampilkan risikonya sebelum menekan tombol.
  - **Koleksi:** mount dan sayap yang masuk stable/vault otomatis tercatat di **CODEX → STABLE / WING VAULT** (4 dan 3 entri, `???` sebelum ditemukan), termasuk yang sudah dimiliki save lama.
  - Uji: `src/sim/mounts.test.ts`, `src/sim/wings.test.ts`, kasus dungeon di `src/sim/battle.test.ts`, `src/sim/codex.test.ts`, `src/sim/pacing.test.ts` (pacing sayap maksimal), `src/game/dummy/assets.test.ts` (sprite mount & sayap), serta `npm run smoke:mount` dan `npm run smoke:wing` (termasuk screenshot `artifacts/wings.png`).
- **Cheat panel (khusus testing):** tombol **DEV** mengapung di atas dock membuka panel untuk menyuntik state tanpa farming: **GIVE** tiap mount (4) dan wing (3), tombol **LV +1** gratis untuk yang sudah dimiliki, **+1M GOLD / +100 ◈ / +MATS / +5 TICKETS**, dan **UNLOCK 70** untuk membuka semua tier dungeon. Semua tulisan langsung ke save browser.
  - Panel hanya ada di build dev, atau di build apa pun yang dibuka dengan `?cheats=1`, jadi pemain biasa tidak bisa mencapainya. `Escape` atau tombol **CLOSE** menutupnya.
  - Uji: `src/sim/cheat.test.ts` (grant, clamp level, resource, tiket cap, lompat stage, penolakan saat dungeon berjalan) dan `npm run smoke:cheat` (panel, grant, level gratis, resource, unlock stage, persistensi, 360 px).
- **Offline expedition:** saat tab ditutup atau game ditutup, progres dihitung 85% dari rate farm aktif, maksimal 8 jam. Laporan menampilkan kill, gold, EXP, level, drop, essence, core, dan book; reward baru masuk setelah **CLAIM REWARDS**.
  - Di bawah rincian ada blok **AFTER CLAIM**: satu–dua upgrade yang langsung terjangkau setelah klaim (enhance senjata, boost termurah, level skill, atau socket rune), atau saran farm kalau semuanya masih jauh. Perhitungannya ikut menghitung gold salvage dan tidak mengubah run apa pun.
- **Polish M8:** audio prosedural lewat WebAudio (SFX + musik, tanpa file audio), getar di HP, hit stop saat crit dan boss kill, flash kamera saat boss muncul/mati.
  - **Musik berlapis mengikuti situasi:** pad tenang saat farm, tema D-minor dengan bass pulse dan shimmer saat boss, lalu arpeggio cepat + hi-hat saat rift. Semua lapisan dijadwalkan dari satu beat 240 ms, jadi pergantian mood tidak pernah putus.
  - **Options:** **MENU → OPTIONS** membuka slider **MUSIC** dan **SFX** (0–100%, langkah 5%), toggle **SOUND** untuk mute, dan pilihan **MOTION**. Semua tersimpan di save settings dan bertahan setelah reload.
  - **Heartbeat:** saat HP hero ≤30%, detak ganda 64 Hz berbunyi tiap 900 ms; berhenti saat hero mati, game di-mute, atau tab disembunyikan.
  - Audio unlock di tap pertama, `AudioContext` di-resume setelah interupsi iOS, dan otomatis berhenti saat tab disembunyikan. Kontrol audio ada di **MENU → OPTIONS**.
- **Reduced motion:** MOTION bisa FULL atau REDUCED. Tanpa pilihan tersimpan, nilainya mengikuti `prefers-reduced-motion` OS, jadi pemain yang sudah mematikannya di HP tidak perlu mengubah apa pun.
  - Mode ini mematikan screen shake, zoom kamera saat boss muncul, denyut danger vignette, dan pulse pada boss pill/indikator AUTO. Kilatan warna, angka damage, dan particle tetap ada supaya umpan balik tarung tidak hilang.
  - CSS memakai class `reduce-motion` di `<html>`; Phaser membaca `isMotionReduced()` dari `src/state/motion.ts` sebelum shake atau zoom.
- **Navigasi dock:** lima halaman terpisah — **BATTLE** (HUD), **GEAR** (loadout + bag), **FORGE** (enhance/fuse/craft), **ARENA**, dan **MENU** (rift, event, skills, boost, ascend, codex, options, save). Tap tab yang sama untuk kembali ke root halaman.
  - **Tombol back HP/browser** menelusuri balik halaman: sub-halaman MENU → index MENU → BATTLE, dan tab yang diganti tidak menumpuk riwayat. Di BATTLE, back tetap keluar dari game seperti biasa.
  - Tab **MENU** menampilkan titik merah saat ada rift yang bisa dijalankan atau cache Emberfall yang siap diklaim, jadi konten harian/mingguan tidak terlewat.
  - **Keyboard:** `Escape` menutup detail item dan modal (onboarding dikecualikan karena belum ada yang bisa dituju), fokus pindah ke dialog saat dibuka lalu kembali ke tombol pemicu, `Tab`/`Shift+Tab` berputar di dalam dialog, dan `.hud` serta halaman di belakangnya di-`inert` selama modal terbuka.
  - Detail item dan modal (**Forge Forecast**, laporan ekspedisi, hasil rift/duel) juga lapisan riwayat: back menutupnya lebih dulu sebelum halaman di belakangnya bergerak. Laporan offline yang ditutup lewat back otomatis **diklaim**, jadi hadiahnya tidak hilang. Onboarding sengaja bukan lapisan riwayat karena belum ada halaman yang bisa dituju saat kembali.
- **Onboarding 3 langkah** muncul sekali untuk pemain baru: auto-battle, gear/enhance, lalu Ascension.
- **PWA:** manifest + ikon 192/512/maskable, service worker dengan network-first untuk HTML dan stale-while-revalidate untuk aset, jadi game tetap terbuka saat offline setelah kunjungan pertama.
- **Ascension:** setelah clear stage 50, reset run dan dapat **Star Shard** (`floor((bestStage/10)^1.6)`).
  - Reset: level, gold, stage, gear, Boost, essence/core/book/dust, dan level skill.
  - Disimpan: Star Shard, rank node, skill loadout, jumlah ascension, dan seluruh wardrobe costume.
  - 6 node permanen: Might (+ATK), Vigor (+HP), Prosperity (+gold), Scavenger (+drop), Head Start (mulai di stage lebih tinggi), Long Haul (+2 jam cap offline per rank).
- Loot equipment: 6 slot (weapon, helm, armor, boots, ring, amulet), 5 rarity, drop dari musuh normal/elite/boss. Boss selalu memberi Epic atau lebih.
- Inventory 24 slot sebagai **grid 4×6** bergaya kotak: border warna rarity, **icon pixel 16×16 per item**, nama item, power, badge `+enhance`, dan penanda sudut warna set. Slot kosong tetap digambar (garis putus-putus) supaya kapasitas terasa; saat penuh, item terlemah otomatis di-salvage seperti sebelumnya. Tap kotak membuka detail untuk equip, unequip, salvage, enhance, refine, dan rune.
  - Filter per slot dan urutan **POWER**/**RARITY** ada di atas grid, dengan jumlah item per slot di tiap chip dan penanda `SHOWING x/y` saat filter aktif.
- Gear score, enhance, dan substat ikut dihitung ke ATK, HP, DEF, crit, dan attack speed hero.
- **Forge Forecast:** tombol **PLAN** di baris farm/push membuka simulasi "apa yang harus dibeli?". Game mengkloning run saat ini, mencoba kandidat nyata (enhance senjata, EQUIP BEST, boost, level skill, latih wisp), lalu menyimulasikan fight boss stage berikutnya dengan aturan combat yang sama — urut dari kill tercepat, lengkap dengan biaya, peluang enhance, dan sisa HP kalau kalah. Run asli tidak tersentuh; gold/gear tidak berkurang. Ini pembeda utama dari idle game yang hanya menampilkan angka berjalan.
- **Emberfall (event mingguan):** Jumat 00:00 sampai Minggu 23:59 waktu lokal. Setelah clear stage 10, setiap boss yang mati di farm/push dihitung ke target **5 boss**; selama event boss juga **menjatuhkan gear set eksklusif Emberforged** menggantikan loot biasa. Lima kill membuka **weekly cache** berisi satu piece Emberforged Epic+ yang dijamin, sekali per minggu. Progres disimpan per key hari Jumat, jadi minggu baru otomatis mereset target tanpa menghapus riwayat gear.
  - Halaman **EVENT** menampilkan status (ENDS IN / STARTS IN), progress bar, tombol klaim, dan 6 piece set dengan penanda `???` untuk yang belum ditemukan.
  - Penghitung hanya jalan saat event aktif dan stage 10 sudah tercapai; boss rift tidak dihitung supaya gauntlet 60 detik tidak bisa dipakai mem-burst target.
- **Arena ranked (PvP asinkron):** setelah clear stage 30, tab **ARENA** menawarkan **3 rival build per hari** yang di-seed dari tanggal lokal — stat, elemen, dan set-nya diambil sekali di awal hari dari kekuatan hero saat itu, jadi upgrade di tengah hari tidak membuat lawan ikut naik. Setiap rival punya label **STEADY / EVEN / DEADLY**, satu elemen, dan satu kombinasi set + skill. **3 tiket** per hari; duel berjalan di arena yang sama (sprite rival, badge `RIVAL`, bar HP dua sisi) dan rival melancarkan **serangan elemen** tiap 6,5 detik. Menang memberi **+24 poin** dan gold/essence (core di Champion+), kalah **−8 poin** tanpa hadiah. Peringkat: **Squire → Knight → Champion → Warlord → Legend** pada 0/120/300/600/1000 poin. Poin dan rekor menang-kalah bertahan melewati Ascension, tapi snapshot rival dibuang saat reset supaya diambil ulang di kekuatan baru. Duel otomatis batal (tanpa mengubah poin) kalau tab disembunyikan, dan save tidak ditulis di tengah duel.
  - **Liga mingguan:** ladder di atas tidak pernah reset, tapi liga punya musim yang berakhir **Senin 00:00 lokal**. Setiap duel juga menambah **poin musim** (+24 menang, −8 kalah, tidak di bawah 0), dan saat musim berganti poin itu diselesaikan jadi **divisi**: **Bronze → Silver → Gold → Prismatic** pada 200/330/450 poin. Di atas ambang promosi naik satu divisi; di bawah ambang bertahan (100/220/340) turun satu divisi. Sembilan kemenangan sudah cukup untuk naik dari Bronze, empat belas untuk Gold, dan Prismatic butuh 19 dari 21 tiket mingguan.
  - **Crate musim** menunggu setelah settle dan hanya bisa diklaim sekali: gold (≈40 kill farm), essence, core (Silver+), **satu set piece Epic** dan **satu egg wisp** untuk Gold+; kemenangan duel di **Champion+** juga bisa menjatuhkan egg (35–65% sesuai pangkat). Pemain yang tidak memainkan satu duel pun tidak mendapat crate, dan pemain yang absen beberapa minggu tetap hanya menyelesaikan satu musim saat kembali.
  - Panel ARENA memisahkan dua angka: **LEAGUE** (poin musim + hitung mundur + ambang promosi/degradasi) dan **LADDER** (poin karier + W/L). Divisi dan poin musim tidak ikut hilang saat Ascension.
- **Codex:** halaman **CODEX** mencatat penemuan pemain — **35 bestiary** (15 normal, 15 elite, 5 boss), **36 item** (6 slot × 6 nama, lengkap dengan warna set), **6 costume** wardrobe, **4 set** dengan hitungan potong yang ditemukan, dan **8 modifier rift**. Entri yang belum ditemukan tetap tampil sebagai `???` supaya progresnya terlihat. Pencatatan otomatis: musuh saat spawn, gear saat drop atau diklaim dari laporan offline, modifier saat rift dimulai.
- **Pet kennel (wisps):** tiga wisp dengan gaya serang berbeda, satu bertarung sekaligus, diatur di **MENU → BOOSTS**.
  - **Ember (stage 20):** menyerang tiap 3 detik dan membakar target 3 detik (15% damage per detik). **Frost (stage 40):** menyerang lebih sering dan memperlambat serangan musuh 20% selama 2,5 detik. **Storm (stage 60):** menyerang dua kali, hit kedua 60% damage.
  - **Budget damage:** total DPS wisp dijaga di bawah **20% DPS hero** di level maksimum; waktu serang dan rasio ATK tiap wisp dituning di `src/data/pets.ts` supaya ketiganya setara.
  - **Level & ceiling:** level 1–10 dinaikkan dengan gold; **egg duplikat** dari boss (6%), cache tower (50%), crate liga Gold+, dan kemenangan arena Champion+ menaikkan ceiling **+2 per egg** sampai **level 20**. Egg hanya menaikkan batas, bukan level, jadi tidak ada power gratis.
  - Wisp aktif berwarna sesuai elemennya di samping hero (api/ice/lightning) dan setiap serangan punya jejak sendiri: percikan api untuk Ember, pecahan es + label **CHILL** serta tint biru pada musuh selama slow aktif untuk Frost, dan kilat zigzag dari wisp ke target untuk Storm. Burning tick juga menebar bara kecil di tubuh musuh. Semua efek dimatikan saat *reduce motion* aktif.
  - Seluruh kennel — level, ceiling, egg, wisp aktif — tersimpan serta tidak hilang saat Ascension.
- Save **v24** ke `localStorage` tiap 5 detik dan saat halaman ditutup, termasuk `lastSeen`, farm stage, posisi stage, hasil rift harian, progres Emberfall, state Ascension, papan arena (poin, rekor, tiket, rival harian), liga mingguan (poin musim, divisi, crate), trial tower (lantai clear, retry, kunci minggu), wardrobe costume (dimiliki + dipakai + counter pity), status koleksi lengkap, kennel wisp (level, ceiling, egg, wisp aktif), palet kosmetik (worn + unlocked), dan dust. Save lama dimigrasi otomatis: enhance global v1/v2 dipindahkan ke senjata terbaik, farm stage lama dianggap sama dengan stage tertinggi, dan currency/boost/ascension/dust mulai dari nol. Sejak v24 gear dan wardrobe disimpan **per karakter** (`gear`/`costumes`), party punya slot/unlock sendiri, dan save v23 kebawah memindahkan satu set lama ke knight; karakter yang milestone stage-nya sudah lewat langsung terbuka saat load.
- **Backup save:** **MENU → SAVE DATA** punya **EXPORT** (kode `IF1-…`), **IMPORT** (kode atau JSON), dan **RESET** dua tap. Import memvalidasi versi, dedupe item, dan me-refresh `lastSeen`; reset tidak ditimpa lagi oleh autosave saat reload.
- HUD mobile (tab **BATTLE**): stage, wave, HP musuh dan hero, EXP, gold, baris farm/push dengan tracker DPS boss berikutnya dan tombol **PLAN** (Forge Forecast), bar rift 60 detik (modifier + kill + sisa waktu) saat rift berjalan, dan bar **ARENA · pangkat · poin/tiket** dengan chip `DUEL` + badge `RIVAL` selama duel.
  - **Party di arena:** anggota selain leader digambar di belakang dan sedikit ke kiri leader, makin ke belakang makin kecil (1,7× → 1,35×), dan diwarnai tint warna roster masing-masing (navy Warden, emas Ranger, teal Cleric, merah Mage, ungu Rogue). Posisinya ikut march dan rotasi langkah hero, jadi barisan bergerak sebagai satu grup. Anggota yang tumbang tetap terlihat tapi pudar dan kelabu sampai wave berikutnya, bukan hilang tiba-tiba. Susunannya dihitung modul murni `src/game/layout.ts`, jadi bisa diuji tanpa canvas (4 test: solo kosong, urutan makin kiri & makin kecil, tidak keluar layar, batas 4 anggota).
  - Batasan yang jujur: **belum ada sprite per karakter** — keempat mate memakai tekstur knight yang di-tint, bukan art Ranger/Mage/Cleric/Rogue sendiri.
  - **Strip party:** begitu party berisi dua karakter atau lebih, bar tipis per anggota muncul di bawah bar hero — nama berwarna sesuai roster, bar dengan warna karakter itu, HP berjalan, dan label `DOWN` kalau anggota sedang tumbang. Baris `YOU` memakai nama karakter aktif, bukan teks tetap. Angka di strip diambil dari simulasi yang berjalan (`snapshot().party`), jadi sama dengan yang dipakai mesin tarung; party solo tetap menampilkan HUD satu hero yang lama tanpa strip.
- **Battle stage:** hero, 6 musuh, dan boss digambar dari primitif ke grid 32×32 lalu di-outline otomatis, dengan palet baja/emas/ember/void per makhluk. Arena sengaja diletakkan di atas panel HUD (ground line di y=370 dari 844) supaya karakter selalu terlihat di 390×844 maupun 360×640; horizon, bulan, castle, bebatuan, dan kabut digambar ulang mengikuti garis itu.
  - Skala per jenis: normal 2× (64 px), elite 3× (96 px), boss 4× (128 px), dengan bayangan yang ikut membesar.
  - Idle per makhluk: slime squash-stretch, bat hover, skeleton sway, goblin hop, wraith mengambang + alpha pulse, boss bernafas; hero punya bob + breathing.
  - **March:** setelah kill, hero melangkah maju dengan badan sedikit miring dan debu di kakinya, sementara dua strip penanda tanah bergulir — strip jauh 40% lebih lambat, jadi arena terasa berjalan. Musuh baru masuk dari sisi kanan (`ENEMY_ENTER` 110 px) dan stage baru memicu jalan lebih panjang. Semua turunan dari event simulasi (`spawn`, `kill`, `stageup`), jadi timing combat dan hasil `pacing.test.ts` tidak berubah; `MOTION = REDUCED` mematikan gulir, rotasi, debu, dan walk-in sekaligus.
- **Juice pertarungan:** setiap hit memunculkan crescent slash, musuh squish, dan angka damage yang tersebar; hero yang kena damage terlempar sedikit plus kilatan merah di tepi layar.
  - Skill punya wujud: skill damage melesatkan orb berwarna elemen dari hero ke musuh lalu meledak, heal/shield/buff memancarkan ring yang mengembang di hero.
  - **Kill streak:** kill beruntun dalam 6 detik menampilkan `STREAK ×N` (jadi `RAMPAGE` di ×8) dengan ledakan partikel yang makin banyak; streak reset saat hero mati.
  - Drop rare ke atas memancarkan pilar cahaya berwarna rarity, dan boss memicu zoom kamera 1.06× sebelum bertarung.
  - **Danger vignette:** saat HP hero ≤30%, tepi layar berdenyut merah (React overlay di atas canvas, di bawah HUD).
- Efek: damage text, hit flash, screen shake, hit stop, particle, banner boss/stage, popup loot, getar, dan SFX.

## Balance & pacing

Kurva musuh memakai **HP kubik** terhadap global wave, **ATK linear**, dan reward yang mengikuti HP musuh. Tujuannya: stage awal cepat, stage akhir makin lama, tapi gear dan level tetap bisa mengejar.

Hasil simulasi `npm run pacing` (seed 1, pemain aktif yang upgrade tiap 30 detik dan menekan **PUSH** saat tracker hijau atau setelah 5 menit farm):

| Milestone | Waktu |
|---|---|
| Stage 5 | 11 menit |
| Stage 10 | 29 menit |
| Stage 20 | 1.9 jam |
| Stage 30 | 3.8 jam |
| Stage 40 | 6.9 jam |
| Stage 50 (Ascension pertama) | 11.4 jam |
| Tanpa upgrade | berhenti di stage 4 (tidak pernah push) |
| Offline 8 jam setelah stage 50 | 130 kill · +2 level |

Simulasi ikut melatih wisp aktif dengan 25% gold tiap check-in, memakai set terbaik, dan meng-upgrade skill. Seed 2 dan 3 bergerak di 8–8.5 jam untuk stage 50, jadi loot RNG tidak menentukan segalanya. Test `src/sim/pacing.test.ts` mengunci rentang ini supaya perubahan angka tidak diam-diam merusak pacing. Ini tetap perlu **playtest manusia**; simulasi hanya menjaga bentuk kurvanya.

Kalibrasi terakhir (Oktober 2026): `SURGE_CHARGE_HP` naik dari 22 ke **26** setelah costume dan kennel wisp menambah damage di pertengahan run; uptime surge kembali ke **15,9–18,9%** di tiga seed engaged. Meter surge diisi damage, jadi outfit yang lebih tinggi memang menaikkan uptime — dengan **Emerald dipakai dari detik pertama**, `pacing.test.ts` menjaga uptime tetap **≤28%** dan stage 50 tetap **≥4 jam** di tiga seed, sehingga tier baru tidak bisa membuat surge menyala terus atau melompati progres. Roll costume memakai stream RNG sendiri, jadi loot tidak lagi menggeser hasil crit/damage. DPS wisp aktif ikut dihitung di laporan offline dan tracker boss, sehingga keduanya tidak lagi meremehkan pemain sekitar 7–15%. Chest rift dikalibrasi ke **0.85–1.15× gold kill farm** di stage 10–50, dan `src/sim/rift.test.ts` mengunci rasio itu. Gear score dan EQUIP BEST sekarang ikut menghitung nilai set, jadi menyelesaikan 2/4 potong terbaca sebagai upgrade nyata, bukan turun power.

## Inventory & upgrade

Dock lima tab di bawah layar: **BATTLE**, **GEAR**, **FORGE**, **ARENA**, **MENU**. Battle tetap berjalan di belakang halaman mana pun.

- **GEAR** berisi stat tempur, grid slot equipped, ringkasan set, aksi batch, dan bag; segmented **GEAR · COSTUME** di atas halaman membuka wardrobe outfit.
  - **Pemilih karakter:** kalau party berisi lebih dari satu karakter, deretan chip di atas halaman menampilkan tiap anggota (nama berwarna roster, elemen, atau `DOWN`). Memilih chip membuat karakter itu yang **bertarung** sekaligus yang gear/wardrobe-nya ditampilkan, karena GEAR dan COSTUME membaca karakter aktif — satu tindakan, tanpa halaman bayangan yang bisa menyesatkan tentang siapa yang memakai item itu.
  - **HP tidak ikut pulih saat berganti:** HP tiap anggota diingat per karakter saat roster dibangun ulang, termasuk saat LEAD, ganti chip, atau ubah slot party. Sebelumnya `refreshParty()` mengisi ulang semua anggota ke HP penuh, dan berkat itu bolak-balik LEAD adalah heal party gratis tanpa batas; sekarang hanya karakter yang benar-benar baru bergabung yang masuk dengan bar penuh, dan anggota yang tumbang tetap tumbang.
- Halaman **COSTUME** menampilkan 6 kartu tier: tier, nama outfit, passive, skill + cooldown, tombol **WEAR/REMOVE**, hitungan **pity** boss, dan tombol **FORGE** berisi harga dust/essence untuk tier yang belum ditemukan. Di bawahnya ada blok **PALETTE**: chip default + 5 palet dengan swatch, status **WORN**, dan syarat unlock untuk yang masih terkunci.
- Tap item di bag atau slot equipped untuk membuka detail item.
- Di detail: **ENHANCE** (×1 / ×10), **REFINE**, **LOCK** per substat, dan 5 tombol elemen untuk socket **rune** (biaya Rune Essence).
- **FORGE** punya tiga sub-tab: **ENHANCE** (ENHANCE WEAPON + enhance semua slot ke +5), **FUSE** (3 → 1), dan **CRAFT** (set piece Epic). Tiap sub-tab membawa konfirmasinya sendiri dan mulai dari atas saat dipilih.
- **ARENA** berisi rival harian, tier, tiket, dan tombol duel.
- **MENU** adalah index untuk **RIFT**, **EVENT**, **SKILLS**, **BOOSTS**, **ASCEND**, **CODEX**, **OPTIONS**, dan **SAVE DATA** — tiap kartu membuka halaman sendiri dengan tombol back.
- Halaman **BOOSTS** menampilkan 5 cabang boost, rank, biaya core, tombol respec, dan kennel **WISPS**: tiga kartu (Ember/Frost/Storm) dengan elemen, level/ceiling, damage & DPS, jumlah egg, tombol **SET ACTIVE/REST**, **TRAIN**, dan **SYNTHESISE**.
- Halaman **SKILLS** berisi 6 slot aktif (grid 3×2), 1 passive, picker per slot, dan library untuk upgrade.
- Halaman **ASCEND** berisi status best stage, Star Shard, 6 node dengan biaya shard, dan layar konfirmasi sebelum reset.
- Halaman **RIFT** punya dua sub-tab: **RIFT** (modifier hari ini, reward, status terkunci/cleared, tombol **ENTER RIFT**) dan **TRIAL** (tangga 10 lantai, boss + 2 aturan mingguan, stat, reward, dan tombol **CLIMB FLOOR n**).
- Halaman **EVENT** berisi kartu Emberfall, progress boss mingguan, tombol **CLAIM CACHE**, daftar piece Emberforged yang sudah ditemukan, dan ringkasan bonus 2/4 potong.
- Halaman **CODEX** berisi bestiary per kelompok (normal/elite/boss), arsenal per slot beserta warna set, rekap 4 set, dan daftar modifier rift yang pernah ditemui.
- Di atas grid gear ada ringkasan set yang sedang dipakai: jumlah potong (`3/6`) dan tier 2/4 potong yang sudah aktif. Baris bag dan detail item juga menampilkan nama set, plus status ACTIVE/LOCKED per tier.
- **EQUIP BEST** memilih gear dengan skor total tertinggi (enhance, substat, dan bonus set aktif), dua pass supaya set yang baru lengkap ikut menaikkan pilihan slot lain.
- **SALVAGE COMMONS** menghapus semua item Common sekaligus.
- **ENHANCE ALL SLOTS → +5** menaikkan semua item terpasang ke +5 sekaligus; tombol nonaktif kalau semua slot sudah +5 atau tidak ada item.
- **UNEQUIP** dan **SALVAGE** ada di bagian bawah detail item.
- Di halaman **SAVE DATA**: **EXPORT** menghasilkan kode `IF1-…` yang bisa disalin, **IMPORT** memulihkan kode/JSON save, dan **RESET** butuh dua tap sebelum menghapus run.
  - Export/import memakai save yang sudah disanitasi; import juga menyegarkan `lastSeen` supaya tidak memicu laporan offline palsu.
  - Tag set tidak disimpan terpisah: item lama tanpa tag akan diberi set berdasarkan namanya saat save dimuat.
- Di detail item: tiap substat menampilkan chip tier (C–SS), dan **REFINE TO A** berjalan sampai semua substat tidak terkunci minimal tier A atau gold habis.

Tombol **ENHANCE WEAPON** di halaman **FORGE** selalu menargetkan senjata yang sedang dipakai, lengkap dengan peluang sukses dan biayanya.

## Yang belum ada

- **Art pass:** sprite karakter, background, dan icon item masih prosedural/dummy. Icon item adalah pixel map di `src/data/itemIcons.ts`, sedangkan sprite karakter dibangun dari primitif di `src/game/dummy/assets.ts` (`SPRITE_BUILDERS`). File art final tinggal menggantikan texture dengan key yang sama (`hero`, `rival`, `slime`, `bat`, `skeleton`, `goblin`, `wraith`, `demon`, `blade`, `bg`) tanpa menyentuh scene atau layout.
- **PvP online sungguhan:** arena saat ini asinkron dan lokal — lawan adalah snapshot build, bukan pemain yang terhubung. Ladder online lintas perangkat butuh backend, akun, dan anti-cheat, yang masih di luar non-goal v1.
- **Playtest manusia:** pacing sudah dituning lewat simulasi, tapi belum dicoba pemain sungguhan.
- **Domain sendiri:** game disajikan dari domain `*.vercel.app` bawaan Vercel; belum ada custom domain.
- Bundle **JS awal 456,93 KB gzip**, budget **≤ 520 KB** yang dijaga `npm run check:bundle` (entry HUD ~118 KB + chunk Phaser+battle ~337 KB yang di-`modulepreload` dari HTML sehingga keduanya diunduh paralel). Angka gate memakai gzip level 9 sendiri supaya stabil antar mesin; laporan Vite bisa berbeda ~1–2%.
  - **Kenapa 520 KB, bukan 460 KB:** pekerjaan party menambah kode ke chunk battle, dan mempertahankan `modulepreload` lebih penting daripada angka byte — tanpa preload, chunk Phaser baru ditemukan setelah entry dieksekusi, jadi unduhannya bersambung di 1,6 Mbps. Gate dinaikkan **setelah** diukur: pada 454,95 KB, `npm run check:perf` mencatat **first paint 1608 ms** dan **canvas ready 3147 ms** terhadap batas 2000/4000 ms, jadi masih ada margin ~850 ms yang setara ±65 KB. Kenaikan berikutnya wajib disertai pengukuran baru, bukan sekadar menaikkan konstanta.
- **Perf gate terukur, bukan klaim:** `npm run check:perf` menjalankan build produksi di bawah throttle 1.6 Mbps/150 ms dengan cache dingin. Hasil di mesin pengembangan: **first contentful paint 1.46–1.49 s** dan **canvas ready 2.75–2.80 s**, dengan batas 2.0 s / 4.0 s. Lonjakan di atas batas menggagalkan script.
- Halaman **MENU** (**RIFT, EVENT, SKILLS, BOOSTS, ASCEND, CODEX, OPTIONS, SAVE DATA**), halaman **GEAR/FORGE/ARENA**, dan modal hasil duel dimuat **lazy**, jadi entry HUD tidak ikut membawa kodenya. Biayanya: halaman itu pertama kali dibuka ~75–115 ms lebih lambat di 4G lambat sambil menampilkan `Opening…`.
- Kalau seluruh chunk lazy dijumlah, totalnya melewati 520 KB karena setiap chunk membawa overhead sendiri. Yang dijaga adalah **JS awal**; fitur berikutnya harus masuk chunk lazy baru atau memangkas kode, bukan menambah ke entry.
- Perubahan yang menembus gate wajib disertai pengukuran baru di README + `PLAN.md`, bukan menaikkan angka tanpa bukti.

## Struktur

```
src/
  sim/          simulasi headless (tanpa Phaser), loot, equipment, upgrade, boost, skills, costume, pets, offline, ascension, arena + test
  data/         balance, pool musuh, rarity dan nama item
  game/
    scenes/     BattleScene Phaser
    dummy/      generator sprite pixel + background
  audio/        engine SFX + ambient WebAudio
  state/        controller, save localStorage, settings, Zustand store
  ui/           HUD React + CSS
public/         manifest, service worker, ikon PWA
scripts/        smoke test Playwright, generator ikon
```

## Tema UI

HUD dan semua panel memakai tema komik: kertas putih sebagai bidang utama, tinta navy / merah tua / kuning tua sebagai aksen, outline hitam dan hard shadow 2–4 px, tekstur halftone, serta judul kapital. Token warna, bayangan, dan tipografi ada di blok `:root` pada `src/ui/styles.css`; angka rarity, elemen, set, boost, skill, dan ascension di `src/data/` memakai warna tinta yang sama supaya tidak ada aksen neon yang lolos.

Font self-hosted di `src/assets/fonts/`: **Anton** untuk judul/angka dan **Barlow Semi Condensed** untuk teks, keduanya SIL Open Font License (file lisensi ada di folder yang sama). Font di-bundle lewat CSS supaya tetap jalan offline dan tidak bergantung pada Google Fonts.

## Reset save

Buka DevTools console:

```js
localStorage.removeItem('idle-forge-save-v1');
location.reload();
```

## Dummy art

Sprite karakter dibangun dari primitif (ellipse, polygon, line) ke grid **32×32** di `src/game/dummy/assets.ts`, diberi outline gelap otomatis, lalu dirender ke canvas saat runtime dan ditampilkan 2×/3×/4× sesuai jenis (normal/elite/boss) dengan `pixelArt: true`. Background juga digambar prosedural (langit, bulan, perbukitan, reruntuhan, kabut).

Kalau nanti aset final sudah ada, ganti `registerDummyTextures()` dengan loader atlas Phaser tanpa mengubah simulasi.
