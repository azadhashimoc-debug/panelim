import { tr } from "@/shared/i18n/catalog";
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch {
    throw new Error(
      tr("İnternet bağlantısını yoxlayın. Əməliyyat təsdiqlənməyib."),
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || tr("Əməliyyat tamamlanmadı."));
  return data as T;
}
