import { useCallback, useRef } from 'react';

/**
 * 封装编辑器的核心文本操作能力
 * @param {Function} onChange - 外部传入的内容变更回调
 * @param {RefObject} textareaRef - textarea 的 ref
 * @returns {Object} 核心操作方法集合
 */
export function useEditorCore(onChange, textareaRef) {
  // 在当前光标位置或选区周围插入文本
  const insertText = useCallback((before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop; // 保存滚动位置
    const text = textarea.value;
    const selection = text.substring(start, end);
    const replacement = before + selection + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onChange?.(newValue);
    
    // 使用 requestAnimationFrame 确保 React 状态更新后再设置光标
    requestAnimationFrame(() => {
        if(textarea) {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, start + before.length + selection.length);
            textarea.scrollTop = scrollTop; // 恢复滚动位置
        }
    });
  }, [onChange, textareaRef]);

  // 读取当前选区文本（无选区时返回空字符串）
  const getSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return '';
    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  }, [textareaRef]);

  // 用文本替换当前选区（无选区时等同于在光标处插入），插入后光标落在文本末尾
  // asBlock=true 时确保插入内容另起一行
  const replaceSelection = useCallback((text, asBlock = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop; // 保存滚动位置
    const value = textarea.value;
    const needsLineBreak = asBlock && start > 0 && value[start - 1] !== '\n';
    const insertion = needsLineBreak ? '\n' + text : text;

    onChange?.(value.substring(0, start) + insertion + value.substring(end));

    requestAnimationFrame(() => {
      if (textarea) {
        const caret = start + insertion.length;
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
        textarea.scrollTop = scrollTop; // 恢复滚动位置
      }
    });
  }, [onChange, textareaRef]);

  // 插入块级元素（确保换行）
  const insertBlock = useCallback((prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const text = textarea.value;
    const isStartOfLine = start === 0 || text[start - 1] === '\n';
    const insertion = isStartOfLine ? prefix : '\n' + prefix;
    
    insertText(insertion);
  }, [insertText, textareaRef]);

  return {
    insertText,
    insertBlock,
    getSelection,
    replaceSelection
  };
}
