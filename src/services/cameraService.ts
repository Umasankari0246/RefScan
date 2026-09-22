/**
 * RefScan - Camera & MediaDevices Service
 * Handles camera stream acquisition, device enumeration, front/rear switching, and torch/flash.
 */

export interface CameraDevice {
  deviceId: string;
  label: string;
  facing: "environment" | "user" | "unknown";
}

/**
 * Checks if the current browser environment supports getUserMedia.
 */
export function isCameraSupported(): boolean {
  return !!(
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/**
 * Retrieves all connected video input devices and classifies them as rear (environment) or front (user).
 */
export async function getAvailableCameras(): Promise<CameraDevice[]> {
  if (!isCameraSupported()) return [];

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");

    return videoDevices.map((d, idx) => {
      const label = d.label || `Camera ${idx + 1}`;
      const lower = label.toLowerCase();
      let facing: "environment" | "user" | "unknown" = "unknown";

      if (lower.includes("back") || lower.includes("rear") || lower.includes("environment")) {
        facing = "environment";
      } else if (lower.includes("front") || lower.includes("user") || lower.includes("selfie")) {
        facing = "user";
      } else if (idx === 0) {
        facing = "environment"; // default assumption for mobile 1st camera
      }

      return {
        deviceId: d.deviceId,
        label,
        facing
      };
    });
  } catch (err) {
    console.warn("Error enumerating cameras:", err);
    return [];
  }
}

/**
 * Starts a camera stream with preferred rear facing mode or specific device ID.
 */
export async function startCameraStream(options?: {
  deviceId?: string;
  facingMode?: "environment" | "user";
}): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new Error("Camera is not supported on this browser or connection is not secure (HTTPS required).");
  }

  const baseVideoConstraints: MediaTrackConstraints = {
    width: { ideal: 1920, min: 640 },
    height: { ideal: 1080, min: 480 },
    frameRate: { ideal: 30, max: 60 },
  };

  if (options?.deviceId) {
    baseVideoConstraints.deviceId = { exact: options.deviceId };
  } else {
    baseVideoConstraints.facingMode = options?.facingMode || { ideal: "environment" };
  }

  try {
    // Try with focusMode continuous if supported by modern mobile browsers
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...baseVideoConstraints,
        advanced: [{ focusMode: "continuous" } as any]
      }
    });
  } catch (err) {
    // Fallback to standard video constraints
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: baseVideoConstraints
      });
    } catch (fallbackErr) {
      // Minimal fallback constraints
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: options?.facingMode ? { facingMode: options.facingMode } : true
      });
    }
  }
}

/**
 * Toggles the device flashlight / torch on the active video track if supported by hardware.
 */
export async function toggleTorch(stream: MediaStream, enabled: boolean): Promise<boolean> {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;

  try {
    const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
      await track.applyConstraints({
        advanced: [{ torch: enabled } as any]
      });
      return true;
    }
  } catch (err) {
    console.warn("Torch constraint not supported on this track:", err);
  }
  return false;
}

/**
 * Safely stops all tracks in a MediaStream to turn off the hardware camera LED.
 */
export function stopCameraStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  } catch (err) {
    console.warn("Error stopping camera tracks:", err);
  }
}

