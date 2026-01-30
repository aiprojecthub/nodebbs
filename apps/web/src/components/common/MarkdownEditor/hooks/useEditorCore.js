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
    insertBlock
  };
}
