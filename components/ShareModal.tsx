import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { X, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const url = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f2846] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-scale-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2 text-center">Share Prototype</h3>
        <p className="text-slate-400 text-sm mb-6 text-center">Scan to open on mobile or copy link.</p>

        <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-6 shadow-inner">
          <QRCode 
            value={url} 
            size={180}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>

        <div className="flex items-center gap-2 bg-[#061526] p-3 rounded-lg border border-white/5">
          <input 
            type="text" 
            readOnly 
            value={url} 
            className="bg-transparent text-slate-300 text-sm flex-1 outline-none truncate font-mono"
          />
          <button 
            onClick={handleCopy}
            className="text-orange-400 hover:text-orange-300 transition-colors p-2 hover:bg-white/5 rounded-md"
            title="Copy Link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;