import { apiClient } from "./client";
import type { EDAResponse } from "./types";

/** GET /eda */
export async function getEDA(): Promise<EDAResponse> {
  const response = await apiClient.get<EDAResponse>("/eda");
  return response.data;
}
