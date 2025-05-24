package main

import (
	"fmt"
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/game"
)

func main() {
	fmt.Println("TileTactics Backend CLI")
	fmt.Println("======================")

	// Test 1: Create board
	b := board.New()
	fmt.Println("✓ Board created")

	// Test 2: Place some tiles
	b.SetTile(7, 7, &game.Tile{Letter: 'C', Value: 3})
	b.SetTile(7, 8, &game.Tile{Letter: 'A', Value: 1})
	b.SetTile(7, 9, &game.Tile{Letter: 'T', Value: 1})

	// Test 3: Check anchors
	fmt.Println("\nAnchor squares:")
	for row := 6; row <= 8; row++ {
		for col := 6; col <= 10; col++ {
			if b.IsAnchor(row, col) {
				fmt.Printf("  Anchor at (%d,%d)\n", row, col)
			}
		}
	}

	// Test 4: Print simple board view
	fmt.Println("\nBoard state:")
	printSimpleBoard(b)
}

func printSimpleBoard(b *board.Board) {
	for row := 0; row < 15; row++ {
		for col := 0; col < 15; col++ {
			tile := b.GetTile(row, col)
			if tile != nil {
				fmt.Printf("%c ", tile.Letter)
			} else if row == 7 && col == 7 {
				fmt.Print("* ")
			} else {
				fmt.Print(". ")
			}
		}
		fmt.Println()
	}
}
