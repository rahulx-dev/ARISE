import { expoDb } from '../client.native';

export interface InventoryItem {
  id: number;
  itemId: string;
  itemType: string;
  unlockedAt: string;
  isEquipped: boolean;
}

class InventoryRepository {
  async getUnlockedItems(): Promise<InventoryItem[]> {
    try {
      const rows = await expoDb.getAllAsync<any>(
        'SELECT * FROM user_inventory'
      );
      return rows.map((r) => ({
        id: r.id,
        itemId: r.item_id,
        itemType: r.item_type,
        unlockedAt: r.unlocked_at,
        isEquipped: Boolean(r.is_equipped),
      }));
    } catch (e) {
      console.warn('Error fetching inventory:', e);
      return [];
    }
  }

  async isItemUnlocked(itemId: string): Promise<boolean> {
    try {
      const row = await expoDb.getFirstAsync<any>(
        'SELECT id FROM user_inventory WHERE item_id = ?',
        [itemId]
      );
      return Boolean(row);
    } catch {
      return false;
    }
  }

  async unlockItem(itemId: string, itemType: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await expoDb.runAsync(
        'INSERT OR IGNORE INTO user_inventory (item_id, item_type, unlocked_at, is_equipped) VALUES (?, ?, ?, 1)',
        [itemId, itemType.toUpperCase(), now]
      );
    } catch (e) {
      console.warn('Error unlocking item:', e);
    }
  }

  async equipItem(itemId: string, itemType: string): Promise<void> {
    try {
      // Unequip any existing equipped items of this type
      await expoDb.runAsync(
        'UPDATE user_inventory SET is_equipped = 0 WHERE item_type = ?',
        [itemType.toUpperCase()]
      );
      // Equip target item
      await expoDb.runAsync(
        'UPDATE user_inventory SET is_equipped = 1 WHERE item_id = ?',
        [itemId]
      );
    } catch (e) {
      console.warn('Error equipping item:', e);
    }
  }

  async getEquippedItem(itemType: string): Promise<string | null> {
    try {
      const row = await expoDb.getFirstAsync<any>(
        'SELECT item_id FROM user_inventory WHERE item_type = ? AND is_equipped = 1',
        [itemType.toUpperCase()]
      );
      return row ? row.item_id : null;
    } catch {
      return null;
    }
  }
}

export const inventoryRepository = new InventoryRepository();
