const DEFAULT_API_URL = "http://127.0.0.1:8000";

export const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export interface SpaceDocument {
  _id: string;
  name: string;
  content: string[];
  words: string[];
  createdAt: string;
  updatedAt: string;
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as SpaceDocument;
};

export const upsertSpace = async (name: string): Promise<SpaceDocument> => {
  const response = await fetch(`${API_URL}/spaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ name })
  });

  return handleResponse(response);
};

interface UpdateSpacePayload {
  id: string;
  content: string[];
  words: string[];
}

const sendUpdate = async (
  method: "PATCH" | "PUT",
  { id, content, words }: UpdateSpacePayload
) => {
  const response = await fetch(`${API_URL}/spaces/${id}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ content, words })
  });

  return response;
};

export const updateSpaceContent = async (payload: UpdateSpacePayload): Promise<SpaceDocument> => {
  let response = await sendUpdate("PATCH", payload);

  if (response.status === 405) {
    response = await sendUpdate("PUT", payload);
  }

  return handleResponse(response);
};

export interface NewsData {
  title?: string;
  subtitle?: string;
  source_url?: string;
  top_image?: string;
  sections?: {
    heading?: string;
    blocks: ({
      type: 'paragraph';
      text: string;
    } | {
      type: 'list';
      items: string[];
    })[];
  }[];
}

export const scrapeUrl = async (params: { url: string; space_name: string }): Promise<NewsData> => {
  const response = await fetch(`${API_URL}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as NewsData;
};

export const extractWords = (text: string, limit = 500): string[] => {
  const matches = text
    .toLowerCase()
    .match(/[\p{L}\p{N}']+/gu);

  if (!matches) {
    return [];
  }

  const unique = new Set<string>();

  for (const token of matches) {
    if (!unique.has(token)) {
      unique.add(token);
      if (unique.size >= limit) {
        break;
      }
    }
  }

  return Array.from(unique);
};
