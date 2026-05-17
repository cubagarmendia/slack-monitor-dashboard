import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://178.156.222.29:8765";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_URL}/api/${path}${req.nextUrl.search}`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_URL}/api/${path}`;
  const body = await req.text();
  const res = await fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_URL}/api/${path}`;
  const body = await req.text();
  const res = await fetch(url, { method: "PATCH", body, headers: { "Content-Type": "application/json" } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_URL}/api/${path}`;
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
