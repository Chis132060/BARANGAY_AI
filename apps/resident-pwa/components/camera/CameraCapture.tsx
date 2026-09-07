"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, Check, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = async () => {
    stopCamera();
    setError("");
    setCapturedBlob(null);
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else {
        setError("Could not access the camera. Make sure your device has a camera and it is not in use.");
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setCapturedBlob(blob);
              setCapturedUrl(URL.createObjectURL(blob));
              stopCamera();
            } else {
              setError("Failed to capture image.");
            }
          },
          "image/jpeg",
          0.9
        );
      }
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-lg bg-black text-white relative w-full h-[400px] overflow-hidden">
      {error ? (
        <div className="text-center p-4">
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={handleRetake}
              className="px-4 py-2 bg-zinc-800 rounded-md hover:bg-zinc-700 transition"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : capturedUrl ? (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <img
            src={capturedUrl}
            alt="Captured ID"
            className="w-full h-full object-cover rounded-md"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-6">
            <button
              type="button"
              onClick={handleRetake}
              className="flex items-center justify-center w-12 h-12 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 shadow-lg transition"
              aria-label="Retake"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-lg transition"
              aria-label="Confirm"
            >
              <Check className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-md"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center justify-center w-12 h-12 bg-zinc-800/80 text-white rounded-full hover:bg-zinc-700 shadow-lg backdrop-blur-sm transition"
              aria-label="Cancel"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleCapture}
              className="flex items-center justify-center w-16 h-16 bg-white border-4 border-zinc-300 text-black rounded-full hover:bg-zinc-200 shadow-lg transition"
              aria-label="Capture"
            >
              <Camera className="w-8 h-8" />
            </button>
          </div>
          
          <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-white shadow-sm border border-white/10">
              Position your ID clearly in frame
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
