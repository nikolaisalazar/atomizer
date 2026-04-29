"use client";

const KEY = "atomizer:bookmarks";

export function getBookmarks(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function isBookmarked(id: number): boolean {
  return getBookmarks().includes(id);
}

export function addBookmark(id: number): void {
  const current = getBookmarks();
  if (!current.includes(id)) {
    localStorage.setItem(KEY, JSON.stringify([...current, id]));
  }
}

export function removeBookmark(id: number): void {
  const current = getBookmarks();
  localStorage.setItem(KEY, JSON.stringify(current.filter((b) => b !== id)));
}

export function toggleBookmark(id: number): boolean {
  if (isBookmarked(id)) {
    removeBookmark(id);
    return false;
  } else {
    addBookmark(id);
    return true;
  }
}
