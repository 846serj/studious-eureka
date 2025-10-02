#!/usr/bin/env python3
"""
Python API server for recipe generation
Deploy this on Render to handle recipe queries
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import json

# Add the recipe-writer directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'recipe writing', 'recipe-writer'))

from tools import airtable_sync, embeddings, vector_store, retrieval, generator

app = Flask(__name__)
CORS(app)

# Global variables for caching
recipes_cache = None
index_cache = None
id_to_recipe_cache = None

def load_recipe_data():
    """Load recipe data and embeddings"""
    global recipes_cache, index_cache, id_to_recipe_cache
    
    if recipes_cache is None:
        print("Loading recipes with embeddings...")
        recipes_cache = embeddings.load_embeddings()
        
        print("Loading FAISS index...")
        index_cache = vector_store.load_faiss_index()
        id_to_recipe_cache = vector_store.get_id_to_recipe(recipes_cache)
        
        print(f"Loaded {len(recipes_cache)} recipes")
    
    return recipes_cache, index_cache, id_to_recipe_cache

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
        
        # Load recipe data
        recipes, index, id_to_recipe = load_recipe_data()
        
        # Extract number from query (default to 5 if no number found)
        import re
        numbers = re.findall(r'\d+', query)
        k = int(numbers[0]) if numbers else 5
        
        # Retrieve recipes
        print(f"Searching for {k} recipes...")
        top_recipes = retrieval.search_recipes(query, index, id_to_recipe, k=k)
        
        print(f"Found {len(top_recipes)} matching recipes")
        
        # Generate professional article
        print("Generating professional article...")
        article_content = generator.generate_professional_article(query, top_recipes)
        
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
