import { randomUUID } from "node:crypto";

export interface ReaderStatus {
  connected: boolean;
  name: string;
}

export interface FingerprintReader {
  getStatus(): Promise<ReaderStatus>;
  readMatchedTemplateId(): Promise<string | null>;
  enrollTemplateId(): Promise<string>;
}

class SimulatorReader implements FingerprintReader {
  async getStatus(): Promise<ReaderStatus> {
    return { connected: false, name: "Simulador de consola" };
  }

  async readMatchedTemplateId(): Promise<string | null> {
    return null;
  }

  async enrollTemplateId(): Promise<string> {
    return `SIM-${randomUUID()}`;
  }
}

class UnconfiguredHardwareReader implements FingerprintReader {
  async getStatus(): Promise<ReaderStatus> {
    return { connected: false, name: "SDK biométrico sin configurar" };
  }

  async readMatchedTemplateId(): Promise<string | null> {
    return null;
  }

  async enrollTemplateId(): Promise<string> {
    throw new Error("Integrá el SDK del fabricante en bridge-huella/src/reader.ts antes de enrolar.");
  }
}

export function createReader(mode: "simulator" | "hardware"): FingerprintReader {
  return mode === "simulator" ? new SimulatorReader() : new UnconfiguredHardwareReader();
}
