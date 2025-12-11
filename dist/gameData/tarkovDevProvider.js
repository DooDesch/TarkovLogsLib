export class TarkovDevGameDataProvider {
    constructor(options) {
        this.endpoint = options?.endpoint ?? "https://api.tarkov.dev/graphql";
        this.headers = { "Content-Type": "application/json", ...(options?.headers ?? {}) };
    }
    async getItemById(id) {
        const result = await this.query(`query ItemById($id: String!) {
        item(id: $id) {
          id
          name
          shortName
          basePrice
          types
          sellFor { price vendor { name } }
        }
      }`, { id });
        if (!result.item)
            return null;
        const traderPrices = {};
        if (Array.isArray(result.item.sellFor)) {
            for (const offer of result.item.sellFor) {
                if (offer?.vendor?.name && typeof offer.price === "number") {
                    traderPrices[offer.vendor.name] = offer.price;
                }
            }
        }
        return {
            id: result.item.id,
            name: result.item.name,
            shortName: result.item.shortName,
            basePrice: result.item.basePrice,
            categoryNames: Array.isArray(result.item.types) ? result.item.types : undefined,
            traderPrices,
        };
    }
    async getQuestById(id) {
        const result = await this.query(`query QuestById($id: String!) {
        quest(id: $id) {
          id
          name
          giver { id name }
          experience
        }
      }`, { id });
        if (!result.quest)
            return null;
        return {
            id: result.quest.id,
            name: result.quest.name,
            traderId: result.quest.giver?.id,
            experience: result.quest.experience,
        };
    }
    async getTraderById(id) {
        const result = await this.query(`query TraderById($id: String!) {
        trader(id: $id) {
          id
          name
          normalizedName
        }
      }`, { id });
        if (!result.trader)
            return null;
        return {
            id: result.trader.id,
            name: result.trader.name ?? result.trader.normalizedName,
            nickname: result.trader.normalizedName,
        };
    }
    async getLocationById(id) {
        const result = await this.query(`query MapById($id: String!) {
        map(id: $id) { id name normalizedName }
      }`, { id });
        if (!result.map)
            return null;
        return { id: result.map.id, name: result.map.name ?? result.map.normalizedName, type: "map" };
    }
    async query(query, variables) {
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ query, variables }),
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
