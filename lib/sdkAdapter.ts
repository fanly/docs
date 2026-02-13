export interface WordSDKAdapter {
  init(container: HTMLElement): Promise<void>;
  loadDocument(file: File): Promise<void>;
  destroy(): void;
}

type NutrientInstance = {
  loadDocument: (input: Blob | File | ArrayBuffer) => Promise<void>;
  destroy: () => void;
};

type NutrientRuntime = {
  mount: (container: HTMLElement, options: { licenseKey?: string }) => Promise<NutrientInstance>;
};

declare global {
  interface Window {
    NutrientEditor?: NutrientRuntime;
  }
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-nutrient-sdk=\"${url}\"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.nutrientSdk = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Nutrient SDK script: ${url}`));
    document.head.appendChild(script);
  });
}

export class NutrientSDKAdapter implements WordSDKAdapter {
  private instance: NutrientInstance | null = null;

  constructor(
    private readonly options: {
      sdkScriptUrl?: string;
      licenseKey?: string;
    }
  ) {}

  async init(container: HTMLElement): Promise<void> {
    if (this.options.sdkScriptUrl) {
      await loadScript(this.options.sdkScriptUrl);
    }

    const runtime = window.NutrientEditor;
    if (!runtime) {
      throw new Error(
        "Nutrient SDK runtime not found. Set NEXT_PUBLIC_NUTRIENT_SDK_SCRIPT and expose window.NutrientEditor."
      );
    }

    this.instance = await runtime.mount(container, { licenseKey: this.options.licenseKey });
  }

  async loadDocument(file: File): Promise<void> {
    if (!this.instance) {
      throw new Error("SDK adapter not initialized");
    }
    await this.instance.loadDocument(file);
  }

  destroy(): void {
    this.instance?.destroy();
    this.instance = null;
  }
}

export function createWordSDKAdapter(): WordSDKAdapter {
  return new NutrientSDKAdapter({
    sdkScriptUrl: process.env.NEXT_PUBLIC_NUTRIENT_SDK_SCRIPT,
    licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY
  });
}
