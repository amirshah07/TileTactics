package main

import (
	"fmt"
	"log"
	"strings"
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/evaluator"
	"tiletactics/backend/internal/gaddag"
	"tiletactics/backend/internal/game"
	"tiletactics/backend/internal/generator"
)

func main() {
	fmt.Println("TileTactics CLI - Testing Move Generator with Evaluator")
	fmt.Println("======================================================")

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

	// Generate all moves
	moves := gen.GenerateMoves(rack)
	fmt.Printf("\nFound %d possible moves\n", len(moves))

	// Create remaining tiles map for testing
	// This simulates mid-game with some tiles already played
	remainingTiles := getTestRemainingTiles()

	// Create evaluator and get best moves
	eval := evaluator.New(remainingTiles)
	bestMoves := eval.EvaluateMoves(moves, rack, 10) // Get top 10

	// Show moves using existing tiles with more details
	fmt.Println("\nMoves using existing tiles (before evaluation):")
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

		if usesExisting && g.Contains(move.Word) && connectingMoves < 5 {
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

	// Show top moves by raw score (before evaluation)
	fmt.Println("\nTop 5 moves by raw score (before evaluation):")
	for i := 0; i < 5 && i < len(moves); i++ {
		move := moves[i]
		fmt.Printf("  %d. %s at (%d,%d) %s - %d points\n",
			i+1,
			move.Word,
			move.Position.Row,
			move.Position.Col,
			dirString(move.Direction),
			move.Score)
	}

	// Show best moves after evaluation
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("TOP MOVES AFTER EVALUATION:")
	fmt.Println(strings.Repeat("=", 50))

	for i, move := range bestMoves {
		fmt.Printf("\n%d. %s at (%d,%d) %s\n",
			i+1,
			move.Word,
			move.Position.Row,
			move.Position.Col,
			dirString(move.Direction))
		fmt.Printf("   Score: %d points\n", move.Score)
		fmt.Printf("   Tiles placed: %d\n", len(move.TilesPlaced))
		fmt.Printf("   Leave: %s\n", formatLeave(move.Leave))

		// Show tile placement details
		fmt.Printf("   Placing: ")
		for j, placed := range move.TilesPlaced {
			if j > 0 {
				fmt.Print(", ")
			}
			if placed.Tile.IsBlank {
				fmt.Printf("?→%c", placed.Tile.Letter)
			} else {
				fmt.Printf("%c", placed.Tile.Letter)
			}
		}
		fmt.Println()
	}

	// Show evaluation insights
	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("EVALUATION INSIGHTS:")
	fmt.Println(strings.Repeat("=", 50))
	totalTilesRemaining := 0
	for _, count := range remainingTiles {
		totalTilesRemaining += count
	}
	fmt.Printf("Game stage: ")
	if totalTilesRemaining == 0 {
		fmt.Println("ENDGAME")
	} else if totalTilesRemaining < 7 {
		fmt.Println("PRE-ENDGAME")
	} else if totalTilesRemaining > 80 {
		fmt.Println("EARLY GAME")
	} else {
		fmt.Println("MID-GAME")
	}
	fmt.Printf("Tiles remaining in bag: %d\n", totalTilesRemaining)
	fmt.Println("\nThe evaluator considers:")
	fmt.Println("- Raw score (primary factor)")
	fmt.Println("- Leave quality (S, blanks, vowel balance)")
	fmt.Println("- Board position (center control)")
	fmt.Println("- Defense (blocking opponent)")
	fmt.Println("- Synergies (QU, ER, ING, etc.)")
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

func formatLeave(leave []game.Tile) string {
	if len(leave) == 0 {
		return "none (used all tiles!)"
	}

	letters := make([]string, len(leave))
	for i, tile := range leave {
		if tile.IsBlank {
			letters[i] = "?"
		} else {
			letters[i] = string(tile.Letter)
		}
	}
	return strings.Join(letters, "")
}

// getTestRemainingTiles returns a simulated mid-game tile distribution
func getTestRemainingTiles() map[rune]int {
	// Standard Scrabble distribution minus some tiles to simulate mid-game
	// Already played: C, A, T from board, and simulating some others played
	return map[rune]int{
		'A': 6, // 9 total, 3 played (1 on board, 2 elsewhere)
		'B': 2,
		'C': 1, // 2 total, 1 on board
		'D': 3,
		'E': 8, // 12 total, 4 played
		'F': 2,
		'G': 2,
		'H': 2,
		'I': 7, // 9 total, 2 played
		'J': 1,
		'K': 1,
		'L': 3,
		'M': 2,
		'N': 5,
		'O': 6, // 8 total, 2 played
		'P': 2,
		'Q': 1,
		'R': 5,
		'S': 3, // 4 total, 1 played
		'T': 5, // 6 total, 1 on board
		'U': 3,
		'V': 2,
		'W': 2,
		'X': 1,
		'Y': 2,
		'Z': 1,
		'?': 2, // Blanks
	}
}
