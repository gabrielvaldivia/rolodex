import React from "react";
import ReactMarkdown from "react-markdown";

interface RichTextProps {
  content: string;
  className?: string;
}

export const RichText: React.FC<RichTextProps> = ({
  content,
  className = "",
}) => {
  // Pre-process content to handle line breaks better
  const processedContent = content
    .replace(/\n/g, "  \n") // Convert single line breaks to markdown line breaks
    .replace(/\r\n/g, "  \n") // Handle Windows line endings
    .replace(/\r/g, "  \n"); // Handle Mac line endings

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          // Customize paragraph styling
          p: ({ children }) => (
            <p className="mb-1 leading-relaxed last:mb-0">{children}</p>
          ),
          // Customize strong/bold styling
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          // Customize emphasis/italic styling
          em: ({ children }) => <em className="italic">{children}</em>,
          // Customize code styling
          code: ({ children }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ),
          // Customize line breaks
          br: () => <br className="leading-relaxed" />,
          // Remove default list styling for inline content
          ul: ({ children }) => (
            <ul className="mb-1 pl-4 space-y-0.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-1 pl-4 space-y-0.5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm">{children}</li>,
          // Handle headings
          h1: ({ children }) => (
            <h1 className="text-base font-semibold mb-1">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium mb-1">{children}</h3>
          ),
          // Handle blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted pl-2 italic text-muted-foreground mb-1">
              {children}
            </blockquote>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
