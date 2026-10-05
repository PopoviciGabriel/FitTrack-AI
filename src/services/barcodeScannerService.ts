import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { BarcodeScannerSession, TorchConstraintSet, TorchTrackCapabilities } from "../types";

const RETAIL_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
];

const noop = (): void => undefined;

/** GS1 check digit for EAN-8, UPC-A and EAN-13. Rejects the occasional misread frame. */
export function isValidRetailBarcode(code: string): boolean {
  if (!/^\d+$/.test(code) || (code.length !== 8 && code.length !== 12 && code.length !== 13)) return false;
  const digits = [...code].map(Number);
  const checkDigit = digits.pop() as number;
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

/** UPC-A is an EAN-13 with a leading zero, which is the form Open Food Facts indexes. */
export function normalizeBarcode(code: string): string {
  return code.length === 12 ? `0${code}` : code;
}

function getActiveVideoTrack(container: HTMLElement): MediaStreamTrack | null {
  const stream = container.querySelector("video")?.srcObject;
  if (!(stream instanceof MediaStream)) return null;
  const track = stream.getVideoTracks()[0];
  return track ?? null;
}

function trackSupportsTorch(track: MediaStreamTrack): boolean {
  if (typeof track.getCapabilities !== "function") return false;
  const capabilities: TorchTrackCapabilities = track.getCapabilities();
  return capabilities.torch === true;
}

/**
 * Starts the rear camera inside `#elementId` and reports each decoded EAN/UPC once.
 * Must be called straight from a tap handler: iOS Safari only shows the camera prompt there.
 */
export async function startBarcodeScanner(
  elementId: string,
  onDecoded: (barcode: string) => void
): Promise<BarcodeScannerSession> {
  const container = document.getElementById(elementId);
  if (!container) throw new Error(`Scanner container #${elementId} not found`);

  const scanner = new Html5Qrcode(elementId, {
    verbose: false,
    formatsToSupport: RETAIL_FORMATS,
    useBarCodeDetectorIfSupported: true,
  });

  let delivered = false;

  const stop = async (): Promise<void> => {
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch (error) {
      console.warn("Barcode scanner stop:", error);
    }
    try {
      scanner.clear();
    } catch {
      // The container may already be gone when the modal unmounts.
    }
  };

  try {
    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        disableFlip: true,
        videoConstraints: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      (decodedText) => {
        if (delivered || !isValidRetailBarcode(decodedText)) return;
        delivered = true;
        onDecoded(normalizeBarcode(decodedText));
      },
      noop
    );
  } catch (error) {
    await stop();
    throw error;
  }

  return {
    get torchSupported(): boolean {
      const track = getActiveVideoTrack(container);
      return track !== null && trackSupportsTorch(track);
    },

    async setTorch(enabled: boolean): Promise<boolean> {
      const track = getActiveVideoTrack(container);
      if (!track || !trackSupportsTorch(track)) return false;
      const constraint: TorchConstraintSet = { torch: enabled };
      try {
        await track.applyConstraints({ advanced: [constraint] });
        return true;
      } catch (error) {
        console.warn("Torch constraint rejected:", error);
        return false;
      }
    },

    stop,
  };
}
