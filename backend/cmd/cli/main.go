package main

import (
	"fmt"
	"log"
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/gaddag"
	"tiletactics/backend/internal/game"
	"tiletactics/backend/internal/generator"
)

func main() {
	fmt.Println("TileTactics CLI - Testing Move Generator")
	fmt.Println("=========================================")

	// Load the test dictionary
	g, err := gaddag.LoadFromFile("../dictionaries/test_dict.txt")
	if err != nil {
		log.Fatalf("Failed to load dictionary: %v", err)
	}

	// Show stats
	fmt.Println("\nDictionary loaded!")
	fmt.Println(g.Stats())

	// Set up board with a word
	fmt.Println("\nSetting up board with 'CAT' at (7,7):")
	b := board.New()

	// Place "CAT" horizontally at row 7, starting at column 7
	b.SetTile(7, 7, &game.Tile{Letter: 'C', Value: 3})
	b.SetTile(7, 8, &game.Tile{Letter: 'A', Value: 1})
	b.SetTile(7, 9, &game.Tile{Letter: 'T', Value: 1})

	// Verify tiles are placed correctly
	fmt.Println("\nVerifying board tiles:")
	for col := 6; col <= 10; col++ {
		tile := b.GetTile(7, col)
		if tile != nil {
			fmt.Printf("  Position (7,%d): %c (value=%d)\n", col, tile.Letter, tile.Value)
		}
	}

	// Show the board
	fmt.Println("\nBoard state:")
	printBoard(b)

	// Create generator
	gen := generator.New(g, b)

	// Test with a rack
	fmt.Println("\nGenerating moves with rack: S, C, A, R")
	rack := []game.Tile{
		{Letter: 'S', Value: 1},
		{Letter: 'C', Value: 3},
		{Letter: 'A', Value: 1},
		{Letter: 'R', Value: 1},
	}

	moves := gen.GenerateMoves(rack)
	fmt.Printf("\nFound %d possible moves\n", len(moves))

	// Show moves using existing tiles with more details
	fmt.Println("\nMoves using existing tiles (should score higher):")
	connectingMoves := 0
	for _, move := range moves {
		// Check if this move uses any existing tiles
		usesExisting := false
		if move.Direction == game.Horizontal && move.Position.Row == 7 {
			// Check if horizontal move overlaps with CAT at row 7
			if move.Position.Col <= 7 && move.Position.Col+len(move.Word) > 7 {
				usesExisting = true
			}
		}

		if usesExisting && g.Contains(move.Word) {
			connectingMoves++
			fmt.Printf("  %s at (%d,%d) %s - %d points, %d tiles placed\n",
				move.Word,
				move.Position.Row,
				move.Position.Col,
				dirString(move.Direction),
				move.Score,
				len(move.TilesPlaced))
		}
	}
	fmt.Printf("Found %d moves that connect to existing tiles\n", connectingMoves)

	// Show top 10 moves by score
	fmt.Println("\nTop 10 moves by score:")
	count := 0
	nonZeroCount := 0
	for _, move := range moves {
		if move.Score > 0 {
			nonZeroCount++
		}
		if g.Contains(move.Word) {
			fmt.Printf("  %d. %s at (%d,%d) %s - %d points, %d tiles placed\n",
				count+1,
				move.Word,
				move.Position.Row,
				move.Position.Col,
				dirString(move.Direction),
				move.Score,
				len(move.TilesPlaced))
			count++
			if count >= 10 {
				break
			}
		}
	}
	fmt.Printf("\nTotal moves with non-zero scores: %d\n", nonZeroCount)
}

func printBoard(b *board.Board) {
	fmt.Println("   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4")
	fmt.Println("   - - - - - - - - - - - - - - -")
	for row := 0; row < game.BoardSize; row++ {
		fmt.Printf("%2d|", row)
		for col := 0; col < game.BoardSize; col++ {
			if tile := b.GetTile(row, col); tile != nil {
				fmt.Printf("%c ", tile.Letter)
			} else {
				fmt.Print(". ")
			}
		}
		fmt.Println("|")
	}
	fmt.Println("   - - - - - - - - - - - - - - -")
}

func dirString(dir game.Direction) string {
	if dir == game.Horizontal {
		return "horizontal"
	}
	return "vertical"
}
