import { NextResponse } from 'next/server';
import { readDocs, writeDocs } from '@/lib/json';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; timestamp: string }> }
) {
  const { id, timestamp } = await params;
  const ts = parseInt(timestamp);
  
  const docs = readDocs();
  const index = docs.findIndex((d: any) => d.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const doc = docs[index];
  if (!doc.versions) {
    return NextResponse.json({ error: 'No versions found' }, { status: 404 });
  }

  const filteredVersions = doc.versions.filter((v: any) => v.timestamp !== ts);
  
  if (filteredVersions.length === doc.versions.length) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  docs[index] = {
    ...doc,
    versions: filteredVersions
  };

  writeDocs(docs);
  return new NextResponse(null, { status: 204 });
}
