package evaluator

import (
	"testing"
	"tiletactics/backend/internal/game"
)

func TestEvaluateLeave(t *testing.T) {
	remainingTiles := map[rune]int{
		'E': 8, 'A': 6, 'I': 6, 'O': 5, 'U': 3,
		'S': 4, 'R': 5, 'T': 5, 'N': 5, 'L': 4,
	}

	eval := New(remainingTiles)

	tests := []struct {
		name    string
		leave   []game.Tile
		wantMin float64
		wantMax float64
	}{
		{
			name: "Good balanced leave - S,E,R,T",
			leave: []game.Tile{
				{Letter: 'S', Value: 1},
				{Letter: 'E', Value: 1},
				{Letter: 'R', Value: 1},
				{Letter: 'T', Value: 1},
			},
			wantMin: 25.0, // High value due to good tiles and ER synergy
			wantMax: 35.0,
		},
		{
			name: "Blank in leave",
			leave: []game.Tile{
				{Letter: '?', Value: 0, IsBlank: true},
				{Letter: 'A', Value: 1},
				{Letter: 'T', Value: 1},
			},
			wantMin: 35.0, // Blank is worth 25 alone
			wantMax: 45.0,
		},
		{
			name: "Q without U",
			leave: []game.Tile{
				{Letter: 'Q', Value: 10},
				{Letter: 'A', Value: 1},
				{Letter: 'T', Value: 1},
			},
			wantMin: -5.0, // Q penalty outweighs other tiles
			wantMax: 10.0,
		},
		{
			name: "Q with U",
			leave: []game.Tile{
				{Letter: 'Q', Value: 10},
				{Letter: 'U', Value: 1},
				{Letter: 'A', Value: 1},
			},
			wantMin: 5.0, // Q penalty + U value + synergy bonus - vowel penalty
			wantMax: 6.0,
		},
		{
			name: "Too many vowels",
			leave: []game.Tile{
				{Letter: 'A', Value: 1},
				{Letter: 'E', Value: 1},
				{Letter: 'I', Value: 1},
				{Letter: 'O', Value: 1},
				{Letter: 'U', Value: 1},
			},
			wantMin: 20.0, // Good tiles but vowel penalty
			wantMax: 30.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := eval.evaluateLeave(tt.leave)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("evaluateLeave() = %v, want between %v and %v", got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestCalculateLeave(t *testing.T) {
	eval := New(map[rune]int{})

	tests := []struct {
		name        string
		rack        []game.Tile
		tilesPlaced []game.PlacedTile
		wantLeave   int
	}{
		{
			name: "Simple placement",
			rack: []game.Tile{
				{Letter: 'C', Value: 3},
				{Letter: 'A', Value: 1},
				{Letter: 'T', Value: 1},
				{Letter: 'S', Value: 1},
			},
			tilesPlaced: []game.PlacedTile{
				{Position: game.Position{Row: 7, Col: 7}, Tile: game.Tile{Letter: 'C', Value: 3}},
				{Position: game.Position{Row: 7, Col: 8}, Tile: game.Tile{Letter: 'A', Value: 1}},
				{Position: game.Position{Row: 7, Col: 9}, Tile: game.Tile{Letter: 'T', Value: 1}},
			},
			wantLeave: 1, // Only S remains
		},
		{
			name: "Using blank",
			rack: []game.Tile{
				{Letter: '?', Value: 0, IsBlank: true},
				{Letter: 'A', Value: 1},
				{Letter: 'T', Value: 1},
			},
			tilesPlaced: []game.PlacedTile{
				{Position: game.Position{Row: 7, Col: 7}, Tile: game.Tile{Letter: 'C', Value: 0, IsBlank: true}},
			},
			wantLeave: 2, // A and T remain
		},
		{
			name: "Using all tiles (bingo)",
			rack: []game.Tile{
				{Letter: 'S', Value: 1},
				{Letter: 'T', Value: 1},
				{Letter: 'A', Value: 1},
				{Letter: 'R', Value: 1},
				{Letter: 'I', Value: 1},
				{Letter: 'N', Value: 1},
				{Letter: 'G', Value: 1},
			},
			tilesPlaced: []game.PlacedTile{
				{Position: game.Position{Row: 7, Col: 7}, Tile: game.Tile{Letter: 'S', Value: 1}},
				{Position: game.Position{Row: 7, Col: 8}, Tile: game.Tile{Letter: 'T', Value: 1}},
				{Position: game.Position{Row: 7, Col: 9}, Tile: game.Tile{Letter: 'A', Value: 1}},
				{Position: game.Position{Row: 7, Col: 10}, Tile: game.Tile{Letter: 'R', Value: 1}},
				{Position: game.Position{Row: 7, Col: 11}, Tile: game.Tile{Letter: 'I', Value: 1}},
				{Position: game.Position{Row: 7, Col: 12}, Tile: game.Tile{Letter: 'N', Value: 1}},
				{Position: game.Position{Row: 7, Col: 13}, Tile: game.Tile{Letter: 'G', Value: 1}},
			},
			wantLeave: 0, // No tiles remain
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := eval.calculateLeave(tt.rack, tt.tilesPlaced)
			if len(got) != tt.wantLeave {
				t.Errorf("calculateLeave() returned %d tiles, want %d", len(got), tt.wantLeave)
			}
		})
	}
}

func TestEvaluateMoves(t *testing.T) {
	// Setup remaining tiles (mid-game scenario)
	remainingTiles := map[rune]int{
		'E': 8, 'A': 6, 'I': 6, 'O': 5, 'U': 3,
		'S': 4, 'R': 5, 'T': 5, 'N': 5, 'L': 4,
		'Q': 1, 'Z': 1, 'X': 1, '?': 2,
	}

	eval := New(remainingTiles)

	rack := []game.Tile{
		{Letter: 'S', Value: 1},
		{Letter: 'C', Value: 3},
		{Letter: 'A', Value: 1},
		{Letter: 'R', Value: 1},
		{Letter: 'E', Value: 1},
		{Letter: 'D', Value: 2},
		{Letter: 'Q', Value: 10},
	}

	// Create some mock moves
	moves := []game.Move{
		{
			Word:      "SCARED",
			Position:  game.Position{Row: 7, Col: 7},
			Direction: game.Horizontal,
			Score:     20, // Low score but uses 6 tiles
			TilesPlaced: []game.PlacedTile{
				{Position: game.Position{Row: 7, Col: 7}, Tile: game.Tile{Letter: 'S', Value: 1}},
				{Position: game.Position{Row: 7, Col: 8}, Tile: game.Tile{Letter: 'C', Value: 3}},
				{Position: game.Position{Row: 7, Col: 9}, Tile: game.Tile{Letter: 'A', Value: 1}},
				{Position: game.Position{Row: 7, Col: 10}, Tile: game.Tile{Letter: 'R', Value: 1}},
				{Position: game.Position{Row: 7, Col: 11}, Tile: game.Tile{Letter: 'E', Value: 1}},
				{Position: game.Position{Row: 7, Col: 12}, Tile: game.Tile{Letter: 'D', Value: 2}},
			},
		},
		{
			Word:      "ACED",
			Position:  game.Position{Row: 7, Col: 7},
			Direction: game.Horizontal,
			Score:     35, // Higher score but leaves QRSE
			TilesPlaced: []game.PlacedTile{
				{Position: game.Position{Row: 7, Col: 7}, Tile: game.Tile{Letter: 'A', Value: 1}},
				{Position: game.Position{Row: 7, Col: 8}, Tile: game.Tile{Letter: 'C', Value: 3}},
				{Position: game.Position{Row: 7, Col: 9}, Tile: game.Tile{Letter: 'E', Value: 1}},
				{Position: game.Position{Row: 7, Col: 10}, Tile: game.Tile{Letter: 'D', Value: 2}},
			},
		},
		{
			Word:      "SCAR",
			Position:  game.Position{Row: 7, Col: 7},
			Direction: game.Horizontal,
			Score:     25, // Medium score, balanced leave
			TilesPlaced: []game.PlacedTile{
				{Position: game.Position{Row: 7, Col: 7}, Tile: game.Tile{Letter: 'S', Value: 1}},
				{Position: game.Position{Row: 7, Col: 8}, Tile: game.Tile{Letter: 'C', Value: 3}},
				{Position: game.Position{Row: 7, Col: 9}, Tile: game.Tile{Letter: 'A', Value: 1}},
				{Position: game.Position{Row: 7, Col: 10}, Tile: game.Tile{Letter: 'R', Value: 1}},
			},
		},
	}

	// Evaluate moves
	evaluated := eval.EvaluateMoves(moves, rack, 3)

	// Check that we got 3 moves back
	if len(evaluated) != 3 {
		t.Errorf("EvaluateMoves() returned %d moves, want 3", len(evaluated))
	}

	// Check that leave was populated
	for i, move := range evaluated {
		if move.Leave == nil {
			t.Errorf("Move %d has nil Leave", i)
		}
	}

	// The ACED move might rank lower than SCARED despite higher score
	// due to leaving Q without U
	t.Logf("Move rankings:")
	for i, move := range evaluated {
		t.Logf("%d. %s (score: %d, leave: %d tiles)",
			i+1, move.Word, move.Score, len(move.Leave))
	}
}

func TestGameStageAdjustment(t *testing.T) {
	eval := New(map[rune]int{})

	tests := []struct {
		name            string
		totalRemaining  int
		wantLeaveWeight float64
	}{
		{
			name:            "Endgame",
			totalRemaining:  0,
			wantLeaveWeight: 0.0,
		},
		{
			name:            "Pre-endgame",
			totalRemaining:  5,
			wantLeaveWeight: DefaultWeights.Leave * 0.5,
		},
		{
			name:            "Mid-game",
			totalRemaining:  50,
			wantLeaveWeight: DefaultWeights.Leave,
		},
		{
			name:            "Early game",
			totalRemaining:  90,
			wantLeaveWeight: DefaultWeights.Leave * 1.2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			weights := eval.adjustWeightsForGameStage(tt.totalRemaining)
			if weights.Leave != tt.wantLeaveWeight {
				t.Errorf("adjustWeightsForGameStage() leave weight = %v, want %v",
					weights.Leave, tt.wantLeaveWeight)
			}
		})
	}
}
