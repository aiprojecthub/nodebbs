import { useCallback } from 'react';

/**
 * 封装编辑器的核心文本操作能力
 * @param {Function} onChange - 外部传入的内容变更回调
 * @param {RefObject} textareaRef - textarea 的 ref
 * @returns {Object} 核心操作方法集合
 */
export function useEditorCore(onChange, textareaRef) {
  /**
   * 落地一次编辑（底层原语，其余方法都基于它）
   *
   * 必须走 execCommand，不能只调 onChange：受控组件下 React 提交时会执行
   * textarea.value = newValue，而编程式赋值会清空该元素的原生撤销栈，
   * 表现为点击工具栏后 Ctrl+Z 彻底失效、之前的输入历史全部丢失。
   * execCommand 产生的是「真实编辑」，浏览器会正常入栈，并派发原生 input
   * 事件让 React 的 onChange 拿到新值，因此成功时不需要再手动调 onChange。
   *
   * @param {number} start - 被替换区间的起点
   * @param {number} end - 被替换区间的终点
   * @param {string} text - 用于替换该区间的文本
   * @param {number} caretStart - 编辑完成后的选区起点
   * @param {number} caretEnd - 编辑完成后的选区终点
   */
  const applyEdit = useCallback((start, end, text, caretStart, caretEnd) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollTop = textarea.scrollTop; // 保存滚动位置
    const prevValue = textarea.value;

    // execCommand 要求元素处于聚焦态。textarea 失焦后 selectionStart/End 仍会
    // 保留，所以弹层类工具（链接/表格/投票等）关闭后也能靠这两步还原目标区间
    textarea.focus({ preventScroll: true });

    // 弹层（Radix Dialog / DropdownMenu 等）打开期间会 trap 焦点，上面的 focus
    // 会被 FocusScope 同步拽回弹层内部。此时若照常 execCommand，编辑动作会落在
    // 弹层自己的输入框上（Radix 还会先 select 全选，等于把它的内容覆盖掉），
    // 因此必须确认焦点真的到位，否则直接走兜底
    let inserted = false;
    if (document.activeElement === textarea) {
      textarea.setSelectionRange(start, end);

      // execCommand 的返回值在部分浏览器不可靠（可能返回 true 但实际没插入），
      // 统一以内容是否真的发生变化为准
      try {
        document.execCommand?.('insertText', false, text);
        inserted = textarea.value !== prevValue;
      } catch {
        inserted = false;
      }
    }

    // 兜底：不支持 insertText 的环境（如 Firefox < 89）退回原写法，
    // 功能可用，但这一步的撤销历史会丢失
    if (!inserted) {
      onChange?.(prevValue.slice(0, start) + text + prevValue.slice(end));
    }

    // 等 React 提交后再摆放光标，同时抵消弹层关闭时被抢走的焦点
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(caretStart, caretEnd);
      el.scrollTop = scrollTop; // 恢复滚动位置
    });
  }, [onChange, textareaRef]);

  // 在当前光标位置或选区周围插入文本
  const insertText = useCallback((before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const caret = start + before.length;

    applyEdit(start, end, before + selection + after, caret, caret + selection.length);
  }, [applyEdit, textareaRef]);

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
    const value = textarea.value;
    const needsLineBreak = asBlock && start > 0 && value[start - 1] !== '\n';
    const insertion = needsLineBreak ? '\n' + text : text;
    const caret = start + insertion.length;

    applyEdit(start, end, insertion, caret, caret);
  }, [applyEdit, textareaRef]);

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
