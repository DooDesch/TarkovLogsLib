export class TarkovTrackerDataProvider {
    constructor(options) {
        this.cache = {};
        this.baseUrl =
            options?.baseUrl ??
                "https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master";
    }
    async getItemById(id) {
        const items = await this.loadItems();
        const match = items[id];
        if (!match)
            return null;
        return {
            id: match.id,
            name: match.name,
            shortName: match.shortName,
            basePrice: match.basePrice,
            categoryNames: match.types,
        };
    }
    async getQuestById(id) {
        const quests = await this.loadQuests();
        const match = quests[id];
        if (!match)
            return null;
        return { id: match.id, name: match.name, traderId: match.traderId, experience: match.experience };
    }
    async getTraderById(id) {
        const traders = await this.loadTraders();
        const match = traders[id];
        if (!match)
            return null;
        return { id: match.id, name: match.name, nickname: match.nickname };
    }
    async getLocationById(id) {
        const locations = await this.loadLocations();
        const match = locations[id];
        if (!match)
            return null;
        return { id: match.id, name: match.name, type: match.type };
    }
    async loadItems() {
        if (this.cache.items)
            return this.cache.items;
        const data = await this.fetchJson("items.json");
        this.cache.items = Object.fromEntries(data.map((i) => [i.id, i]));
        return this.cache.items;
    }
    async loadQuests() {
        if (this.cache.quests)
            return this.cache.quests;
        const data = await this.fetchJson("quests.json");
        this.cache.quests = Object.fromEntries(data.map((q) => [q.id, q]));
        return this.cache.quests;
    }
    async loadTraders() {
        if (this.cache.traders)
            return this.cache.traders;
        const data = await this.fetchJson("traders.json");
        this.cache.traders = Object.fromEntries(data.map((t) => [t.id, t]));
        return this.cache.traders;
    }
    async loadLocations() {
        if (this.cache.locations)
            return this.cache.locations;
        const data = await this.fetchJson("maps.json");
        this.cache.locations = Object.fromEntries(data.map((l) => [l.id, l]));
        return this.cache.locations;
    }
    async fetchJson(file) {
        const response = await fetch(`${this.baseUrl}/${file}`);
        if (!response.ok) {
            throw new Error(`TarkovTracker data fetch failed: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }
}
