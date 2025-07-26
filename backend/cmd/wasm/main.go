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
func analyzePosition(this js.Value, args []js.Value) interface{} {
	// Parse input
	if len(args) != 1 {
		return createErrorResponse("Expected 1 argument")
	}

	jsonStr := args[0].String()
	var request AnalysisRequest
	if err := json.Unmarshal([]byte(jsonStr), &request); err != nil {
		return createErrorResponse(fmt.Sprintf("Failed to parse request: %v", err))
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

	// Convert rack from JSON
	rack := make([]game.Tile, len(request.Rack))
	for i, tileJSON := range request.Rack {
		rack[i] = game.Tile{
			Letter:  rune(tileJSON.Letter[0]),
			Value:   tileJSON.Value,
			IsBlank: tileJSON.IsBlank,
		}
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
			moveJSON.TilesPlaced[j] = PlacedTileJSON{
				Position: PositionJSON{Row: placed.Position.Row, Col: placed.Position.Col},
				Tile: TileJSON{
					Letter:  string(placed.Tile.Letter),
					Value:   placed.Tile.Value,
					IsBlank: placed.Tile.IsBlank,
				},
			}
		}

		// Convert leave
		moveJSON.Leave = make([]TileJSON, len(move.Leave))
		for j, tile := range move.Leave {
			moveJSON.Leave[j] = TileJSON{
				Letter:  string(tile.Letter),
				Value:   tile.Value,
				IsBlank: tile.IsBlank,
			}
		}

		response.Moves[i] = moveJSON
	}

	// Return JSON response
	responseJSON, _ := json.Marshal(response)
	return string(responseJSON)
}

// getGaddag loads or retrieves cached GADDAG
func getGaddag(dictionary string) (*gaddag.GADDAG, error) {
	if g, exists := gaddagCache[dictionary]; exists {
		return g, nil
	}

	// Map dictionary name to filename
	var filename string
	switch dictionary {
	case "csw24":
		filename = "csw24.txt"
	case "nwl2023":
		filename = "nwl2023.txt"
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
			g.Add(word)
		}
	}

	// Cache it
	gaddagCache[dictionary] = g
	return g, nil
}

// createErrorResponse creates an error response
func createErrorResponse(error string) string {
	response := AnalysisResponse{Error: error}
	responseJSON, _ := json.Marshal(response)
	return string(responseJSON)
}

func main() {
	// Register the function
	js.Global().Set("analyzePosition", js.FuncOf(analyzePosition))

	// Keep the program running
	select {}
}
