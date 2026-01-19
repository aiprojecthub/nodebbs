"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * 日期选择器组件
 * 基于 shadcn 的 Calendar 和 Popover 封装
 *
 * @param {Object} props
 * @param {Date|null} props.value - 选中的日期
 * @param {Function} props.onChange - 日期变更回调 (date: Date | null) => void
 * @param {string} props.placeholder - 占位文本
 * @param {boolean} props.disabled - 禁用整个组件
 * @param {string} props.className - 自定义触发按钮类名
 * @param {Function} props.formatDate - 自定义格式化函数
 * @param {Object} props.calendarProps - 透传给 Calendar（react-day-picker）的属性
 */
function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  disabled = false,
  className,
  formatDate,
  calendarProps,
  ...props
}) {
  const [open, setOpen] = React.useState(false)

  // 默认日期格式化函数
  const defaultFormatDate = (date) => {
    if (!date) return ""
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  const format = formatDate || defaultFormatDate

  const handleSelect = (date) => {
    onChange?.(date || null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!value}
          className={cn(
            "w-full justify-start text-left font-normal",
            "data-[empty=true]:text-muted-foreground",
            className
          )}
          {...props}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {value ? format(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          initialFocus
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
