//go:build js && wasm
// +build js,wasm

package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"syscall/js"
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/evaluator"
	"tiletactics/backend/internal/gaddag"
	"tiletactics/backend/internal/game"
	"tiletactics/backend/internal/generator"
)

// Global GADDAG to avoid reloading
var gaddagCache map[string]*gaddag.GADDAG

func init() {
	gaddagCache = make(map[string]*gaddag.GADDAG)
}

// ValidationRequest represents word validation input
type ValidationRequest struct {
	Words      []string `json:"words"`
	Dictionary string   `json:"dictionary"`
}

// ValidationResponse represents word validation output
type ValidationResponse struct {
	Results      []WordValidation `json:"results"`
	AllValid     bool             `json:"allValid"`
	InvalidWords []string         `json:"invalidWords,omitempty"`
	Error        string           `json:"error,omitempty"`
}

// WordValidation represents validation result for a single word
type WordValidation struct {
	Word    string `json:"word"`
	IsValid bool   `json:"isValid"`
}

// validateWords validates a list of words against the dictionary
func validateWords(this js.Value, args []js.Value) (result interface{}) {
	// Wrap in panic recovery
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Panic in validateWords: %v\n", r)
			response := ValidationResponse{
				Error: fmt.Sprintf("Internal error: %v", r),
			}
			responseJSON, _ := json.Marshal(response)
			js.Global().Get("console").Call("error", "WASM panic:", r)
			result = string(responseJSON)
		}
	}()

	// Parse input
	if len(args) != 1 {
		return createValidationErrorResponse("Expected 1 argument")
	}

	jsonStr := args[0].String()
	var request ValidationRequest
	if err := json.Unmarshal([]byte(jsonStr), &request); err != nil {
		return createValidationErrorResponse(fmt.Sprintf("Failed to parse request: %v", err))
	}

	// Validate input
	if len(request.Words) == 0 {
		// Empty word list - return empty results
		return createValidationErrorResponse("No words to validate")
	}

	// Load or get cached GADDAG
	g, err := getGaddag(request.Dictionary)
	if err != nil {
		return createValidationErrorResponse(fmt.Sprintf("Failed to load dictionary: %v", err))
	}

	// Validate each word
	results := make([]WordValidation, len(request.Words))
	invalidWords := []string{}
	allValid := true

	for i, word := range request.Words {
		// Skip empty words
		if word == "" {
			results[i] = WordValidation{
				Word:    word,
				IsValid: false,
			}
			allValid = false
			invalidWords = append(invalidWords, word)
			continue
		}

		// Handle blanks - blanks are represented as lowercase in the word
		// Convert word with blanks to check format
		checkWord := ""
		for _, ch := range word {
			if ch >= 'a' && ch <= 'z' {
				// Lowercase indicates blank tile - convert to uppercase for checking
				checkWord += strings.ToUpper(string(ch))
			} else {
				checkWord += string(ch)
			}
		}

		// Check if word exists in dictionary
		isValid := g.Contains(checkWord)

		results[i] = WordValidation{
			Word:    word,
			IsValid: isValid,
		}

		if !isValid {
			allValid = false
			invalidWords = append(invalidWords, word)
		}
	}

	// Create response
	response := ValidationResponse{
		Results:      results,
		AllValid:     allValid,
		InvalidWords: invalidWords,
	}

	// Return JSON response
	responseJSON, _ := json.Marshal(response)
	return string(responseJSON)
}

// createValidationErrorResponse creates an error response for validation
func createValidationErrorResponse(error string) string {
	response := ValidationResponse{Error: error}
	responseJSON, _ := json.Marshal(response)
	return string(responseJSON)
}

// AnalysisRequest represents the input from JavaScript
type AnalysisRequest struct {
	Board          [][]TileJSON   `json:"board"`
	Rack           []TileJSON     `json:"rack"`
	RemainingTiles map[string]int `json:"remainingTiles"`
	Dictionary     string         `json:"dictionary"`
}

// TileJSON represents a tile in JSON format
type TileJSON struct {
	Letter  string `json:"letter"`
	Value   int    `json:"value"`
	IsBlank bool   `json:"isBlank"`
}

// AnalysisResponse represents the output to JavaScript
type AnalysisResponse struct {
	Moves []MoveJSON `json:"moves"`
	Error string     `json:"error,omitempty"`
}

// MoveJSON represents a move in JSON format
type MoveJSON struct {
	Word        string           `json:"word"`
	Position    PositionJSON     `json:"position"`
	Direction   string           `json:"direction"`
	Score       int              `json:"score"`
	TilesPlaced []PlacedTileJSON `json:"tilesPlaced"`
	Leave       []TileJSON       `json:"leave"`
}

// PositionJSON represents a position in JSON format
type PositionJSON struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

// PlacedTileJSON represents a placed tile in JSON format
type PlacedTileJSON struct {
	Position PositionJSON `json:"position"`
	Tile     TileJSON     `json:"tile"`
}

// analyzePosition is the main function exposed to JavaScript
func analyzePosition(this js.Value, args []js.Value) (result interface{}) {
	// Always return something, even on panic
	result = createErrorResponse("Unexpected error occurred")

	// Wrap in panic recovery
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Panic in analyzePosition: %v\n", r)
			response := AnalysisResponse{
				Error: fmt.Sprintf("Internal error: %v", r),
			}
			responseJSON, _ := json.Marshal(response)
			js.Global().Get("console").Call("error", "WASM panic:", r)
			result = string(responseJSON)
		}
	}()

	// Parse input
	if len(args) != 1 {
		return createErrorResponse("Expected 1 argument")
	}

	jsonStr := args[0].String()
	if jsonStr == "" {
		return createErrorResponse("Empty request")
	}

	var request AnalysisRequest
	if err := json.Unmarshal([]byte(jsonStr), &request); err != nil {
		return createErrorResponse(fmt.Sprintf("Failed to parse request: %v", err))
	}

	// Validate rack is not empty
	if len(request.Rack) == 0 {
		// Return empty moves list if no tiles in rack
		response := AnalysisResponse{
			Moves: []MoveJSON{},
		}
		responseJSON, _ := json.Marshal(response)
		return string(responseJSON)
	}

	// Load or get cached GADDAG
	g, err := getGaddag(request.Dictionary)
	if err != nil {
		return createErrorResponse(fmt.Sprintf("Failed to load dictionary: %v", err))
	}

	// Convert board from JSON
	b := board.New()
	for row := 0; row < len(request.Board); row++ {
		for col := 0; col < len(request.Board[row]); col++ {
			tileJSON := request.Board[row][col]
			if tileJSON.Letter != "" {
				tile := &game.Tile{
					Letter:  rune(tileJSON.Letter[0]),
					Value:   tileJSON.Value,
					IsBlank: tileJSON.IsBlank,
				}
				b.SetTile(row, col, tile)
			}
		}
	}

	// Convert rack from JSON - handle empty letters
	rack := make([]game.Tile, 0, len(request.Rack))
	for _, tileJSON := range request.Rack {
		if tileJSON.Letter == "" {
			// Handle blank tiles
			rack = append(rack, game.Tile{
				Letter:  '?',
				Value:   0,
				IsBlank: true,
			})
		} else {
			rack = append(rack, game.Tile{
				Letter:  rune(tileJSON.Letter[0]),
				Value:   tileJSON.Value,
				IsBlank: tileJSON.IsBlank,
			})
		}
	}

	// If rack is still empty after processing, return no moves
	if len(rack) == 0 {
		response := AnalysisResponse{
			Moves: []MoveJSON{},
		}
		responseJSON, _ := json.Marshal(response)
		return string(responseJSON)
	}

	// Convert remaining tiles
	remainingTiles := make(map[rune]int)
	for letter, count := range request.RemainingTiles {
		if letter == "?" {
			remainingTiles['?'] = count
		} else if len(letter) > 0 {
			remainingTiles[rune(letter[0])] = count
		}
	}

	// Generate moves
	gen := generator.New(g, b)
	allMoves := gen.GenerateMoves(rack)

	// If no moves found, return empty list
	if len(allMoves) == 0 {
		response := AnalysisResponse{
			Moves: []MoveJSON{},
		}
		responseJSON, _ := json.Marshal(response)
		return string(responseJSON)
	}

	// Evaluate moves
	eval := evaluator.New(remainingTiles)
	bestMoves := eval.EvaluateMoves(allMoves, rack, 10) // Return top 10

	// Convert moves to JSON format
	response := AnalysisResponse{
		Moves: make([]MoveJSON, len(bestMoves)),
	}

	for i, move := range bestMoves {
		moveJSON := MoveJSON{
			Word:     move.Word,
			Position: PositionJSON{Row: move.Position.Row, Col: move.Position.Col},
			Score:    move.Score,
		}

		// Set direction
		if move.Direction == game.Horizontal {
			moveJSON.Direction = "H"
		} else {
			moveJSON.Direction = "V"
		}

		// Convert tiles placed
		moveJSON.TilesPlaced = make([]PlacedTileJSON, len(move.TilesPlaced))
		for j, placed := range move.TilesPlaced {
			// Keep the letter even for blank tiles
			// Blank tiles should have their designated letter (what they represent)
			letter := string(placed.Tile.Letter)

			// Only set to empty if there's truly no letter (which shouldn't happen in valid moves)
			if placed.Tile.Letter == 0 {
				letter = ""
			}

			moveJSON.TilesPlaced[j] = PlacedTileJSON{
				Position: PositionJSON{Row: placed.Position.Row, Col: placed.Position.Col},
				Tile: TileJSON{
					Letter:  letter, // Keeps the letter for blanks
					Value:   placed.Tile.Value,
					IsBlank: placed.Tile.IsBlank,
				},
			}
		}

		// Convert leave
		moveJSON.Leave = make([]TileJSON, len(move.Leave))
		for j, tile := range move.Leave {
			letter := string(tile.Letter)

			// For leave tiles, blanks might be represented as '?'
			// Keep the letter as-is unless it's truly empty
			if tile.Letter == 0 {
				letter = ""
			} else if tile.IsBlank && tile.Letter == '?' {
				// Leave blanks as '?' in the leave
				letter = "?"
			}

			moveJSON.Leave[j] = TileJSON{
				Letter:  letter,
				Value:   tile.Value,
				IsBlank: tile.IsBlank,
			}
		}

		response.Moves[i] = moveJSON
	}

	// Return JSON response
	responseJSON, err := json.Marshal(response)
	if err != nil {
		return createErrorResponse(fmt.Sprintf("Failed to marshal response: %v", err))
	}

	return string(responseJSON)
}

// getGaddag loads or retrieves cached GADDAG
func getGaddag(dictionary string) (*gaddag.GADDAG, error) {
	// Normalise dictionary name to lowercase for consistency
	dictLower := strings.ToLower(dictionary)

	if g, exists := gaddagCache[dictLower]; exists {
		return g, nil
	}

	// Map dictionary name to filename
	var filename string
	switch dictLower {
	case "csw24":
		filename = "CSW24.txt"
	case "nwl2023":
		filename = "NWL2023.txt"
	default:
		return nil, fmt.Errorf("unknown dictionary: %s", dictionary)
	}

	// Fetch dictionary via HTTP
	url := "/dictionaries/" + filename

	// Use XMLHttpRequest for synchronous fetch
	xhr := js.Global().Get("XMLHttpRequest").New()
	xhr.Call("open", "GET", url, false) // false = synchronous
	xhr.Call("send")

	if xhr.Get("status").Int() != 200 {
		return nil, fmt.Errorf("failed to fetch dictionary: status %d", xhr.Get("status").Int())
	}

	text := xhr.Get("responseText").String()
	words := strings.Split(strings.TrimSpace(text), "\n")

	// Build GADDAG
	g := gaddag.New()
	for _, word := range words {
		word = strings.TrimSpace(word)
		if word != "" {
			g.Add(strings.ToUpper(word)) // Ensure uppercase
		}
	}

	gaddagCache[dictLower] = g
	return g, nil
}

// createErrorResponse creates an error response
func createErrorResponse(error string) string {
	response := AnalysisResponse{Error: error}
	responseJSON, _ := json.Marshal(response)
	return string(responseJSON)
}

func main() {
	// Register the functions
	js.Global().Set("analyzePosition", js.FuncOf(analyzePosition))
	js.Global().Set("validateWords", js.FuncOf(validateWords))

	// Keep the program running
	select {}
}
