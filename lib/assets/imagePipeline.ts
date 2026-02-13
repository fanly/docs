export interface PreservedAsset {
  hash: string;
  src: string;
  mimeType: string;
  bytes: number;
}

export interface ImagePipelineOptions {
  uploadAsset: (asset: PreservedAsset, blob: Blob) => Promise<string>;
}

const inflightUploads = new Map<string, Promise<string>>();

async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

async function srcToBlob(src: string): Promise<Blob | null> {
  if (src.startsWith("data:")) {
    const response = await fetch(src);
    return response.blob();
  }

  if (src.startsWith("blob:") || src.startsWith("http://") || src.startsWith("https://")) {
    const response = await fetch(src);
    return response.blob();
  }

  return null;
}

export async function preserveEmbeddedImages(doc: Document, options: ImagePipelineOptions): Promise<void> {
  const images = Array.from(doc.querySelectorAll("img"));

  for (const img of images) {
    if (img.getAttribute("data-asset-hash")) {
      continue;
    }

    const src = img.getAttribute("src");
    if (!src) continue;

    const blob = await srcToBlob(src);
    if (!blob) continue;

    const hash = await hashBlob(blob);
    const metadata: PreservedAsset = {
      hash,
      src,
      mimeType: blob.type || "application/octet-stream",
      bytes: blob.size
    };

    try {
      let uploadPromise = inflightUploads.get(hash);
      if (!uploadPromise) {
        uploadPromise = options.uploadAsset(metadata, blob);
        inflightUploads.set(hash, uploadPromise);
      }
      const uploadedUrl = await uploadPromise;
      img.setAttribute("src", uploadedUrl);
      img.setAttribute("data-asset-hash", hash);
      img.removeAttribute("data-asset-error");
    } catch (error) {
      const message = error instanceof Error ? error.message : "upload failed";
      img.setAttribute("data-asset-error", message.slice(0, 160));
    } finally {
      inflightUploads.delete(hash);
    }
  }
}

function detectExtension(asset: PreservedAsset): string {
  const typeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/tiff": "tiff"
  };

  const fromMime = typeMap[asset.mimeType.toLowerCase()];
  if (fromMime) return fromMime;

  const match = asset.src.match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
  if (match) return match[1].toLowerCase();

  return "bin";
}

export async function uploadAssetToUpyun(asset: PreservedAsset, blob: Blob): Promise<string> {
  const extension = detectExtension(asset);
  const file = new File([blob], `${asset.hash}.${extension}`, { type: asset.mimeType });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("hash", asset.hash);
  formData.append("extension", extension);

  const response = await fetch("/api/assets/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let detail = "";
    try {
      const err = (await response.json()) as { error?: string; detail?: string };
      detail = [err.error, err.detail].filter(Boolean).join(" | ");
    } catch {
      detail = await response.text();
    }
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`Upload failed with status ${response.status}${suffix}`);
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function defaultUploadAsset(asset: PreservedAsset): Promise<string> {
  return `/assets/${asset.hash}`;
}
