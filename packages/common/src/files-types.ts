export interface GeminiFilesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export interface GeminiFile {
  name: string;
  displayName?: string;
  mimeType?: string;
  sizeBytes?: string;
  createTime?: string;
  updateTime?: string;
  state?: string;
  uri?: string;
  downloadUri?: string;
}

export interface UploadFileInput {
  path: string;
  displayName?: string;
  mimeType?: string;
}

export interface ListFilesInput {
  pageSize?: number;
  pageToken?: string;
}

export interface ListFilesOutput {
  files: GeminiFile[];
  nextPageToken?: string;
}

export interface GetFileInput {
  name: string;
}

export interface DeleteFileInput {
  name: string;
}

export interface DownloadFileInput {
  name: string;
}

export interface GeminiFilesClient {
  uploadFile(input: UploadFileInput): Promise<GeminiFile>;
  listFiles(input?: ListFilesInput): Promise<ListFilesOutput>;
  getFile(input: GetFileInput): Promise<GeminiFile>;
  deleteFile(input: DeleteFileInput): Promise<void>;
  downloadFile(input: DownloadFileInput): Promise<Buffer>;
}
