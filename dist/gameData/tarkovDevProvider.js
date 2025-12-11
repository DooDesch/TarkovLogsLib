import { TarkovTrackerDataProvider } from "./tarkovTrackerDataProvider.js";
/**
 * Bulk-loading provider that fetches all quests, traders, maps, and items
 * once per process and serves lookups from in-memory caches. This avoids
 * rate-limiting and per-ID GraphQL calls.
 */
export class TarkovDevGameDataProvider {
    constructor(options) {
        this.endpoint = options?.endpoint ?? "https://api.tarkov.dev/graphql";
        this.headers = { "Content-Type": "application/json", ...(options?.headers ?? {}) };
        this.tracker = new TarkovTrackerDataProvider();
    }
    async getItemById(id) {
        await this.ensureLoaded();
        return this.items?.[id] ?? null;
    }
    async getQuestById(id) {
        await this.ensureLoaded();
        return this.quests?.[id] ?? null;
    }
    async getTraderById(id) {
        await this.ensureLoaded();
        return this.traders?.[id] ?? null;
    }
    async getLocationById(id) {
        await this.ensureLoaded();
        return this.locations?.[id] ?? null;
    }
    async ensureLoaded() {
        if (this.items && this.quests && this.traders && this.locations)
            return;
        if (this.loading)
            return this.loading;
        this.loading = this.loadAll();
        await this.loading;
    }
    async loadAll() {
        // Pull items from TarkovDev (rich pricing), and fall back to tracker for quests/traders/locations.
        await Promise.all([
            this.loadItemsFromTarkovDev(),
            this.loadStaticFromTracker(),
        ]);
    }
    async loadItemsFromTarkovDev() {
        const query = `
      query AllItems {
        items {
          id
          name
          shortName
          basePrice
          types
          sellFor { price vendor { name } }
        }
      }
    `;
        const data = await this.query(query);
        this.items = {};
        for (const it of data.items ?? []) {
            const traderPrices = {};
            if (Array.isArray(it.sellFor)) {
                for (const offer of it.sellFor) {
                    if (offer?.vendor?.name && typeof offer.price === "number") {
                        traderPrices[offer.vendor.name] = offer.price;
                    }
                }
            }
            this.items[it.id] = {
                id: it.id,
                name: it.name,
                shortName: it.shortName,
                basePrice: it.basePrice,
                categoryNames: Array.isArray(it.types) ? it.types : undefined,
                traderPrices: Object.keys(traderPrices).length ? traderPrices : undefined,
            };
        }
    }
    async loadStaticFromTracker() {
        // Static JSON (bulk) – stable schema, no rate limits
        // Items already loaded from TarkovDev; keep tracker items only if TarkovDev fails
        const trackerItems = await this.tracker["loadItems"]?.().catch(() => undefined);
        if (!this.items && trackerItems) {
            this.items = Object.fromEntries(Object.values(trackerItems).map((it) => [
                it.id,
                {
                    id: it.id,
                    name: it.name,
                    shortName: it.shortName,
                    basePrice: it.basePrice,
                    categoryNames: it.types,
                },
            ]));
        }
        const quests = await this.tracker["loadQuests"]();
        this.quests = Object.fromEntries(Object.values(quests).map((q) => [
            q.id,
            { id: q.id, name: q.name, traderId: q.traderId, experience: q.experience },
        ]));
        const traders = await this.tracker["loadTraders"]();
        this.traders = Object.fromEntries(Object.values(traders).map((t) => [t.id, { id: t.id, name: t.name, nickname: t.nickname }]));
        const locations = await this.tracker["loadLocations"]();
        this.locations = Object.fromEntries(Object.values(locations).map((l) => [l.id, { id: l.id, name: l.name, type: l.type }]));
    }
    async query(query) {
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ query, variables: {} }),
        });
        if (!response.ok) {
            throw new Error(`TarkovDev API error: ${response.status} ${response.statusText}`);
        }
        const json = (await response.json());
        if (!json.data) {
            throw new Error(`TarkovDev API returned no data: ${JSON.stringify(json.errors)}`);
        }
        return json.data;
    }
}
