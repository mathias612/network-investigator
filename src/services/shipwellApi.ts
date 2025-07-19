import { ShipwellApiDoc } from "../types";

export class ShipwellApiService {
  private static shipwellDocs: ShipwellApiDoc[] = [
    {
      endpoint: "/api/v2/shipments",
      method: "GET",
      documentationUrl: "https://docs.shipwell.com/api/shipments#list",
      description: "List shipments",
    },
    {
      endpoint: "/api/v2/shipments",
      method: "POST",
      documentationUrl: "https://docs.shipwell.com/api/shipments#create",
      description: "Create a new shipment",
    },
    {
      endpoint: "/api/v2/shipments/{id}",
      method: "GET",
      documentationUrl: "https://docs.shipwell.com/api/shipments#get",
      description: "Get shipment by ID",
    },
    {
      endpoint: "/api/v2/shipments/{id}",
      method: "PUT",
      documentationUrl: "https://docs.shipwell.com/api/shipments#update",
      description: "Update shipment",
    },
    {
      endpoint: "/api/v2/quotes",
      method: "GET",
      documentationUrl: "https://docs.shipwell.com/api/quotes#list",
      description: "List quotes",
    },
    {
      endpoint: "/api/v2/quotes",
      method: "POST",
      documentationUrl: "https://docs.shipwell.com/api/quotes#create",
      description: "Create a new quote",
    },
  ];

  static isShipwellCall(url: string): boolean {
    return url.includes("shipwell.com") || url.includes("shipwell");
  }

  static getDocumentationForCall(
    url: string,
    method: string,
  ): ShipwellApiDoc | null {
    if (!this.isShipwellCall(url)) {
      return null;
    }

    const normalizedMethod = method.toUpperCase();

    return (
      this.shipwellDocs.find((doc) => {
        const pattern = doc.endpoint.replace(/{[^}]+}/g, "[^/]+");
        const regex = new RegExp(pattern + "$");
        const pathMatch = regex.test(new URL(url).pathname);
        return pathMatch && doc.method === normalizedMethod;
      }) || null
    );
  }

  static getAllDocumentation(): ShipwellApiDoc[] {
    return [...this.shipwellDocs];
  }

  static searchDocumentation(query: string): ShipwellApiDoc[] {
    const lowercaseQuery = query.toLowerCase();
    return this.shipwellDocs.filter(
      (doc) =>
        doc.endpoint.toLowerCase().includes(lowercaseQuery) ||
        doc.description.toLowerCase().includes(lowercaseQuery) ||
        doc.method.toLowerCase().includes(lowercaseQuery),
    );
  }
}
