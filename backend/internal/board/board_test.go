package board

import (
	"testing"
	"tiletactics/backend/internal/game"
)

func TestNewBoard(t *testing.T) {
	b := New()

	// Test empty board
	for row := 0; row < game.BoardSize; row++ {
		for col := 0; col < game.BoardSize; col++ {
			if !b.IsEmpty(row, col) {
				t.Errorf("New board should be empty at (%d,%d)", row, col)
			}
		}
	}
}

func TestIsAnchor(t *testing.T) {
	b := New()

	// Empty board - only center is anchor
	if !b.IsAnchor(7, 7) {
		t.Error("Center should be anchor on empty board")
	}

	if b.IsAnchor(0, 0) {
		t.Error("Corner should not be anchor on empty board")
	}

	// Place a tile
	b.SetTile(7, 7, &game.Tile{Letter: 'A', Value: 1})

	// Adjacent squares should be anchors
	if !b.IsAnchor(7, 6) || !b.IsAnchor(7, 8) {
		t.Error("Squares adjacent to tiles should be anchors")
	}
}
