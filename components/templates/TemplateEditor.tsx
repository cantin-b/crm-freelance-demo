"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import {
  Bold,
  Check,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo,
  Undo,
  Unlink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
}

type EmailAttributes = Record<string, string | null>;

function preserveEmailAttributes() {
  return {
    style: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("style"),
      renderHTML: (attributes: EmailAttributes) =>
        attributes.style ? { style: attributes.style } : {},
    },
    width: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("width"),
      renderHTML: (attributes: EmailAttributes) =>
        attributes.width ? { width: attributes.width } : {},
    },
    border: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("border"),
      renderHTML: (attributes: EmailAttributes) =>
        attributes.border ? { border: attributes.border } : {},
    },
  };
}

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-zinc-200 text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      )}
    >
      {children}
    </button>
  );
}

function normalizeLinkUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function TemplateEditor({
  content,
  onChange,
  placeholder = "Write your email body here…",
  minHeightClassName = "min-h-48",
  className,
}: Props) {
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        autolink: false,
        openOnClick: false,
      }),
      Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            ...preserveEmailAttributes(),
            cellpadding: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute("cellpadding"),
              renderHTML: (attributes: EmailAttributes) =>
                attributes.cellpadding ? { cellpadding: attributes.cellpadding } : {},
            },
            cellspacing: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute("cellspacing"),
              renderHTML: (attributes: EmailAttributes) =>
                attributes.cellspacing ? { cellspacing: attributes.cellspacing } : {},
            },
            role: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute("role"),
              renderHTML: (attributes: EmailAttributes) =>
                attributes.role ? { role: attributes.role } : {},
            },
          };
        },
      }).configure({
        resizable: false,
        cellMinWidth: 1,
      }),
      TableRow.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            ...preserveEmailAttributes(),
          };
        },
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            ...preserveEmailAttributes(),
          };
        },
      }),
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            ...preserveEmailAttributes(),
          };
        },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              parseHTML: element => element.getAttribute("width"),
              renderHTML: attributes => attributes.width ? { width: attributes.width } : {},
            },
            height: {
              default: null,
              parseHTML: element => element.getAttribute("height"),
              renderHTML: attributes => attributes.height ? { height: attributes.height } : {},
            },
            border: {
              default: null,
              parseHTML: element => element.getAttribute("border"),
              renderHTML: attributes => attributes.border ? { border: attributes.border } : {},
            },
            style: {
              default: null,
              parseHTML: element => element.getAttribute("style"),
              renderHTML: attributes => attributes.style ? { style: attributes.style } : {},
            },
          };
        },
      }).configure({ inline: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const activeEditor = editor;
  const currentLink = activeEditor.getAttributes("link").href as string | undefined;

  function openLinkPanel() {
    setLinkUrl(currentLink ?? "");
    setLinkPanelOpen(true);
  }

  function applyLink() {
    const normalizedUrl = normalizeLinkUrl(linkUrl);
    if (!normalizedUrl) return;

    const chain = activeEditor.chain().focus();
    if (activeEditor.state.selection.empty && !activeEditor.isActive("link")) {
      chain.insertContent({
        type: "text",
        text: normalizedUrl,
        marks: [{ type: "link", attrs: { href: normalizedUrl } }],
      }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href: normalizedUrl }).run();
    }
    setLinkPanelOpen(false);
  }

  function removeLink() {
    activeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkUrl("");
    setLinkPanelOpen(false);
  }

  return (
    <div className={cn("border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-zinc-50">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-zinc-200 mx-1" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-zinc-200 mx-1" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-zinc-200 mx-1" />

        <ToolbarBtn
          onClick={openLinkPanel}
          active={editor.isActive("link") || linkPanelOpen}
          title="Link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-zinc-200 mx-1" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarBtn>
      </div>

      {linkPanelOpen && (
        <div className="flex flex-col gap-2 border-b bg-white px-3 py-2 sm:flex-row sm:items-center">
          <Input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") {
                setLinkPanelOpen(false);
              }
            }}
            placeholder="https://example.com"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="sm"
              className="h-8 px-2"
              disabled={!linkUrl.trim()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={applyLink}
              title="Apply link"
            >
              <Check className="h-4 w-4" />
            </Button>
            {editor.isActive("link") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onMouseDown={(event) => event.preventDefault()}
                onClick={removeLink}
                title="Remove link"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setLinkPanelOpen(false)}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Editable area */}
      <EditorContent
        editor={editor}
        className={cn("p-3 text-sm", minHeightClassName)}
      />
    </div>
  );
}
