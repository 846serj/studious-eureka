#!/usr/bin/env python3
"""
Simple Python API server for recipe generation
Deploy this on Render to handle recipe queries
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import openai

app = Flask(__name__)
CORS(app)

# Initialize OpenAI
client = openai.OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Recipe API server is running'})

@app.route('/recipe-query', methods=['POST'])
def recipe_query():
    """Handle recipe queries"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        print(f"Processing query: {query}")
        
        # Generate article using OpenAI
        prompt = f"""
Write a professional article about "{query}". 

Create a compelling article with:
- An engaging introduction
- 3-5 recipe sections with descriptions  
- Cooking tips
- A conclusion

Format the response as HTML with proper headings and paragraphs.
"""
        
        response = client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.7,
            max_tokens=2000
        )
        
        article_content = response.choices[0].message.content or ''
        
        return jsonify({
            'success': True,
            'html': article_content,
            'summary': 'Professional article generated'
        })
        
    except Exception as e:
        print(f"Error processing recipe query: {str(e)}")
        return jsonify({'error': 'Failed to generate recipe content', 'details': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
