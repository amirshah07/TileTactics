package game

// Tile represents a single tile
type Tile struct {
	Letter  rune
	Value   int
	IsBlank bool
}

// Position on the board
type Position struct {
	Row int
	Col int
}

// Direction of word placement
type Direction int

const (
	Horizontal Direction = iota
	Vertical
)

// Move represents a complete move
type Move struct {
	Word        string
	Position    Position
	Direction   Direction
	Score       int
	TilesPlaced []PlacedTile
	Leave       []Tile // Remaining tiles
}

// PlacedTile is a tile placed at a position
type PlacedTile struct {
	Position Position
	Tile     Tile
}
