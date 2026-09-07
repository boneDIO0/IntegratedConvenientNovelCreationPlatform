'use client'

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react'

interface MemberItem {
  id: string;
  display: string;
}

interface CommentEditorProps {
  value: string;
  onChange: (html: string) => void;
  members: MemberItem[];
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

// --- @標記的彈出選單 UI ---
const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.display });
    }
  }

  const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length)
  const enterHandler = () => selectItem(selectedIndex)

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    }
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1 min-w-[120px]">
      {props.items.length ? (
        props.items.map((item: MemberItem, index: number) => (
          <button
            key={item.id}
            className={`w-full text-left px-3 py-1.5 text-sm ${index === selectedIndex ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
            onMouseDown={(e) => {
              e.preventDefault(); 
              e.stopPropagation();
              selectItem(index);
            }}
          >
            {item.display}
          </button>
        ))
      ) : (
        <div className="px-3 py-1.5 text-sm text-slate-400">無此成員</div>
      )}
    </div>
  )
})
MentionList.displayName = 'MentionList'

// --- 編輯器主體 ---
export default function CommentEditor({ value, onChange, members, placeholder, disabled, minHeight = "60px" }: CommentEditorProps) {

  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-indigo-600 font-bold bg-indigo-50 px-1 rounded border border-indigo-100',
        },
        renderHTML({ options, node }) {
          return [
            'span',
            options.HTMLAttributes,
            `@${node.attrs.label ?? node.attrs.id}`,
            ['span', { class: 'opacity-0 select-none pointer-events-none' }, '\u200B'] 
          ]
        },
        suggestion: {
          items: ({ query }) => {
            const currentMembers = membersRef.current;
            
            if (!query) {
              return currentMembers.slice(0, 5);
            }
            return currentMembers
              .filter((item) => 
                item.display && item.display.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5);
          },
          render: () => {
            let component: any
            let popup: any

            return {
              onStart: props => {
                component = new ReactRenderer(MentionList, { props, editor: props.editor })

                if (!props.clientRect || props.editor.isDestroyed) return;
                
                popup = tippy(document.body, {
                  getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start'
                })
              },
              onUpdate(props) {
                component?.updateProps(props)
                if (!props.clientRect || props.editor.isDestroyed) return;

                popup?.[0]?.setProps({ 
                  getReferenceClientRect: () => props.clientRect?.() || new DOMRect() 
                })
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') { 
                  popup?.[0]?.hide(); 
                  return true 
                }
                return component?.ref?.onKeyDown(props)
              },
              onExit() {
                popup?.[0]?.destroy()
                component?.destroy()
              }
            }
          }
        }
      })
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none w-full px-3 py-2`,
      },
    }
  })

  useEffect(() => {
    if (!editor) return;

    const currentHTML = editor.getHTML();
    const isEditorEmpty = currentHTML === '<p></p>' || currentHTML === '';

    if (value === '' && !isEditorEmpty) {
      editor.commands.clearContent(true);
    } else if (value !== '' && isEditorEmpty) {
      editor.commands.setContent(value);
    }
  }, [value, editor])

  return (
    <div 
      style={{ minHeight, maxHeight: '200px' }}
      className={`border rounded-lg bg-white overflow-hidden ${disabled ? 'opacity-50 pointer-events-none' : 'border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500'}`}
    >
      <EditorContent editor={editor} />
    </div>
  )
}