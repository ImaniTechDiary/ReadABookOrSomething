const FALLBACK_GUTENBERG_IDS = [
  84, 1342, 11, 2701, 1661, 74, 98, 1400, 1080, 64317,
  2554, 5200, 4300, 46, 1952, 37106, 158, 1232, 35, 16
];

const titleById = {
  84: "Frankenstein; Or, The Modern Prometheus",
  1342: "Pride and Prejudice",
  11: "Alice's Adventures in Wonderland",
  2701: "Moby Dick; Or, The Whale",
  1661: "The Adventures of Sherlock Holmes",
  74: "The Adventures of Tom Sawyer",
  98: "A Tale of Two Cities",
  1400: "Great Expectations",
  1080: "A Modest Proposal",
  64317: "The Great Gatsby",
  2554: "Crime and Punishment",
  5200: "Metamorphosis",
  4300: "Ulysses",
  46: "A Christmas Carol in Prose; Being a Ghost Story of Christmas",
  1952: "The Yellow Wallpaper",
  37106: "Little Women; Or, Meg, Jo, Beth, and Amy",
  158: "Emma",
  1232: "The Prince",
  35: "The Time Machine",
  16: "Peter Pan",
};

const authorById = {
  84: ["Mary Wollstonecraft Shelley"],
  1342: ["Jane Austen"],
  11: ["Lewis Carroll"],
  2701: ["Herman Melville"],
  1661: ["Arthur Conan Doyle"],
  74: ["Mark Twain"],
  98: ["Charles Dickens"],
  1400: ["Charles Dickens"],
  1080: ["Jonathan Swift"],
  64317: ["F. Scott Fitzgerald"],
  2554: ["Fyodor Dostoyevsky"],
  5200: ["Franz Kafka"],
  4300: ["James Joyce"],
  46: ["Charles Dickens"],
  1952: ["Charlotte Perkins Gilman"],
  37106: ["Louisa May Alcott"],
  158: ["Jane Austen"],
  1232: ["Niccolò Machiavelli"],
  35: ["H. G. Wells"],
  16: ["J. M. Barrie"],
};

const toBook = (id) => ({
  id: `fallback:${id}`,
  title: titleById[id] || `Project Gutenberg #${id}`,
  authors: authorById[id] || [],
  source: "gutendex",
  readable: true,
  coverUrl: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
  formats: {
    html: `https://www.gutenberg.org/files/${id}/${id}-h/${id}-h.htm`,
    epub: `https://www.gutenberg.org/ebooks/${id}.epub.images`,
    text: `https://www.gutenberg.org/files/${id}/${id}-0.txt`
  }
});

const normalize = (value = "") => value.toLowerCase().trim();

export const getFallbackBooksPage = ({ query = "", limit = 20, page = 1 }) => {
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const safePage = Math.max(Number(page) || 1, 1);
  const q = normalize(query);

  const allBooks = FALLBACK_GUTENBERG_IDS.map(toBook).filter((book) => {
    if (!q) return true;
    const haystack = `${book.title} ${book.authors.join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });

  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    total: allBooks.length,
    results: allBooks.slice(start, end)
  };
};

