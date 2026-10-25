/**
 * Navigation helper for the smoke scripts.
 *
 * The HUD no longer opens a tabbed bag sheet: a five-tab dock switches pages
 * and MENU hosts the secondary systems as separate cards.
 */
export const DOCK = {
  BATTLE: '.dock-battle',
  GEAR: '.dock-gear',
  FORGE: '.dock-forge',
  ARENA: '.dock-arena',
  MENU: '.dock-menu',
};

const MENU_PAGES = {
  RIFT: '.menu-rift',
  EVENT: '.menu-event',
  MOUNTS: '.menu-mounts',
  WINGS: '.menu-wings',
  DUNGEON: '.menu-dungeon',
  SHOP: '.menu-shop',
  SKILLS: '.menu-skills',
  BOOST: '.menu-boosts',
  BOOSTS: '.menu-boosts',
  ASCEND: '.menu-ascend',
  CODEX: '.menu-codex',
  OPTIONS: '.menu-options',
  SAVE: '.menu-save',
  'SAVE DATA': '.menu-save',
};

/** Opens a dock section, or a MENU page when the name is not on the dock. */
export async function openSection(page, name) {
  const key = name.toUpperCase();
  if (DOCK[key]) {
    await page.locator(DOCK[key]).click();
  } else {
    const target = MENU_PAGES[key];
    if (!target) throw new Error(`unknown section: ${name}`);
    await page.locator(DOCK.MENU).click();
    await page.locator(target).click();
  }
  await page.waitForTimeout(350);
}

/** Leaves MENU sub-pages and returns to the tab root. */
export async function openMenuRoot(page) {
  await page.locator(DOCK.MENU).click();
  await page.waitForTimeout(300);
}
