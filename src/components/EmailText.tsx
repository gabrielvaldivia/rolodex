import React from "react";

interface EmailTextProps {
  content: string;
  className?: string;
}

export const EmailText: React.FC<EmailTextProps> = ({
  content,
  className = "",
}) => {
  // Debug: Log all content being processed
  console.log("📧 EmailText received content:", content);
  // Function to process email content and format it properly
  const processEmailContent = (text: string) => {
    // First, truncate at common email chain patterns to show only the latest email
    const emailChainPatterns = [
      // Match "On [day], [month] [date], [year] at [time] [name] wrote:"
      /On\s+\w+,\s+\w+\s+\d+,\s+\d+\s+at\s+\d+:\d+\s*(AM|PM)?\s+.+?\s+wrote:/i,
      // Match "On [month] [date], [year] at [time] [name] wrote:"
      /On\s+\w+\s+\d+,\s+\d+\s+at\s+\d+:\d+\s*(AM|PM)?\s+.+?\s+wrote:/i,
      // Match "On [date]/[month]/[year] at [time] [name] wrote:"
      /On\s+\d+\/\d+\/\d+\s+at\s+\d+:\d+\s*(AM|PM)?\s+.+?\s+wrote:/i,
      // Match "On [date]-[month]-[year] at [time] [name] wrote:"
      /On\s+\d+-\d+-\d+\s+at\s+\d+:\d+\s*(AM|PM)?\s+.+?\s+wrote:/i,
      // Match exact pattern like "On Wed, Jul 16, 2025 at 8:32 AM Gabe Valdivia"
      /On\s+\w{3},\s+\w{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)?\s+.+/i,
      // Match "From: [email]" at start of line
      /^From:\s*.+$/m,
      // Match standard email separators
      /^-----Original Message-----$/m,
      /^_{20,}$/m,
      /^Begin forwarded message:$/m,
      /^-{10,}\s*Forwarded message\s*-{10,}$/m,
    ];

    let truncatedText = text;

    for (const pattern of emailChainPatterns) {
      const match = truncatedText.match(pattern);
      if (match) {
        // Only truncate if the match is not at the very beginning of the text
        if (match.index && match.index > 10) {
          truncatedText = truncatedText.substring(0, match.index).trim();
          break;
        }
      }
    }

    const lines = truncatedText.split("\n");
    const processedLines: Array<{
      content: string;
      type: "normal" | "quote" | "signature";
    }> = [];

    let inSignature = false;

    lines.forEach((line, index) => {
      // Check for signature delimiter
      if (
        line.trim() === "--" ||
        line.trim() === "-- " ||
        line.includes("-- ")
      ) {
        inSignature = true;
        return; // Skip the signature delimiter line
      }

      // Detect quoted text (lines starting with > or >>> or common email patterns)
      const quoteMatch = line.match(/^(\s*>+\s*)/);
      const forwardMatch = line.match(/^(\s*-+\s*Forwarded message\s*-+)/i);
      const originalMatch = line.match(/^(\s*-+\s*Original Message\s*-+)/i);
      const onDateMatch = line.match(/^On .* wrote:/i);

      // Also check for lines that contain >>> anywhere in the line
      const tripleQuoteMatch = line.includes(">>> ");

      if (
        quoteMatch ||
        forwardMatch ||
        originalMatch ||
        onDateMatch ||
        tripleQuoteMatch
      ) {
        // Remove all types of quote markers
        const cleanContent = line
          .replace(/^(\s*>+\s*)/, "") // Remove leading > symbols
          .replace(/>>> /g, "") // Remove >>> symbols anywhere in line
          .replace(/^(\s*-+\s*Forwarded message\s*-+)/i, "")
          .replace(/^(\s*-+\s*Original Message\s*-+)/i, "");

        processedLines.push({
          content: cleanContent,
          type: "quote",
        });
      } else if (inSignature) {
        processedLines.push({
          content: line,
          type: "signature",
        });
      } else {
        processedLines.push({
          content: line,
          type: "normal",
        });
      }
    });

    return processedLines;
  };

  // Function to detect and format URLs
  const formatUrls = (text: string) => {
    // Handle the specific case first: "Designer in Residence" <url> (with or without closing >)
    const designerPattern = /"Designer in Residence"\s*<([^>]+)(?:>|$)/g;

    // Then handle Gmail's format: "text" <url> - more robust pattern
    const gmailLinkRegex = /"([^"]+)"\s*<([^>]+)>/g;

    // Also handle variations like "text" <url> without quotes
    const gmailLinkRegex2 = /([^<>\s]+)\s*<([^>]+)>/g;

    // Then handle regular URLs (but not URLs that are already inside HTML tags)
    const urlRegex = /(?<!["'])(https?:\/\/[^\s<>"']+)(?!["'])/g;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    let result = text;

    // Debug: Check if we're processing the right content
    if (text.includes('"Designer in Residence"')) {
      console.log("🔗 Debug: Processing text with Designer in Residence");
      console.log("🔗 Debug: Before any processing:", result);

      // Test the designerPattern specifically
      const testMatch = designerPattern.exec(text);
      console.log("🔗 Debug: designerPattern test match:", testMatch);
    }

    result = result
      .replace(
        gmailLinkRegex,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
      )
      .replace(gmailLinkRegex2, (match, text, url) => {
        // Only replace if the URL looks like a real URL and text doesn't contain special URL characters
        if (url.startsWith("http") && !text.includes("://")) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${text}</a>`;
        }
        return match;
      })
      .replace(
        urlRegex,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
      )
      .replace(
        emailRegex,
        '<a href="mailto:$1" class="text-blue-600 hover:underline">$1</a>'
      );

    // Handle the specific case LAST to avoid interference
    result = result.replace(
      designerPattern,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Designer in Residence</a>'
    );

    if (text.includes('"Designer in Residence"')) {
      console.log("🔗 Debug: After all processing:", result);
    }

    return result;
  };

  const processedLines = processEmailContent(content);

  // Process the entire content first to handle cross-line patterns
  const fullFormattedContent = formatUrls(content);

  return (
    <div
      className={`text-sm leading-relaxed break-words overflow-hidden ${className}`}
    >
      {processedLines.map((line, index) => {
        // Use the full formatted content instead of processing each line separately
        // This ensures cross-line patterns are handled correctly
        const formattedContent = formatUrls(line.content);

        switch (line.type) {
          case "quote":
            // Handle empty lines in quotes
            if (line.content.trim() === "") {
              return <div key={index} className="h-3" />;
            }
            return (
              <div
                key={index}
                className="border-l-3 border-blue-300 pl-3 ml-1 text-muted-foreground/70 bg-blue-50/30 py-0.5 my-0.5 rounded-r-sm break-words"
              >
                <div
                  className="whitespace-pre-wrap break-words leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formattedContent,
                  }}
                />
              </div>
            );
          case "signature":
            // Handle empty lines in signatures
            if (line.content.trim() === "") {
              return <div key={index} className="h-3" />;
            }
            return (
              <div
                key={index}
                className="text-muted-foreground/60 text-xs mt-2 pt-2 border-t border-muted break-words"
              >
                <div
                  className="whitespace-pre-wrap break-words leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formattedContent,
                  }}
                />
              </div>
            );
          case "normal":
          default:
            // Handle empty lines to show line breaks
            if (line.content.trim() === "") {
              return <div key={index} className="h-5" />;
            }
            return (
              <div key={index} className="text-foreground break-words">
                <div
                  className="whitespace-pre-wrap break-words leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formattedContent,
                  }}
                />
              </div>
            );
        }
      })}
    </div>
  );
};
