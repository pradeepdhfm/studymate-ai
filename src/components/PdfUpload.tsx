import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PdfUploadProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export function PdfUpload({ onUpload, isUploading, uploadProgress }: PdfUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-3">StudyRAG</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Upload your PDF notes or textbook to generate exam-oriented questions and structured answers.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative w-full max-w-lg p-10 rounded-2xl cursor-pointer
          transition-all duration-300 glass-panel
          ${isDragOver ? 'border-primary glow-primary scale-[1.02]' : 'hover:border-primary/50'}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="w-64">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {uploadProgress < 30
                      ? 'Reading PDF...'
                      : uploadProgress < 60
                      ? 'Extracting text...'
                      : uploadProgress < 90
                      ? 'Processing chunks...'
                      : 'Finalizing...'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  {isDragOver ? (
                    <FileText className="w-8 h-8 text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium text-lg">
                    {isDragOver ? 'Drop your PDF here' : 'Upload PDF Document'}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Drag & drop or click to browse
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 max-w-sm text-center">
        Every answer is generated from your PDF content only, not from outside sources.
      </p>
    </motion.div>
  );
}
