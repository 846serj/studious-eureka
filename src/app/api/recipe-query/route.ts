import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Path to the simple recipe query script
    const recipeQueryPath = path.join(process.cwd(), 'recipe writing/recipe-writer/query');
    
    return new Promise<Response>((resolve) => {
      const child = spawn('python3', [recipeQueryPath, query], {
        cwd: path.join(process.cwd(), 'recipe writing/recipe-writer'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error('Recipe query failed:', stderr);
          resolve(NextResponse.json(
            { error: 'Failed to generate recipe content', details: stderr },
            { status: 500 }
          ));
          return;
        }

        // Parse the output to extract article content
        const articleMatch = stdout.match(/=== Professional Article ===\n([\s\S]*?)$/);
        
        const articleContent = articleMatch ? articleMatch[1].trim() : '';

        resolve(NextResponse.json({
          success: true,
          html: articleContent,
          summary: 'Professional article generated'
        }));
      });

      child.on('error', (error) => {
        console.error('Failed to start recipe query process:', error);
        resolve(NextResponse.json(
          { error: 'Failed to start recipe query process', details: error.message },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error('Recipe query API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
