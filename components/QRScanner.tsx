import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr'; // Assuming jsQR is available in the environment

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number, max: number, step: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const requestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // Use a smaller fixed size for scanning to improve performance
        const scanSize = 480;
        const ratio = video.videoWidth / video.videoHeight;
        
        if (ratio > 1) {
          canvas.width = scanSize * ratio;
          canvas.height = scanSize;
        } else {
          canvas.width = scanSize;
          canvas.height = scanSize / ratio;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                onScan(code.data);
                return;
            }
        } catch (e) {
            // jsQR might not be available
        }
      }
    }
    // Scan every 150ms instead of every frame to save battery and CPU on mobile
    setTimeout(() => {
      requestRef.current = requestAnimationFrame(scanFrame);
    }, 150);
  }, [onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1 }
          }
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (envError) {
          console.warn("Back camera with constraints failed, trying basic back camera...", envError);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          } catch (fallbackError) {
            console.warn("Back camera not available, trying default camera...", fallbackError);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }

        if (videoRef.current && stream) {
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          
          // Try to enable continuous focus if supported
          const track = stream.getVideoTracks()[0];
          if (track) {
            try {
              const capabilities = track.getCapabilities() as any;
              
              // Check for torch support
              if (capabilities.torch) {
                setHasTorch(true);
              }

              // Check for zoom support
              if (capabilities.zoom) {
                setZoomCapabilities({
                  min: capabilities.zoom.min,
                  max: capabilities.zoom.max,
                  step: capabilities.zoom.step || 0.1
                });
                // Initialize to 1x or the minimum supported zoom
                setZoomLevel(Math.max(1, capabilities.zoom.min || 1));
              }

              if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                await track.applyConstraints({
                  advanced: [{ focusMode: 'continuous' }] as any
                });
              }
            } catch (focusError) {
              console.warn("Focus mode constraint not supported", focusError);
            }
          }

          try {
            await videoRef.current.play();
          } catch (e) {
            console.error("Video play failed", e);
          }
          requestRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera. Please ensure permissions are granted and a camera is available.");
      }
    };

    startCamera();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanFrame]);

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const newTorchState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newTorchState }] as any
      });
      setTorchOn(newTorchState);
    } catch (err) {
      console.error("Error toggling torch:", err);
    }
  };

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setZoomLevel(value);
    
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ zoom: value }] as any
      });
    } catch (err) {
      console.error("Error applying zoom:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {hasTorch && (
          <button 
            onClick={toggleTorch}
            className={`p-3 rounded-full backdrop-blur-md border border-white/20 transition-colors ${torchOn ? 'bg-orange-500 text-white' : 'bg-white/20 text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a2 2 0 0 0-2 2v2h10V4a2 2 0 0 0-2-2Z"/><path d="M7 6h10v4a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V6Z"/><path d="M11 13v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-7"/><path d="M11 9h2"/></svg>
          </button>
        )}
        <button 
          onClick={onClose}
          className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium border border-white/20 hover:bg-white/30 transition-colors"
        >
          Close
        </button>
      </div>
      
      {error ? (
        <div className="text-white px-6 text-center max-w-sm">
          <p className="mb-4 text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-500/30">{error}</p>
          <button onClick={onClose} className="bg-white text-black px-6 py-2 rounded-lg font-medium">
            Go Back
          </button>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover" 
            playsInline 
            muted 
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Zoom Control */}
          {zoomCapabilities && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 z-20 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-white/60 font-medium uppercase tracking-wider">
                <span>Zoom</span>
                <span>{zoomLevel.toFixed(1)}x</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.5" 
                value={zoomLevel} 
                onChange={handleZoomChange}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          )}

          {/* Scan overlay */}
          <div className="relative w-64 h-64 border-2 border-orange-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] flex items-center justify-center">
             <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-orange-500 -mt-1 -ml-1"></div>
             <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-orange-500 -mt-1 -mr-1"></div>
             <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-orange-500 -mb-1 -ml-1"></div>
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-orange-500 -mb-1 -mr-1"></div>
             <p className="text-white/80 font-medium text-sm mt-32 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Align QR Code</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;