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
    throw new Error("Camera is not supported on this device/browser or HTTPS connection is required.");
  }

  const facing = options?.facingMode || "environment";

  // Attempt 1: Standard mobile camera stream with preferred rear-facing lens
  try {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: options?.deviceId
        ? { deviceId: { exact: options.deviceId } }
        : {
            facingMode: { ideal: facing },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
    };
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err: any) {
    console.warn("[CameraService] Preferred constraints failed, attempting facing fallback:", err?.message || err);

    // Attempt 2: Simplified constraints with just facingMode string
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facing },
      });
    } catch (err2: any) {
      console.warn("[CameraService] FacingMode constraints failed, attempting generic video fallback:", err2?.message || err2);

      // Attempt 3: Any available video device
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
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

