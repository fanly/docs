import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function normalizeDomain(value: string): string {
  return value.replace(/\/$/, "");
}

function authHeader(operator: string, password: string): string {
  const token = Buffer.from(`${operator}:${password}`).toString("base64");
  return `Basic ${token}`;
}

export async function POST(request: Request) {
  try {
    const bucket = requiredEnv("UPYUN_BUCKET");
    const operator = requiredEnv("UPYUN_OPERATOR");
    const password = requiredEnv("UPYUN_PASSWORD");
    const apiDomain = normalizeDomain(requiredEnv("UPYUN_DOMAIN"));
    const cdnDomain = normalizeDomain(requiredEnv("UPYUN_CDN_DOMAIN"));

    const formData = await request.formData();
    const file = formData.get("file");
    const hash = String(formData.get("hash") ?? "").trim();
    const extension = String(formData.get("extension") ?? "bin").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!hash) {
      return NextResponse.json({ error: "hash is required" }, { status: 400 });
    }

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const objectPath = `/word-assets/${yyyy}/${mm}/${hash}.${extension}`;
    const uploadUrl = `${apiDomain}/${bucket}${objectPath}`;

    const uploadBody = await file.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: authHeader(operator, password),
        "Content-Type": file.type || "application/octet-stream",
        mkdir: "true"
      },
      body: uploadBody
    });

    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      return NextResponse.json(
        { error: "upyun upload failed", detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    const url = `${cdnDomain}${objectPath}`;
    return NextResponse.json({ url, path: objectPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected upload error";
    console.error("[upyun-upload-error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
