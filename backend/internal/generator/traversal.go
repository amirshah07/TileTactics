package generator

import (
	"tiletactics/backend/internal/gaddag"
	"tiletactics/backend/internal/game"
)

// extendRight continues building a word to the right/down from current position
func (g *Generator) extendRight(
	node *gaddag.Node,
	pos anchorSquare,
	word string,
	tilesPlaced []game.PlacedTile,
	rackMap map[rune]int,
	blanks int,
	dir game.Direction,
	anchorSeen bool,
	moves *[]game.Move,
) {
	// Check if current position is out of bounds
	if pos.row >= game.BoardSize || pos.col >= game.BoardSize {
		// Check if we can terminate here
		if anchorSeen && node.IsTerminal() && len(tilesPlaced) > 0 {
			move := game.Move{
				Word:        word,
				Position:    g.findMoveStart(word, tilesPlaced, dir),
				Direction:   dir,
				TilesPlaced: tilesPlaced,
			}
			*moves = append(*moves, move)
		}
		return
	}

	existingTile := g.board.GetTile(pos.row, pos.col)

	if existingTile != nil {
		// Square already has a tile - must use it
		letter := existingTile.Letter
		if nextNode := node.GetEdge(letter); nextNode != nil {
			nextPos := g.nextPos(pos, dir)
			isAnchor := g.board.IsAnchor(pos.row, pos.col)
			g.extendRight(
				nextNode,
				nextPos,
				word+string(letter),
				tilesPlaced,
				rackMap,
				blanks,
				dir,
				anchorSeen || isAnchor,
				moves,
			)
		}
	} else {
		// Empty square - check if we can terminate here
		if anchorSeen && node.IsTerminal() && len(tilesPlaced) > 0 {
			move := game.Move{
				Word:        word,
				Position:    g.findMoveStart(word, tilesPlaced, dir),
				Direction:   dir,
				TilesPlaced: tilesPlaced,
			}
			*moves = append(*moves, move)
		}

		// Try placing tiles from rack
		isAnchor := g.board.IsAnchor(pos.row, pos.col)

		// Try each letter in rack
		for letter, count := range rackMap {
			if count > 0 && g.isValidCrossWord(pos, letter, dir) {
				if nextNode := node.GetEdge(letter); nextNode != nil {
					// Use the tile
					rackMap[letter]--
					newPlaced := append(tilesPlaced, game.PlacedTile{
						Position: game.Position{Row: pos.row, Col: pos.col},
						Tile:     game.Tile{Letter: letter, Value: game.TileValues[letter]},
					})

					nextPos := g.nextPos(pos, dir)
					g.extendRight(
						nextNode,
						nextPos,
						word+string(letter),
						newPlaced,
						rackMap,
						blanks,
						dir,
						anchorSeen || isAnchor,
						moves,
					)

					// Return the tile
					rackMap[letter]++
				}
			}
		}

		// Try blanks
		if blanks > 0 {
			for letter := 'A'; letter <= 'Z'; letter++ {
				if g.isValidCrossWord(pos, letter, dir) {
					if nextNode := node.GetEdge(letter); nextNode != nil {
						// Use blank as this letter
						newPlaced := append(tilesPlaced, game.PlacedTile{
							Position: game.Position{Row: pos.row, Col: pos.col},
							Tile:     game.Tile{Letter: letter, Value: 0, IsBlank: true},
						})

						nextPos := g.nextPos(pos, dir)
						g.extendRight(
							nextNode,
							nextPos,
							word+string(letter),
							newPlaced,
							rackMap,
							blanks-1,
							dir,
							anchorSeen || isAnchor,
							moves,
						)
					}
				}
			}
		}

		// Try extending without placing a tile here (skip to separator)
		if !isAnchor {
			if separatorNode := node.GetEdge(gaddag.Separator); separatorNode != nil {
				g.extendAfterSeparator(
					separatorNode,
					pos,
					word,
					tilesPlaced,
					rackMap,
					blanks,
					dir,
					anchorSeen,
					moves,
				)
			}
		}
	}
}

// extendAfterSeparator handles the part after seeing the separator in GADDAG
func (g *Generator) extendAfterSeparator(
	node *gaddag.Node,
	pos anchorSquare,
	word string,
	tilesPlaced []game.PlacedTile,
	rackMap map[rune]int,
	blanks int,
	dir game.Direction,
	anchorSeen bool,
	moves *[]game.Move,
) {
	// After separator, we place tiles going backwards (building prefix)
	if pos.row < 0 || pos.col < 0 {
		return
	}

	existingTile := g.board.GetTile(pos.row, pos.col)

	if existingTile != nil {
		// Must use existing tile
		letter := existingTile.Letter
		if nextNode := node.GetEdge(letter); nextNode != nil {
			prevPos := g.prevPos(pos, dir)
			// Prepend letter to word
			g.extendAfterSeparator(
				nextNode,
				prevPos,
				string(letter)+word,
				tilesPlaced,
				rackMap,
				blanks,
				dir,
				anchorSeen,
				moves,
			)
		}
	} else {
		// Check if we can end here (forms valid word)
		if node.IsTerminal() && anchorSeen && len(tilesPlaced) > 0 {
			move := game.Move{
				Word:        word,
				Position:    game.Position{Row: pos.row, Col: pos.col},
				Direction:   dir,
				TilesPlaced: tilesPlaced,
			}
			if dir == game.Vertical {
				move.Position.Row = pos.row
			} else {
				move.Position.Col = pos.col
			}
			*moves = append(*moves, move)
		}

		// Try placing tiles from rack going backwards
		for letter, count := range rackMap {
			if count > 0 && g.isValidCrossWord(pos, letter, dir) {
				if nextNode := node.GetEdge(letter); nextNode != nil {
					rackMap[letter]--

					// Place tile at current position
					newPlaced := make([]game.PlacedTile, len(tilesPlaced)+1)
					newPlaced[0] = game.PlacedTile{
						Position: game.Position{Row: pos.row, Col: pos.col},
						Tile:     game.Tile{Letter: letter, Value: game.TileValues[letter]},
					}
					copy(newPlaced[1:], tilesPlaced)

					prevPos := g.prevPos(pos, dir)
					g.extendAfterSeparator(
						nextNode,
						prevPos,
						string(letter)+word,
						newPlaced,
						rackMap,
						blanks,
						dir,
						anchorSeen,
						moves,
					)

					rackMap[letter]++
				}
			}
		}

		// Try blanks
		if blanks > 0 {
			for letter := 'A'; letter <= 'Z'; letter++ {
				if g.isValidCrossWord(pos, letter, dir) {
					if nextNode := node.GetEdge(letter); nextNode != nil {
						newPlaced := make([]game.PlacedTile, len(tilesPlaced)+1)
						newPlaced[0] = game.PlacedTile{
							Position: game.Position{Row: pos.row, Col: pos.col},
							Tile:     game.Tile{Letter: letter, Value: 0, IsBlank: true},
						}
						copy(newPlaced[1:], tilesPlaced)

						prevPos := g.prevPos(pos, dir)
						g.extendAfterSeparator(
							nextNode,
							prevPos,
							string(letter)+word,
							newPlaced,
							rackMap,
							blanks-1,
							dir,
							anchorSeen,
							moves,
						)
					}
				}
			}
		}
	}
}

// isValidCrossWord checks if placing a letter forms valid perpendicular words
func (g *Generator) isValidCrossWord(pos anchorSquare, letter rune, dir game.Direction) bool {
	// For now, return true - will implement cross-word validation later
	return true
}

// findMoveStart finds the starting position of a move
func (g *Generator) findMoveStart(word string, tilesPlaced []game.PlacedTile, dir game.Direction) game.Position {
	if len(word) == 0 {
		return game.Position{}
	}

	// If no tiles placed, word must already exist on board
	if len(tilesPlaced) == 0 {
		return game.Position{}
	}

	// Find the position of the first tile placed
	firstPlaced := tilesPlaced[0].Position

	// Count existing tiles before first placed tile
	pos := positionToAnchor(firstPlaced)
	existingBefore := 0

	for {
		prev := g.prevPos(pos, dir)
		if prev.row < 0 || prev.col < 0 {
			break
		}
		if g.board.GetTile(prev.row, prev.col) == nil {
			break
		}
		existingBefore++
		pos = prev
	}

	return anchorToPosition(pos)
}
