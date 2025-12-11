import {
  GameDataProvider,
  ItemData,
  QuestData,
  TraderData,
  LocationData,
} from "../types/index.js";

type ItemRecord = { id: string; name: string; shortName?: string; basePrice?: number; types?: string[] };
type QuestRecord = { id: string; name: string; traderId?: string; experience?: number };
type TraderRecord = { id: string; name: string; nickname?: string };
type LocationRecord = { id: string; name: string; type?: string };

export interface TarkovTrackerDataProviderOptions {
  baseUrl?: string;
}

export class TarkovTrackerDataProvider implements GameDataProvider {
  private readonly baseUrl: string;
  private cache: {
    items?: Record<string, ItemRecord>;
    quests?: Record<string, QuestRecord>;
    traders?: Record<string, TraderRecord>;
    locations?: Record<string, LocationRecord>;
  } = {};

  constructor(options?: TarkovTrackerDataProviderOptions) {
    this.baseUrl =
      options?.baseUrl ??
      "https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master";
  }

  async getItemById(id: string): Promise<ItemData | null> {
    const items = await this.loadItems();
    const match = items[id];
    if (!match) return null;
    return {
      id: match.id,
      name: match.name,
      shortName: match.shortName,
      basePrice: match.basePrice,
      categoryNames: match.types,
    };
  }

  async getQuestById(id: string): Promise<QuestData | null> {
    const quests = await this.loadQuests();
    const match = quests[id];
    if (!match) return null;
    return { id: match.id, name: match.name, traderId: match.traderId, experience: match.experience };
  }

  async getTraderById(id: string): Promise<TraderData | null> {
    const traders = await this.loadTraders();
    const match = traders[id];
    if (!match) return null;
    return { id: match.id, name: match.name, nickname: match.nickname };
  }

  async getLocationById(id: string): Promise<LocationData | null> {
    const locations = await this.loadLocations();
    const match = locations[id];
    if (!match) return null;
    return { id: match.id, name: match.name, type: match.type };
  }

  private async loadItems(): Promise<Record<string, ItemRecord>> {
    if (this.cache.items) return this.cache.items;
    const data = await this.fetchJson<ItemRecord[]>("items.json");
    this.cache.items = Object.fromEntries(data.map((i) => [i.id, i]));
    return this.cache.items;
  }

  private async loadQuests(): Promise<Record<string, QuestRecord>> {
    if (this.cache.quests) return this.cache.quests;
    const data = await this.fetchJson<QuestRecord[]>("quests.json");
    this.cache.quests = Object.fromEntries(data.map((q) => [q.id, q]));
    return this.cache.quests;
  }

  private async loadTraders(): Promise<Record<string, TraderRecord>> {
    if (this.cache.traders) return this.cache.traders;
    const data = await this.fetchJson<TraderRecord[]>("traders.json");
    this.cache.traders = Object.fromEntries(data.map((t) => [t.id, t]));
    return this.cache.traders;
  }

  private async loadLocations(): Promise<Record<string, LocationRecord>> {
    if (this.cache.locations) return this.cache.locations;
    const data = await this.fetchJson<LocationRecord[]>("maps.json");
    this.cache.locations = Object.fromEntries(data.map((l) => [l.id, l]));
    return this.cache.locations;
  }

  private async fetchJson<T>(file: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${file}`);
    if (!response.ok) {
      throw new Error(`TarkovTracker data fetch failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  }
}
