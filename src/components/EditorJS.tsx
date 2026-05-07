'use client';

import { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';

interface EditorProps {
  data: any;
  onChange: (data: any) => void;
  readOnly?: boolean;
}

const Editor = ({ data, onChange, readOnly }: EditorProps) => {
  const ejInstance = useRef<EditorJS | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ejInstance.current && editorRef.current) {
      initEditor();
    }
    return () => {
      if (ejInstance.current) {
        try {
          ejInstance.current.destroy();
        } catch (error) {
          console.error("An error occurred during editor destruction:", error);
        }
        ejInstance.current = null;
      }
    };
  }, []);

  const initEditor = async () => {
    // Dynamic imports for tools to ensure they are only loaded on the client
    const Header = (await import('@editorjs/header')).default;
    const List = (await import('@editorjs/list')).default;

    const editor = new EditorJS({
      holder: editorRef.current!,
      data: data,
      readOnly: readOnly,
      tools: {
        header: {
          class: Header as any,
          inlineToolbar: ['link'],
          config: {
            placeholder: 'Enter a header',
            levels: [2, 3, 4],
            defaultLevel: 2
          }
        },
        list: {
          class: List as any,
          inlineToolbar: true,
        },
      },
      onChange: async () => {
        const content = await editor.save();
        onChange(content);
      },
      placeholder: 'Start writing your story....',
      autofocus: true,
    });
    ejInstance.current = editor;
  };

  return <div ref={editorRef} className="editor-container" />;
};

export default Editor;
