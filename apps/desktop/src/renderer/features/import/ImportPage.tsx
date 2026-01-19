import { useState } from 'react';
import { FileDown, Link2, Image, FileText, Type, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

type ImportType = 'url' | 'image' | 'pdf' | 'text';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportType>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const importContent = async (type: ImportType, content?: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const body: any = { type };
      if (type === 'url') body.url = url;
      else body.content = content || text;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setMessage({ type: 'success', text: 'Content imported successfully!' });
      setUrl('');
      setText('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await importContent(type, base64);
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { key: 'url', label: 'URL', icon: Link2 },
    { key: 'image', label: 'Image', icon: Image },
    { key: 'pdf', label: 'PDF', icon: FileText },
    { key: 'text', label: 'Text', icon: Type },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <FileDown className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Import</h1>
      </div>

      <p className="text-on-surface-variant">
        Import content from various sources. AI will extract key information and classify it automatically.
      </p>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              activeTab === key
                ? 'bg-primary text-white'
                : 'bg-surface hover:bg-surface-variant'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-error/10 text-error'
        }`}>
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className="bg-surface rounded-xl p-6 shadow-sm">
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Link2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Import from URL</h3>
              <p className="text-sm text-on-surface-variant">
                Paste a URL to extract and save its content
              </p>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-3 rounded-xl border border-outline/30 bg-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => importContent('url')}
              disabled={!url.trim() || isLoading}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Import URL
            </button>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="text-center py-8">
            <Image className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Import Image</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Select an image to extract text using OCR
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 cursor-pointer">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
              Select Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'image')}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Import PDF</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Select a PDF to extract its text content
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 cursor-pointer">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Select PDF
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e, 'pdf')}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Type className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Import Text</h3>
              <p className="text-sm text-on-surface-variant">
                Paste text content to import and classify
              </p>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your text here..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-outline/30 bg-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <button
              onClick={() => importContent('text')}
              disabled={!text.trim() || isLoading}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Import Text
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
