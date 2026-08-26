import { Node } from '@tiptap/core';

const ExportMathNode = Node.create({
  name: 'inlineMath', 
  
  // 宣告要讀取 attrs 裡面的 latex 屬性
  addAttributes() {
    return {
      latex: {
        default: '',
      },
      display: {
        default: 'no',
      }
    }
  },

  renderHTML({ node }: { node: any }) {
    const latexRaw = node.attrs.latex || '';
    const isDisplay = node.attrs.display === 'yes';
    
    // 如果是獨立成行的數學公式 (display: yes)，用 $$
    // 如果是行內的數學公式，用 $
    const wrapper = isDisplay ? '$$' : '$';
    const textContent = `${wrapper}${latexRaw}${wrapper}`;
    
    // 輸出一個帶有樣式的 span 標籤，把原始碼包在裡面
    // Word 會把它當作一段加粗的藍色文字，TXT 匯出時 regex 會把它抽出來
    return [
      'span', 
      { 
        'data-type': 'inlineMath', 
        style: 'font-weight: bold; color: #2563eb; font-family: monospace; padding: 0 4px;' 
      }, 
      textContent
    ];
  },
});

export default ExportMathNode;