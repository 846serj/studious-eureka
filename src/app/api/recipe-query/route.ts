import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    
    try {
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
    } catch (fetchError) {
      // Fallback: Generate simple article if Python server is not available
      console.log('Python server not available, using fallback');
      const fallbackContent = await generateFallbackArticle(query);
      return NextResponse.json({
        success: true,
        html: fallbackContent,
        summary: 'Article generated (fallback mode)'
      });
    }

  } catch (error) {
    console.error('Recipe query API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateFallbackArticle(query: string): Promise<string> {
  try {
    const prompt = `Write a professional article about "${query}". 

Create a compelling article with:
- An engaging introduction
- 3-5 recipe sections with descriptions  
- Cooking tips
- A conclusion

Format the response as HTML with proper headings and paragraphs.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', 'content': prompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Fallback article generation error:', error);
    return `<h1>${query}</h1><p>Article generation temporarily unavailable. Please try again later.</p>`;
  }
}
