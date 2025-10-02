'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Block, BlockEditorProps, BlockEditorRef } from '../types/blockEditor';
import { convertHtmlToBlocks, convertBlocksToHtml } from '../lib/htmlToBlocks';

const BlockEditor = forwardRef<BlockEditorRef, BlockEditorProps>(({ 
  content, 
  onContentChange, 
  onSave 
}, ref) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Convert HTML to blocks when content changes (only from external changes)
  useEffect(() => {
    if (!isInternalUpdate.current) {
      const newBlocks = convertHtmlToBlocks(content);
      setBlocks(newBlocks);
    }
    isInternalUpdate.current = false;
  }, [content]);

  // Convert blocks back to HTML and notify parent (only when blocks actually change)
  useEffect(() => {
    if (blocks.length > 0) {
      isInternalUpdate.current = true;
      const html = convertBlocksToHtml(blocks);
      onContentChange(html);
    }
  }, [blocks, onContentChange]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getContent: () => convertBlocksToHtml(blocks),
    save: () => onSave?.(),
  }));

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  // Simple input handling - the ref pattern handles cursor position
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>, blockId: string) => {
    const content = e.currentTarget.textContent || '';
    updateBlock(blockId, { content });
  }, []);


  const addBlock = (index: number, type: Block['type'] = 'paragraph') => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      attributes: type === 'heading' ? { level: 2 } : {}
    };
    
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
  };

  const deleteBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(prev => prev.filter(block => block.id !== id));
    }
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const index = prev.findIndex(block => block.id === id);
      if (index === -1) return prev;
      
      const newBlocks = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex >= 0 && targetIndex < newBlocks.length) {
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      }
      
      return newBlocks;
    });
  };

  const renderBlock = (block: Block, index: number) => {
    const isSelected = selectedBlockId === block.id;
    
    return (
      <div
        key={block.id}
        className={`block-editor-block ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedBlockId(block.id)}
      >
        <div className="block-content">
          {block.type === 'heading' ? (
            <div
              ref={(el) => {
                if (el && el.textContent !== block.content) {
                  el.textContent = block.content;
                }
              }}
              contentEditable
              suppressContentEditableWarning
              className="block-contenteditable heading-contenteditable"
              onInput={(e) => handleInput(e, block.id)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
                  e.preventDefault();
                  deleteBlock(block.id);
                }
              }}
              style={{ 
                fontSize: `${33 - (block.attributes?.level || 2) * 3.3}px`, 
                fontWeight: 'bold',
                minHeight: '1.2em',
                lineHeight: '1.2'
              }}
            />
          ) : block.type === 'list' ? (
            <div
              ref={(el) => {
                if (el && el.textContent !== block.content) {
                  el.textContent = block.content;
                }
              }}
              contentEditable
              suppressContentEditableWarning
              className="block-contenteditable list-contenteditable"
              onInput={(e) => handleInput(e, block.id)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
                  e.preventDefault();
                  deleteBlock(block.id);
                }
              }}
              style={{ 
                fontFamily: 'monospace',
                minHeight: '1.2em',
                lineHeight: '1.4'
              }}
            />
          ) : block.type === 'quote' ? (
            <div
              ref={(el) => {
                if (el && el.textContent !== block.content) {
                  el.textContent = block.content;
                }
              }}
              contentEditable
              suppressContentEditableWarning
              className="block-contenteditable quote-contenteditable"
              onInput={(e) => handleInput(e, block.id)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
                  e.preventDefault();
                  deleteBlock(block.id);
                }
              }}
              style={{ 
                fontStyle: 'italic',
                borderLeft: '3px solid #ccc',
                paddingLeft: '12px',
                minHeight: '1.2em',
                lineHeight: '1.4'
              }}
            />
          ) : block.type === 'image' ? (
            <div className="block-image-container">
              {block.attributes?.src ? (
                <img 
                  src={block.attributes.src} 
                  alt={block.attributes.alt || ''}
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    height: 'auto',
                    borderRadius: '8px',
                    margin: '16px 0'
                  }}
                />
              ) : (
                <div 
                  className="recipe-image-placeholder"
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    height: '300px',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    borderRadius: '8px',
                    margin: '16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontStyle: 'italic'
                  }}
                >
                  Image: {block.attributes?.alt || 'Recipe'}
                </div>
              )}
            </div>
          ) : (
            <div
              ref={(el) => {
                if (el && el.textContent !== block.content) {
                  el.textContent = block.content;
                }
              }}
              contentEditable
              suppressContentEditableWarning
              className="block-contenteditable paragraph-contenteditable"
              onInput={(e) => handleInput(e, block.id)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
                  e.preventDefault();
                  deleteBlock(block.id);
                }
              }}
              style={{ 
                minHeight: '1.2em',
                lineHeight: '1.4'
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="block-editor" ref={editorRef}>
      {/* {onSave && (
        <div className="block-editor-toolbar">
          <button
            onClick={onSave}
            className="save-btn"
          >
            Save
          </button>
        </div>
      )} */}
      
      <div className="block-list">
        {blocks.map((block, index) => (
          <div 
            key={block.id}
            style={{ marginBottom: index < blocks.length - 1 ? '15px' : '0' }}
          >
            {/* Insertion point before each block */}
            {/* {renderInsertionPoint(index)} */}
            {renderBlock(block, index)}
          </div>
        ))}
        {/* Insertion point after the last block */}
        {/* {renderInsertionPoint(blocks.length - 1)} */}
      </div>
    </div>
  );
});

BlockEditor.displayName = 'BlockEditor';

export default BlockEditor;
export type { BlockEditorRef };
