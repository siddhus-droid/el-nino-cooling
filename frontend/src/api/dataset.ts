import { apiClient } from "./client";
import type { PreprocessResponse, UploadResponse } from "./types";

/** POST /upload — multipart/form-data with field name "file". */
export async function uploadDataset(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<UploadResponse>("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onUploadProgress && evt.total) {
        onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return response.data;
}

/** POST /preprocess — no request body. */
export async function runPreprocessing(): Promise<PreprocessResponse> {
  const response = await apiClient.post<PreprocessResponse>("/preprocess");
  return response.data;
}
