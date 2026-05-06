import { NextResponse } from 'next/server';
import { readDocs, writeDocs } from '@/lib/json';

export async function GET() {
  const docs = readDocs();
  // Return only metadata (id, title)
  return NextResponse.json(docs.map((doc: any) => ({ id: doc.id, title: doc.title })));
}

export async function POST(request: Request) {
  const body = await request.json();
  const docs = readDocs();
  const newDoc = {
    id: Date.now().toString(),
    title: body.title || 'Untitled',
    content: { blocks: [] }
  };
  docs.push(newDoc);
  writeDocs(docs);
  return NextResponse.json(newDoc, { status: 201 });
}
