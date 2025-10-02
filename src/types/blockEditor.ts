export interface Block {
  id: string;
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'image';
  content: string;
  attributes?: Record<string, any>;
}

export interface BlockEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave?: () => void;
}

export interface BlockEditorRef {
  getContent: () => string;
  save: () => void;
}
