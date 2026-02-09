"use client";

import { useState, useRef, useCallback } from "react";
import { industries } from "@/lib/industries";
import { TRANSLATABLE_FIELDS, type TranslatableField } from "@/lib/cloudcart-parser";

type Status = "idle" | "uploading" | "translating" | "complete" | "error";

interface Stats {
  totalProducts: number;
  totalItems: number;
  uniqueItems: number;
}

const LANGUAGES = [
  { code: "bg", name: "Bulgarian" },
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ro", name: "Romanian" },
  { code: "el", name: "Greek" },
  { code: "tr", name: "Turkish" },
  { code: "ru", name: "Russian" },
  { code: "uk", name: "Ukrainian" },
  { code: "cs", name: "Czech" },
  { code: "hr", name: "Croatian" },
  { code: "sr", name: "Serbian" },
  { code: "hu", name: "Hungarian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
];

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [industryId, setIndustryId] = useState("");
  const [sourceLang, setSourceLang] = useState("bg");
  const [targetLang, setTargetLang] = useState("en");
  const [apiKey, setApiKey] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [stats, setStats] = useState<Stats | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [translatedXml, setTranslatedXml] = useState<string | null>(null);
  const [translationCount, setTranslationCount] = useState(0);
  const [selectedFields, setSelectedFields] = useState<Set<TranslatableField>>(
    () => new Set(TRANSLATABLE_FIELDS.filter((f) => f.defaultOn).map((f) => f.id))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedIndustry = industries.find((i) => i.id === industryId);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setStatus("idle");
        setTranslatedXml(null);
        setErrorMessage("");
        setStats(null);
      }
    },
    []
  );

  const handleTranslate = useCallback(async () => {
    if (!selectedFile || !industryId || !apiKey) return;

    setStatus("translating");
    setErrorMessage("");
    setTranslatedXml(null);
    setProgress({ completed: 0, total: 0, percent: 0 });

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("industry", industryId);
    formData.append("sourceLang", sourceLang);
    formData.append("targetLang", targetLang);
    formData.append("apiKey", apiKey);
    if (industryId === "custom" && customContext) {
      formData.append("customContext", customContext);
    }
    formData.append("fields", JSON.stringify([...selectedFields]));

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server error");
      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "status":
                setStatusMessage(data.message);
                break;
              case "stats":
                setStats({
                  totalProducts: data.totalProducts,
                  totalItems: data.totalItems,
                  uniqueItems: data.uniqueItems,
                });
                break;
              case "progress":
                setProgress({
                  completed: data.completed,
                  total: data.total,
                  percent: data.percent,
                });
                break;
              case "complete":
                setTranslatedXml(data.translatedXml);
                setTranslationCount(data.translationCount);
                setStatus("complete");
                setStatusMessage(data.message);
                break;
              case "error":
                setErrorMessage(data.message);
                setStatus("error");
                break;
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      setStatus("error");
    }
  }, [selectedFile, industryId, sourceLang, targetLang, apiKey, customContext]);

  const handleDownload = useCallback(() => {
    if (!translatedXml || !selectedFile) return;

    const blob = new Blob([translatedXml], {
      type: "application/xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = selectedFile.name.replace(/\.xml$/i, "");
    a.download = `${baseName}-${targetLang}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [translatedXml, selectedFile, targetLang]);

  const canTranslate =
    selectedFile && industryId && apiKey && status !== "translating";

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">
              FT
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                CloudCart Feed Translator
              </h1>
              <p className="text-xs text-gray-500">
                Industry-aware XML feed translation
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Step 1: Upload */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Upload Feed
            </h2>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              selectedFile
                ? "border-green-600/50 bg-green-950/20"
                : "border-gray-700 hover:border-gray-500 bg-gray-900/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-green-400 font-medium">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB - Click to
                  replace
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-3xl">📄</div>
                <p className="text-gray-400">
                  Drop your CloudCart XML feed here or click to browse
                </p>
                <p className="text-xs text-gray-600">Supports .xml files up to 50MB</p>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Languages */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Languages
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Step 3: Industry */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Industry & Terminology
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {industries.map((ind) => (
              <button
                key={ind.id}
                onClick={() => setIndustryId(ind.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  industryId === ind.id
                    ? "border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/30"
                    : "border-gray-800 bg-gray-900/40 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{ind.icon}</span>
                  <span className="text-sm font-medium">{ind.name}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {ind.description}
                </p>
                {ind.exampleTerms.length > 0 && industryId === ind.id && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">
                      Sample mappings
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ind.exampleTerms.map((term) => (
                        <span
                          key={term}
                          className="text-[11px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {industryId === "custom" && (
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Describe your industry and the terminology style you want. For example: 'You are translating content for a premium outdoor sports equipment store. Use technical mountaineering and hiking terminology...'"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-gray-600"
            />
          )}
        </section>

        {/* Step 4: Fields to Translate */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Fields to Translate
            </h2>
          </div>

          <div className="border border-gray-800 rounded-xl p-5 bg-gray-900/40">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                Choose which product fields should be translated
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedFields(
                      new Set(TRANSLATABLE_FIELDS.map((f) => f.id))
                    )
                  }
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Select all
                </button>
                <span className="text-gray-700">|</span>
                <button
                  onClick={() => setSelectedFields(new Set())}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
              {Object.entries(
                TRANSLATABLE_FIELDS.reduce(
                  (acc, field) => {
                    if (!acc[field.group]) acc[field.group] = [];
                    acc[field.group].push(field);
                    return acc;
                  },
                  {} as Record<string, typeof TRANSLATABLE_FIELDS>
                )
              ).map(([group, fields]) => (
                <div key={group} className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium pt-2">
                    {group}
                  </p>
                  {fields.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.has(field.id)}
                        onChange={(e) => {
                          const next = new Set(selectedFields);
                          if (e.target.checked) {
                            next.add(field.id);
                          } else {
                            next.delete(field.id);
                          }
                          setSelectedFields(next);
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-0 w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-600 mt-3 pt-3 border-t border-gray-800">
              {selectedFields.size} of {TRANSLATABLE_FIELDS.length} fields
              selected
            </p>
          </div>
        </section>

        {/* Step 5: API Key */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center">
              5
            </span>
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Claude API Key
            </h2>
          </div>

          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-gray-600 font-mono"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Your API key is sent directly to Anthropic and is never stored.
              Get one at{" "}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        </section>

        {/* Translate Button */}
        <div className="pt-2">
          <button
            onClick={handleTranslate}
            disabled={!canTranslate}
            className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all ${
              canTranslate
                ? "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-900/30"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {status === "translating"
              ? "Translating..."
              : "Translate Feed"}
          </button>
        </div>

        {/* Progress & Results */}
        {(status === "translating" ||
          status === "complete" ||
          status === "error") && (
          <section className="space-y-4">
            <div className="border border-gray-800 rounded-xl p-6 bg-gray-900/40">
              {/* Status message */}
              <p className="text-sm text-gray-300 mb-3">{statusMessage}</p>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {stats.totalProducts}
                    </p>
                    <p className="text-xs text-gray-500">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-400">
                      {stats.uniqueItems}
                    </p>
                    <p className="text-xs text-gray-500">Unique Texts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats.totalItems}
                    </p>
                    <p className="text-xs text-gray-500">Total Occurrences</p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {status === "translating" && progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>
                      {progress.completed} / {progress.total}
                    </span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-violet-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {status === "error" && (
                <div className="mt-3 p-3 bg-red-950/30 border border-red-800/50 rounded-lg">
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Complete */}
              {status === "complete" && translatedXml && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-green-950/30 border border-green-800/50 rounded-lg">
                    <p className="text-sm text-green-400">
                      Translation complete! {translationCount} unique texts
                      translated.
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition-all shadow-lg shadow-green-900/30"
                  >
                    Download Translated Feed
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-gray-600">
          CloudCart Feed Translator - Powered by Claude AI
        </div>
      </footer>
    </main>
  );
}
