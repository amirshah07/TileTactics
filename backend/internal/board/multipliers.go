package board

func (b *Board) initializeMultipliers() {
	// Triple word scores (red squares)
	tripleWords := [][2]int{
		{0, 0}, {0, 7}, {0, 14},
		{7, 0}, {7, 14},
		{14, 0}, {14, 7}, {14, 14},
	}
	for _, pos := range tripleWords {
		b.multipliers[pos[0]][pos[1]] = Multiplier{TripleWord, 3}
	}

	// Double word scores (pink squares)
	doubleWords := [][2]int{
		{1, 1}, {2, 2}, {3, 3}, {4, 4},
		{1, 13}, {2, 12}, {3, 11}, {4, 10},
		{13, 1}, {12, 2}, {11, 3}, {10, 4},
		{13, 13}, {12, 12}, {11, 11}, {10, 10},
		{7, 7}, // Center star
	}
	for _, pos := range doubleWords {
		b.multipliers[pos[0]][pos[1]] = Multiplier{DoubleWord, 2}
	}

	// Add triple letter and double letter...
	// (I can provide full multiplier positions if needed)
}
