import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  startCameraStream, stopCameraStream, getAvailableCameras, 
  toggleTorch, isCameraSupported, CameraDevice 
} from "../../services/cameraService";
import { 
  decodeFromVideoFrame, decodeFromImage, playScanSuccessBeep 
} from "../../services/barcodeService";
import { 
  extractFromScannedContent, formatIsbn 
} from "../../services/isbnService";
import { fetchBookMetadata } from "../../services/bookMetadataService";
import { ScanFrame } from "./ScanFrame";
import { CameraControls } from "./CameraControls";
import { CameraSwitcher } from "./CameraSwitcher";
import { ScannerStatus, ScannerLifecycleState } from "./ScannerStatus";
import { BookReference } from "../../types";

interface ScannerViewProps {
  onBookDetected: (book: BookReference) => void;
  onManualInput: () => void;
  onEditManually?: () => void;
  onClose?: () => void;
}

export function ScannerView({ onBookDetected, onManualInput, onEditManually, onClose }: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const [scannerState, setScannerState] = useState<ScannerLifecycleState>("permission_required");
  const [detectedIsbn, setDetectedIsbn] = useState<string>("");
  const [foundBook, setFoundBook] = useState<BookReference | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const scanningActiveRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimestampRef = useRef<number>(0);

  // Initialize camera stream
  const initializeCamera = useCallback(async (deviceId?: string, facing: "environment" | "user" = "environment") => {
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
    }

    setScannerState("scanning");
    setErrorMessage("");
    scanningActiveRef.current = false;

    try {
      if (!isCameraSupported()) {
        throw new Error("Camera API is not supported in this browser or connection is not HTTPS.");
      }

      const newStream = await startCameraStream({
        deviceId: deviceId || undefined,
        facingMode: facing
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }

      // Check available cameras and torch capability
      const availableCams = await getAvailableCameras();
      setCameras(availableCams);

      const track = newStream.getVideoTracks()[0];
      if (track) {
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(!!caps.torch);
      }

      setScannerState("ready");
      scanningActiveRef.current = true;
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setScannerState("camera_error");
      setErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera permissions in your browser address bar."
          : err.message || "Failed to access camera device."
      );
    }
  }, [stream]);

  // Handle successful Barcode / QR Code detection & metadata retrieval
  const handleProcessCode = useCallback(async (rawCode: string) => {
    if (!rawCode || (!scanningActiveRef.current && scannerState !== "ready" && scannerState !== "scanning")) {
      return;
    }

    scanningActiveRef.current = false;
    playScanSuccessBeep();

    const parsed = extractFromScannedContent(rawCode);
    const displayLabel = parsed.type === "isbn" ? formatIsbn(parsed.value) : parsed.value;

    setDetectedIsbn(displayLabel);
    setScannerState("detected");

    // Visual confirmation pulse, then query metadata APIs
    setTimeout(async () => {
      setScannerState("fetching_metadata");
      try {
        const book = await fetchBookMetadata(rawCode);
        setFoundBook(book);
        setScannerState("book_found");
      } catch (err: any) {
        setScannerState("book_not_found");
        setErrorMessage(err.message || `No bibliographic record found for: ${displayLabel}`);
      }
    }, 500);
  }, [scannerState]);

  // Frame processing loop using ZXing MultiFormatReader + native BarcodeDetector
  useEffect(() => {
    let isMounted = true;

    const scanFrame = async (timestamp: number) => {
      if (!isMounted) return;

      if (
        scanningActiveRef.current &&
        videoRef.current &&
        canvasRef.current &&
        videoRef.current.readyState >= 2
      ) {
        // Run scan every ~100ms
        if (timestamp - lastScanTimestampRef.current >= 100) {
          lastScanTimestampRef.current = timestamp;
          try {
            const detectedRaw = await decodeFromVideoFrame(videoRef.current, canvasRef.current);
            if (detectedRaw && scanningActiveRef.current) {
              handleProcessCode(detectedRaw);
              return;
            }
          } catch (err) {
            // Ignored
          }
        }
      }

      if (scanningActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    if (scannerState === "ready" || scannerState === "scanning") {
      scanningActiveRef.current = true;
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } else {
      scanningActiveRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      isMounted = false;
      scanningActiveRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scannerState, handleProcessCode]);

  // Clean up stream on component unmount
  useEffect(() => {
    return () => {
      stopCameraStream(stream);
    };
  }, [stream]);

  // Switch front <-> rear camera
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    setSelectedCameraId("");
    initializeCamera(undefined, nextFacing);
  };

  // Switch specific camera device from dropdown
  const handleSelectCamera = (deviceId: string) => {
    setSelectedCameraId(deviceId);
    initializeCamera(deviceId, facingMode);
  };

  // Torch / Flashlight toggle
  const handleToggleTorch = async () => {
    if (stream) {
      const nextTorch = !torchOn;
      const success = await toggleTorch(stream, nextTorch);
      if (success) setTorchOn(nextTorch);
    }
  };

  // Handle uploaded barcode / QR photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerState("scanning");
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const detected = await decodeFromImage(img);
        if (detected) {
          handleProcessCode(detected);
          return;
        }
      } catch (err) {
        console.warn("Uploaded image decoding failed:", err);
      }

      setScannerState("invalid_barcode");
      setErrorMessage("No clear barcode or QR code could be detected in the image. Please try another photo or enter details manually.");
    };
  };

  // Restart scanning
  const handleRetryScan = () => {
    setDetectedIsbn("");
    setFoundBook(null);
    setErrorMessage("");
    if (stream) {
      setScannerState("ready");
      scanningActiveRef.current = true;
    } else {
      initializeCamera(selectedCameraId || undefined, facingMode);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] sm:aspect-video shadow-lg border border-[var(--border)] isolate select-none">
      {/* Hidden File Input for Barcode Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Hidden Canvas for Frame Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live Video Feed - Centered */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover object-center block"
      />

      {/* Subtle Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-[circle_at_center,_transparent_38%,_rgba(15,23,42,0.65)_85%] z-[1]" />

      {/* Centered Animated Scan Frame Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <ScanFrame
          isScanning={scannerState === "ready" || scannerState === "scanning"}
          detected={scannerState === "detected" || scannerState === "book_found"}
        />
      </div>

      {/* Multi-state Status Overlays */}
      <ScannerStatus
        state={scannerState}
        detectedIsbn={detectedIsbn}
        foundBook={foundBook}
        errorMessage={errorMessage}
        onRequestPermission={() => initializeCamera(undefined, facingMode)}
        onRetry={handleRetryScan}
        onManualInput={onManualInput}
        onEditManually={onEditManually}
        onConfirmBook={() => foundBook && onBookDetected(foundBook)}
      />

      {/* Top Camera Switcher Dropdown */}
      {cameras.length > 1 && scannerState === "ready" && (
        <div className="absolute top-4 left-4 z-20">
          <CameraSwitcher
            cameras={cameras}
            selectedDeviceId={selectedCameraId}
            onSelectCamera={handleSelectCamera}
          />
        </div>
      )}

      {/* Bottom Camera Controls Bar */}
      {(scannerState === "ready" || scannerState === "scanning") && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center z-20 px-4">
          <CameraControls
            torchOn={torchOn}
            hasTorch={hasTorch}
            cameras={cameras}
            facingMode={facingMode}
            onToggleTorch={handleToggleTorch}
            onSwitchCamera={handleToggleFacingMode}
            onUploadImage={() => fileInputRef.current?.click()}
            onManualInput={onManualInput}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}

export default ScannerView;
