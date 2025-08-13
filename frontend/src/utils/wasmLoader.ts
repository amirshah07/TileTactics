declare global {
  interface Window {
    Go: any;
    analyzePosition: (request: string) => string;
    validateWords: (request: string) => string;
    __wasmCleanup?: () => void;
  }
}

let wasmReady = false;
let wasmLoadPromise: Promise<void> | null = null;
let goInstance: any = null;

export async function loadWasm(): Promise<void> {
  if (wasmReady) {
    // Check if WASM is still alive
    try {
      // Try a simple operation to verify WASM is still responsive
      if (typeof window.validateWords === 'function') {
        return;
      }
    } catch (e) {
      // WASM has crashed, need to reload
      console.warn('WASM has crashed, reloading...');
      wasmReady = false;
      wasmLoadPromise = null;
    }
  }
  
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = loadWasmInternal();
  return wasmLoadPromise;
}

async function loadWasmInternal(): Promise<void> {
  try {
    // Clean up any existing instance
    if (window.__wasmCleanup) {
      window.__wasmCleanup();
    }
    
    // Load wasm_exec.js script if not already loaded
    if (!window.Go) {
      await loadScript('/wasm_exec.js');
    }

    // Initialise Go
    const go = new window.Go();
    goInstance = go;

    // Load the WASM file
    const wasmResponse = await fetch('/tiletactics.wasm');
    const wasmBuffer = await wasmResponse.arrayBuffer();
    
    // Instantiate the WASM module
    const result = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    
    // Run the Go programme
    const runPromise = go.run(result.instance);
    
    // Set up cleanup function
    window.__wasmCleanup = () => {
      if (goInstance && goInstance.exit) {
        try {
          goInstance.exit();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      goInstance = null;
      wasmReady = false;
    };
    
    // Don't await the run promise as it never resolves (select {} keeps it running)
    runPromise.catch((err: any) => {
      console.error('WASM runtime error:', err);
      wasmReady = false;
      wasmLoadPromise = null;
    });
    
    // Give it a moment to initialise
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the functions are available
    if (typeof window.analyzePosition !== 'function') {
      throw new Error('analyzePosition function not found after WASM load');
    }
    if (typeof window.validateWords !== 'function') {
      throw new Error('validateWords function not found after WASM load');
    }
    
    wasmReady = true;
  } catch (error) {
    console.error('Failed to load WASM:', error);
    wasmReady = false;
    wasmLoadPromise = null;
    throw error;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Types for the WASM interface
export interface TileData {
  letter: string;
  value: number;
  isBlank: boolean;
}

export interface AnalysisRequest {
  board: (TileData | null)[][];
  rack: TileData[];
  remainingTiles: Record<string, number>;
  dictionary: string;
}

export interface MoveResult {
  word: string;
  position: { row: number; col: number };
  direction: 'H' | 'V';
  score: number;
  tilesPlaced: Array<{
    position: { row: number; col: number };
    tile: TileData;
  }>;
  leave: TileData[];
}

export interface AnalysisResponse {
  moves: MoveResult[];
  error?: string;
}

// Word validation types
export interface ValidationRequest {
  words: string[];
  dictionary: string;
}

export interface WordValidation {
  word: string;
  isValid: boolean;
}

export interface ValidationResponse {
  results: WordValidation[];
  allValid: boolean;
  invalidWords?: string[];
  error?: string;
}

export async function analyzeBoard(request: AnalysisRequest): Promise<AnalysisResponse> {
  // Ensure WASM is loaded
  await loadWasm();
  
  try {
    // Convert board nulls to empty tiles for JSON
    const boardForWasm = request.board.map(row => 
      row.map(tile => tile || { letter: '', value: 0, isBlank: false })
    );
    
    const wasmRequest = {
      ...request,
      board: boardForWasm
    };
    
    
    // Call the WASM function with retry logic
    let responseStr: string | undefined;
    try {
      responseStr = window.analyzePosition(JSON.stringify(wasmRequest));
    } catch (error: any) {
      if (error.message?.includes('Go program has already exited')) {
        // Try to reload WASM and retry once
        console.warn('WASM crashed, attempting to reload...');
        wasmReady = false;
        wasmLoadPromise = null;
        await loadWasm();
        responseStr = window.analyzePosition(JSON.stringify(wasmRequest));
      } else {
        throw error;
      }
    }
    
    // Check if response is undefined
    if (!responseStr || responseStr === 'undefined') {
      console.error('WASM returned undefined response');
      // Try reloading WASM once more
      wasmReady = false;
      wasmLoadPromise = null;
      await loadWasm();
      responseStr = window.analyzePosition(JSON.stringify(wasmRequest));
      
      if (!responseStr || responseStr === 'undefined') {
        // If still undefined, return no moves (AI will pass)
        return {
          moves: [],
          error: 'WASM analysis failed'
        };
      }
    }
    
    const response = JSON.parse(responseStr) as AnalysisResponse;
    
    if (response.error) {
      console.error('WASM error:', response.error);
      // Return empty moves so AI can pass
      return {
        moves: [],
        error: response.error
      };
    }
    
    return response;
  } catch (error) {
    console.error('Error analyzing board:', error);
    // Return empty moves array so AI can pass
    return {
      moves: [],
      error: `Analysis failed: ${error}`
    };
  }
}

export async function validateWords(words: string[], dictionary: string): Promise<ValidationResponse> {
  // Ensure WASM is loaded
  await loadWasm();
  
  try {
    const request: ValidationRequest = {
      words,
      dictionary
    };
    
    // Call the WASM function with retry logic
    let responseStr: string;
    try {
      responseStr = window.validateWords(JSON.stringify(request));
    } catch (error: any) {
      if (error.message?.includes('Go program has already exited')) {
        // Try to reload WASM and retry once
        console.warn('WASM crashed, attempting to reload...');
        wasmReady = false;
        wasmLoadPromise = null;
        await loadWasm();
        responseStr = window.validateWords(JSON.stringify(request));
      } else {
        throw error;
      }
    }
    
    const response = JSON.parse(responseStr) as ValidationResponse;
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  } catch (error) {
    console.error('Error validating words:', error);
    // If WASM completely fails, return a safe default
    if ((error as any).message?.includes('Go program has already exited')) {
      return {
        results: words.map(word => ({ word, isValid: false })),
        allValid: false,
        invalidWords: words,
        error: 'Word validation service temporarily unavailable'
      };
    }
    throw error;
  }
}

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (window.__wasmCleanup) {
      window.__wasmCleanup();
    }
  });
}