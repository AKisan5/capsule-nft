'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePreMintStore } from '@/stores/preMint';
import { uploadImage } from '@/lib/walrus/image';

export default function PhotoPage() {
  const router = useRouter();
  const { eventName, fighterTag, setPhoto, setEventName, setFighterTag } =
    usePreMintStore();

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onNext = async () => {
    if (!file) {
      toast.error('写真を選択してください');
      return;
    }
    if (!eventName.trim()) {
      toast.error('イベント名を入力してください');
      return;
    }
    if (!fighterTag.trim()) {
      toast.error('ファイタータグを入力してください');
      return;
    }

    setUploading(true);
    try {
      const blobId = await uploadImage(file);
      setPhoto(blobId, preview!);
      router.push('/create/step1');
    } catch {
      // uploadImage already shows a toast on failure
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">あの瞬間の写真</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          心が震えた瞬間を切り取った一枚をアップロード
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="写真を選択"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`relative flex min-h-52 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${dragging ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-muted-foreground">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="size-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">タップして選択</p>
              <p className="text-xs">またはドラッグ＆ドロップ</p>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {preview && (
        <button
          className="text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => inputRef.current?.click()}
        >
          別の写真を選ぶ
        </button>
      )}

      {/* Metadata */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            イベント名 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="例: ONE 170"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            ファイタータグ <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="例: Takeru"
            value={fighterTag}
            onChange={(e) => setFighterTag(e.target.value)}
          />
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={onNext}
        disabled={uploading || !file}
      >
        {uploading ? (
          <>
            <UploadIcon className="animate-pulse" />
            アップロード中…
          </>
        ) : (
          '次へ — 瞬間を記録'
        )}
      </Button>
    </div>
  );
}
