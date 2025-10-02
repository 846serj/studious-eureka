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

    // For now, generate a simple article without the Python script
    // This is a temporary solution until we can properly deploy the Python system
    const articleContent = await generateSimpleArticle(query);

    return NextResponse.json({
      success: true,
      html: articleContent,
      summary: 'Professional article generated'
    });

  } catch (error) {
    console.error('Recipe query API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateSimpleArticle(query: string): Promise<string> {
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
    console.error('OpenAI API error:', error);
    return `<h1>${query}</h1><p>Article generation temporarily unavailable. Please try again later.</p>`;
  }
}