import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://178.156.222.29:8765";

type Params = { path: string[] };

async function proxyRequest(req: NextRequest, params: Params, method: string, body?: string) {
  const path = params.path.join("/");
  const search = req.nextUrl.search || "";
  const url = `${API_URL}/api/${path}${search}`;

  try {
    const res = await fetch(url, {
      method,
      body,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to reach backend", detail: String(e), url },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  return proxyRequest(req, params, "GET");
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const body = await req.text();
  return proxyRequest(req, params, "POST", body);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const body = await req.text();
  return proxyRequest(req, params, "PATCH", body);
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  return proxyRequest(req, params, "DELETE");
}
