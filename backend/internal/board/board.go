package board

import (
	"tiletactics/backend/internal/game"
)

type Board struct {
	tiles       [game.BoardSize][game.BoardSize]*game.Tile
	multipliers [game.BoardSize][game.BoardSize]Multiplier
}

type Multiplier struct {
	Type  MultiplierType
	Value int
}

type MultiplierType int

const (
	None MultiplierType = iota
	DoubleLetter
	TripleLetter
	DoubleWord
	TripleWord
)

func New() *Board {
	b := &Board{}
	b.initializeMultipliers()
	return b
}

func (b *Board) GetTile(row, col int) *game.Tile {
	if row < 0 || row >= game.BoardSize || col < 0 || col >= game.BoardSize {
		return nil
	}
	return b.tiles[row][col]
}

func (b *Board) SetTile(row, col int, tile *game.Tile) {
	if row >= 0 && row < game.BoardSize && col >= 0 && col < game.BoardSize {
		b.tiles[row][col] = tile
	}
}

func (b *Board) IsEmpty(row, col int) bool {
	return b.GetTile(row, col) == nil
}

func (b *Board) IsAnchor(row, col int) bool {
	// Center square is anchor for first move
	if b.IsCompletelyEmpty() && row == 7 && col == 7 {
		return true
	}

	// Empty squares adjacent to tiles are anchors
	if !b.IsEmpty(row, col) {
		return false
	}

	// Check adjacent squares
	directions := [][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}
	for _, d := range directions {
		if !b.IsEmpty(row+d[0], col+d[1]) {
			return true
		}
	}
	return false
}

// IsCompletelyEmpty returns true if the board has no tiles placed
func (b *Board) IsCompletelyEmpty() bool {
	for row := 0; row < game.BoardSize; row++ {
		for col := 0; col < game.BoardSize; col++ {
			if b.tiles[row][col] != nil {
				return false
			}
		}
	}
	return true
}

// GetMultiplier returns the multiplier at the given position
func (b *Board) GetMultiplier(row, col int) Multiplier {
	if row < 0 || row >= game.BoardSize || col < 0 || col >= game.BoardSize {
		return Multiplier{Type: None, Value: 1}
	}
	return b.multipliers[row][col]
}
