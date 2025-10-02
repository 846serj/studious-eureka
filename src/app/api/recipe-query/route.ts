import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Call the Render Python API server
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5000';
    
    const response = await fetch(`${pythonApiUrl}/recipe-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate recipe content');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Recipe query API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

