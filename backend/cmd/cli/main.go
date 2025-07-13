package main

import (
	"fmt"
	"log"
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/gaddag"
	"tiletactics/backend/internal/game"
)

func main() {
	fmt.Println("TileTactics CLI - Testing GADDAG")
	fmt.Println("=================================")

	// Load the test dictionary
	g, err := gaddag.LoadFromFile("../dictionaries/test_dict.txt")
	if err != nil {
		log.Fatalf("Failed to load dictionary: %v", err)
	}

	// Show stats
	fmt.Println("\nDictionary loaded!")
	fmt.Println(g.Stats())

	// Test some lookups
	fmt.Println("\nTesting word lookups:")
	testWords := []string{"CAT", "CATS", "DOG", "SCAR", "HELLO"}
	for _, word := range testWords {
		exists := g.Contains(word)
		fmt.Printf("  %s: %v\n", word, exists)
	}

	// Set up board with a word
	fmt.Println("\nSetting up board with 'CAT' at (7,7):")
	b := board.New()

	// Place "CAT" horizontally at row 7, starting at column 7
	b.SetTile(7, 7, &game.Tile{Letter: 'C', Value: 3})
	b.SetTile(7, 8, &game.Tile{Letter: 'A', Value: 1})
	b.SetTile(7, 9, &game.Tile{Letter: 'T', Value: 1})

	// Show the board
	fmt.Println("\nBoard state:")
	printBoard(b)

	// Find anchors
	fmt.Println("\nAnchor squares (marked with *):")
	printBoardWithAnchors(b)
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

func printBoardWithAnchors(b *board.Board) {
	fmt.Println("   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4")
	fmt.Println("   - - - - - - - - - - - - - - -")
	for row := 0; row < game.BoardSize; row++ {
		fmt.Printf("%2d|", row)
		for col := 0; col < game.BoardSize; col++ {
			if tile := b.GetTile(row, col); tile != nil {
				fmt.Printf("%c ", tile.Letter)
			} else if b.IsAnchor(row, col) {
				fmt.Print("* ")
			} else {
				fmt.Print(". ")
			}
		}
		fmt.Println("|")
	}
	fmt.Println("   - - - - - - - - - - - - - - -")
}
