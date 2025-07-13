package scorer

import (
	"tiletactics/backend/internal/board"
	"tiletactics/backend/internal/game"
)

type Scorer struct {
	board *board.Board
}

func New(b *board.Board) *Scorer {
	return &Scorer{board: b}
}

// ScoreMove calculates the total score for a move
func (s *Scorer) ScoreMove(move game.Move) int {
	score := 0
	wordMultiplier := 1

	// Check if board is empty
	boardEmpty := s.board.IsCompletelyEmpty()

	// Track if this move connects to existing tiles
	connectsToExisting := false
	usesExistingInMainWord := false

	// Calculate score for each letter in the word
	for i := range move.Word {
		letterScore := 0
		letterMultiplier := 1

		// Determine position of this letter
		row, col := s.getLetterPosition(move.Position, i, move.Direction)

		// Check if this position already has a tile
		existingTile := s.board.GetTile(row, col)
		if existingTile != nil {
			// Using existing tile - just add base value
			letterScore = existingTile.Value
			connectsToExisting = true
			usesExistingInMainWord = true
		} else {
			// Placing new tile - check for multipliers
			multiplier := s.board.GetMultiplier(row, col)

			// Find the tile being placed at this position
			for _, placed := range move.TilesPlaced {
				if placed.Position.Row == row && placed.Position.Col == col {
					letterScore = placed.Tile.Value
					break
				}
			}

			// Apply multiplier only for newly placed tiles
			switch multiplier.Type {
			case board.DoubleLetter:
				letterMultiplier = 2
			case board.TripleLetter:
				letterMultiplier = 3
			case board.DoubleWord:
				wordMultiplier *= 2
			case board.TripleWord:
				wordMultiplier *= 3
			default:
				// No multiplier
			}
		}

		score += letterScore * letterMultiplier
	}

	// Apply word multiplier
	score *= wordMultiplier

	// Add bonus for using all 7 tiles (bingo)
	if len(move.TilesPlaced) == 7 {
		score += 50
	}

	// Add scores from perpendicular words formed
	crossWordScore := s.calculateCrossWordScores(move)
	if crossWordScore > 0 {
		connectsToExisting = true
	}
	score += crossWordScore

	// Special case for first move - board is empty
	if boardEmpty {
		// First move doesn't need to connect to existing tiles
		// Just ensure it covers center square (7,7)
		centerCovered := false
		for i := range move.Word {
			row, col := s.getLetterPosition(move.Position, i, move.Direction)
			if row == 7 && col == 7 {
				centerCovered = true
				break
			}
		}
		if !centerCovered {
			return 0 // Invalid first move
		}
		return score
	}

	// For non-first moves, the move is valid if:
	// 1. It uses at least one existing tile in the main word, OR
	// 2. It forms a cross word (crossWordScore > 0), OR
	// 3. At least one placed tile is adjacent to an existing tile

	if !connectsToExisting && !usesExistingInMainWord {
		// Check if any placed tile is adjacent to existing tiles
		for _, placed := range move.TilesPlaced {
			if s.isAdjacentToExistingTile(placed.Position) {
				connectsToExisting = true
				break
			}
		}
	}

	if !connectsToExisting {
		return 0 // Invalid move - doesn't connect
	}

	return score
}

// isAdjacentToExistingTile checks if a position is adjacent to any existing tile
func (s *Scorer) isAdjacentToExistingTile(pos game.Position) bool {
	// Check all four directions
	adjacentPositions := []game.Position{
		{Row: pos.Row - 1, Col: pos.Col}, // up
		{Row: pos.Row + 1, Col: pos.Col}, // down
		{Row: pos.Row, Col: pos.Col - 1}, // left
		{Row: pos.Row, Col: pos.Col + 1}, // right
	}

	for _, adjPos := range adjacentPositions {
		if adjPos.Row >= 0 && adjPos.Row < game.BoardSize &&
			adjPos.Col >= 0 && adjPos.Col < game.BoardSize {
			if s.board.GetTile(adjPos.Row, adjPos.Col) != nil {
				return true
			}
		}
	}

	return false
}

// getLetterPosition calculates the board position for a letter in the word
func (s *Scorer) getLetterPosition(start game.Position, offset int, dir game.Direction) (int, int) {
	if dir == game.Horizontal {
		return start.Row, start.Col + offset
	}
	return start.Row + offset, start.Col
}

// calculateCrossWordScores calculates scores from perpendicular words formed
func (s *Scorer) calculateCrossWordScores(move game.Move) int {
	totalCrossScore := 0

	for _, placed := range move.TilesPlaced {
		crossScore := s.getCrossWordScore(placed.Position, placed.Tile, move.Direction)
		totalCrossScore += crossScore
	}

	return totalCrossScore
}

// getCrossWordScore calculates the score of a perpendicular word formed by placing a tile
func (s *Scorer) getCrossWordScore(pos game.Position, tile game.Tile, mainDir game.Direction) int {
	// Perpendicular direction
	crossDir := game.Vertical
	if mainDir == game.Vertical {
		crossDir = game.Horizontal
	}

	// Find extent of perpendicular word
	startPos := s.findWordStart(pos, crossDir)
	endPos := s.findWordEnd(pos, crossDir)

	// If no perpendicular word formed, return 0
	if startPos.Row == endPos.Row && startPos.Col == endPos.Col {
		return 0
	}

	// Calculate score of perpendicular word
	score := 0
	wordMultiplier := 1

	// Check if we're using a multiplier
	multiplier := s.board.GetMultiplier(pos.Row, pos.Col)
	switch multiplier.Type {
	case board.DoubleWord:
		wordMultiplier = 2
	case board.TripleWord:
		wordMultiplier = 3
	default:
		// No word multiplier
	}

	// Score each letter in the cross word
	currentPos := startPos
	for {
		if currentPos.Row == pos.Row && currentPos.Col == pos.Col {
			// This is the newly placed tile
			letterMultiplier := 1
			switch multiplier.Type {
			case board.DoubleLetter:
				letterMultiplier = 2
			case board.TripleLetter:
				letterMultiplier = 3
			default:
				// No letter multiplier
			}
			score += tile.Value * letterMultiplier
		} else {
			// Existing tile
			existingTile := s.board.GetTile(currentPos.Row, currentPos.Col)
			if existingTile != nil {
				score += existingTile.Value
			}
		}

		// Move to next position
		if currentPos.Row == endPos.Row && currentPos.Col == endPos.Col {
			break
		}

		if crossDir == game.Horizontal {
			currentPos.Col++
		} else {
			currentPos.Row++
		}
	}

	return score * wordMultiplier
}

// findWordStart finds the start of a word in the given direction
func (s *Scorer) findWordStart(pos game.Position, dir game.Direction) game.Position {
	current := pos

	for {
		prev := current
		if dir == game.Horizontal {
			prev.Col--
		} else {
			prev.Row--
		}

		// Check bounds
		if prev.Row < 0 || prev.Col < 0 {
			break
		}

		// Check if tile exists
		if s.board.GetTile(prev.Row, prev.Col) == nil {
			break
		}

		current = prev
	}

	return current
}

// findWordEnd finds the end of a word in the given direction
func (s *Scorer) findWordEnd(pos game.Position, dir game.Direction) game.Position {
	current := pos

	for {
		next := current
		if dir == game.Horizontal {
			next.Col++
		} else {
			next.Row++
		}

		// Check bounds
		if next.Row >= game.BoardSize || next.Col >= game.BoardSize {
			break
		}

		// Check if tile exists
		if s.board.GetTile(next.Row, next.Col) == nil {
			break
		}

		current = next
	}

	return current
}
