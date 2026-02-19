"use client"

import { useEffect, useCallback } from "react"

interface TerminalOptionProps {
  /** The label to display */
  label: string
  /** Keyboard shortcut key (single char or number) */
  hotkey: string
  /** Whether this option is currently selected/active */
  selected?: boolean
  /** Click / select handler */
  onSelect: () => void
  className?: string
}

/**
 * A single selectable option rendered as a terminal command.
 * Shows a hotkey in brackets and the label.
 * Selected state uses primary accent color + a marker.
 */
export function TerminalOption({
  label,
  hotkey,
  selected = false,
  onSelect,
  className = "",
}: TerminalOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex items-center gap-2 py-0.5 text-left font-retro text-sm transition-colors duration-100 focus:outline-none ${
        selected
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      <span className="w-6 shrink-0 text-center text-xs opacity-60">[{hotkey}]</span>
      <span className={`${selected ? "text-primary" : ""}`}>
        {selected ? "■" : "○"} {label}
      </span>
    </button>
  )
}

interface TerminalOptionGroupProps {
  options: { value: string; label: string; hotkey: string }[]
  /** Currently selected values */
  selected: string[]
  /** Toggle or set selection */
  onSelect: (value: string) => void
  /** Enable keyboard shortcuts */
  enableKeyboard?: boolean
  className?: string
}

/**
 * A group of terminal options with optional keyboard navigation.
 * Binds hotkeys (number keys or letter keys) to options.
 */
export function TerminalOptionGroup({
  options,
  selected,
  onSelect,
  enableKeyboard = true,
  className = "",
}: TerminalOptionGroupProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeyboard) return
      const key = e.key.toLowerCase()
      const match = options.find(
        (opt) => opt.hotkey.toLowerCase() === key
      )
      if (match) {
        e.preventDefault()
        onSelect(match.value)
      }
    },
    [options, onSelect, enableKeyboard]
  )

  useEffect(() => {
    if (!enableKeyboard) return
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown, enableKeyboard])

  return (
    <div className={`flex flex-col gap-0.5 ${className}`} role="group">
      {options.map((opt) => (
        <TerminalOption
          key={opt.value}
          label={opt.label}
          hotkey={opt.hotkey}
          selected={selected.includes(opt.value)}
          onSelect={() => onSelect(opt.value)}
        />
      ))}
    </div>
  )
}
