declare global {
  interface Window {
    Go: any;
    analyzePosition: (request: string) => string;
  }
}

let wasmReady = false;
let wasmLoadPromise: Promise<void> | null = null;

export async function loadWasm(): Promise<void> {
  if (wasmReady) return;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = loadWasmInternal();
  return wasmLoadPromise;
}

async function loadWasmInternal(): Promise<void> {
  try {
    // Load wasm_exec.js script
    await loadScript('/wasm_exec.js');

    // Initialize Go
    const go = new window.Go();

    // Load the WASM file
    const wasmResponse = await fetch('/tiletactics.wasm');
    const wasmBuffer = await wasmResponse.arrayBuffer();
    
    // Instantiate the WASM module
    const result = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    
    // Run the Go program
    go.run(result.instance);
    
    // Verify the function is available
    if (typeof window.analyzePosition !== 'function') {
      throw new Error('analyzePosition function not found after WASM load');
    }
    
    wasmReady = true;
    console.log('WASM loaded successfully');
  } catch (error) {
    console.error('Failed to load WASM:', error);
    throw error;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
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
    
    // Call the WASM function
    const responseStr = window.analyzePosition(JSON.stringify(wasmRequest));
    const response = JSON.parse(responseStr) as AnalysisResponse;
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  } catch (error) {
    console.error('Error analyzing board:', error);
    throw error;
  }
}