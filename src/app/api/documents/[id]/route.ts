import { NextResponse } from 'next/server';
import { readDocs, writeDocs } from '@/lib/json';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docs = readDocs();
  const doc = docs.find((d: any) => d.id === id);
  if (doc) {
    return NextResponse.json(doc);
  } else {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const docs = readDocs();
  const index = docs.findIndex((d: any) => d.id === id);
  if (index !== -1) {
    const oldDoc = docs[index];
    
    // Initialize versions if they don't exist
    const versions = oldDoc.versions || [];
    
    // Only save to versions if explicitly requested

	var mybody = body
    if (body.saveVersion && oldDoc.content) {
      versions.push({
        timestamp: oldDoc.updatedAt || Date.now(),
        content: oldDoc.content
      });
      mybody = {...body, content: oldDoc.content}
    }

    // Prepare updated document
    const { saveVersion, ...updateData } = mybody;
    const useData = { ...updateData, content: oldDoc.content};
    docs[index] = { 
      ...oldDoc, 
      ...updateData,
      versions,
      updatedAt: Date.now() 
    };
    writeDocs(docs);
    return NextResponse.json(docs[index]);
  } else {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docs = readDocs();
  const filteredDocs = docs.filter((d: any) => d.id !== id);
  writeDocs(filteredDocs);
  return new NextResponse(null, { status: 204 });
}
