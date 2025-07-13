package gaddag

import (
	"testing"
)

func TestGADDAGBasic(t *testing.T) {
	g := New()

	// Add some words
	words := []string{"CAT", "CATS", "AT", "ATE"}
	for _, word := range words {
		g.Add(word)
	}

	// Test contains
	tests := []struct {
		word     string
		expected bool
	}{
		{"CAT", true},
		{"CATS", true},
		{"AT", true},
		{"ATE", true},
		{"DOG", false},
		{"CA", false},
		{"CATE", false},
	}

	for _, test := range tests {
		if got := g.Contains(test.word); got != test.expected {
			t.Errorf("Contains(%q) = %v, want %v", test.word, got, test.expected)
		}
	}
}

func TestGADDAGCaseInsensitive(t *testing.T) {
	g := New()
	g.Add("cat")

	if !g.Contains("CAT") {
		t.Error("GADDAG should be case-insensitive")
	}
	if !g.Contains("Cat") {
		t.Error("GADDAG should be case-insensitive")
	}
}

func TestGADDAGPaths(t *testing.T) {
	g := New()
	g.Add("CAT")

	// Expected GADDAG paths for "CAT":
	// 1. C A T (start at beginning)
	// 2. A > C T (start at A)
	// 3. T A > C (start at T)
	// 4. T A C > (start after end)

	stats := g.Stats()
	t.Logf("After adding 'CAT': %s", stats)

	g.Add("ATE")
	stats = g.Stats()
	t.Logf("After adding 'ATE': %s", stats)
}

func TestLoadFromFile(t *testing.T) {
	// Skip if test dictionary file doesn't exist
	g, err := LoadFromFile("../../../dictionaries/test_dict.txt")
	if err != nil {
		t.Skipf("Skipping file test: %v", err)
		return
	}

	// Test some words from the test dictionary
	testWords := []struct {
		word     string
		expected bool
	}{
		{"CAT", true},
		{"CATS", true},
		{"SCAR", true},
		{"ARTS", true},
		{"DOG", false},
		{"HELLO", false},
	}

	for _, test := range testWords {
		if got := g.Contains(test.word); got != test.expected {
			t.Errorf("Contains(%q) = %v, want %v", test.word, got, test.expected)
		}
	}

	t.Logf("Dictionary stats: %s", g.Stats())
}
