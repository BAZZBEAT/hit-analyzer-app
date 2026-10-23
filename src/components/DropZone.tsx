import { useRef, useState, useCallback, type DragEvent } from "react";
import { Upload, Music, FileAudio } from "lucide-react";

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled: boolean;
  fileName?: string;
}

export default function DropZone({ onFile, disabled, fileName }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("audio/")) {
        onFile(file);
      }
    },
    [disabled, onFile]
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        group relative cursor-pointer rounded-2xl border-2 border-dashed
        transition-all duration-300
        ${isDragging
          ? "border-cyan-400 bg-cyan-400/5 scale-[1.01]"
          : "border-white/15 hover:border-white/30 hover:bg-white/[0.02]"
        }
        ${disabled ? "opacity-50 pointer-events-none" : ""}
        px-8 py-14 text-center
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`
            relative flex h-20 w-20 items-center justify-center rounded-2xl
            bg-gradient-to-br from-cyan-500/20 to-blue-600/20
            ring-1 ring-white/10
            transition-transform duration-300 group-hover:scale-110
            ${isDragging ? "scale-110 ring-cyan-400/40" : ""}
          `}
        >
          {fileName ? (
            <FileAudio className="h-9 w-9 text-cyan-400" />
          ) : (
            <Upload className="h-9 w-9 text-cyan-400" />
          )}
          <div className="absolute -inset-2 rounded-2xl bg-cyan-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <div className="space-y-1.5">
          {fileName ? (
            <p className="text-base font-medium text-white/90 flex items-center justify-center gap-2">
              <Music className="h-4 w-4 text-cyan-400" />
              {fileName}
            </p>
          ) : (
            <p className="text-base font-semibold text-white/90">
              Нажмите или перетащите аудиофайл сюда
            </p>
          )}
          <p className="text-sm text-white/40">
            Поддерживаются .mp3, .wav, .ogg, .flac
          </p>
        </div>
      </div>
    </div>
  );
}
