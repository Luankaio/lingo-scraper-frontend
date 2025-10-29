const DEFAULT_API_URL = "http://127.0.0.1:8000";

export const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export interface SpaceWord {
  word: string;
  isChecked: boolean;
}

export interface SpaceDocument {
  _id: string;
  name: string;
  content: string[];
  words: SpaceWord[];
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
  words: SpaceWord[];
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

export interface TranslateWordParams {
  text: string;
  targetLanguage: string;
  signal?: AbortSignal;
}

export interface TranslateWordResult {
  translatedText: string;
  detectedLanguage?: string;
}

const buildGoogleTranslateUrl = (text: string, targetLanguage: string): string => {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  return url.toString();
};

export const translateWord = async ({
  text,
  targetLanguage,
  signal
}: TranslateWordParams): Promise<TranslateWordResult> => {
  const trimmed = text.trim();

  if (!trimmed) {
    return { translatedText: "" };
  }

  const response = await fetch(buildGoogleTranslateUrl(trimmed, targetLanguage), {
    signal
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Falha ao traduzir com status ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  const sentences = Array.isArray(data) && Array.isArray((data as unknown[])[0])
    ? ((data as unknown[])[0] as unknown[])
    : [];

  const translatedText = sentences
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
    .join("");

  const detectedLanguage = Array.isArray(data) && typeof (data as unknown[])[2] === "string"
    ? ((data as unknown[])[2] as string)
    : undefined;

  return {
    translatedText: translatedText || trimmed,
    detectedLanguage
  };
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

export const removeWordFromSpace = async ({
  spaceName,
  word
}: {
  spaceName: string;
  word: string;
}): Promise<SpaceDocument> => {
  const response = await fetch(`${API_URL}/spaces/words`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ space_name: spaceName, word })
  });

  return handleResponse(response);
};

export const removeContentFromSpace = async ({
  spaceName,
  url
}: {
  spaceName: string;
  url: string;
}): Promise<SpaceDocument> => {
  const response = await fetch(`${API_URL}/spaces/content`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ space_name: spaceName, url })
  });

  return handleResponse(response);
};

export const addWordToSpace = async ({
  spaceName,
  word,
  isChecked = false
}: {
  spaceName: string;
  word: string;
  isChecked?: boolean;
}): Promise<SpaceDocument> => {
  const response = await fetch(`${API_URL}/spaces/words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ space_name: spaceName, word, isChecked })
  });

  return handleResponse(response);
};
