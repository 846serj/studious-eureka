import { Block } from '../types/blockEditor';

export function convertHtmlToBlocks(html: string): Block[] {
  if (!html || html.trim() === '') {
    return [createBlock('paragraph', '')];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: Block[] = [];

  function processNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      switch (element.tagName.toLowerCase()) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const level = parseInt(element.tagName.charAt(1));
          blocks.push(createBlock('heading', element.textContent || '', { level }));
          break;
          
        case 'p':
          const pContent = element.textContent || '';
          if (pContent.trim()) {
            blocks.push(createBlock('paragraph', pContent));
          }
          break;
          
        case 'ul':
        case 'ol':
          const listItems = Array.from(element.querySelectorAll('li'));
          const listContent = listItems.map(li => li.textContent || '').join('\n');
          blocks.push(createBlock('list', listContent, { 
            ordered: element.tagName.toLowerCase() === 'ol' 
          }));
          break;
          
        case 'blockquote':
          blocks.push(createBlock('quote', element.textContent || ''));
          break;
          
        case 'img':
          const src = element.getAttribute('src') || '';
          const alt = element.getAttribute('alt') || '';
          blocks.push(createBlock('image', '', { src, alt }));
          break;
          
        case 'div':
          // Check if it's an image placeholder
          if (element.classList.contains('recipe-image-placeholder')) {
            const title = element.textContent?.replace('Image: ', '') || '';
            blocks.push(createBlock('image', '', { 
              src: '', 
              alt: title,
              isPlaceholder: true 
            }));
          } else {
            // Process child nodes for other divs
            Array.from(element.childNodes).forEach(processNode);
          }
          break;
          
        default:
          // Process child nodes for other elements
          Array.from(element.childNodes).forEach(processNode);
          break;
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push(createBlock('paragraph', text));
      }
    }
  }

  // Process all child nodes of the body
  Array.from(doc.body.childNodes).forEach(processNode);

  // If no blocks were created, create an empty paragraph
  if (blocks.length === 0) {
    blocks.push(createBlock('paragraph', ''));
  }

  return blocks;
}

export function convertBlocksToHtml(blocks: Block[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading':
        const level = block.attributes?.level || 2;
        return `<h${level}>${block.content}</h${level}>`;
        
      case 'paragraph':
        return `<p>${block.content}</p>`;
        
      case 'list':
        const tag = block.attributes?.ordered ? 'ol' : 'ul';
        const items = block.content.split('\n').filter(item => item.trim());
        const listItems = items.map(item => `<li>${item}</li>`).join('');
        return `<${tag}>${listItems}</${tag}>`;
        
      case 'quote':
        return `<blockquote>${block.content}</blockquote>`;
        
      case 'image':
        const src = block.attributes?.src || '';
        const alt = block.attributes?.alt || '';
        const isPlaceholder = block.attributes?.isPlaceholder;
        
        if (src) {
          return `<img src="${src}" alt="${alt}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; margin: 16px 0;" />`;
        } else if (isPlaceholder) {
          return `<div class="recipe-image-placeholder" style="width: 100%; max-width: 600px; height: 300px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 8px; margin: 16px 0; display: flex; align-items: center; justify-content: center; color: #666; font-style: italic;">Image: ${alt}</div>`;
        } else {
          return `<div class="recipe-image-placeholder" style="width: 100%; max-width: 600px; height: 300px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 8px; margin: 16px 0; display: flex; align-items: center; justify-content: center; color: #666; font-style: italic;">Image placeholder</div>`;
        }
        
      default:
        return `<p>${block.content}</p>`;
    }
  }).join('\n');
}

function createBlock(type: Block['type'], content: string, attributes?: Record<string, any>): Block {
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    content,
    attributes: attributes || {}
  };
}
