/**
 * RefScan - AI Chatbot Service
 * Context-aware academic research and citation assistant.
 * Analyzes workspace references, active book/paper context, and citation rules.
 */

import { Reference, BookReference, PaperReference, CitationStyle } from "../types";
import { generateCitationPlainText, generateCitationHTML } from "./citationService";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  html?: string;
  timestamp: string;
  suggestions?: string[];
  referenceSnippet?: {
    title: string;
    type: string;
    authors?: string[];
  };
}

export interface ChatContext {
  currentPath: string;
  activeBook?: BookReference | null;
  activePaper?: PaperReference | null;
  references: Reference[];
  preferredStyle?: CitationStyle;
}

/**
 * Builds the context payload and generates an intelligent, accurate response.
 */
export async function sendChatMessage(
  message: string,
  context: ChatContext,
  history: ChatMessage[] = []
): Promise<ChatMessage> {
  const query = message.trim().toLowerCase();
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const activeBook = context.activeBook || (
    context.references.find((r) => r.type === "BOOK" && context.currentPath.includes(r.id)) as BookReference | undefined
  );

  const activePaper = context.activePaper || (
    context.references.find((r) => r.type === "PAPER" && context.currentPath.includes(r.id)) as PaperReference | undefined
  );

  const books = context.references.filter((r) => r.type === "BOOK") as BookReference[];
  const papers = context.references.filter((r) => r.type === "PAPER") as PaperReference[];

  // 1. "What is this book about?" or "Explain this book's subject"
  if (query.includes("what is this book about") || query.includes("summary of this book") || query.includes("explain this book") || query.includes("about this book")) {
    if (activeBook) {
      const desc = activeBook.description || "No detailed synopsis is cataloged for this entry.";
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `**${activeBook.title}**\n\n${desc}\n\n* **Category:** ${activeBook.category}\n* **Publisher:** ${activeBook.publisher} (${activeBook.year})\n* **ISBN:** ${activeBook.isbn13 || activeBook.isbn10 || "N/A"}`,
        timestamp,
        suggestions: [
          `Generate APA citation for ${activeBook.title}`,
          `Generate IEEE citation for ${activeBook.title}`,
          "Who is the author of this book?"
        ],
        referenceSnippet: {
          title: activeBook.title,
          type: "BOOK",
          authors: activeBook.authors
        }
      };
    } else if (books.length > 0) {
      const firstBook = books[0];
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `You aren't viewing a specific book right now, but here is your most recent library book:\n\n**${firstBook.title}** by ${firstBook.authors.join(", ")}\n\n${firstBook.description || "No description cataloged."}`,
        timestamp,
        suggestions: ["Show me the books I saved", "How do I scan a book?"]
      };
    } else {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: "You haven't scanned or selected a book yet. Use the **Scan Book** button to scan a barcode or enter an ISBN, and I'll break down its synopsis and bibliographic data for you!",
        timestamp,
        suggestions: ["How do I scan a book?", "Show me citation styles"]
      };
    }
  }

  // 2. "Who is the author of this book?"
  if (query.includes("who is the author") || query.includes("who wrote") || query.includes("author of")) {
    if (activeBook) {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `The author(s) of **${activeBook.title}** are:\n\n* **${activeBook.authors.join(", ")}**\n\nPublished by **${activeBook.publisher}** in **${activeBook.year}**.`,
        timestamp,
        suggestions: [
          `Give me the APA citation`,
          `Give me the IEEE citation`
        ]
      };
    } else {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: "Please open a book from your Library or scan a book barcode to check its verified authors.",
        timestamp,
        suggestions: ["Show me the books I saved", "How do I scan a book?"]
      };
    }
  }

  // 3. Citation requests: APA, IEEE, MLA, Harvard
  if (query.includes("citation") || query.includes("cite") || query.includes("apa") || query.includes("ieee") || query.includes("mla") || query.includes("harvard")) {
    let targetRef: Reference | undefined = activeBook || activePaper;

    if (!targetRef && context.references.length > 0) {
      // Check if user named a book or paper
      targetRef = context.references.find((r) => query.includes(r.title.toLowerCase().substring(0, 15))) || context.references[0];
    }

    let style: CitationStyle = "IEEE";
    if (query.includes("apa")) style = "APA";
    else if (query.includes("mla")) style = "MLA";
    else if (query.includes("harvard")) style = "Harvard";
    else if (context.preferredStyle) style = context.preferredStyle;

    if (targetRef) {
      const citationText = generateCitationPlainText(targetRef, style);
      const citationHTML = generateCitationHTML(targetRef, style);

      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `Here is the **${style}** citation for **${targetRef.title}**:\n\n\`\`\`text\n${citationText}\n\`\`\``,
        html: `<p class="font-semibold mb-1 text-slate-800 dark:text-slate-200">${style} Citation:</p><div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-slate-900 dark:text-slate-100 leading-relaxed font-serif text-sm">${citationHTML}</div>`,
        timestamp,
        suggestions: [
          `Give me the APA citation`,
          `Give me the IEEE citation`,
          `Give me the MLA citation`,
          `Give me the Harvard citation`
        ],
        referenceSnippet: {
          title: targetRef.title,
          type: targetRef.type,
          authors: (targetRef as any).authors
        }
      };
    } else {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `RefScan supports **IEEE, APA (7th), MLA (9th), and Harvard** citation formats.\n\nOnce you scan a book or upload a paper, you can ask me to generate formatted citations for your bibliography instantly!`,
        timestamp,
        suggestions: ["What is the difference between APA and IEEE?", "How do I scan a book?"]
      };
    }
  }

  // 4. "What is the difference between APA and IEEE?"
  if (query.includes("difference between apa and ieee") || (query.includes("difference") && (query.includes("apa") || query.includes("ieee")))) {
    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### Difference Between APA and IEEE Citation Styles\n\n* **IEEE Style (Institute of Electrical and Electronics Engineers):**\n  * **In-text:** Uses numeric bracketed citations in order of appearance (e.g. \`[1]\`, \`[2]\`).\n  * **Bibliography:** Formatted with author initials first (\`J. K. Author, Title, Year\`).\n  * **Common domains:** Engineering, Computer Science, Robotics, Electronics.\n\n* **APA Style (American Psychological Association, 7th Ed.):**\n  * **In-text:** Uses author-date format in parentheses (e.g. \`Author, 2023\`).\n  * **Bibliography:** Formatted with Last name first (\`Author, J. K. (2023). Title. Publisher\`).\n  * **Common domains:** Psychology, Social Sciences, Healthcare, Education.`,
      timestamp,
      suggestions: ["Show me MLA style", "Show me Harvard style", "Generate IEEE citation"]
    };
  }

  // 5. "Show me the books I saved" / "My library"
  if (query.includes("books i saved") || query.includes("saved books") || query.includes("my library") || query.includes("show me my references") || query.includes("list my books")) {
    if (books.length === 0) {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: "You haven't saved any books to your library yet. Try scanning a book barcode in the **Scan Book** section!",
        timestamp,
        suggestions: ["How do I scan a book?", "Load demo references"]
      };
    }

    const bookList = books.map((b, i) => `${i + 1}. **${b.title}** by ${b.authors.join(", ")} (${b.year}) [ISBN: \`${b.isbn13 || b.isbn10 || "N/A"}\`]`).join("\n");
    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `You have **${books.length} book(s)** saved in your Reference Library:\n\n${bookList}`,
      timestamp,
      suggestions: [
        `Generate citations for ${books[0].title}`,
        "Which references are related to computer science?",
        "How do I export to BibTeX?"
      ]
    };
  }

  // 6. "Which references are related to [topic]?"
  if (query.includes("related to") || query.includes("about machine learning") || query.includes("search for") || query.includes("topic")) {
    const keywords = query.replace(/which references are related to|show me references about|related to|find/g, "").trim().toLowerCase();
    const matches = context.references.filter((r) => {
      const titleMatch = r.title.toLowerCase().includes(keywords);
      const catMatch = (r as any).category?.toLowerCase().includes(keywords);
      const descMatch = (r as any).description?.toLowerCase().includes(keywords);
      const kwMatch = (r as any).keywords?.some((k: string) => k.toLowerCase().includes(keywords));
      return titleMatch || catMatch || descMatch || kwMatch;
    });

    if (matches.length > 0) {
      const list = matches.map((m, i) => `${i + 1}. [${m.type}] **${m.title}** (${(m as any).year || (m as any).publicationYear || "n.d."})`).join("\n");
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `Found **${matches.length} reference(s)** related to "${keywords}":\n\n${list}`,
        timestamp,
        suggestions: [
          `Generate citation for ${matches[0].title}`,
          "Show all my references"
        ]
      };
    } else {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `I couldn't find any saved references directly matching "${keywords}". You can search academic portals like **IEEE Xplore, arXiv, or PubMed** in the **Research Sites** portal!`,
        timestamp,
        suggestions: ["Open Academic Search Portals", "Show all my references"]
      };
    }
  }

  // 7. Research Gaps & Paper analysis
  if (query.includes("gap") || query.includes("research direction") || query.includes("limitation")) {
    if (activePaper && activePaper.researchGaps.length > 0) {
      const gapsList = activePaper.researchGaps.map((g, i) => `${i + 1}. **${g.title}** (${g.strength} confidence)\n   ${g.description}`).join("\n\n");
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `Identified **${activePaper.researchGaps.length} research gap(s)** in *${activePaper.title}*:\n\n${gapsList}`,
        timestamp,
        suggestions: ["Explain methodology of this paper", "Generate citation for this paper"]
      };
    } else {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: "RefScan detects research gaps by parsing limitations, dataset constraints, and author-stated future work in uploaded PDFs. Navigate to **Research Gaps** in the sidebar to review all detected directions across your library!",
        timestamp,
        suggestions: ["Go to Research Gaps", "How does paper analysis work?"]
      };
    }
  }

  // Default Academic Assistant response
  return {
    id: "msg_" + Date.now(),
    sender: "assistant",
    text: `I'm **RefScan AI**, your academic research and citation co-pilot.\n\nHere are some things you can ask me:\n* *"What is this book about?"*\n* *"Give me the APA/IEEE citation for my scanned book"*\n* *"Show me the books I saved"*\n* *"What is the difference between APA and IEEE styles?"*\n* *"Which references are related to machine learning?"*`,
    timestamp,
    suggestions: [
      "What is the difference between APA and IEEE?",
      "Show me the books I saved",
      "How do I scan a book?"
    ]
  };
}
