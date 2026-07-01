import React, { useState, useRef, useCallback } from 'react';
import { Booking } from '../types/booking';
import { uploadDocument, replaceDocument, viewDocument } from '../api/bookings';

interface Props {
  booking: Booking;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface DocType {
  key: string;
  label: string;
}

interface FileItem {
  file: File;
  id: string;
}

type FilesByType = Record<string, FileItem[]>;

function buildDocTypes(booking: Booking): DocType[] {
  const types: DocType[] = [];

  if (booking.personalDetails && booking.personalDetails.length > 0) {
    booking.personalDetails.forEach((p, i) => {
      types.push({ key: `passport-${i}`, label: `Passport ${p.firstName} ${p.lastName}` });
    });
  } else {
    // Fallback: parse from guests string "Johnson Doe (1 adult)"
    const guestsStr = booking.tourDetails.guests;
    const nameMatch = guestsStr.match(/^([^(]+)/);
    const name = nameMatch ? nameMatch[1].trim() : 'Guest';
    types.push({ key: 'passport-0', label: `Passport ${name}` });
  }

  types.push({ key: 'payment', label: 'Payment confirmation' });
  return types;
}

const UploadDocumentsModal: React.FC<Props> = ({ booking, token, onClose, onSuccess }) => {
  const docTypes = buildDocTypes(booking);
  const [selectedType, setSelectedType] = useState<string>(docTypes[0]?.key ?? '');
  const [filesByType, setFilesByType] = useState<FilesByType>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((typeKey: string, files: File[]) => {
    if (files.length === 0) return;
    setFilesByType(prev => ({
      ...prev,
      [typeKey]: [
        ...(prev[typeKey] ?? []),
        ...files.map(f => ({ file: f, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })),
      ],
    }));
  }, []);

  const removeFile = (typeKey: string, id: string) => {
    setFilesByType(prev => ({
      ...prev,
      [typeKey]: (prev[typeKey] ?? []).filter(f => f.id !== id),
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(selectedType, Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(selectedType, Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const totalFileCount = Object.values(filesByType).reduce((sum, arr) => sum + arr.length, 0);

  const handleSave = async () => {
    // Build a flat list of { typeKey, label, file } to upload
    const allEntries: { typeKey: string; label: string; file: FileItem }[] = [];
    docTypes.forEach(dt => {
      (filesByType[dt.key] ?? []).forEach(item => {
        allEntries.push({ typeKey: dt.key, label: dt.label, file: item });
      });
    });

    if (allEntries.length === 0) {
      onClose();
      return;
    }

    setUploading(true);
    setError(null);

    // Build a map of label → existing documentId from booking.documents
    const existingByLabel: Record<string, string> = {};
    (booking.documents ?? []).forEach(doc => {
      if (doc.documentLabel) existingByLabel[doc.documentLabel] = doc.id;
    });

    try {
      for (const entry of allEntries) {
        const existingDocId = existingByLabel[entry.label];
        if (existingDocId) {
          // Slot already has a document → replace it (PUT)
          await replaceDocument(booking.id, existingDocId, entry.file.file, token, entry.label);
        } else {
          // New slot → upload fresh (POST)
          await uploadDocument(booking.id, entry.file.file, token, entry.label);
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const currentFiles = filesByType[selectedType] ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold" style={{ color: '#0B3857' }}>Upload documents</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex border-t border-gray-100 overflow-hidden flex-1">
          {/* Left: document type tabs */}
          <div className="flex-shrink-0 border-r border-gray-100 py-2" style={{ width: 220 }}>
          {docTypes.map(dt => {
              const hasNewFile = (filesByType[dt.key]?.length ?? 0) > 0;
              const existingDoc = (booking.documents ?? []).find(d => d.documentLabel === dt.label);
              const isSelected = selectedType === dt.key;
              return (
                <button
                  key={dt.key}
                  onClick={() => setSelectedType(dt.key)}
                  className="w-full text-left px-4 flex items-center justify-between transition-colors"
                  style={{
                    paddingTop: 12,
                    paddingBottom: 12,
                    color: isSelected ? '#0B3857' : '#677883',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 14,
                    background: 'none',
                    border: 'none',
                    borderBottom: isSelected ? '2px solid #027EAC' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ flex: 1 }}>{dt.label}</span>
                  {hasNewFile ? (
                    // Green check: new file selected
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#118819" strokeWidth="2" fill="none" />
                      <path d="M7 12l4 4 6-6" stroke="#118819" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : existingDoc ? (
                    // Blue dot: already uploaded previously
                    <span
                      title="Already uploaded — uploading again will replace it"
                      style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: '#027EAC', flexShrink: 0,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Right: file upload area */}
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
            <p className="text-sm font-bold" style={{ color: '#0B3857' }}>Add attachments</p>

            {/* Hint when slot already has an uploaded doc */}
            {(() => {
              const currentDocType = docTypes.find(dt => dt.key === selectedType);
              const existingDoc = currentDocType
                ? (booking.documents ?? []).find(d => d.documentLabel === currentDocType.label)
                : null;
              return existingDoc ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: '#E7F9FF', border: '1px solid #027EAC', color: '#027EAC' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    Already uploaded:{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const directUrl = existingDoc.fileUrl ?? existingDoc.url ?? existingDoc.documentUrl;
                        if (directUrl) {
                          window.open(directUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          viewDocument(booking.id, existingDoc.id, token).catch(() => {
                            setError('Could not open the document. Please try again.');
                          });
                        }
                      }}
                      style={{
                        fontWeight: 700,
                        color: '#027EAC',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: 'inherit',
                      }}
                      title="Click to view document"
                    >
                      {existingDoc.fileName}
                    </button>. Uploading a new file will replace it.
                  </span>
                </div>
              ) : null;
            })()}

            {/* Drop zone */}
            <div
              className="rounded-lg flex flex-col items-center justify-center py-8 cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${dragOver ? '#027EAC' : '#CBD5E1'}`,
                backgroundColor: dragOver ? '#E7F9FF' : '#FAFAFA',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <svg width="28" height="28" fill="none" stroke="#677883" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
              <p className="text-sm mt-2" style={{ color: '#677883' }}>Click to upload or drag and drop</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />

            {/* Uploaded files list */}
            {currentFiles.map(f => (
              <div key={f.id} className="flex items-center gap-3 py-1">
                <svg width="18" height="18" fill="none" stroke="#677883" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0B3857' }}>{f.file.name}</p>
                  <p className="text-xs" style={{ color: '#677883' }}>{(f.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={() => removeFile(selectedType, f.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove file"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ border: '2px solid #027EAC', color: '#027EAC', background: 'white' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: totalFileCount > 0 ? '#027EAC' : '#94a3b8', cursor: totalFileCount > 0 || uploading ? 'pointer' : 'default' }}
          >
            {uploading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadDocumentsModal;
