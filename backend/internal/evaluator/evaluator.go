package evaluator

import (
	"math"
	"sort"
	"tiletactics/backend/internal/game"
)

// Weights for different evaluation factors
type Weights struct {
	Score      float64 // Raw score weight
	Leave      float64 // Rack leave quality weight
	Position   float64 // Board position weight
	Defense    float64 // Defensive play weight
	Volatility float64 // Board volatility weight
}

// DefaultWeights provides balanced evaluation weights
var DefaultWeights = Weights{
	Score:      1.0,
	Leave:      0.3,
	Position:   0.2,
	Defense:    0.15,
	Volatility: 0.1,
}

// TileLeaveValues assigns value to tiles when left on rack
var TileLeaveValues = map[rune]float64{
	'?': 25.0, // Blank is extremely valuable
	'S': 8.0,  // S is great for hooks and plurals
	'X': 8.0,  // High scoring potential
	'Z': 8.0,  // High scoring potential
	'E': 7.0,  // Most common vowel
	'A': 6.5,  // Common vowel
	'I': 6.5,  // Common vowel
	'R': 6.0,  // Common consonant
	'N': 6.0,  // Common consonant
	'T': 6.0,  // Common consonant
	'L': 5.5,  // Good consonant
	'O': 5.0,  // Vowel
	'D': 4.5,  // Decent consonant
	'U': 2.0,  // Less useful vowel
	'Q': -8.0, // Terrible without U
	'V': 1.0,  // Difficult to use
	'W': 1.0,  // Difficult to use
	'J': 3.0,  // High value but harder to use
	'K': 2.0,  // Harder to use
}

// SynergyBonus for tile combinations
var SynergyBonus = map[string]float64{
	"QU":  10.0, // Q with U is much better
	"ER":  2.0,  // Common ending
	"ING": 3.0,  // Common suffix
	"ED":  2.0,  // Common ending
	"ES":  2.0,  // Common plural
}

// Evaluator evaluates and ranks moves
type Evaluator struct {
	weights        Weights
	remainingTiles map[rune]int // Tiles left in bag
}

// New creates a new evaluator
func New(remainingTiles map[rune]int) *Evaluator {
	return &Evaluator{
		weights:        DefaultWeights,
		remainingTiles: remainingTiles,
	}
}

// NewWithWeights creates an evaluator with custom weights
func NewWithWeights(remainingTiles map[rune]int, weights Weights) *Evaluator {
	return &Evaluator{
		weights:        weights,
		remainingTiles: remainingTiles,
	}
}

// EvaluateMoves takes scored moves and returns the best ones with full evaluation
func (e *Evaluator) EvaluateMoves(moves []game.Move, rack []game.Tile, topN int) []game.Move {
	if len(moves) == 0 {
		return moves
	}

	// Calculate total remaining tiles
	totalRemaining := 0
	for _, count := range e.remainingTiles {
		totalRemaining += count
	}

	// Evaluate each move
	evaluatedMoves := make([]evaluatedMove, 0, len(moves))

	for _, move := range moves {
		// Calculate leave tiles
		leave := e.calculateLeave(rack, move.TilesPlaced)
		move.Leave = leave

		// Calculate evaluation score
		evalScore := e.evaluateMove(move, totalRemaining)

		evaluatedMoves = append(evaluatedMoves, evaluatedMove{
			move:  move,
			score: evalScore,
		})
	}

	// Sort by evaluation score
	sort.Slice(evaluatedMoves, func(i, j int) bool {
		return evaluatedMoves[i].score > evaluatedMoves[j].score
	})

	// Return top N moves
	result := make([]game.Move, 0, topN)
	for i := 0; i < len(evaluatedMoves) && i < topN; i++ {
		result = append(result, evaluatedMoves[i].move)
	}

	return result
}

type evaluatedMove struct {
	move  game.Move
	score float64
}

// evaluateMove calculates the full evaluation score for a move
func (e *Evaluator) evaluateMove(move game.Move, totalRemaining int) float64 {
	score := 0.0

	// Adjust weights based on game stage
	weights := e.adjustWeightsForGameStage(totalRemaining)

	// 1. Raw score component
	score += float64(move.Score) * weights.Score

	// 2. Leave evaluation
	if totalRemaining > 0 { // No leave value in endgame
		leaveValue := e.evaluateLeave(move.Leave)
		score += leaveValue * weights.Leave
	}

	// 3. Position evaluation
	positionValue := e.evaluatePosition(move)
	score += positionValue * weights.Position

	// 4. Defensive evaluation (simplified for now)
	defenseValue := e.evaluateDefense(move)
	score += defenseValue * weights.Defense

	// 5. Board volatility (simplified for now)
	volatilityValue := e.evaluateVolatility(move)
	score += volatilityValue * weights.Volatility

	return score
}

// adjustWeightsForGameStage modifies weights based on game stage
func (e *Evaluator) adjustWeightsForGameStage(totalRemaining int) Weights {
	weights := e.weights

	if totalRemaining == 0 {
		// Endgame: only score matters
		weights.Score = 1.0
		weights.Leave = 0.0
		weights.Position = 0.1
		weights.Defense = 0.2
		weights.Volatility = 0.0
	} else if totalRemaining < 7 {
		// Pre-endgame: reduce leave importance
		weights.Leave *= 0.5
		weights.Score *= 1.2
	} else if totalRemaining > 80 {
		// Early game: position and leave more important
		weights.Position *= 1.3
		weights.Leave *= 1.2
	}

	return weights
}

// calculateLeave determines which tiles remain after a move
func (e *Evaluator) calculateLeave(rack []game.Tile, tilesPlaced []game.PlacedTile) []game.Tile {
	// Create a map of placed tiles for easy lookup
	placedMap := make(map[rune]int)
	blanksPlaced := 0

	for _, placed := range tilesPlaced {
		if placed.Tile.IsBlank {
			blanksPlaced++
		} else {
			placedMap[placed.Tile.Letter]++
		}
	}

	// Calculate remaining tiles
	var leave []game.Tile
	blanksLeft := 0

	for _, tile := range rack {
		if tile.IsBlank {
			if blanksLeft < blanksPlaced {
				blanksLeft++
				continue
			}
			leave = append(leave, tile)
		} else if placedMap[tile.Letter] > 0 {
			placedMap[tile.Letter]--
		} else {
			leave = append(leave, tile)
		}
	}

	return leave
}

// evaluateLeave calculates the value of remaining tiles
func (e *Evaluator) evaluateLeave(leave []game.Tile) float64 {
	if len(leave) == 0 {
		return 0
	}

	value := 0.0

	// Individual tile values
	for _, tile := range leave {
		if tile.IsBlank {
			value += TileLeaveValues['?']
		} else if tileValue, exists := TileLeaveValues[tile.Letter]; exists {
			value += tileValue
		}
	}

	// Check for synergies
	value += e.calculateSynergies(leave)

	// Penalty for too many vowels or consonants
	vowelCount := 0
	for _, tile := range leave {
		if !tile.IsBlank && isVowel(tile.Letter) {
			vowelCount++
		}
	}

	vowelRatio := float64(vowelCount) / float64(len(leave))
	if vowelRatio > 0.6 || vowelRatio < 0.2 {
		value -= 5.0 // Imbalanced rack penalty
	}

	// Penalty for duplicate tiles (except S)
	duplicates := make(map[rune]int)
	for _, tile := range leave {
		if !tile.IsBlank {
			duplicates[tile.Letter]++
		}
	}

	for letter, count := range duplicates {
		if count > 1 && letter != 'S' {
			value -= float64(count-1) * 2.0
		}
	}

	return value
}

// calculateSynergies checks for valuable tile combinations
func (e *Evaluator) calculateSynergies(leave []game.Tile) float64 {
	bonus := 0.0

	// Convert to string for easy checking
	letters := make(map[rune]bool)
	for _, tile := range leave {
		if !tile.IsBlank {
			letters[tile.Letter] = true
		}
	}

	// Check specific combinations
	if letters['Q'] && letters['U'] {
		bonus += SynergyBonus["QU"]
	}
	if letters['E'] && letters['R'] {
		bonus += SynergyBonus["ER"]
	}
	if letters['I'] && letters['N'] && letters['G'] {
		bonus += SynergyBonus["ING"]
	}
	if letters['E'] && letters['D'] {
		bonus += SynergyBonus["ED"]
	}
	if letters['E'] && letters['S'] {
		bonus += SynergyBonus["ES"]
	}

	return bonus
}

// evaluatePosition calculates position value of a move
func (e *Evaluator) evaluatePosition(move game.Move) float64 {
	value := 0.0

	// Calculate center position of the move
	centerRow := move.Position.Row
	centerCol := move.Position.Col

	if move.Direction == game.Horizontal {
		centerCol += len(move.Word) / 2
	} else {
		centerRow += len(move.Word) / 2
	}

	// Distance from center (7,7) - closer is better in early game
	centerDistance := math.Abs(float64(centerRow-7)) + math.Abs(float64(centerCol-7))
	value += (14.0 - centerDistance) * 0.5

	// Bonus for moves that don't open triple word scores
	// Simplified: check if move is near edges
	if (centerRow <= 2 || centerRow >= 12) || (centerCol <= 2 || centerCol >= 12) {
		value -= 3.0 // Penalty for edge plays that might open TWS
	}

	return value
}

// evaluateDefense calculates defensive value (simplified)
func (e *Evaluator) evaluateDefense(move game.Move) float64 {
	// Simple heuristic: longer words are more defensive (block more squares)
	return float64(len(move.Word)) * 0.5
}

// evaluateVolatility calculates board volatility impact (simplified)
func (e *Evaluator) evaluateVolatility(move game.Move) float64 {
	// High-scoring tiles placed are less volatile
	highValueTiles := 0
	for _, placed := range move.TilesPlaced {
		if placed.Tile.Value >= 4 {
			highValueTiles++
		}
	}

	return float64(highValueTiles) * 2.0
}

// isVowel checks if a letter is a vowel
func isVowel(letter rune) bool {
	switch letter {
	case 'A', 'E', 'I', 'O', 'U':
		return true
	default:
		return false
	}
}
