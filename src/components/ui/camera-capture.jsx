
import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function CameraCapture({ 
  onCapture, 
  onUpload,
  isUploading = false,
  className 
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
      // We need to wait for the dialog to open and videoRef to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
          };
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions.');
      setShowCamera(true); // Show dialog anyway to display error
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCapturedImage(null);
    setError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to data URL for immediate preview
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedImage(dataUrl);
    }
  };

  const confirmPhoto = async () => {
    if (capturedImage && onCapture) {
      try {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await onCapture(file);
        stopCamera();
      } catch (err) {
        console.error("Confirm photo error:", err);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload?.(file);
    }
  };

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          disabled={isUploading}
          className="flex-1 h-12 rounded-xl border-slate-200"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Camera className="w-4 h-4 mr-2" />
          )}
          Take Photo
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 h-12 rounded-xl border-slate-200"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Photo
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="p-4 bg-white">
            <DialogTitle>
              {capturedImage ? 'Review Photo' : 'Take Photo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            {error ? (
              <div className="aspect-video flex flex-col items-center justify-center p-8 text-center text-white">
                <X className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-lg font-medium mb-2">{error}</p>
                <Button variant="outline" onClick={stopCamera} className="text-white border-white hover:bg-white/10">
                  Close
                </Button>
              </div>
            ) : !capturedImage ? (
              <>
                <div className="relative aspect-video bg-black overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={stopCamera}
                    className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white border-none backdrop-blur-md"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    type="button"
                    size="icon"
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 text-emerald-600 shadow-xl border-none"
                  >
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-600" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                  <Button
                    type="button"
                    onClick={retakePhoto}
                    className="bg-white/90 text-slate-800 hover:bg-white rounded-xl h-12 px-6"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={confirmPhoto}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-6"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Use Photo
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}
