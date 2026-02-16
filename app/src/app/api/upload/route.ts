import { NextRequest, NextResponse } from "next/server";

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

async function pinFile(file: File, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("pinataMetadata", JSON.stringify({ name }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY!,
      pinata_secret_api_key: PINATA_SECRET_KEY!,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`File upload failed: ${err}`);
  }

  const data = await res.json();
  return `${PINATA_GATEWAY}/${data.IpfsHash}`;
}

/**
 * POST /api/upload
 *
 * Accepts multipart form data with:
 * - file: image file (token avatar)
 * - banner: banner image file (optional)
 * - name: token name
 * - symbol: token symbol
 * - description: token description
 * - color: brand color hex
 * - twitter: twitter handle
 * - telegram: telegram link
 * - website: website URL
 *
 * Returns: { uri: string, imageUri: string }
 */
export async function POST(req: NextRequest) {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    return NextResponse.json(
      { error: "Pinata API keys not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env.local" },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const banner = formData.get("banner") as File | null;
    const name = formData.get("name") as string;
    const symbol = formData.get("symbol") as string;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;
    const twitter = formData.get("twitter") as string;
    const telegram = formData.get("telegram") as string;
    const website = formData.get("website") as string;

    if (!name || !symbol) {
      return NextResponse.json({ error: "name and symbol are required" }, { status: 400 });
    }

    let imageUri = "";
    let bannerUri = "";

    // Upload image to Pinata (if provided)
    if (file && file.size > 0) {
      imageUri = await pinFile(file, `${symbol}-image`);
    }

    // Upload banner to Pinata (if provided)
    if (banner && banner.size > 0) {
      bannerUri = await pinFile(banner, `${symbol}-banner`);
    }

    // Build JSON metadata (Metaplex-compatible + custom extensions)
    const metadata: Record<string, unknown> = {
      name,
      symbol,
      description: description || "",
      image: imageUri,
      properties: {
        category: "token",
      },
      // Custom extensions for launchpad UI
      extensions: {
        color: color || "",
        banner: bannerUri,
        twitter: twitter || "",
        telegram: telegram || "",
        website: website || "",
      },
    };

    const jsonRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `${symbol}-metadata` },
      }),
    });

    if (!jsonRes.ok) {
      const err = await jsonRes.text();
      return NextResponse.json({ error: `Metadata upload failed: ${err}` }, { status: 500 });
    }

    const jsonData = await jsonRes.json();
    const metadataUri = `${PINATA_GATEWAY}/${jsonData.IpfsHash}`;

    return NextResponse.json({
      uri: metadataUri,
      imageUri,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
