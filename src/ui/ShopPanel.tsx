import { useGameStore } from '../state/store';
import { fmt } from './format';

/**
 * The item shop. Deliberately tiny: extra dungeon tickets and a capped crystal
 * allowance, both paid in gold. The dungeon stays the only source of mounts.
 */
export default function ShopPanel() {
  const shop = useGameStore((state) => state.shop);
  const gold = useGameStore((state) => state.gold);
  const crystals = useGameStore((state) => state.mounts.crystals);
  const buyDungeonTicket = useGameStore((state) => state.buyDungeonTicket);
  const buyMountCrystal = useGameStore((state) => state.buyMountCrystal);

  const ticketLeft = shop.ticketCap - shop.ticketsBought;
  const crystalLeft = shop.crystalCap - shop.crystalBought;

  return (
    <div className="shop-panel">
      <div className="section-head">
        <span>ITEM SHOP</span>
        <span>◆ {fmt(gold)} · ◈ {fmt(crystals)}</span>
      </div>

      <p className="detail-note">
        Gold buys convenience, never a mount: extra dungeon tickets and a small daily
        crystal allowance. Stock resets at local midnight.
      </p>

      {!shop.unlocked ? (
        <p className="rift-locked">The shop opens alongside the dungeon at stage 30.</p>
      ) : (
        <div className="shop-list">
          <article className="shop-card">
            <div className="shop-head">
              <span className="shop-name">DUNGEON TICKET</span>
              <span className="shop-stock">{ticketLeft} LEFT TODAY</span>
            </div>
            <p className="shop-desc">One more run at any dungeon tier. The price climbs with each purchase.</p>
            <div className="shop-actions">
              <span className="shop-price">◆ {fmt(shop.ticketPrice)}</span>
              <button
                type="button"
                className="rival-fight"
                disabled={ticketLeft <= 0 || gold < shop.ticketPrice}
                onClick={buyDungeonTicket}
              >
                {ticketLeft <= 0 ? 'SOLD OUT' : gold < shop.ticketPrice ? 'NEED GOLD' : 'BUY'}
              </button>
            </div>
          </article>

          <article className="shop-card">
            <div className="shop-head">
              <span className="shop-name">MOUNT CRYSTAL</span>
              <span className="shop-stock">{crystalLeft} LEFT TODAY</span>
            </div>
            <p className="shop-desc">One crystal toward a craft or a level. Capped so the dungeon still matters.</p>
            <div className="shop-actions">
              <span className="shop-price">◆ {fmt(shop.crystalPrice)}</span>
              <button
                type="button"
                className="rival-fight"
                disabled={crystalLeft <= 0 || gold < shop.crystalPrice}
                onClick={buyMountCrystal}
              >
                {crystalLeft <= 0 ? 'SOLD OUT' : gold < shop.crystalPrice ? 'NEED GOLD' : 'BUY'}
              </button>
            </div>
          </article>
        </div>
      )}

      <p className="shop-note">
        Tickets held: {shop.ticketsBought}/{shop.ticketCap} bought today. Crystals bought:
        {shop.crystalBought}/{shop.crystalCap}.
      </p>
    </div>
  );
}
