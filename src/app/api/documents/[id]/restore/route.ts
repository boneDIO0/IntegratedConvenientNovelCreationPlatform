import { NextResponse } from 'next/server';
import { readDocs, writeDocs } from '@/lib/json';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { timestamp } = await request.json();
  const docs = readDocs();
  const index = docs.findIndex((d: any) => d.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const doc = docs[index];
  const version = doc.versions?.find((v: any) => v.timestamp === timestamp);

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }
/*
  // Before restoring, save the current state as a version
  const newVersions = doc.versions.filter((v: any) => v.timestamp !== timestamp);
  newVersions.push({
    timestamp: doc.updatedAt || Date.now(),
    content: doc.content
  });

  docs[index] = {
    ...doc,
    content: version.content,
    updatedAt: Date.now(),
    versions: newVersions
  };

  writeDocs(docs);
*/
  docs[index] = {
    ...doc,
    content: version.content,
    updatedAt: Date.now(),
    versions: doc.versions
  };

  return NextResponse.json(docs[index]);
}
