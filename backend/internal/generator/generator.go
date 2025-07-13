package generator

import (
	"sort"
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/gaddag"
	"tiletactics/backend/internal/game"
	"tiletactics/backend/internal/scorer"
)

type Generator struct {
	gaddag *gaddag.GADDAG
	board  *board.Board
}

func New(g *gaddag.GADDAG, b *board.Board) *Generator {
	return &Generator{
		gaddag: g,
		board:  b,
	}
}

// GenerateMoves finds all valid moves for the given rack
func (g *Generator) GenerateMoves(rack []game.Tile) []game.Move {
	var moves []game.Move

	// Find all anchor squares
	anchors := g.findAnchors()

	// For each anchor, generate moves in both directions
	for _, anchor := range anchors {
		// Generate horizontal moves through this anchor
		horizontalMoves := g.generateMovesFromAnchor(anchor, rack, game.Horizontal)
		moves = append(moves, horizontalMoves...)

		// Generate vertical moves through this anchor
		verticalMoves := g.generateMovesFromAnchor(anchor, rack, game.Vertical)
		moves = append(moves, verticalMoves...)
	}

	// Remove duplicates and invalid words
	moves = g.removeDuplicates(moves)

	// Score all moves
	sc := scorer.New(g.board)
	for i := range moves {
		moves[i].Score = sc.ScoreMove(moves[i])
	}

	// Sort by score (highest first)
	sort.Slice(moves, func(i, j int) bool {
		return moves[i].Score > moves[j].Score
	})

	return moves
}

type anchorSquare struct {
	row, col int
}

func (g *Generator) findAnchors() []anchorSquare {
	var anchors []anchorSquare

	for row := 0; row < game.BoardSize; row++ {
		for col := 0; col < game.BoardSize; col++ {
			if g.board.IsAnchor(row, col) {
				anchors = append(anchors, anchorSquare{row, col})
			}
		}
	}

	return anchors
}

func (g *Generator) generateMovesFromAnchor(anchor anchorSquare, rack []game.Tile, dir game.Direction) []game.Move {
	var moves []game.Move

	// Convert rack to a more usable format
	rackMap := make(map[rune]int)
	var blanks int
	for _, tile := range rack {
		if tile.IsBlank {
			blanks++
		} else {
			rackMap[tile.Letter]++
		}
	}

	// Special case: if anchor is right after existing tiles, start from those tiles
	prev := g.prevPos(anchor, dir)
	if prev.row >= 0 && prev.col >= 0 && g.board.GetTile(prev.row, prev.col) != nil {
		// Find the start of the existing word
		wordStart := prev
		for {
			p := g.prevPos(wordStart, dir)
			if p.row < 0 || p.col < 0 || g.board.GetTile(p.row, p.col) == nil {
				break
			}
			wordStart = p
		}

		// Generate moves starting from the existing word
		movesFromExisting := g.generateMovesFromPosition(wordStart, anchor, rackMap, blanks, dir)
		moves = append(moves, movesFromExisting...)
	} else {
		// Normal case: find all valid starting positions
		startPos := g.findWordStart(anchor, dir)

		// Try placing tiles starting from each valid position
		for pos := startPos; pos.row <= anchor.row && pos.col <= anchor.col; pos = g.nextPos(pos, dir) {
			movesFromPos := g.generateMovesFromPosition(pos, anchor, rackMap, blanks, dir)
			moves = append(moves, movesFromPos...)

			// If there's already a tile at this position, we can't start before it
			if g.board.GetTile(pos.row, pos.col) != nil {
				break
			}
		}
	}

	return moves
}

func (g *Generator) findWordStart(anchor anchorSquare, dir game.Direction) anchorSquare {
	pos := anchor

	// First, backtrack through any existing tiles
	for {
		prev := g.prevPos(pos, dir)
		if prev.row < 0 || prev.col < 0 {
			break
		}
		if g.board.GetTile(prev.row, prev.col) == nil {
			break
		}
		pos = prev
	}

	// Now backtrack through empty squares where we could place tiles
	emptyCount := 0
	for {
		prev := g.prevPos(pos, dir)

		// Stop if we hit the edge
		if prev.row < 0 || prev.col < 0 {
			break
		}

		// Stop if we hit an existing tile
		if g.board.GetTile(prev.row, prev.col) != nil {
			break
		}

		// Stop if we've gone back 7 spaces (max rack size)
		emptyCount++
		if emptyCount >= 7 {
			break
		}

		pos = prev
	}

	return pos
}

func (g *Generator) generateMovesFromPosition(start, _ anchorSquare, rackMap map[rune]int, blanks int, dir game.Direction) []game.Move {
	var moves []game.Move

	// Start GADDAG traversal from root
	g.extendRight(
		g.gaddag.Root(),
		start,
		"",                  // word built so far
		[]game.PlacedTile{}, // tiles placed so far
		rackMap,
		blanks,
		dir,
		false, // haven't seen anchor yet
		&moves,
	)

	return moves
}

func (g *Generator) nextPos(pos anchorSquare, dir game.Direction) anchorSquare {
	if dir == game.Horizontal {
		return anchorSquare{pos.row, pos.col + 1}
	}
	return anchorSquare{pos.row + 1, pos.col}
}

func (g *Generator) prevPos(pos anchorSquare, dir game.Direction) anchorSquare {
	if dir == game.Horizontal {
		return anchorSquare{pos.row, pos.col - 1}
	}
	return anchorSquare{pos.row - 1, pos.col}
}

func (g *Generator) removeDuplicates(moves []game.Move) []game.Move {
	seen := make(map[string]bool)
	var unique []game.Move

	for _, move := range moves {
		// Validate that the word is actually in the dictionary
		if !g.gaddag.Contains(move.Word) {
			continue // Skip invalid words
		}

		// Create a unique key for each move
		key := moveKey(move)
		if !seen[key] {
			seen[key] = true
			unique = append(unique, move)
		}
	}

	return unique
}

func moveKey(m game.Move) string {
	// Create unique key using position and direction
	return string(rune(m.Position.Row)) + string(rune(m.Position.Col)) + string(rune(m.Direction)) + m.Word
}

// positionToAnchor converts game.Position to anchorSquare
func positionToAnchor(p game.Position) anchorSquare {
	return anchorSquare{row: p.Row, col: p.Col}
}

// anchorToPosition converts anchorSquare to game.Position
func anchorToPosition(a anchorSquare) game.Position {
	return game.Position{Row: a.row, Col: a.col}
}
