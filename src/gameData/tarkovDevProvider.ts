import {
  GameDataProvider,
  ItemData,
  QuestData,
  TraderData,
  LocationData,
} from "../types/index.js";

export interface TarkovDevGameDataProviderOptions {
  endpoint?: string;
  headers?: Record<string, string>;
}

export class TarkovDevGameDataProvider implements GameDataProvider {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(options?: TarkovDevGameDataProviderOptions) {
    this.endpoint = options?.endpoint ?? "https://api.tarkov.dev/graphql";
    this.headers = { "Content-Type": "application/json", ...(options?.headers ?? {}) };
  }

  async getItemById(id: string): Promise<ItemData | null> {
    const result = await this.query<{ item: any }>(
      `query ItemById($id: String!) {
        item(id: $id) {
          id
          name
          shortName
          basePrice
          types
          sellFor { price vendor { name } }
        }
      }`,
      { id },
    );
    if (!result.item) return null;
    const traderPrices: Record<string, number> = {};
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

  async getQuestById(id: string): Promise<QuestData | null> {
    const result = await this.query<{ quest: any }>(
      `query QuestById($id: String!) {
        quest(id: $id) {
          id
          name
          giver { id name }
          experience
        }
      }`,
      { id },
    );
    if (!result.quest) return null;
    return {
      id: result.quest.id,
      name: result.quest.name,
      traderId: result.quest.giver?.id,
      experience: result.quest.experience,
    };
  }

  async getTraderById(id: string): Promise<TraderData | null> {
    const result = await this.query<{ trader: any }>(
      `query TraderById($id: String!) {
        trader(id: $id) {
          id
          name
          normalizedName
        }
      }`,
      { id },
    );
    if (!result.trader) return null;
    return {
      id: result.trader.id,
      name: result.trader.name ?? result.trader.normalizedName,
      nickname: result.trader.normalizedName,
    };
  }

  async getLocationById(id: string): Promise<LocationData | null> {
    const result = await this.query<{ map: any }>(
      `query MapById($id: String!) {
        map(id: $id) { id name normalizedName }
      }`,
      { id },
    );
    if (!result.map) return null;
    return { id: result.map.id, name: result.map.name ?? result.map.normalizedName, type: "map" };
  }

  private async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      throw new Error(`TarkovDev API error: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as { data?: T; errors?: any };
    if (!json.data) {
      throw new Error(`TarkovDev API returned no data: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  }
}
