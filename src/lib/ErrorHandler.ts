import { NextResponse } from 'next/server';

export function handleApiError(error: any, customMessage: string = "Server Error") {
  console.error("API error:", error); // notify on server-side
  
  return NextResponse.json(
    { 
      status: "error", 
      message: customMessage // return to front-end
    }, 
    { status: 500 }
  );
}